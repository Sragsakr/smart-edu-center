import { pathToFileURL } from "node:url";
import pg from "pg";

/**
 * تزويد دور runtime للتطبيق بصلاحيات least-privilege.
 *
 * السبب: `FORCE ROW LEVEL SECURITY` لا يُلزم الـsuperuser ولا أي دور بـ`BYPASSRLS`.
 * فلو عمل التطبيق بدور المالك لصارت سياسات العزل غير مُلزمة فعليًا. لذلك:
 *
 * - **دور المالك** يبني المخطط ويزرع البيانات ويعيد إنشاء قاعدة الاختبار (يتجاوز RLS عمدًا).
 * - **دور التطبيق `saboraty_app`** يُشغّل runtime ويخضع لكل السياسات.
 *
 * المرجع: docs/adr/0007.
 */

export class RoleProvisioningError extends Error {}

export const APP_ROLE = "saboraty_app";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const MIN_PASSWORD_LENGTH = 16;

/**
 * بناء أوامر SQL لتزويد الدور. دالة نقية ليمكن اختبارها بلا قاعدة بيانات.
 *
 * تُستخدم `format` مع `%I`/`%L` لضمان اقتباس المعرّفات والقيم، فلا يمكن أن يتحول
 * اسم دور أو كلمة مرور إلى SQL إضافي.
 */
export function buildRoleProvisioningStatements({ roleName, password, databaseName }) {
  if (!/^[a-z_][a-z0-9_]*$/.test(roleName)) {
    throw new RoleProvisioningError(`role name "${roleName}" must be a simple lowercase identifier`);
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new RoleProvisioningError(`the application role password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const quotedRole = quoteIdentifier(roleName);
  const quotedDatabase = quoteIdentifier(databaseName);

  return [
    // الدور: بلا superuser وبلا bypassrls — وإلا لصارت سياسات العزل بلا أثر.
    `do $provision$
     begin
       if not exists (select 1 from pg_roles where rolname = ${quoteLiteral(roleName)}) then
         execute format('create role %I login nosuperuser nobypassrls nocreatedb nocreaterole', ${quoteLiteral(roleName)});
       else
         execute format('alter role %I nosuperuser nobypassrls nocreatedb nocreaterole', ${quoteLiteral(roleName)});
       end if;
       execute format('alter role %I with password %L', ${quoteLiteral(roleName)}, ${quoteLiteral(password)});
     end
     $provision$;`,

    `grant connect on database ${quotedDatabase} to ${quotedRole};`,
    `grant usage on schema public to ${quotedRole};`,
    `grant usage on schema private to ${quotedRole};`,

    // لا نمنح DDL: الدور يعمل على البيانات فقط.
    `revoke create on schema public from ${quotedRole};`,

    `grant select, insert, update, delete on all tables in schema public to ${quotedRole};`,
    `grant usage, select on all sequences in schema public to ${quotedRole};`,
    `grant execute on all functions in schema public to ${quotedRole};`,
    `grant execute on all functions in schema private to ${quotedRole};`,

    // الجداول القادمة في المخطط ترث نفس الصلاحيات تلقائيًا.
    `alter default privileges in schema public grant select, insert, update, delete on tables to ${quotedRole};`,
    `alter default privileges in schema public grant usage, select on sequences to ${quotedRole};`,
    `alter default privileges in schema public grant execute on functions to ${quotedRole};`,
    `alter default privileges in schema private grant execute on functions to ${quotedRole};`,
  ];
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * هل يتجاوز هذا الدور سياسات RLS؟
 *
 * `rolsuper` أو `rolbypassrls` تعني أن كل سياسة على كل جدول غير مُلزمة.
 */
export function roleBypassesRls(role) {
  return role.rolsuper === true || role.rolbypassrls === true;
}

/** يفشل برسالة عملية إن كان دور الاتصال يتجاوز RLS. */
export async function assertRlsEnforcedForRuntime(connectionString, label = "DATABASE_URL") {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      `select current_user as role_name, rolsuper, rolbypassrls
       from pg_roles where rolname = current_user`,
    );
    const role = result.rows[0];
    if (!role) throw new RoleProvisioningError(`${label} resolved to an unknown role`);

    if (roleBypassesRls(role)) {
      const traits = [role.rolsuper ? "SUPERUSER" : null, role.rolbypassrls ? "BYPASSRLS" : null]
        .filter(Boolean)
        .join(" + ");
      throw new RoleProvisioningError(
        `${label} connects as "${role.role_name}" which has ${traits}, so row-level security is NOT enforced. ` +
          `Point the runtime at the dedicated "${APP_ROLE}" role instead (see docs/adr/0007).`,
      );
    }
    return role;
  } finally {
    await client.end();
  }
}

/** ينفّذ التزويد فعليًا على قاعدة البيانات. */
export async function provisionAppRole({ ownerConnectionString, roleName = APP_ROLE, password, databaseName }) {
  const client = new pg.Client({ connectionString: ownerConnectionString });
  await client.connect();
  try {
    const resolvedDatabase = databaseName ?? new URL(ownerConnectionString).pathname.replace(/^\//, "");
    if (!resolvedDatabase) throw new RoleProvisioningError("could not resolve the target database name");

    const statements = buildRoleProvisioningStatements({
      roleName,
      password,
      databaseName: resolvedDatabase,
    });

    await client.query("begin");
    for (const statement of statements) await client.query(statement);
    await client.query("commit");

    const verification = await client.query(
      `select rolsuper, rolbypassrls from pg_roles where rolname = $1`,
      [roleName],
    );
    const role = verification.rows[0];
    if (!role) throw new RoleProvisioningError(`role "${roleName}" was not created`);
    if (roleBypassesRls(role)) {
      throw new RoleProvisioningError(`role "${roleName}" must not be superuser or bypassrls`);
    }
    return { roleName, databaseName: resolvedDatabase };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const ownerConnectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!ownerConnectionString) {
    throw new RoleProvisioningError("MIGRATION_DATABASE_URL (owner) or DATABASE_URL is required.");
  }
  const password = process.env.APP_DB_PASSWORD;
  if (!password) throw new RoleProvisioningError("APP_DB_PASSWORD is required.");

  const hostname = new URL(ownerConnectionString).hostname;
  if (!LOOPBACK_HOSTS.has(hostname) && !process.argv.includes("--allow-remote")) {
    throw new RoleProvisioningError(
      `host "${hostname}" is not loopback. Re-run with --allow-remote when this is the intended environment.`,
    );
  }

  const { roleName, databaseName } = await provisionAppRole({ ownerConnectionString, password });
  console.log(`Role "${roleName}" provisioned with least-privilege grants on "${databaseName}".`);
  console.log("Point DATABASE_URL at this role so row-level security is enforced.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`ROLE PROVISIONING FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}

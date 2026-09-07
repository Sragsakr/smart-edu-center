import { z } from "zod";

const privateEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(20, "SUPABASE_SECRET_KEY is required")
    .refine(
      (secretKey) => !secretKey.startsWith("sb_publishable_") && !secretKey.startsWith("NEXT_PUBLIC_"),
      "SUPABASE_SECRET_KEY must be a server-only secret key",
    ),
  DATA_BACKEND: z.enum(["supabase", "postgres"]).default("supabase"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL").optional(),
});

export type PrivateEnv = z.infer<typeof privateEnvSchema>;

export function parsePrivateEnv(environment: NodeJS.ProcessEnv): PrivateEnv {
  const parsedEnvironment = privateEnvSchema.safeParse(environment);
  if (parsedEnvironment.success) {
    if (parsedEnvironment.data.DATA_BACKEND === "postgres" && !parsedEnvironment.data.DATABASE_URL) {
      throw new Error("Invalid private environment variables:\n- DATABASE_URL: DATABASE_URL is required when DATA_BACKEND=postgres");
    }
    return parsedEnvironment.data;
  }

  const issues = parsedEnvironment.error.issues.map(
    (issue) => `- ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid private environment variables:\n${issues.join("\n")}`);
}

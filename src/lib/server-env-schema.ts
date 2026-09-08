import { z } from "zod";

const privateEnvSchema = z.object({
  DATA_BACKEND: z.literal("postgres").default("postgres"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .url("DATABASE_URL must be a valid PostgreSQL URL")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use the PostgreSQL protocol",
    ),
});

export type PrivateEnv = z.infer<typeof privateEnvSchema>;

export function parsePrivateEnv(environment: NodeJS.ProcessEnv): PrivateEnv {
  const parsedEnvironment = privateEnvSchema.safeParse(environment);
  if (parsedEnvironment.success) return parsedEnvironment.data;
  const issues = parsedEnvironment.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid private environment variables:\n${issues.join("\n")}`);
}

import { z } from "zod";

const privateEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(20, "SUPABASE_SECRET_KEY is required")
    .refine(
      (secretKey) => !secretKey.startsWith("sb_publishable_") && !secretKey.startsWith("NEXT_PUBLIC_"),
      "SUPABASE_SECRET_KEY must be a server-only secret key",
    ),
});

export type PrivateEnv = z.infer<typeof privateEnvSchema>;

export function parsePrivateEnv(environment: NodeJS.ProcessEnv): PrivateEnv {
  const parsedEnvironment = privateEnvSchema.safeParse(environment);
  if (parsedEnvironment.success) return parsedEnvironment.data;

  const issues = parsedEnvironment.error.issues.map(
    (issue) => `- ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid private environment variables:\n${issues.join("\n")}`);
}

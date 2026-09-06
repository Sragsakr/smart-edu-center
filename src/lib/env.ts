import { z } from "zod";

function requiredString(variableName: string) {
  return z
    .string({ error: `${variableName} is required` })
    .trim()
    .min(1, `${variableName} is required`);
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: requiredString("NEXT_PUBLIC_SUPABASE_URL")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .refine(
      (value) => value.startsWith("https://") || value.startsWith("http://"),
      "NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS",
    ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredString(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  rawEnv: Record<string, string | undefined>,
): PublicEnv {
  const validation = publicEnvSchema.safeParse(rawEnv);

  if (!validation.success) {
    const issueDetails = validation.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid public environment variables:\n${issueDetails}`);
  }

  return validation.data;
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

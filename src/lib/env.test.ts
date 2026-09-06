import { beforeEach, describe, expect, it, vi } from "vitest";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", validEnv.NEXT_PUBLIC_SUPABASE_URL);
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
});

async function parse(input: Record<string, string | undefined>) {
  const { parsePublicEnv } = await import("./env");
  return parsePublicEnv(input);
}

describe("parsePublicEnv", () => {
  it("returns trimmed, typed public environment variables", async () => {
    await expect(
      parse({
        NEXT_PUBLIC_SUPABASE_URL: `  ${validEnv.NEXT_PUBLIC_SUPABASE_URL}  `,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          `  ${validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}  `,
      }),
    ).resolves.toEqual(validEnv);
  });

  it("reports every missing required variable", async () => {
    await expect(
      parse({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      }),
    ).rejects.toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL is required[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects a malformed Supabase URL", async () => {
    await expect(
      parse({
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).rejects.toThrowError("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  });

  it("rejects non-HTTP Supabase URLs", async () => {
    await expect(
      parse({
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_URL: "ftp://example.supabase.co",
      }),
    ).rejects.toThrowError(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS",
    );
  });
});

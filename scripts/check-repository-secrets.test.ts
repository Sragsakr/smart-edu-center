import { describe, expect, it } from "vitest";

import { findSecretKinds } from "./check-repository-secrets.mjs";

describe("repository secret policy", () => {
  it.each([
    [
      "private key",
      "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----",
    ],
    ["Supabase service-role JWT", "eyJheader.payload.signature"],
    ["Supabase secret key", `sb_secret_${"x".repeat(20)}`],
    ["GitHub token", `ghp_${"x".repeat(20)}`],
  ])("detects %s material", (secretKind, sourceText) => {
    expect(findSecretKinds(sourceText)).toContain(secretKind);
  });

  it("allows public variable names and placeholders", () => {
    const sourceText = [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=",
      "sb_publishable_ci_placeholder",
    ].join("\n");

    expect(findSecretKinds(sourceText)).toEqual([]);
  });
});

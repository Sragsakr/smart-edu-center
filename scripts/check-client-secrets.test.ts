import { describe, expect, it } from "vitest";

import {
  findLeakedSecretNames,
  findUnsafePublicEnvNames,
} from "./check-client-secrets.mjs";

describe("client secret policy", () => {
  it("rejects sensitive names with the NEXT_PUBLIC prefix", () => {
    const sourceText = [
      "process.env.NEXT_PUBLIC_PROVIDER_SERVICE_ROLE_KEY",
      "process.env.NEXT_PUBLIC_API_SECRET",
      "process.env.NEXT_PUBLIC_SESSION_TOKEN",
    ].join("\n");

    expect(findUnsafePublicEnvNames(sourceText)).toEqual([
      "NEXT_PUBLIC_PROVIDER_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_API_SECRET",
      "NEXT_PUBLIC_SESSION_TOKEN",
    ]);
  });

  it("allows explicitly public, non-sensitive configuration", () => {
    const sourceText = [
      "process.env.NEXT_PUBLIC_SITE_URL",
      "process.env.NEXT_PUBLIC_ANALYTICS_ID",
    ].join("\n");

    expect(findUnsafePublicEnvNames(sourceText)).toEqual([]);
  });

  it("reports sensitive environment values copied into a client bundle", () => {
    const environment = {
      PROVIDER_SERVICE_ROLE_KEY: "server-only-value",
      DATABASE_PASSWORD: "another-private-value",
      NEXT_PUBLIC_SITE_URL: "https://example.test",
    };
    const clientBundleText = `window.config="${environment.PROVIDER_SERVICE_ROLE_KEY}"`;

    expect(findLeakedSecretNames(clientBundleText, environment)).toEqual([
      "PROVIDER_SERVICE_ROLE_KEY",
    ]);
  });
});

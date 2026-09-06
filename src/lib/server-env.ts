import "server-only";

import { parsePrivateEnv } from "@/lib/server-env-schema";

export function privateEnv() {
  return parsePrivateEnv(process.env);
}

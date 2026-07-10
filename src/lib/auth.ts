import "server-only";

import { createAuth, type CareerBridgeAuth } from "@/lib/auth-config";

let authInstance: CareerBridgeAuth | undefined;

/** Lazily creates the auth server so imports remain build-safe. */
export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

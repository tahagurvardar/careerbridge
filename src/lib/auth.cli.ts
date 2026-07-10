import { createAuth } from "@/lib/auth-config";

// Better Auth CLI entry point. Runtime code uses the lazy getAuth() helper.
export const auth = createAuth({ enableNextCookies: false });

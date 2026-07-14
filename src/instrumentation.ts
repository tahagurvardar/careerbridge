export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.VERCEL_ENV === "production"
  ) {
    const { getServerEnvironment } = await import("@/lib/env/server");
    getServerEnvironment();
  }
}

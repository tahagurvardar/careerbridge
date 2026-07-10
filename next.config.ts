import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: {
    // Next.js logs Server Function arguments in development by default. Auth
    // actions carry passwords, so invocation logging must remain disabled.
    serverFunctions: false,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

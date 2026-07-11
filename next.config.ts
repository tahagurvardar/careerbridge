import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: {
    // Next.js logs Server Function arguments in development by default. Auth
    // actions carry passwords, so invocation logging must remain disabled.
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      // The CV upload Server Action accepts PDFs up to 5 MB; the default 1 MB
      // limit would reject them. The extra headroom covers multipart overhead,
      // while the action itself still enforces the exact 5 MB byte limit.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

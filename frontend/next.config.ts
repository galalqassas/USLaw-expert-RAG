import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake is a CJS-only module with internal dynamic requires that cannot be
  // bundled by Turbopack. Marking it as external lets Node.js resolve it at runtime.
  serverExternalPackages: ['pdfmake'],
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;

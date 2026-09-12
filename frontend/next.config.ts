import type { NextConfig } from "next";

// Proxy browser API calls through the frontend origin in production. This
// keeps auth cookies same-origin and avoids localhost/CORS failures.
const apiProxyTarget = process.env.API_PROXY_TARGET || "http://localhost:8008";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

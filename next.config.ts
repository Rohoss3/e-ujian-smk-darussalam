import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withSerwistInit = require("@serwist/next").default;
  const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
    reloadOnOnline: false,
  });
  nextConfig = withSerwist(nextConfig);
} catch (e) {
  // Fallback if serwist is optional or building without PWA bundler
}

export default nextConfig;

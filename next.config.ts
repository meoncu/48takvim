import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Silence Next.js 16 Turbopack migration warning when plugins add webpack config.
  turbopack: {},
};

export default nextConfig;

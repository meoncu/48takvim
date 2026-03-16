import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-eec60fefa25a4b12abac15c90f68e4b2.r2.dev',
        pathname: '/**',
      },
    ],
  },
  // Silence Next.js 16 Turbopack migration warning when plugins add webpack config.
  turbopack: {},
};

export default nextConfig;

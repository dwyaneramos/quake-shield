import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  // Transpile shared packages from monorepo
  transpilePackages: ["@quakeshield/shared"],
};

export default nextConfig;

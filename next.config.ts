import type { NextConfig } from "next";

const emptyBrowserModule = "./lib/empty-module.ts";

const nextConfig: NextConfig = {
  output: process.env.NEXT_BUILD_STANDALONE === "true" ? "standalone" : undefined,
  turbopack: {
    resolveAlias: {
      fs: { browser: emptyBrowserModule },
      encoding: { browser: emptyBrowserModule },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        encoding: false,
      };
    }

    return config;
  },
};

export default nextConfig;

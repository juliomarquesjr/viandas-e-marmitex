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
  // Vale para TODA resposta (páginas, APIs, imagens, PDFs): é o que impede a indexação mesmo de
  // quem ignora o robots.txt ou chega por um link direto (rastreio, e-mail de recuperar senha)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }],
      },
    ];
  },
};

export default nextConfig;

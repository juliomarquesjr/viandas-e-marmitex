import type { NextConfig } from "next";

const emptyBrowserModule = "./lib/empty-module.ts";

const nextConfig: NextConfig = {
  // Permite um segundo servidor de desenvolvimento (testes de tela) sem brigar pelo cache do primeiro:
  // NEXT_DIST_DIR=.next-qa npx next dev -p 3011
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: process.env.NEXT_BUILD_STANDALONE === "true" ? "standalone" : undefined,
  turbopack: {
    resolveAlias: {
      fs: { browser: emptyBrowserModule },
      encoding: { browser: emptyBrowserModule },
    },
  },
  // Endereços antigos continuam valendo (e-mails de recuperar senha já enviados, links salvos):
  // a área do cliente saiu de /customer para a raiz e o PDV de /pdv para /admin/pdv.
  async redirects() {
    return [
      { source: "/customer", destination: "/", permanent: true },
      { source: "/customer/:path*", destination: "/:path*", permanent: true },
      { source: "/pdv", destination: "/admin/pdv", permanent: true },
      { source: "/pdv/:path*", destination: "/admin/pdv/:path*", permanent: true },
    ];
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

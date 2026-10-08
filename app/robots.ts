import type { MetadataRoute } from "next";

/**
 * O sistema é de uso interno (funcionários) e privado (clientes): nenhum mecanismo de busca
 * deve indexá-lo. Este arquivo vira /robots.txt. A garantia de verdade é o cabeçalho
 * `X-Robots-Tag` (next.config.ts) e a meta `robots` (app/layout.tsx), que valem em todas as
 * páginas e respostas; o robots.txt só pede para os rastreadores nem entrarem.
 */
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Googlebot-Image",
  "AdsBot-Google",
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "Applebot",
  "facebookexternalhit",
  "Twitterbot",
  "LinkedInBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "CCBot",
  "Google-Extended",
  "Bytespider",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
  };
}

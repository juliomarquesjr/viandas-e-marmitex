/**
 * Cookie de sessão do cliente. Fica num arquivo sem dependências porque o middleware
 * (runtime Edge) também precisa dele e não pode importar Prisma nem bcrypt.
 *
 * Tem nome próprio, diferente do cookie padrão do NextAuth usado no login de funcionário,
 * para que cada tipo de login enxergue só a própria sessão.
 */

// Em produção (https) o NextAuth prefixa o cookie com __Secure-; mantemos a mesma regra
export const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const CUSTOMER_SESSION_COOKIE = `${USE_SECURE_COOKIES ? "__Secure-" : ""}next-auth.customer-session-token`;

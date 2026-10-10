import { CUSTOMER_SESSION_COOKIE, USE_SECURE_COOKIES } from "@/lib/customer-session-cookie";
import type { Customer } from "@/lib/generated/prisma";
import { parseLoginIdentifier, storedPhoneMatches } from "@/lib/customer-login-id";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Tipos customizados para clientes (separados dos tipos de admin)
export interface CustomerUser {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string;
}

// Tipos para JWT de cliente
interface CustomerJWT {
  id: string;
  customerId: string;
  phone: string;
  email?: string | null;
  name?: string | null;
}

export const customerAuthOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "CustomerCredentials",
      name: "CustomerCredentials",
      credentials: {
        identifier: { label: "Email/Telefone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.identifier || !credentials?.password) return null;

          const login = parseLoginIdentifier(credentials.identifier);
          if (!login) return null;

          // Todos os cadastros que combinam com o e-mail ou telefone digitado; o que tiver a senha certa entra.
          // (Duas pessoas podem dividir o mesmo telefone: só a senha desempata.)
          let candidates: Customer[];
          if (login.kind === 'email') {
            candidates = await prisma.customer.findMany({
              where: { active: true, email: { equals: login.email, mode: 'insensitive' } },
            });
          } else {
            // O telefone fica guardado como foi digitado no cadastro, com ou sem máscara: compara só os dígitos
            const rows = await prisma.$queryRaw<{ id: string }[]>`
              SELECT id FROM "Customer"
              WHERE active = true AND phone IS NOT NULL
                AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${login.tail}`;
            const matches = rows.length
              ? await prisma.customer.findMany({ where: { id: { in: rows.map((r) => r.id) }, active: true } })
              : [];
            candidates = matches.filter((c) => storedPhoneMatches(c.phone, login));
          }

          for (const customer of candidates) {
            if (!customer.password) continue;
            if (await bcrypt.compare(credentials.password, customer.password)) {
              return {
                id: customer.id,
                customerId: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
              } as any;
            }
          }
          return null;
        } catch (error) {
          console.error('[CustomerAuth] Error during authorization:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customerUser = user as unknown as CustomerUser;
        const customerToken = token as unknown as CustomerJWT;
        customerToken.customerId = customerUser.customerId;
        customerToken.phone = customerUser.phone;
        customerToken.email = customerUser.email;
        customerToken.id = customerUser.id;
        customerToken.name = customerUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      const customerToken = token as unknown as CustomerJWT;
      if (customerToken && session.user) {
        (session.user as any).id = customerToken.id;
        (session.user as any).customerId = customerToken.customerId;
        (session.user as any).phone = customerToken.phone;
        (session.user as any).email = customerToken.email;
        (session.user as any).name = customerToken.name;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Cookie com nome próprio, separado do de funcionário (ver lib/customer-session-cookie.ts)
  cookies: {
    sessionToken: {
      name: CUSTOMER_SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: USE_SECURE_COOKIES,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(customerAuthOptions);


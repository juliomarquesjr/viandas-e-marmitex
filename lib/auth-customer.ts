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
          if (!credentials?.identifier || !credentials?.password) {
            console.log('[CustomerAuth] Missing credentials');
            return null;
          }

          console.log('[CustomerAuth] Attempting login for:', credentials.identifier);

          // Buscar cliente por email ou telefone
          const phoneWithoutFormatting = credentials.identifier.replace(/\D/g, '');
          
          // Primeiro tentar buscar por email exato
          let customer = await prisma.customer.findFirst({
            where: {
              active: true,
              email: credentials.identifier.trim()
            }
          });

          // Se não encontrou por email, tentar por telefone
          if (!customer && phoneWithoutFormatting) {
            customer = await prisma.customer.findFirst({
              where: {
                active: true,
                phone: {
                  contains: phoneWithoutFormatting
                }
              }
            });
          }

          // Se ainda não encontrou, tentar busca mais ampla
          if (!customer) {
            customer = await prisma.customer.findFirst({
              where: {
                active: true,
                OR: [
                  { email: { contains: credentials.identifier.trim() } },
                  { phone: { contains: credentials.identifier } }
                ]
              }
            });
          }

          if (!customer) {
            console.log('[CustomerAuth] Customer not found for identifier:', credentials.identifier);
            console.log('[CustomerAuth] Searched with phoneWithoutFormatting:', phoneWithoutFormatting);
            return null;
          }

          console.log('[CustomerAuth] Customer found:', customer.email, 'Has password:', !!customer.password);

          if (!customer.password) {
            console.log('[CustomerAuth] Customer has no password');
            return null;
          }

          // Validar senha
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            customer.password
          );

          console.log('[CustomerAuth] Password validation result:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('[CustomerAuth] Invalid password for customer:', customer.email);
            return null;
          }

          console.log('[CustomerAuth] Login successful for:', customer.email);
          return {
            id: customer.id,
            customerId: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          } as any;
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
    signIn: "/customer/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(customerAuthOptions);


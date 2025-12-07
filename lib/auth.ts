import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { AuthOptions } from "next-auth"

// Extender o tipo padrão do NextAuth para incluir role e id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }

  interface User {
    role: string;
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Login facial: verificar se a senha é um token JWT válido
        // O token JWT é enviado como "senha" para compatibilidade com NextAuth
        if (credentials.password && credentials.password.startsWith('eyJ')) {
          try {
            const { verifyFacialAuthToken } = await import('@/lib/facial-auth-token');
            const payload = verifyFacialAuthToken(credentials.password);
            
            if (!payload) {
              return null; // Token inválido ou expirado
            }

            // Verificar se o email do token corresponde ao email fornecido
            if (payload.email !== credentials.email) {
              console.warn('[AUTH] Email do token não corresponde ao email fornecido');
              return null;
            }

            // Buscar usuário para garantir que ainda está ativo
            const user = await prisma.user.findUnique({
              where: {
                email: payload.email,
                active: true
              }
            });

            if (!user) {
              return null;
            }

            // Verificar se o ID do token corresponde ao ID do usuário
            if (user.id !== payload.userId) {
              console.warn('[AUTH] ID do token não corresponde ao ID do usuário');
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            };
          } catch (error) {
            console.error('[AUTH] Erro ao verificar token facial:', error);
            return null;
          }
        }

        // Login tradicional com senha
        if (!credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
            active: true
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'super-secret-mobile-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

// Middleware para NextAuth (Admin/PDV)
const authMiddleware = withAuth(
  function onSuccess(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Se não tem token, redireciona para login
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Proteger rotas específicas por role
    if (pathname.startsWith("/admin/pdv") && token.role !== "pdv" && token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Apenas administradores podem acessar certas rotas
    if (pathname.startsWith("/admin/users") && token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Usuários PDV não podem acessar rotas admin (exceto as permitidas acima)
    if (pathname.startsWith("/admin") && token.role === "pdv" && !pathname.startsWith("/admin/pdv")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lógica para Mobile
  if (pathname.startsWith("/mobile")) {
    // Permitir rotas públicas mobile (login, register, assets, etc)
    if (pathname.startsWith("/mobile/auth")) {
      return NextResponse.next();
    }

    // Verificar token mobile
    const token = req.cookies.get('mobile-token')?.value;

    if (!token) {
      const loginUrl = new URL("/mobile/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, key);
      return NextResponse.next();
    } catch (error) {
      const loginUrl = new URL("/mobile/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Para outras rotas, usar NextAuth
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/pdv/:path*",
    "/mobile/:path*"
  ]
};
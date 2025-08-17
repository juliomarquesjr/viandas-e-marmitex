import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/pdv/:path*"
  ]
};
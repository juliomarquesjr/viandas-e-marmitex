import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    
    // Rotas de cliente - verificar sessão de cliente separadamente
    if (pathname.startsWith("/customer")) {
      // Se está tentando acessar login, permitir
      if (pathname === "/customer/login") {
        return NextResponse.next();
      }
      
      // Permitir acesso público à página de rastreamento (tracking)
      // Isso permite que links compartilhados funcionem sem autenticação
      if (pathname.match(/^\/customer\/pre-orders\/[^\/]+\/tracking$/)) {
        return NextResponse.next();
      }
      
      // Verificar se tem token de admin (não deve acessar área de cliente)
      if (token && 'role' in token) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      // Verificar sessão de cliente via cookie usando o mesmo secret
      const customerToken = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET
      });
      
      // Se não tem token de cliente e não está na página de login, redirecionar
      if (!customerToken || !(customerToken as any).customerId) {
        return NextResponse.redirect(new URL("/customer/login", req.url));
      }
      
      return NextResponse.next();
    }
    
    // Rotas de entregador
    if (pathname.startsWith("/delivery")) {
      // Se não tem token, redireciona para login
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      
      // Verificar se é token de cliente tentando acessar área de entregador
      if ((token as any).customerId) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      // Qualquer usuário autenticado (admin, pdv) pode acessar área de entregador
      // Mas apenas entregadores atribuídos verão suas entregas
      return NextResponse.next();
    }
    
    // Rotas de admin/PDV - lógica existente
    if (pathname.startsWith("/admin") || pathname.startsWith("/pdv")) {
      // Se não tem token, redireciona para login
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      
      // Verificar se é token de cliente tentando acessar admin
      if ((token as any).customerId) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
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
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Para rotas de cliente, não usar a autorização padrão do withAuth
        // Vamos verificar manualmente no middleware
        if (pathname.startsWith("/customer")) {
          return true; // Sempre permitir, verificaremos manualmente
        }
        
        // Para rotas admin/pdv, usar verificação padrão
        return !!token;
      }
    }
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/pdv/:path*",
    "/customer/:path*",
    "/delivery/:path*"
    // /tracking não está no matcher, então é público por padrão
  ]
};
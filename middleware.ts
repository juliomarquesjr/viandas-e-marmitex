import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session-cookie";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Páginas da área do cliente. Ficam na raiz do site, então a lista é explícita: as demais
 * rotas (/admin, /auth, /tracking, /print...) não são do cliente.
 */
const CUSTOMER_PATHS = ["/login", "/forgot-password", "/reset-password", "/dashboard", "/expenses", "/pre-orders", "/profile"];

function isCustomerPath(pathname: string) {
  return CUSTOMER_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    
    // Rotas de cliente (a área do cliente vive na raiz do site) - verificar sessão de cliente separadamente
    if (isCustomerPath(pathname)) {
      // Sessão de cliente: cookie próprio, separado do de funcionário. Um funcionário logado no mesmo
      // navegador não atrapalha: cada área olha só para a sua sessão.
      const customerToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: CUSTOMER_SESSION_COOKIE,
      });
      const customerLoggedIn = !!customerToken && !!(customerToken as any).customerId;

      // Login: quem já está logado vai direto para o Início
      if (pathname === "/login") {
        return customerLoggedIn
          ? NextResponse.redirect(new URL("/dashboard", req.url))
          : NextResponse.next();
      }

      // Recuperar e redefinir a senha: públicas
      if (pathname === "/forgot-password" || pathname === "/reset-password") {
        return NextResponse.next();
      }
      
      // Permitir acesso público à página de rastreamento (tracking)
      // Isso permite que links compartilhados funcionem sem autenticação
      if (pathname.match(/^\/pre-orders\/[^\/]+\/tracking$/)) {
        return NextResponse.next();
      }
      
      // Sem sessão de cliente, volta para o login
      if (!customerLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.url));
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
    
    // Rotas de admin e PDV (o PDV é /admin/pdv)
    if (pathname.startsWith("/admin")) {
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
        if (isCustomerPath(pathname)) {
          return true; // Sempre permitir, verificaremos manualmente
        }
        
        // Para rotas admin (o PDV é /admin/pdv), usar verificação padrão
        return !!token;
      }
    }
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/delivery/:path*",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/dashboard/:path*",
    "/expenses/:path*",
    "/pre-orders/:path*",
    "/profile/:path*",
    // / (a entrada do cliente decide sozinha) e /tracking (público) não estão no matcher
  ]
};
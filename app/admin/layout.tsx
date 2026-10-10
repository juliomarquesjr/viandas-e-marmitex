"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { SidebarProvider, ModernSidebar, MobileSidebar, HeaderActions } from "./components/layout";
import { AdminChromeProvider, useAdminChrome } from "./components/layout/AdminChromeProvider";
import { AdminThemeProvider } from "./components/layout/AdminThemeProvider";
import { Button } from "@/app/components/ui/button";
import RoAssistant from "./components/ro-assistant";
import { NotificationsProvider, useNotificationsContext } from "./components/notifications/NotificationsProvider";

/**
 * AdminLayout - Design System
 * 
 * Layout moderno com sidebar e header.
 * Inspirado em HubSpot/Salesforce.
 */

interface ExtendedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminThemeProvider>
        <AdminChromeProvider>
          <AdminShell>{children}</AdminShell>
        </AdminChromeProvider>
      </AdminThemeProvider>
    </SidebarProvider>
  );
}

/** Botão do menu no celular: mostra o número de conversas do WhatsApp com mensagem nova, mesmo com o menu fechado. */
function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const { chatUnread } = useNotificationsContext();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={onClick}
      aria-label={chatUnread > 0 ? `Abrir menu, ${chatUnread === 1 ? "1 conversa com mensagem nova" : `${chatUnread} conversas com mensagem nova`}` : "Abrir menu"}
    >
      <span className="relative">
        <Menu className="h-5 w-5" />
        {chatUnread > 0 && (
          <span
            aria-hidden
            className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ring-2 ring-[color:var(--card)]"
            style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
          >
            {chatUnread > 99 ? "99+" : chatUnread}
          </span>
        )}
      </span>
    </Button>
  );
}

/**
 * A casca em volta da página. Fica separada do layout porque precisa ler o
 * contexto que o próprio layout monta.
 */
function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const chrome = useAdminChrome();
  // O PDV é a tela toda desde o primeiro quadro (inclusive no HTML do servidor): sem isso a barra
  // lateral do admin aparece por um instante, até a página ligar o modo imersivo
  const isPdv = (usePathname() ?? "").startsWith("/admin/pdv");
  const fullBleed = chrome.fullBleed || isPdv;
  const immersive = chrome.immersive || isPdv;

  const userRole = session?.user?.role;

  return (
    // Um só estado de notificações para o sino, a tela inicial, o título da aba e a barra lateral.
    // No PDV o sino não existe, então nada é consultado. A tela cheia da Mesa de Pedido (modo imersivo do
    // usuário) continua recebendo os avisos: é onde o operador fica enquanto os pedidos chegam.
    <NotificationsProvider enabled={!isPdv} chatEnabled={userRole === "admin"}>
        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          userRole={userRole}
        />

        {/* Main Layout */}
        <div className="flex h-dvh">
          {/* Desktop Sidebar — escondida no modo imersivo */}
          {!immersive && <ModernSidebar userRole={userRole} />}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header — escondido no modo imersivo */}
            {!immersive && (
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 lg:px-6 shrink-0 transition-colors duration-200">
              {/* Left side - Mobile menu button */}
              <div className="flex items-center gap-4">
                <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
              </div>

              {/* Right side - User menu */}
              <HeaderActions />
            </header>
            )}

            {/* Page Content */}
            <main
              className={
                fullBleed
                  ? "flex-1 min-h-0 overflow-hidden bg-background"
                  : "scroll-slim flex-1 overflow-auto bg-background"
              }
              style={fullBleed ? undefined : { scrollbarGutter: "stable" }}
            >
              {fullBleed ? (
                children
              ) : (
                <div className="w-full px-4 lg:px-6 pt-6 pb-24 lg:pb-6">{children}</div>
              )}
            </main>
          </div>
        </div>

        {/* RO Assistant — sai da frente quando a tela toda é a área de trabalho */}
        {!immersive && <RoAssistant />}
    </NotificationsProvider>
  );
}

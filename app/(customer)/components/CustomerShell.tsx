"use client";

import { BookOpen, Home, LogOut, Menu, ReceiptText, ShoppingBag, User } from "lucide-react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { resetCustomerAvatar, useCustomerAvatar } from "../lib/avatar-store";
import { CustomerRealtimeProvider } from "../lib/realtime";
import { resetNotices } from "../lib/notifications-store";
import { NotificationBell } from "./avisos/NotificationBell";
import { MobileMenu } from "./MobileMenu";
import { CustomerThemeProvider } from "./CustomerTheme";
import { BrandMark, ThemeButton, useBranding } from "./kit";

const NAV = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/cardapio", label: "Cardápio", icon: BookOpen },
  { href: "/expenses", label: "Ficha", icon: ReceiptText },
  { href: "/pre-orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/profile", label: "Perfil", icon: User },
];

/** Rastreio público: quem recebe o link não está logado e a tela ainda tem o visual antigo. */
function isTrackingRoute(pathname: string | null) {
  return !!pathname && /^\/pre-orders\/[^/]+\/tracking$/.test(pathname);
}

/** Telas sem navegação: entrar, recuperar senha e o rastreio público. */
function isBareRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    isTrackingRoute(pathname)
  );
}

/** No celular o Perfil mora no menu do cabeçalho (sanduíche); a barra de baixo fica com quatro atalhos. */
function NavLinks({ pathname, skip }: { pathname: string; skip?: string }) {
  return (
    <>
      {NAV.filter((item) => item.href !== skip).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className="c-nav" aria-current={active ? "page" : undefined}>
            <span className="c-nav-ic">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            </span>
            {label}
          </Link>
        );
      })}
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: session } = useSession();
  const branding = useBranding();
  const avatar = useCustomerAvatar();
  const bare = isBareRoute(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // trocar de tela fecha o menu
  useEffect(() => setMenuOpen(false), [pathname]);
  const mustChange = avatar.mustChangePassword && !bare && pathname !== "/profile";

  // Senha gerada pelo estabelecimento: o cliente só segue depois de trocá-la
  useEffect(() => {
    if (mustChange) router.replace("/profile?aba=seguranca");
  }, [mustChange, router]);

  if (bare) return <>{children}</>;

  const logout = async () => {
    resetCustomerAvatar();
    resetNotices();
    await signOut({ redirect: false });
    router.push("/login");
  };

  // nomes curtos aparecem inteiros ("Sabores de Casa"); os longos viram a primeira palavra
  const shortTitle = branding.title.length <= 18 ? branding.title : branding.title.split(/\s+e\s+|\s+/)[0] || branding.title;

  return (
    <div className="c-shell">
      <header className="c-top">
        <Link href="/dashboard" className="c-brand">
          <BrandMark logoUrl={branding.logoUrl} />
          <span>{shortTitle}</span>
        </Link>
        <div className="c-top-actions">
          <NotificationBell />
          <button
            type="button"
            className="c-iconbtn"
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      <Suspense fallback={null}>
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          name={session?.user?.name}
          detail={session?.user?.email || (session?.user as { phone?: string } | undefined)?.phone}
          imageUrl={avatar.imageUrl}
          onLogout={logout}
        />
      </Suspense>

      <nav className="c-rail" aria-label="Principal">
        <Link href="/dashboard" aria-label={branding.title} title={branding.title}>
          <BrandMark logoUrl={branding.logoUrl} />
        </Link>
        <NavLinks pathname={pathname} />
        <span className="c-rail-spacer" />
        <NotificationBell variant="rail" />
        <ThemeButton variant="rail" />
        <button type="button" className="c-nav" onClick={logout}>
          <span className="c-nav-ic">
            <LogOut size={22} />
          </span>
          Sair
        </button>
      </nav>

      <main className="c-main" id="customer-main">
        {children}
      </main>

      <nav className="c-tabbar" aria-label="Principal">
        <NavLinks pathname={pathname} skip="/profile" />
      </nav>
    </div>
  );
}

export function CustomerShell({ children, fontClassName }: { children: React.ReactNode; fontClassName: string }) {
  const pathname = usePathname();

  // O rastreio fica fora do escopo visual novo (tema e kit), exatamente como era antes:
  // dentro dele, o fundo seguia o tema escuro e os cartões antigos continuavam brancos.
  if (isTrackingRoute(pathname)) {
    return <SessionProvider basePath="/api/auth/customer">{children}</SessionProvider>;
  }

  return (
    <SessionProvider basePath="/api/auth/customer">
      <CustomerThemeProvider>
        <div data-customer-scope="" className={fontClassName}>
          <CustomerRealtimeProvider>
            <Shell>{children}</Shell>
          </CustomerRealtimeProvider>
        </div>
      </CustomerThemeProvider>
    </SessionProvider>
  );
}

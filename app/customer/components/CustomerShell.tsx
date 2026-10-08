"use client";

import { Home, LogOut, ReceiptText, ShoppingBag, User } from "lucide-react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { resetCustomerAvatar, useCustomerAvatar } from "../lib/avatar-store";
import { CustomerRealtimeProvider } from "../lib/realtime";
import { resetNotices } from "../lib/notifications-store";
import { NotificationBell } from "./avisos/NotificationBell";
import { CustomerAvatar } from "./Avatar";
import { CustomerThemeProvider } from "./CustomerTheme";
import { BrandMark, ThemeButton, useBranding } from "./kit";

const NAV = [
  { href: "/customer/dashboard", label: "Início", icon: Home },
  { href: "/customer/expenses", label: "Ficha", icon: ReceiptText },
  { href: "/customer/pre-orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/customer/profile", label: "Perfil", icon: User },
];

/** Rastreio público: quem recebe o link não está logado e a tela ainda tem o visual antigo. */
function isTrackingRoute(pathname: string | null) {
  return !!pathname && /^\/customer\/pre-orders\/[^/]+\/tracking$/.test(pathname);
}

/** Telas sem navegação: entrar, recuperar senha e o rastreio público. */
function isBareRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/customer/login" ||
    pathname === "/customer/forgot-password" ||
    pathname === "/customer/reset-password" ||
    isTrackingRoute(pathname)
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
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

  if (isBareRoute(pathname)) return <>{children}</>;

  const logout = async () => {
    resetCustomerAvatar();
    resetNotices();
    await signOut({ redirect: false });
    router.push("/customer/login");
  };

  const shortTitle = branding.title.split(/\s+e\s+|\s+/)[0] || branding.title;

  return (
    <div className="c-shell">
      <header className="c-top">
        <Link href="/customer/dashboard" className="c-brand">
          <BrandMark logoUrl={branding.logoUrl} />
          <span>{shortTitle}</span>
        </Link>
        <div className="c-top-actions">
          <NotificationBell />
          <ThemeButton />
          <Link href="/customer/profile" className="c-avatar-link" aria-label="Meu perfil">
            <CustomerAvatar name={session?.user?.name} imageUrl={avatar.imageUrl} size={40} />
          </Link>
        </div>
      </header>

      <nav className="c-rail" aria-label="Principal">
        <Link href="/customer/dashboard" aria-label={branding.title} title={branding.title}>
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
        <NavLinks pathname={pathname} />
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

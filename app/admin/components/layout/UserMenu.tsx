"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Calculator,
  ChevronDown,
  LogOut,
  Printer,
  ScanBarcode,
  ShoppingCart,
  User,
} from "lucide-react";
import { ExpenseInvoiceLookupDialog } from "@/app/admin/expenses/components/ExpenseInvoiceLookupDialog";
import { CalculatorModal } from "@/app/components/CalculatorModal";
import { UserFormDialog } from "@/app/components/UserFormDialog";
import { useToast } from "@/app/components/Toast";
import { isDesktopRuntime } from "@/lib/runtime/capabilities";
import { AdminThemeSelector } from "./AdminThemeSelector";
import { DesktopPrintManagerDialog } from "./DesktopPrintManagerDialog";
import { NotificationBell } from "../notifications/NotificationBell";

/**
 * UserMenu - Design System
 *
 * Menu de usuário com dropdown.
 * Inspirado em HubSpot/Salesforce.
 */

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
}

export function UserMenu() {
  const { data: session, update: updateSession } = useSession();
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [printManagerOpen, setPrintManagerOpen] = React.useState(false);
  const [desktopRuntime, setDesktopRuntime] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const user = session?.user as SessionUser | undefined;

  // Fechar ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Fechar ao pressionar Escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  React.useEffect(() => {
    setDesktopRuntime(isDesktopRuntime());
  }, []);

  const handleSignOut = React.useCallback(async () => {
    setOpen(false);

    await signOut({ redirect: false });
    window.location.assign("/auth/login");
  }, []);

  if (!user) return null;

  const roleLabel = user.role === "admin" ? "Administrador" : "PDV";
  const canManageDesktopPrinting = user.role === "admin" && desktopRuntime;

  // Mapeia os dados da sessão para o formato esperado pelo UserFormDialog
  const sessionUserForForm = {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    imageUrl: user.image || "",
    phone: "",
    role: (user.role === "admin" ? "admin" : "pdv") as "admin" | "pdv",
    status: "active" as const,
    createdAt: "",
    updatedAt: "",
  };

  const handleProfileSubmit = async (
    e: React.FormEvent,
    formData: {
      name: string;
      email: string;
      phone: string;
      role: "admin" | "pdv";
      status: "active" | "inactive";
      password: string;
      imageUrl: string;
    }
  ) => {
    try {
      const body: Record<string, unknown> = {
        id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        imageUrl: formData.imageUrl,
      };
      if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = await response.json();
        showToast(result.error || "Erro ao atualizar perfil.", "error");
        return;
      }

      const result = await response.json();
      showToast("Perfil atualizado com sucesso!", "success");
      await updateSession({
        user: {
          ...session?.user,
          name: result.name ?? formData.name,
          email: result.email ?? formData.email,
          image: result.imageUrl ?? formData.imageUrl ?? null,
          role: result.role ?? formData.role,
        },
      });
      setProfileOpen(false);
    } catch {
      showToast("Erro ao atualizar perfil.", "error");
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/20",
            open && "bg-[color:var(--muted)]"
          )}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {/* Avatar */}
          <UserAvatar name={user.name || "Usuário"} image={user.image || undefined} />

          {/* Info */}
          <div className="hidden md:block text-left">
            <p className="max-w-[120px] truncate text-sm font-medium text-[color:var(--foreground)]">
              {user.name || "Usuário"}
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">{roleLabel}</p>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className={cn(
              "absolute right-0 z-50 mt-2 w-56 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
            role="menu"
          >
            {/* Header do dropdown */}
            <div className="border-b border-[color:var(--border)] px-4 py-3">
              <p className="text-sm font-medium text-[color:var(--foreground)]">{user.name}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
              >
                <User className="h-4 w-4 text-slate-400" />
                Meu Perfil
              </button>

              {canManageDesktopPrinting && (
                <button
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setPrintManagerOpen(true);
                  }}
                >
                  <Printer className="h-4 w-4 text-slate-400" />
                  Gerenciar Impressão
                </button>
              )}

              <Link
                href="/pdv"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <ShoppingCart className="h-4 w-4 text-slate-400" />
                Abrir PDV
              </Link>
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--border)] py-1">
              <button
                onClick={() => void handleSignOut()}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Sair do sistema
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de edição do perfil */}
      <UserFormDialog
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSubmit={handleProfileSubmit}
        user={profileOpen ? sessionUserForForm : null}
      />

      <DesktopPrintManagerDialog
        open={printManagerOpen}
        onOpenChange={setPrintManagerOpen}
      />
    </>
  );
}

// O sino de notificações mora em ../notifications; reexportado aqui para quem já o importa daqui
export { NotificationBell } from "../notifications/NotificationBell";

/**
 * UserAvatar - Componente de avatar simples
 */
interface UserAvatarProps {
  name?: string;
  image?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ name, image, size = "md", className }: UserAvatarProps) {
  const sizeStyles = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  if (image) {
    return (
      <img
        key={image}
        src={image}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover", sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-white font-semibold",
        sizeStyles[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

/**
 * HeaderActions - Ações do header
 */
interface HeaderActionsProps {
  children?: React.ReactNode;
  className?: string;
}

export function HeaderActions({ children, className }: HeaderActionsProps) {
  const { data: session } = useSession();
  const [calculatorOpen, setCalculatorOpen] = React.useState(false);
  const [nfLookupOpen, setNfLookupOpen] = React.useState(false);
  const userRole = (session?.user as SessionUser | undefined)?.role;

  return (
    <>
      <div className={cn("flex items-center gap-3", className)}>
        {children}
        {userRole === "admin" && <AdminThemeSelector />}
        <button
          type="button"
          onClick={() => setCalculatorOpen(true)}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/20",
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          )}
          title="Calculadora"
          aria-label="Abrir calculadora"
        >
          <Calculator className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setNfLookupOpen(true)}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/20",
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          )}
          title="Verificar nota fiscal"
          aria-label="Verificar se a nota fiscal já foi lançada em alguma despesa"
        >
          <ScanBarcode className="h-5 w-5" />
        </button>
        <NotificationBell />
        <UserMenu />
      </div>
      <CalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />
      <ExpenseInvoiceLookupDialog open={nfLookupOpen} onClose={() => setNfLookupOpen(false)} />
    </>
  );
}

export default UserMenu;

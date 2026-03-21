"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  Construction,
  Info,
  LogOut,
  ShoppingCart,
  User,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { UserFormDialog } from "@/app/components/UserFormDialog";
import { useToast } from "@/app/components/Toast";

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

  if (!user) return null;

  const roleLabel = user.role === "admin" ? "Administrador" : "PDV";

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
            "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20",
            open && "bg-slate-100"
          )}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {/* Avatar */}
          <UserAvatar name={user.name || "Usuário"} image={user.image || undefined} />

          {/* Info */}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
              {user.name || "Usuário"}
            </p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
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
              "absolute right-0 z-50 mt-2 w-56 rounded-lg bg-white border border-slate-200 shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
            role="menu"
          >
            {/* Header do dropdown */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
              >
                <User className="h-4 w-4 text-slate-400" />
                Meu Perfil
              </button>

              <Link
                href="/pdv"
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <ShoppingCart className="h-4 w-4 text-slate-400" />
                Abrir PDV
              </Link>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={() => signOut()}
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
    </>
  );
}

// Placeholder de notificações (substituir por dados reais futuramente)
const PLACEHOLDER_NOTIFICATIONS = [
  {
    id: "1",
    title: "Novo pedido recebido",
    description: "Pedido #1042 aguarda confirmação.",
    time: "há 5 min",
  },
  {
    id: "2",
    title: "Estoque baixo",
    description: "Produto \"Marmita G\" com apenas 3 unidades.",
    time: "há 1 hora",
  },
  {
    id: "3",
    title: "Pré-venda confirmada",
    description: "Cliente João Silva confirmou pré-venda.",
    time: "há 2 horas",
  },
];

/**
 * Cobre conteúdo placeholder com desfoque e mensagem de recurso em desenvolvimento.
 */
function NotificationsDevelopmentOverlay({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Desfoque no próprio conteúdo (evita o “véu branco” do backdrop-blur) */}
      <div
        className="pointer-events-none select-none absolute inset-0 overflow-hidden blur-[3px]"
        aria-hidden
      >
        {children}
      </div>
      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent p-4"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-[15rem] rounded-xl border border-slate-200/90 bg-white/95 px-4 py-3 text-center shadow-lg">
          <Construction className="mx-auto h-7 w-7 shrink-0 text-primary" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-slate-800">Em fase de desenvolvimento</p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            As notificações reais do sistema serão exibidas aqui em uma versão futura.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationBell - Sino de notificações com painel dropdown + modal de histórico
 */
export function NotificationBell() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fechar painel ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  // Fechar painel com Escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPanelOpen(false);
    }
    if (panelOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [panelOpen]);

  const handleShowMore = () => {
    setPanelOpen(false);
    setHistoryOpen(true);
  };

  return (
    <>
      <div className="relative" ref={containerRef}>
        {/* Botão sino */}
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "text-slate-500 hover:text-slate-700",
            panelOpen && "bg-slate-100 text-slate-700"
          )}
          aria-label="Notificações"
          aria-expanded={panelOpen}
        >
          <Bell className="h-5 w-5" />
          {/* Badge */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Painel dropdown deslizante */}
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute right-0 z-50 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden"
            )}
          >
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-slate-800">Notificações</span>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                Em breve
              </span>
            </div>

            {/* Lista de notificações (placeholder visual + overlay) */}
            <NotificationsDevelopmentOverlay className="min-h-[200px]">
              <div className="divide-y divide-slate-100">
                {PLACEHOLDER_NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: "var(--modal-header-icon-bg)",
                        outline: "1px solid var(--modal-header-icon-ring)",
                      }}
                    >
                      <Info className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-slate-400 mt-0.5">{n.time}</span>
                  </div>
                ))}
              </div>
            </NotificationsDevelopmentOverlay>

            {/* Botão "Mostrar mais" */}
            <div className="border-t border-slate-100">
              <button
                onClick={handleShowMore}
                className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors text-center"
              >
                Mostrar histórico completo
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal de histórico completo */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg border-t-[3px] border-t-primary">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Bell className="h-5 w-5 text-primary" />
              </div>
              Histórico de Notificações
            </DialogTitle>
            <DialogDescription>
              Todos os alertas e avisos do sistema
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <NotificationsDevelopmentOverlay className="mx-6 h-96 overflow-hidden rounded-lg">
            <div className="divide-y divide-slate-100 px-4 py-1">
              {PLACEHOLDER_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--modal-header-icon-bg)",
                      outline: "1px solid var(--modal-header-icon-ring)",
                    }}
                  >
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <span className="text-xs text-slate-400 flex-shrink-0">{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{n.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </NotificationsDevelopmentOverlay>

          <DialogFooter>
            <p className="text-xs text-slate-400">Histórico completo disponível em versão futura</p>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {children}
      <NotificationBell />
      <UserMenu />
    </div>
  );
}

export default UserMenu;

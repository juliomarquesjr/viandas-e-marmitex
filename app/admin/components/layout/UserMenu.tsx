"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  LogOut,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

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
  const { data: session } = useSession();
  const [open, setOpen] = React.useState(false);
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
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
          {initials}
        </div>

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
            <Link
              href="/pdv"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <ShoppingCart className="h-4 w-4 text-slate-400" />
              Abrir PDV
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Configurações
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
      <UserMenu />
    </div>
  );
}

export default UserMenu;

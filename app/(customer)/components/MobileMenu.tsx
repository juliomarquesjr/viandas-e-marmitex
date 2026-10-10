"use client";

import { ChevronRight, LogOut, MapPin, Lock, Moon, Palette, Sun, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { CustomerAvatar } from "./Avatar";
import { useCustomerTheme } from "./CustomerTheme";

/** As seções do perfil (as mesmas da tela Perfil, em /profile?aba=...). */
const PROFILE_LINKS = [
  { aba: "dados", label: "Meus dados", hint: "Nome, telefone, e-mail e foto", icon: User },
  { aba: "endereco", label: "Endereço de entrega", hint: "Onde entregamos seu pedido", icon: MapPin },
  { aba: "seguranca", label: "Segurança", hint: "Trocar a senha", icon: Lock },
  { aba: "aparencia", label: "Aparência", hint: "Tema claro, escuro ou automático", icon: Palette },
] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Menu do cabeçalho no celular (o sanduíche): o perfil, todas as seções do perfil, o tema e o Sair.
 * Abre como uma gaveta pela direita, prende o foco enquanto está aberta e fecha com Esc, tocando fora
 * ou ao escolher uma opção. O botão que abre fica no cabeçalho (CustomerShell).
 */
export function MobileMenu({
  open,
  onClose,
  name,
  detail,
  imageUrl,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  name?: string | null;
  detail?: string | null;
  imageUrl?: string | null;
  onLogout: () => void;
}) {
  const pathname = usePathname() ?? "";
  const aba = useSearchParams().get("aba");
  const { mode, toggle } = useCustomerTheme();
  const drawer = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // foco: entra na gaveta ao abrir e volta para o botão que a abriu ao fechar
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => opener?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(drawer.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onProfile = pathname === "/profile";
  const dark = mode === "dark";

  return (
    <div className="c-drawer-ov" onClick={onClose}>
      <div
        ref={drawer}
        className="c-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="c-drawer-h">
          <Link href="/profile?aba=dados" className="c-drawer-me" onClick={onClose}>
            <CustomerAvatar name={name} imageUrl={imageUrl} size={56} />
            <span className="c-drawer-who">
              <strong>{name || "Minha conta"}</strong>
              {detail && <small>{detail}</small>}
            </span>
          </Link>
          <button ref={closeBtn} type="button" className="c-x" onClick={onClose} aria-label="Fechar menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="c-drawer-nav" aria-label="Perfil">
          <p className="c-drawer-sec">Perfil</p>
          {PROFILE_LINKS.map(({ aba: id, label, hint, icon: Icon }) => {
            const active = onProfile && (aba ?? "dados") === id;
            return (
              <Link
                key={id}
                href={`/profile?aba=${id}`}
                className="c-drawer-item"
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <span className="c-drawer-ic">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="c-drawer-t">
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" className="c-drawer-go" />
              </Link>
            );
          })}
        </nav>

        <div className="c-drawer-nav">
          <p className="c-drawer-sec">Atalhos</p>
          <button type="button" className="c-drawer-item" onClick={toggle}>
            <span className="c-drawer-ic">{dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}</span>
            <span className="c-drawer-t">
              <strong>{dark ? "Tema claro" : "Tema escuro"}</strong>
              <small>Trocar agora</small>
            </span>
          </button>
          <button
            type="button"
            className="c-drawer-item is-out"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <span className="c-drawer-ic">
              <LogOut size={22} aria-hidden="true" />
            </span>
            <span className="c-drawer-t">
              <strong>Sair da conta</strong>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

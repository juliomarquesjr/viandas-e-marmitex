"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Barcode,
  Calculator,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer } from "../../types";
import type { Cycle } from "../../lib/cycle";

interface CycleHeaderProps {
  customer: Customer;
  cycle: Cycle;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  onEdit: () => void;
  onOpenPresets: () => void;
  onOpenBudget: () => void;
  onOpenReport: () => void;
  onDownloadBarcode: () => void;
}

function addressLineOf(customer: Customer): string | null {
  const address = customer.address;
  if (!address?.street) return null;
  const street = [address.street, address.number].filter(Boolean).join(", ");
  const area = [address.neighborhood, address.city].filter(Boolean).join(" · ");
  return [street, area].filter(Boolean).join(" — ");
}

/** Só os dígitos, com DDI, para o link do WhatsApp e do discador. */
export function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function CycleHeader({
  customer,
  cycle,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onBack,
  onEdit,
  onOpenPresets,
  onOpenBudget,
  onOpenReport,
  onDownloadBarcode,
}: CycleHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const address = addressLineOf(customer);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const menuItems = [
    { label: "Presets de produtos", icon: Package, action: onOpenPresets },
    { label: "Gerar orçamento", icon: Calculator, action: onOpenBudget },
    { label: "Relatório por período", icon: FileText, action: onOpenReport },
    ...(customer.barcode
      ? [{ label: "Baixar código de barras", icon: Barcode, action: onDownloadBarcode }]
      : []),
  ];

  return (
    <header className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)] border border-border/60">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Voltar para a lista de clientes"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl shadow-[0_4px_10px_-3px_rgba(37,99,235,0.5)]">
          {customer.imageUrl ? (
            <Image
              src={customer.imageUrl}
              alt={customer.name}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-primary text-white">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {customer.name}
            </h1>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                customer.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  customer.active ? "bg-emerald-500" : "bg-slate-400"
                )}
              />
              {customer.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <Link
              href={`tel:+${phoneDigits(customer.phone)}`}
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <Phone className="h-3 w-3" />
              {customer.phone}
            </Link>
            {address && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate transition-colors hover:text-primary"
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{address}</span>
                </a>
              </>
            )}
          </p>
        </div>

        {/* Navegação de competência */}
        <div className="flex items-center gap-0.5 rounded-[10px] bg-muted p-[3px]">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-label="Competência anterior"
            className="flex h-6 w-7 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:bg-transparent disabled:opacity-35 disabled:shadow-none"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[104px] px-2 text-center text-xs font-semibold tracking-tight text-foreground">
            {cycle.label}
          </span>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Próxima competência"
            className="flex h-6 w-7 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:bg-transparent disabled:opacity-35 disabled:shadow-none"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Mais ações"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.4)]">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMenuOpen(false);
                    item.action();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

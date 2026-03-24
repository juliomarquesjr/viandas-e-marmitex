"use client";

import {
  Calculator,
  CalendarDays,
  ChefHat,
  Clock,
  LayoutDashboard,
  LogOut,
  Pencil,
  RefreshCcw,
  User,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";

interface PDVHeaderProps {
  session: Session | null;
  customSaleDate: string;
  formatDisplayDate: (date: string) => string;
  cartLength: number;
  onNewSale: () => void;
  onCalculatorOpen: () => void;
  onDateModalOpen: () => void;
}

export function PDVHeader({
  session,
  customSaleDate,
  formatDisplayDate,
  cartLength,
  onNewSale,
  onCalculatorOpen,
  onDateModalOpen,
}: PDVHeaderProps) {
  const isAdmin = session?.user?.role === "admin";

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const displayDate = now
    ? now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : "--";
  const displayTime = now
    ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  function handleOpenCustomerSelector() {
    window.dispatchEvent(new CustomEvent("openCustomerSelector"));
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">

      {/* Zona 1 — Brand */}
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm flex-shrink-0">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-bold text-slate-900 leading-none">Comida Caseira</div>
          <div className="text-[11px] text-muted-foreground leading-none mt-0.5">Ponto de Venda</div>
        </div>
        {isAdmin && (
          <Badge variant="warning" size="sm" className="hidden sm:inline-flex">
            Modo Admin
          </Badge>
        )}
      </div>

      {/* Zona 2 — Widget de data/hora */}
      <div className="flex-1 flex justify-center px-4">
        <div className="hidden md:flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-x divide-slate-100">

          {/* Seção de data */}
          {isAdmin ? (
            <button
              onClick={onDateModalOpen}
              title="Alterar data da venda"
              className={`group flex items-center gap-2.5 px-4 py-1.5 transition-colors duration-150 ${
                customSaleDate
                  ? "bg-amber-50 hover:bg-amber-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <CalendarDays className={`h-4 w-4 flex-shrink-0 ${customSaleDate ? "text-amber-500" : "text-slate-400"}`} />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className={`text-[9px] uppercase tracking-widest font-bold ${customSaleDate ? "text-amber-400" : "text-slate-400"}`}>
                  {customSaleDate ? "Data da venda" : "Hoje"}
                </span>
                <span className={`text-xs font-semibold ${customSaleDate ? "text-amber-700" : "text-slate-700"}`}>
                  {customSaleDate ? formatDisplayDate(customSaleDate) : displayDate}
                </span>
              </div>
              <Pencil className={`h-4 w-4 flex-shrink-0 ${customSaleDate ? "text-amber-400" : "text-slate-400"}`} />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-1.5">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Hoje</span>
                <span className="text-xs font-semibold text-slate-700">{displayDate}</span>
              </div>
            </div>
          )}

          {/* Seção de hora */}
          <div className="flex items-center gap-2.5 px-4 py-1.5 bg-slate-50/60">
            <Clock className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Hora</span>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">{displayTime}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Zona 3 — Ações */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCalculatorOpen}
          title="Calculadora"
          aria-label="Abrir calculadora"
        >
          <Calculator className="h-4 w-4" />
        </Button>

        {isAdmin && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => (window.location.href = "/admin")}
            title="Painel Admin"
            aria-label="Voltar ao painel admin"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        )}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCustomerSelector}
          className="hidden sm:inline-flex gap-1.5"
          aria-label="Selecionar cliente (F3)"
        >
          <User className="h-4 w-4" />
          <span className="hidden md:inline">Cliente</span>
          <Kbd>F3</Kbd>
        </Button>

        <Button
          size="sm"
          onClick={onNewSale}
          className="gap-1.5"
          aria-label="Nova venda (F9)"
        >
          <RefreshCcw className="h-4 w-4" />
          <span className="hidden md:inline">Nova venda</span>
          <Kbd className="text-white/70 border-white/30 bg-primary/80">F9</Kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          title="Sair"
          aria-label="Sair"
          className="text-slate-500 hover:text-red-500 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

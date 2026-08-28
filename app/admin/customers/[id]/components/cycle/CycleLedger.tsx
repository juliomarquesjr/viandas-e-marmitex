"use client";

import { useState } from "react";
import { Package, Receipt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../../constants";
import type { Cycle, LedgerEntry } from "../../lib/cycle";
import { OrderDetailsModal } from "../OrderDetailsModal";
import { SectionTitle } from "./SectionTitle";

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

interface CycleLedgerProps {
  cycle: Cycle;
  onDelete: (entry: LedgerEntry) => void;
}

/**
 * Os lançamentos da competência, com saldo corrente.
 *
 * A coluna "Acumulado" é o que faltava na tela antiga: o saldo de cada linha
 * fecha com o saldo do topo, então dá para conferir a conta descendo a lista em
 * vez de confiar num número calculado em outro lugar. Um mês cabe inteiro, sem
 * paginação.
 */
export function CycleLedger({ cycle, onDelete }: CycleLedgerProps) {
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)]">
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3 pt-4">
        <SectionTitle icon={Receipt}>
          Lançamentos de {cycle.label.split(" de ")[0]}
        </SectionTitle>
        <p className="ml-auto text-[12px] text-muted-foreground">
          {cycle.entries.length}{" "}
          {cycle.entries.length === 1 ? "lançamento" : "lançamentos"}
        </p>
      </div>

      {cycle.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <Package className="h-10 w-10 text-border" />
          <p className="text-[14px] font-semibold text-foreground">
            Nenhum lançamento em {cycle.label}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Vendas na ficha e pagamentos deste mês aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <Th className="w-[86px]">Dia</Th>
                <Th>Lançamento</Th>
                <Th align="right" className="w-[96px]">Valor</Th>
                <Th align="right" className="w-[104px]">Acumulado</Th>
                <Th className="w-[36px]"><span className="sr-only">Ações</span></Th>
              </tr>
            </thead>
            <tbody>
              {cycle.entries.map((entry) => {
                const isPayment = entry.kind === "pagamento";
                const isCash = entry.kind === "consumo_avista";
                const weekday =
                  WEEKDAY_SHORT[new Date(cycle.year, cycle.month, entry.day).getDay()];

                return (
                  <tr
                    key={entry.id}
                    onClick={() => !isPayment && setSelected(entry)}
                    className={cn(
                      "group border-t border-border/50 transition-colors",
                      !isPayment && "cursor-pointer hover:bg-muted/60"
                    )}
                  >
                    <td className="py-2.5 pr-2 text-[13px] tabular-nums text-muted-foreground whitespace-nowrap">
                      {String(entry.day).padStart(2, "0")}{" "}
                      <span className="text-muted-foreground/70">{weekday}</span>
                    </td>

                    <td className="py-2.5 pr-2 text-[13px] text-foreground">
                      {isPayment ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                          style={{
                            background: "var(--cycle-paga-bg)",
                            color: "var(--cycle-paga-fg)",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: "var(--cycle-paga)" }}
                          />
                          Pagamento recebido
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-baseline gap-x-1.5">
                          <span>{entry.label}</span>
                          {entry.detail && (
                            <span className="text-muted-foreground/70">+ {entry.detail}</span>
                          )}
                          {isCash && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                              style={{
                                background: "var(--cycle-vazio-bg)",
                                color: "var(--cycle-vazio-fg)",
                              }}
                              title="Venda já quitada no balcão — não entra na cobrança do mês"
                            >
                              pago no ato
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    <td
                      className="py-2.5 pr-2 text-right text-[13px] font-medium tabular-nums"
                      style={
                        isPayment
                          ? { color: "var(--cycle-paga-fg)" }
                          : isCash
                            ? { color: "var(--muted-foreground)" }
                            : undefined
                      }
                    >
                      {isPayment ? "− " : ""}
                      {formatCurrency(entry.amountCents)}
                    </td>

                    <td className="py-2.5 text-right text-[13px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(entry.balanceAfterCents)}
                    </td>

                    <td className="py-2.5 pl-1 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(entry);
                        }}
                        title={isPayment ? "Excluir pagamento" : "Excluir venda"}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-transparent transition-colors group-hover:text-muted-foreground hover:!bg-red-50 hover:!text-red-600 focus-visible:text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OrderDetailsModal
        open={selected !== null}
        order={selected?.order ?? null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "pb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

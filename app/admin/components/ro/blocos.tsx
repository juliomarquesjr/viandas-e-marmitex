"use client";

import { brl, primeiroNome } from "@/lib/ai/ro/text";
import type { RoBloco, RoCliente, RoColuna } from "@/lib/ai/ro/types";
import { FileText, MessageCircle, Receipt } from "lucide-react";
import Link from "next/link";

const FUSO = "America/Sao_Paulo";

export function formatarCelula(valor: unknown, formato: RoColuna["formato"]): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (formato) {
    case "dinheiro":
      return typeof valor === "number" ? brl(valor) : String(valor);
    case "inteiro":
      return typeof valor === "number" ? valor.toLocaleString("pt-BR") : String(valor);
    case "data":
      return new Date(String(valor)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });
    case "dataHora":
      return new Date(String(valor)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: FUSO });
    default:
      return String(valor);
  }
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

function Saldo({ cents }: { cents: number }) {
  if (cents > 0) return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Deve {brl(cents)}</span>;
  if (cents < 0) return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Crédito {brl(-cents)}</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Ficha em dia</span>;
}

const ACAO = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const ICONE = "flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Linha enxuta para listas longas (mais de 5 clientes): nome, saldo e os atalhos em ícones. */
function LinhaCliente({ c, onPerguntar }: { c: RoCliente; onPerguntar: (texto: string) => void }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2.5">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">
        {iniciais(c.nome)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-tight text-[color:var(--foreground)]">{c.nome}{!c.ativo && <span className="ml-1.5 rounded bg-slate-200 px-1 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">inativo</span>}</p>
        <p className="break-words text-xs text-[color:var(--muted-foreground)]">{c.telefone ?? "Sem telefone"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {typeof c.saldoCents === "number" && <Saldo cents={c.saldoCents} />}
          {c.nota && <span className="text-xs font-semibold text-primary">{c.nota}</span>}
        </div>
      </div>
      <button type="button" className={ICONE} onClick={() => onPerguntar(`ficha do cliente ${c.nome}`)} aria-label={`Ver a ficha de ${primeiroNome(c.nome)}`} title="Ver ficha">
        <Receipt className="h-4 w-4" aria-hidden="true" />
      </button>
      <Link href={`/admin/customers/${c.id}`} className={ICONE} aria-label={`Abrir o cadastro de ${primeiroNome(c.nome)}`} title="Cadastro">
        <FileText className="h-4 w-4" aria-hidden="true" />
      </Link>
      {c.whatsapp && (
        <Link href={`/admin/whatsapp/conversas?cliente=${c.id}`} className={ICONE} aria-label={`Abrir a conversa com ${primeiroNome(c.nome)}`} title="Conversa">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}

function CartaoCliente({ c, onPerguntar }: { c: RoCliente; onPerguntar: (texto: string) => void }) {
  return (
    <li className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden="true">
          {iniciais(c.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-[color:var(--foreground)]">
            <span className="break-words">{c.nome}</span>
            {!c.ativo && <span className="rounded bg-slate-200 px-1.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">inativo</span>}
          </p>
          <p className="break-words text-xs text-[color:var(--muted-foreground)]">{[c.telefone, c.email].filter(Boolean).join(" · ") || "Sem telefone cadastrado"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {typeof c.saldoCents === "number" && <Saldo cents={c.saldoCents} />}
            {c.nota && <span className="text-xs font-semibold text-primary">{c.nota}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={ACAO} onClick={() => onPerguntar(`ficha do cliente ${c.nome}`)} aria-label={`Ver a ficha de ${primeiroNome(c.nome)}`}>
          <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
          Ver ficha
        </button>
        <Link href={`/admin/customers/${c.id}`} className={ACAO}>
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Cadastro
        </Link>
        {c.whatsapp && (
          <Link href={`/admin/whatsapp/conversas?cliente=${c.id}`} className={ACAO}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Conversa
          </Link>
        )}
      </div>
    </li>
  );
}

const TOM: Record<string, string> = {
  ok: "text-emerald-700 dark:text-emerald-300",
  atencao: "text-amber-700 dark:text-amber-300",
  neutro: "text-[color:var(--foreground)]",
};

export function Blocos({ blocos, onPerguntar }: { blocos: RoBloco[]; onPerguntar: (texto: string) => void }) {
  return (
    <div className="mt-3 space-y-3">
      {blocos.map((b, i) => {
        if (b.tipo === "clientes") {
          return (
            <section key={i} aria-label={b.titulo ?? "Clientes"} className="space-y-2">
              {b.titulo && <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">{b.titulo}</h3>}
              <ul className="space-y-2">
                {b.itens.map((c) => (b.itens.length > 5 ? <LinhaCliente key={c.id} c={c} onPerguntar={onPerguntar} /> : <CartaoCliente key={c.id} c={c} onPerguntar={onPerguntar} />))}
              </ul>
              {b.dica && <p className="text-xs text-[color:var(--muted-foreground)]">{b.dica}</p>}
            </section>
          );
        }
        if (b.tipo === "metricas") {
          return (
            <section key={i} aria-label={b.titulo ?? "Números"} className="space-y-2">
              {b.titulo && <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">{b.titulo}</h3>}
              <dl className="grid grid-cols-2 gap-2">
                {b.itens.map((m) => (
                  <div key={m.rotulo} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
                    <dt className="text-xs text-[color:var(--muted-foreground)]">{m.rotulo}</dt>
                    <dd className={`mt-0.5 text-base font-bold tabular-nums ${TOM[m.tom ?? "neutro"]}`}>{m.valor}</dd>
                    {m.dica && <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--muted-foreground)]">{m.dica}</p>}
                  </div>
                ))}
              </dl>
            </section>
          );
        }
        if (b.tipo === "tabela") {
          return (
            <section key={i} aria-label={b.titulo ?? "Tabela"} className="space-y-2">
              {b.titulo && <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">{b.titulo}</h3>}
              <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
                    <tr>
                      {b.colunas.map((c) => (
                        <th key={c.key} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${c.align === "right" ? "text-right" : ""}`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.linhas.map((l, j) => (
                      <tr key={j} className="border-t border-[color:var(--border)]">
                        {b.colunas.map((c) => (
                          <td key={c.key} className={`px-3 py-2 align-top tabular-nums ${c.align === "right" ? "whitespace-nowrap text-right font-medium" : "min-w-[6rem]"}`}>
                            {formatarCelula(l[c.key], c.formato)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }
        return (
          <section key={i} aria-label={b.titulo ?? "Opções"} className="flex flex-wrap gap-2">
            {b.itens.map((o) => (
              <button key={o.rotulo} type="button" onClick={() => onPerguntar(o.pergunta)} className="min-h-9 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-1.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {o.rotulo}
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

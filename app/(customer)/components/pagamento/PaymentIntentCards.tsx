"use client";

import { Check, Clock, Info, X } from "lucide-react";
import * as React from "react";
import type { CustomerPaymentIntentDTO } from "@/lib/notification-types";
import { formatBRL } from "../../lib/format";
import { backfillOnce, syncDismissed } from "../../lib/dismissals";
import { readDismissedIntents, whenLabel, writeDismissedIntents } from "../../lib/payment-intents";
import { cx } from "../kit";
import "./pagamento.css";

/** Quantas já revisadas aparecem de uma vez: o resto fica só no estabelecimento. */
const MAX_REVIEWED = 3;

/**
 * Andamento dos pagamentos que o cliente informou ("Já paguei"): aguardando,
 * confirmado ou não encontrado. As revisadas podem ser dispensadas, e a escolha
 * fica guardada no servidor (vale em todos os aparelhos). Sem nada a mostrar, não ocupa lugar na tela.
 */
export function PaymentIntentCards({ intents, rise }: { intents: CustomerPaymentIntentDTO[]; rise?: React.CSSProperties }) {
  const [dismissed, setDismissed] = React.useState<string[] | null>(null);
  const list = React.useRef<HTMLDivElement>(null);

  // localStorage só existe no navegador: lê depois de montar
  React.useEffect(() => {
    const local = readDismissedIntents();
    setDismissed(local);
    // o que foi dispensado só neste aparelho, antes de existir o guardado no servidor, sobe uma vez
    backfillOnce("intents", local.map((id) => `intent:${id}`));
  }, []);

  if (dismissed === null) return null;

  const pending = intents.filter((i) => i.status === "pending");
  const reviewed = intents.filter((i) => i.status !== "pending" && !dismissed.includes(i.id)).slice(0, MAX_REVIEWED);
  const visible = [...pending, ...reviewed];
  if (visible.length === 0) return null;

  const remember = (ids: string[]) => {
    const next = [...dismissed.filter((d) => !ids.includes(d)), ...ids];
    setDismissed(next);
    writeDismissedIntents(next);
    syncDismissed(ids.map((id) => `intent:${id}`));
  };

  const dismiss = (id: string) => {
    const rows = Array.from(list.current?.querySelectorAll<HTMLElement>(".c-pay-row") ?? []);
    const at = rows.findIndex((row) => row.dataset.id === id);
    const neighbour = rows[at + 1] ?? rows[at - 1];
    remember([id]);
    // o botão some junto com a linha: o foco vai para a vizinha em vez de se perder
    neighbour?.focus();
  };

  return (
    <section className="c-block c-home-pay c-rise" style={rise} aria-label="Pagamentos que você informou">
      <div ref={list} className="c-card c-pay-box">
        {visible.map((intent) => (
          <PaymentIntentRow key={intent.id} intent={intent} onDismiss={() => dismiss(intent.id)} />
        ))}
        {reviewed.length > 1 && (
          <button type="button" className="c-pay-all" onClick={() => remember(reviewed.map((i) => i.id))}>
            Dispensar todos
          </button>
        )}
      </div>
    </section>
  );
}

function PaymentIntentRow({ intent, onDismiss }: { intent: CustomerPaymentIntentDTO; onDismiss: () => void }) {
  const informed = formatBRL(intent.amountCents);
  const { status } = intent;

  let icon: React.ReactNode;
  let title: string;
  let meta: string;

  if (status === "pending") {
    icon = <Clock size={18} />;
    title = `Pagamento de ${informed} aguardando confirmação`;
    meta = `Informado ${whenLabel(intent.createdAt)}. O estabelecimento está conferindo no banco.`;
  } else if (status === "confirmed") {
    icon = <Check size={18} strokeWidth={2.6} />;
    const confirmed = intent.confirmedAmountCents ?? intent.amountCents;
    if (confirmed !== intent.amountCents) {
      title = `Confirmamos ${formatBRL(confirmed)}`;
      meta = `Você informou ${informed}. Já foi descontado da sua ficha.`;
    } else {
      title = `Pagamento de ${informed} confirmado`;
      meta = "Já foi descontado da sua ficha.";
    }
  } else {
    icon = <Info size={18} />;
    title = `Não encontramos o pagamento de ${informed}`;
    const reason = intent.rejectionReason?.trim();
    meta = `${reason ? `Motivo: ${reason}. ` : ""}Se você já pagou, fale com o estabelecimento.`;
  }

  return (
    <div className={cx("c-pay-row", `is-${status}`)} role="status" tabIndex={-1} data-id={intent.id}>
      <span className="c-pay-ic" aria-hidden="true">
        {icon}
      </span>
      <div className="c-pay-main">
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      {status !== "pending" && (
        <button type="button" className="c-pay-x" onClick={onDismiss} aria-label={`Dispensar aviso: ${title}`} title="Dispensar">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

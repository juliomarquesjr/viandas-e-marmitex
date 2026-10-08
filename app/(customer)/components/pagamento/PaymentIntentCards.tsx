"use client";

import { Check, Clock, Info } from "lucide-react";
import * as React from "react";
import type { CustomerPaymentIntentDTO } from "@/lib/notification-types";
import { formatBRL } from "../../lib/format";
import { readDismissedIntents, whenLabel, writeDismissedIntents } from "../../lib/payment-intents";
import { cx } from "../kit";
import "./pagamento.css";

/** Quantas já revisadas aparecem de uma vez: o resto fica só no estabelecimento. */
const MAX_REVIEWED = 3;

/**
 * Andamento dos pagamentos que o cliente informou ("Já paguei"): aguardando,
 * confirmado ou não encontrado. As revisadas podem ser dispensadas, e a escolha
 * fica só neste aparelho. Sem nada a mostrar, não ocupa lugar na tela.
 */
export function PaymentIntentCards({ intents, rise }: { intents: CustomerPaymentIntentDTO[]; rise?: React.CSSProperties }) {
  const [dismissed, setDismissed] = React.useState<string[] | null>(null);
  const list = React.useRef<HTMLDivElement>(null);

  // localStorage só existe no navegador: lê depois de montar
  React.useEffect(() => setDismissed(readDismissedIntents()), []);

  if (dismissed === null) return null;

  const pending = intents.filter((i) => i.status === "pending");
  const reviewed = intents.filter((i) => i.status !== "pending" && !dismissed.includes(i.id)).slice(0, MAX_REVIEWED);
  const visible = [...pending, ...reviewed];
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const cards = Array.from(list.current?.querySelectorAll<HTMLElement>(".c-pay-card") ?? []);
    const at = cards.findIndex((card) => card.dataset.id === id);
    const neighbour = cards[at + 1] ?? cards[at - 1];
    const next = [...dismissed.filter((d) => d !== id), id];
    setDismissed(next);
    writeDismissedIntents(next);
    // o botão some junto com o cartão: o foco vai para o vizinho em vez de se perder
    neighbour?.focus();
  };

  return (
    <section className="c-block c-home-pay c-rise" style={rise} aria-label="Pagamentos que você informou">
      <div ref={list} className="c-pay-list">
        {visible.map((intent) => (
          <PaymentIntentCard key={intent.id} intent={intent} onDismiss={() => dismiss(intent.id)} />
        ))}
      </div>
    </section>
  );
}

function PaymentIntentCard({ intent, onDismiss }: { intent: CustomerPaymentIntentDTO; onDismiss: () => void }) {
  const informed = formatBRL(intent.amountCents);
  const { status } = intent;

  let icon: React.ReactNode;
  let title: string;
  let lines: string[];

  if (status === "pending") {
    icon = <Clock size={22} />;
    title = `Pagamento de ${informed} aguardando confirmação`;
    lines = [`Informado ${whenLabel(intent.createdAt)}. O estabelecimento está conferindo no banco.`];
  } else if (status === "confirmed") {
    icon = <Check size={22} strokeWidth={2.6} />;
    const confirmed = intent.confirmedAmountCents ?? intent.amountCents;
    if (confirmed !== intent.amountCents) {
      title = `Confirmamos ${formatBRL(confirmed)}`;
      lines = [`Você informou ${informed}.`, "Já foi descontado da sua ficha."];
    } else {
      title = `Pagamento de ${informed} confirmado`;
      lines = ["Já foi descontado da sua ficha."];
    }
  } else {
    icon = <Info size={22} />;
    title = `Não encontramos o pagamento de ${informed}`;
    const reason = intent.rejectionReason?.trim();
    lines = [...(reason ? [`Motivo: ${reason}`] : []), "Se você já pagou, fale com o estabelecimento."];
  }

  return (
    <div className={cx("c-pay-card", `is-${status}`)} role="status" tabIndex={-1} data-id={intent.id}>
      <span className="c-pay-ic" aria-hidden="true">
        {icon}
      </span>
      <div className="c-pay-main">
        <strong>{title}</strong>
        {lines.map((line) => (
          <small key={line}>{line}</small>
        ))}
        {status !== "pending" && (
          <button type="button" className="c-pay-dismiss" onClick={onDismiss} aria-label={`Dispensar aviso: ${title}`}>
            Dispensar
          </button>
        )}
      </div>
    </div>
  );
}

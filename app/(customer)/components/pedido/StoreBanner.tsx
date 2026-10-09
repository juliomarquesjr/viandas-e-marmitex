"use client";

import { CircleCheck, Clock, PauseCircle, Timer } from "lucide-react";
import * as React from "react";
import type { StoreKind, StoreView } from "../../lib/store-status";
import { cx } from "../kit";
import "./pedido.css";

const ICON: Record<StoreKind, React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>> = {
  open: CircleCheck,
  closing: Timer,
  closed: Clock,
  paused: PauseCircle,
  off: Clock,
};

/**
 * Faixa de estado da loja, no topo do cardápio (nunca um modal). O texto muda a cada minuto, mas
 * o leitor de tela só é avisado ao cruzar 30, 10 e 5 minutos para fechar, por uma região à parte.
 */
export function StoreBanner({ view, minutes }: { view: StoreView; minutes: number | null }) {
  const Icon = ICON[view.kind];

  // Avisa uma vez por faixa (30, 10, 5): "Fecha em 10 minutos"
  const bucket = view.kind === "closing" && minutes !== null ? (minutes <= 5 ? 5 : minutes <= 10 ? 10 : 30) : null;
  const [announce, setAnnounce] = React.useState("");
  const lastBucket = React.useRef<number | null>(null);
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!seeded.current) {
      // Na primeira leitura a faixa já está na tela: só avisa quando cruza uma faixa depois
      seeded.current = true;
      lastBucket.current = bucket;
      return;
    }
    if (bucket === lastBucket.current) return;
    lastBucket.current = bucket;
    if (bucket !== null && minutes !== null) setAnnounce(`A loja fecha em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`);
  }, [bucket, minutes]);

  return (
    <div
      className={cx(
        "c-ped-banner",
        view.kind === "open" && "is-open",
        view.kind === "closing" && (view.urgent ? "is-warn" : "is-soon"),
        (view.kind === "closed" || view.kind === "paused") && "is-shut"
      )}
    >
      <span className="c-ped-banner-ic" aria-hidden="true">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p>
        <strong className="c-num">{view.title}</strong>
        {view.detail && <span>{view.detail}</span>}
      </p>
      <span className="c-sr" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

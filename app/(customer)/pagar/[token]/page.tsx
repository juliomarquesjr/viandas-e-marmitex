"use client";

import { Clock, LinkIcon } from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import type { PayLinkInfo } from "@/app/api/pay/[token]/route";
import { PixPaymentSheet } from "../../components/PixPaymentSheet";
import { BrandMark, Money, PixIcon, ThemeButton, useBranding } from "../../components/kit";
import { formatBRL } from "../../lib/format";
import { informPaymentByLink, whenLabel } from "../../lib/payment-intents";
import "../pagar.css";

type Load =
  | { state: "loading" }
  | { state: "ready"; info: PayLinkInfo }
  | { state: "gone"; reason: "invalid" | "expired" }
  | { state: "error" };

/**
 * Link de pagamento: abre sem login e leva direto ao PIX da ficha de quem recebeu o link.
 * Usa a mesma folha de PIX da área do cliente; o "Já paguei" gera o mesmo aviso para o estabelecimento.
 */
export default function PayPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token ?? "";
  const branding = useBranding();
  const [load, setLoad] = React.useState<Load>({ state: "loading" });
  const [pixOpen, setPixOpen] = React.useState(false);
  const inform = React.useMemo(() => informPaymentByLink(token), [token]);

  const fetchInfo = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/pay/${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.status === 404 || res.status === 410) {
        const body = await res.json().catch(() => null);
        setLoad({ state: "gone", reason: body?.reason === "expired" ? "expired" : "invalid" });
        return;
      }
      if (!res.ok) throw new Error("falha");
      setLoad({ state: "ready", info: (await res.json()) as PayLinkInfo });
    } catch {
      setLoad((current) => (current.state === "ready" ? current : { state: "error" }));
    }
  }, [token]);

  React.useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  const info = load.state === "ready" ? load.info : null;
  const owes = (info?.balanceCents ?? 0) > 0;

  return (
    <div className="c-paypage">
      <main className="c-paywrap" id="customer-main">
        <header className="c-paytop">
          <div className="c-paybrand">
            <BrandMark logoUrl={branding.logoUrl} />
            <span>{branding.title}</span>
          </div>
          <ThemeButton />
        </header>

        {load.state === "loading" && (
          <div className="c-hero c-hero-skel" aria-busy="true" aria-label="Carregando">
            <span className="c-skel" style={{ height: 12, width: 140 }} />
            <span className="c-skel" style={{ height: 48, width: 210 }} />
            <span className="c-skel" style={{ height: 14, width: "60%" }} />
          </div>
        )}

        {load.state === "gone" && (
          <section className="c-card c-payerr" role="alert">
            <span className="c-oic" aria-hidden="true">
              <LinkIcon size={22} />
            </span>
            <h2>{load.reason === "expired" ? "Este link venceu" : "Link não encontrado"}</h2>
            <p>
              {load.reason === "expired"
                ? "Por segurança, o link de pagamento vale por um tempo. Peça um novo ao estabelecimento."
                : "Confira se você abriu o link inteiro. Se continuar assim, peça um novo ao estabelecimento."}
            </p>
          </section>
        )}

        {load.state === "error" && (
          <section className="c-card c-payerr" role="alert">
            <h2>Não foi possível abrir agora</h2>
            <p>Confira a internet e tente de novo.</p>
            <button
              type="button"
              className="c-btn is-primary"
              onClick={() => {
                setLoad({ state: "loading" });
                void fetchInfo();
              }}
            >
              Tentar de novo
            </button>
          </section>
        )}

        {info && (
          <>
            <header className="c-paygreet">
              <p className="c-eyebrow">Pagamento da ficha</p>
              <h1>Olá, {info.name}</h1>
            </header>

            {owes ? (
              <section className="c-hero" aria-label="Saldo da ficha">
                <p className="c-eyebrow">Em aberto na sua ficha</p>
                <Money cents={info.balanceCents} />
                <p>Pague agora com PIX: o dinheiro vai direto para o estabelecimento.</p>
                <div className="c-hero-cta">
                  <button type="button" className="c-btn is-primary" onClick={() => setPixOpen(true)}>
                    <PixIcon size={18} />
                    Pagar com PIX
                  </button>
                </div>
              </section>
            ) : (
              <section className="c-card c-payok" aria-label="Ficha em dia">
                <span className="c-art is-done" style={{ width: 88, height: 88 }} aria-hidden="true">
                  <svg viewBox="0 0 72 72" width="88" height="88">
                    <circle cx="36" cy="36" r="20" fill="currentColor" />
                    <path className="c-tick" d="m26 37 7 7 13-14" stroke="var(--c-surface)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </span>
                <h2>Sua ficha está em dia</h2>
                <p>Não há nada a pagar agora. Obrigado!</p>
              </section>
            )}

            {info.pending.length > 0 && (
              <section className="c-card c-paynote" aria-label="Pagamento informado">
                <span className="c-oic" aria-hidden="true">
                  <Clock size={20} />
                </span>
                <div>
                  <strong>Você avisou um PIX de {formatBRL(info.pending[0].amountCents)}</strong>
                  {whenLabel(info.pending[0].createdAt)}. O estabelecimento está conferindo no banco; assim que confirmar, o valor sai da sua ficha.
                </div>
              </section>
            )}

            <p className="c-payfoot">
              O PIX é feito no app do seu banco. Depois de pagar, toque em “Já paguei” para avisar o estabelecimento.
            </p>

            {owes && (
              <PixPaymentSheet
                open={pixOpen}
                onClose={() => setPixOpen(false)}
                balanceCents={info.balanceCents}
                onInformed={() => void fetchInfo()}
                inform={inform}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

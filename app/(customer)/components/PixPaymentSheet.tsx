"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import * as React from "react";
import { loadPixCharge, type PixCharge, type PixSettings } from "@/lib/pix-qr";
import { formatAmount, formatBRL } from "../lib/format";
import { informPayment } from "../lib/payment-intents";
import "./ficha/pix.css";
import { Money, Sheet, SheetHeader, cx } from "./kit";
import "./pagamento/pagamento.css";

const MIN_CENTS = 100;
const QUICK_VALUES = [5000, 10000, 15000];
/** Até R$ 9.999.999,99: o bastante e sem estourar a conta. */
const MAX_DIGITS = 9;

type Mode = "total" | "partial";
type Step = "choose" | "loading" | "error" | "qr" | "done";

/**
 * Pagar a ficha por PIX: escolher o valor, gerar o QR no servidor e, depois
 * de pagar, avisar o estabelecimento ("Já paguei"). O aviso não mexe no saldo:
 * quem confirma é o estabelecimento, depois de ver o PIX entrar no banco.
 * `onInformed` roda quando o aviso foi registrado, para a tela buscar de novo
 * o andamento dos pagamentos.
 */
export function PixPaymentSheet({
  open,
  onClose,
  balanceCents,
  onInformed,
}: {
  open: boolean;
  onClose: () => void;
  balanceCents: number;
  onInformed?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Pagar com PIX">
      {/* montado só com a folha aberta: cada abertura começa do primeiro passo */}
      <PixFlow balanceCents={Math.max(0, balanceCents)} onClose={onClose} onInformed={onInformed} />
    </Sheet>
  );
}

function PixFlow({
  balanceCents,
  onClose,
  onInformed,
}: {
  balanceCents: number;
  onClose: () => void;
  onInformed?: () => void;
}) {
  const [step, setStep] = React.useState<Step>("choose");
  const [mode, setMode] = React.useState<Mode>("total");
  const [partialCents, setPartialCents] = React.useState(() => Math.min(balanceCents, 5000));
  const [result, setResult] = React.useState<{ settings: PixSettings; charge: PixCharge } | null>(null);
  const [sending, setSending] = React.useState(false);
  const [informError, setInformError] = React.useState<string | null>(null);
  const [informedCents, setInformedCents] = React.useState(0);
  const sendingRef = React.useRef(false);
  const onInformedRef = React.useRef(onInformed);
  onInformedRef.current = onInformed;

  const wrap = React.useRef<HTMLDivElement>(null);
  const request = React.useRef(0);
  const alive = React.useRef(true);
  const firstStep = React.useRef(true);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // A cada passo o conteúdo troca inteiro: o foco vai para o título novo,
  // em vez de cair no vazio junto com o botão que sumiu.
  React.useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const target = wrap.current?.querySelector<HTMLElement>("h2, [data-autofocus]");
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus();
    }
  }, [step]);

  const cents = mode === "total" ? balanceCents : partialCents;
  const problem =
    mode === "partial"
      ? cents < MIN_CENTS
        ? "O valor mínimo é R$ 1,00."
        : cents > balanceCents
          ? `O valor máximo é o saldo da ficha, ${formatBRL(balanceCents)}.`
          : null
      : null;

  const generate = async () => {
    if (problem || cents <= 0) return;
    const id = ++request.current;
    setStep("loading");
    let res: Awaited<ReturnType<typeof loadPixCharge>> = null;
    try {
      res = await loadPixCharge(cents);
    } catch {
      res = null;
    }
    if (!alive.current || id !== request.current) return;
    setResult(res);
    setStep(res ? "qr" : "error");
  };

  // Toque em "Já paguei": avisa o estabelecimento com o valor que está na tela.
  // A trava em ref vale já no primeiro toque, antes de a tela re-renderizar.
  const inform = async () => {
    if (sendingRef.current || cents <= 0) return;
    sendingRef.current = true;
    setSending(true);
    setInformError(null);
    const res = await informPayment(cents);
    sendingRef.current = false;
    if (res.ok) {
      // a tela de trás busca de novo mesmo que a folha tenha sido fechada nesse meio tempo
      onInformedRef.current?.();
    }
    if (!alive.current) return;
    setSending(false);
    if (res.ok) {
      setInformedCents(res.intent.amountCents);
      setStep("done");
    } else {
      setInformError(res.error);
    }
  };

  const changeValue = () => {
    setInformError(null);
    setStep("choose");
  };

  return (
    <div ref={wrap} className={cx("c-pix-step", step === "done" && "is-done")}>
      {step === "choose" && (
        <ChooseStep
          balanceCents={balanceCents}
          mode={mode}
          onMode={setMode}
          partialCents={partialCents}
          onPartial={setPartialCents}
          cents={cents}
          problem={problem}
          onGenerate={generate}
          onClose={onClose}
        />
      )}

      {step === "loading" && (
        <>
          <SheetHeader title="Pagar com PIX" subtitle={`Valor: ${formatBRL(cents)}`} onClose={onClose} />
          <div className="c-pix-wait" role="status">
            <span className="c-spin is-ink" aria-hidden="true" />
            Gerando QR code…
          </div>
        </>
      )}

      {step === "error" && (
        <>
          <SheetHeader title="Pagar com PIX" subtitle={`Valor: ${formatBRL(cents)}`} onClose={onClose} />
          <p className="c-alert" role="alert">
            Não foi possível gerar o QR agora. Tente de novo ou pague no balcão.
          </p>
          <div className="c-actions c-pix-foot">
            <button type="button" className="c-btn is-ghost" onClick={() => setStep("choose")}>
              Mudar o valor
            </button>
            <button type="button" className="c-btn is-primary" onClick={generate}>
              <RefreshCw size={18} aria-hidden="true" />
              Tentar de novo
            </button>
          </div>
        </>
      )}

      {step === "qr" && result && (
        <QrStep
          cents={cents}
          charge={result.charge}
          onBack={changeValue}
          onPaid={inform}
          sending={sending}
          error={informError}
          onClose={onClose}
        />
      )}

      {step === "done" && (
        <>
          <SheetHeader title="Avisamos o estabelecimento" onClose={onClose} />
          <span className="c-art is-done c-pix-done-art" style={{ width: 96, height: 96 }} aria-hidden="true">
            <svg viewBox="0 0 72 72" width="96" height="96">
              <circle cx="36" cy="36" r="20" fill="currentColor" />
              <path
                className="c-tick"
                d="m26 37 7 7 13-14"
                stroke="var(--c-surface)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </span>
          <div className="c-qr-amt">
            <p className="c-pix-k">Valor do PIX</p>
            <Money cents={informedCents || cents} />
          </div>
          <p className="c-pixnote">
            Assim que eles conferirem o pagamento no banco, ele sai da sua ficha. Isso costuma levar alguns minutos no
            horário de funcionamento.
          </p>
          <button type="button" className="c-btn is-primary" onClick={onClose}>
            Entendi
          </button>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------- passo 1: valor */

function ChooseStep({
  balanceCents,
  mode,
  onMode,
  partialCents,
  onPartial,
  cents,
  problem,
  onGenerate,
  onClose,
}: {
  balanceCents: number;
  mode: Mode;
  onMode: (mode: Mode) => void;
  partialCents: number;
  onPartial: (cents: number) => void;
  cents: number;
  problem: string | null;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const totalRef = React.useRef<HTMLButtonElement>(null);
  const partialRef = React.useRef<HTMLButtonElement>(null);
  const inputId = React.useId();
  const msgId = React.useId();

  const half = Math.round(balanceCents / 2);
  const quick = QUICK_VALUES.filter((v) => v < balanceCents);

  // radiogroup: as setas trocam a opção, como num grupo de rádios de verdade
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const next: Mode = mode === "total" ? "partial" : "total";
    onMode(next);
    (next === "total" ? totalRef : partialRef).current?.focus();
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
    onPartial(digits ? parseInt(digits, 10) : 0);
  };

  return (
    <>
      <SheetHeader title="Pagar com PIX" subtitle={`Você deve ${formatBRL(balanceCents)} na ficha.`} onClose={onClose} />

      <div className="c-opts" role="radiogroup" aria-label="Valor a pagar" onKeyDown={onKeyDown}>
        <button
          ref={totalRef}
          type="button"
          role="radio"
          className="c-opt"
          aria-checked={mode === "total"}
          tabIndex={mode === "total" ? 0 : -1}
          onClick={() => onMode("total")}
        >
          <span className="c-mk" aria-hidden="true">
            {mode === "total" && <Check size={14} strokeWidth={3} />}
          </span>
          <span className="c-opt-t">
            <strong>Pagar tudo</strong>
            <small>Zera o saldo da sua ficha</small>
          </span>
          <span className="c-opt-val">{formatBRL(balanceCents)}</span>
        </button>
        <button
          ref={partialRef}
          type="button"
          role="radio"
          className="c-opt"
          aria-checked={mode === "partial"}
          tabIndex={mode === "partial" ? 0 : -1}
          onClick={() => onMode("partial")}
        >
          <span className="c-mk" aria-hidden="true">
            {mode === "partial" && <Check size={14} strokeWidth={3} />}
          </span>
          <span className="c-opt-t">
            <strong>Outro valor</strong>
            <small>Abate uma parte do saldo</small>
          </span>
        </button>
      </div>

      {mode === "partial" && (
        <div className="c-pix-amt">
          <label htmlFor={inputId} className="c-sr">
            Valor a pagar, em reais
          </label>
          <div className="c-amtin" data-invalid={problem ? "true" : undefined}>
            <span aria-hidden="true">R$</span>
            <input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="done"
              value={formatAmount(partialCents)}
              onChange={onInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") onGenerate();
              }}
              aria-invalid={problem ? true : undefined}
              aria-describedby={msgId}
            />
          </div>
          <div className="c-pix-quick" role="group" aria-label="Valores rápidos">
            {quick.map((v) => (
              <button key={v} type="button" className="c-chip" aria-pressed={partialCents === v} onClick={() => onPartial(v)}>
                {formatBRL(v)}
              </button>
            ))}
            {half >= MIN_CENTS && (
              <button type="button" className="c-chip" aria-pressed={partialCents === half} onClick={() => onPartial(half)}>
                Metade
              </button>
            )}
          </div>
          <p id={msgId} className={cx("c-pix-msg", problem && "is-error")} aria-live="polite">
            {problem ?? "Mínimo de R$ 1,00 e no máximo o saldo da ficha."}
          </p>
        </div>
      )}

      <div className="c-pix-foot">
        <button type="button" className="c-btn is-primary" disabled={Boolean(problem) || cents <= 0} onClick={onGenerate}>
          Gerar QR code de {formatBRL(cents)}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ passo 2: QR */

function QrStep({
  cents,
  charge,
  onBack,
  onPaid,
  sending,
  error,
  onClose,
}: {
  cents: number;
  charge: PixCharge;
  onBack: () => void;
  onPaid: () => void;
  sending: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [copyHint, setCopyHint] = React.useState<string | null>(null);
  const codeRef = React.useRef<HTMLElement>(null);
  const payload = charge.payload.trim();

  const selectCode = () => {
    const node = codeRef.current;
    const selection = window.getSelection?.();
    if (!node || !selection) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  };

  const fallback = () => {
    if (selectCode()) {
      setCopied(true);
      setCopyHint(null);
    } else {
      setCopyHint("O código ficou selecionado. Use o copiar do seu aparelho.");
    }
  };

  // writeText precisa rodar dentro do clique, senão o navegador recusa
  const copy = () => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(payload).then(
          () => {
            setCopied(true);
            setCopyHint(null);
          },
          fallback
        );
      } else {
        fallback();
      }
    } catch {
      fallback();
    }
  };

  return (
    <>
      <SheetHeader title="Escaneie para pagar" onClose={onClose} />

      {/* QR e valor centralizados, em pouca altura: o essencial cabe sem rolar */}
      <div className="c-qr-row">
        <div className="c-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={charge.qrCodeUrl} alt={`QR code do PIX de ${formatBRL(cents)}`} width={160} height={160} />
        </div>
        <div className="c-qr-amt">
          <p className="c-pix-k">Valor</p>
          <Money cents={cents} />
        </div>
      </div>

      {payload && (
        <div>
          <p className="c-eyebrow c-pix-label">PIX copia e cola</p>
          <div className="c-copyrow">
            <code ref={codeRef}>{payload}</code>
            <button type="button" className={cx("c-btn", copied ? "is-ghost" : "is-primary")} onClick={copy}>
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="c-sr" aria-live="polite">
            {copied ? "Código PIX copiado." : ""}
          </p>
          {copyHint && (
            <p className="c-pix-msg" role="status" style={{ marginTop: 8 }}>
              {copyHint}
            </p>
          )}
        </div>
      )}

      {/* ao abrir, o quadro sobe para não ficar por baixo do rodapé fixo */}
      <details
        className="c-howto-d"
        onToggle={(e) => {
          if (e.currentTarget.open) e.currentTarget.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }}
      >
        <summary>Como pagar</summary>
        <ol className="c-howto">
          <li>Abra o app do seu banco e escolha PIX.</li>
          <li>Toque em “Ler QR code” ou em “PIX copia e cola”.</li>
          <li>Confira o valor e o nome do estabelecimento e confirme.</li>
        </ol>
        <p className="c-pixnote">
          O saldo da sua ficha muda quando o estabelecimento conferir o pagamento no banco.
        </p>
      </details>

      {error && (
        <p className="c-alert" role="alert">
          {error}
        </p>
      )}

      <div className="c-pix-foot">
        <p className="c-pix-after">Depois de pagar, toque em “Já paguei”.</p>
        <div className="c-actions">
          <button type="button" className="c-btn is-ghost" onClick={onBack} disabled={sending}>
            Mudar o valor
          </button>
          <button
            type="button"
            className="c-btn is-primary"
            onClick={onPaid}
            aria-disabled={sending || undefined}
            aria-busy={sending || undefined}
          >
            {sending ? (
              <>
                <span className="c-spin" aria-hidden="true" />
                Avisando…
              </>
            ) : error ? (
              <>
                <RefreshCw size={18} aria-hidden="true" />
                Tentar de novo
              </>
            ) : (
              "Já paguei"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

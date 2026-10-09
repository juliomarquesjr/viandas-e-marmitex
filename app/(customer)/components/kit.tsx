"use client";

/**
 * Peças compartilhadas da área do cliente. As classes vêm de customer.css;
 * aqui fica só o comportamento.
 */

import { ChefHat, Moon, RefreshCw, Sun, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { formatAmount } from "../lib/format";
import { artKind, isLive, shortLabel, stepIndex, stepNames, toneOf, type StatusSource, type StatusTone } from "../lib/order-status";
import { useCustomerTheme, type CustomerThemeChoice } from "./CustomerTheme";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/* ---------------------------------------------------------------- dinheiro */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Valor em reais com o "R$" menor na linha de base. Com `countUp`, conta de
 * zero até o valor na primeira vez que aparece.
 */
export function Money({ cents, countUp = false, className }: { cents: number; countUp?: boolean; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = React.useState(countUp ? 0 : Math.abs(cents));
  const target = Math.abs(cents);

  React.useEffect(() => {
    if (!countUp || reduced) {
      setShown(target);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const duration = 1100;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / duration);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [countUp, reduced, target]);

  return (
    <div className={cx("c-money", className)} aria-label={`R$ ${formatAmount(target)}`}>
      <span className="c-money-cur" aria-hidden="true">
        R$
      </span>
      <span aria-hidden="true">{formatAmount(shown)}</span>
    </div>
  );
}

/* ---------------------------------------------------------- status do pedido */

type StatusOrder = StatusSource;

const toneClass: Record<StatusTone, string> = { go: "is-go", prog: "is-prog", done: "is-done", off: "is-off" };

/** Badge discreto; a ênfase de "pede ação" fica na linha (classe is-flag). */
export function StatusChip({ order }: { order: StatusOrder }) {
  const tone = toneOf(order);
  return (
    <span className={cx("c-pill", toneClass[tone])}>
      {isLive(order) && <i className="c-pd" aria-hidden="true" />}
      {shortLabel(order)}
    </span>
  );
}

/** `compact` mantém as etapas sempre em linha, para cartões pequenos. */
export function Stepper({ order, compact = false }: { order: StatusOrder; compact?: boolean }) {
  const names = stepNames(order);
  const current = stepIndex(order);
  if (current < 0) return null;
  const last = names.length - 1;
  return (
    <ol className={cx("c-steps", compact && "is-compact")} style={{ ["--c-steps" as string]: names.length }} aria-label="Etapas do pedido">
      {names.map((name, i) => {
        const done = i < current || (i === current && current === last);
        const now = i === current && !done;
        return (
          <li key={name} className={cx(done && "is-done", now && "is-now")} aria-current={i === current ? "step" : undefined}>
            <span className="c-dot" aria-hidden="true">
              {done && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
            </span>
            {name}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Ilustração animada do estado: papel (recebido), panela com vapor (preparo),
 * sacola com ondas (pronto), caminhão (a caminho), selo (concluído).
 */
export function StatusArt({ order, size = 76 }: { order: StatusOrder; size?: number }) {
  const kind = artKind(order);
  const tone = toneOf(order);
  let inner: React.ReactNode;

  if (kind === "wait") {
    inner = (
      <g className="c-wait">
        <rect x="22" y="18" width="28" height="36" rx="5" fill="var(--c-surface)" stroke="currentColor" strokeWidth="2.4" />
        <path d="M29 29h14M29 36h14M29 43h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  } else if (kind === "preparing") {
    inner = (
      <>
        <path className="c-steam" d="M28 34c-4-4 4-7 0-12" />
        <path className="c-steam s2" d="M37 34c-4-4 4-7 0-12" />
        <path className="c-steam s3" d="M46 34c-4-4 4-7 0-12" />
        <g className="c-bowl">
          <path d="M17 38h38c0 11-8.5 18-19 18S17 49 17 38z" fill="currentColor" />
          <path d="M14 38h44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </g>
      </>
    );
  } else if (kind === "ready") {
    inner = (
      <>
        <circle className="c-ring" cx="36" cy="36" r="24" />
        <circle className="c-ring r2" cx="36" cy="36" r="24" />
        <g className="c-bag">
          <path d="M21 28h30l-2 26H23z" fill="currentColor" />
          <path d="M29 28v-3a7 7 0 0 1 14 0v3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path className="c-tick" d="m29.5 41 5 5 8.5-9.5" stroke="var(--c-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </>
    );
  } else if (kind === "truck") {
    inner = (
      <>
        <path className="c-speed" d="M8 30h10M5 38h12M10 46h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".5" />
        <g className="c-truck">
          <path d="M20 24h24v22H20z" fill="currentColor" />
          <path d="M44 31h9l6 7v8H44z" fill="currentColor" />
          <circle cx="29" cy="48" r="5" fill="var(--c-surface)" stroke="currentColor" strokeWidth="2.6" />
          <circle cx="51" cy="48" r="5" fill="var(--c-surface)" stroke="currentColor" strokeWidth="2.6" />
        </g>
      </>
    );
  } else if (kind === "done") {
    inner = (
      <>
        <circle cx="36" cy="36" r="20" fill="currentColor" />
        <path className="c-tick" d="m26 37 7 7 13-14" stroke="var(--c-surface)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    );
  } else {
    inner = (
      <>
        <circle cx="36" cy="36" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="m28 28 16 16M44 28 28 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  return (
    <span className={cx("c-art", tone !== "off" && toneClass[tone])} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 72 72" width={size} height={size}>
        {inner}
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------- folha */

/**
 * Folha que sobe de baixo no celular e vira modal no computador. Fica dentro
 * do [data-customer-scope] (para herdar o tema), fecha com Esc e com toque
 * fora, e devolve o foco a quem a abriu.
 */
export function Sheet({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Classe extra do painel, para folhas que precisam de outro tamanho. */
  className?: string;
  children: React.ReactNode;
}) {
  const [host, setHost] = React.useState<Element | null>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setHost(document.querySelector("[data-customer-scope]") ?? document.body);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      // `data-sheet-focus` (ex.: o título da folha) vence o primeiro botão
      const first =
        panel.current?.querySelector<HTMLElement>("[data-sheet-focus]") ??
        panel.current?.querySelector<HTMLElement>("button, [href], input, select, textarea");
      first?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !host) return null;

  return createPortal(
    <div
      className="c-ov"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} className={cx("c-sheet", className)} role="dialog" aria-modal="true" aria-label={label}>
        <span className="c-grab" aria-hidden="true" />
        {children}
      </div>
    </div>,
    host
  );
}

export function SheetHeader({
  title,
  subtitle,
  onClose,
  focusTitle = false,
}: {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  /** Ao abrir a folha, o foco vai para o título (leitor de tela começa por ele). */
  focusTitle?: boolean;
}) {
  return (
    <div className="c-sheet-h">
      <div>
        <h2 {...(focusTitle ? { tabIndex: -1, "data-sheet-focus": "" } : {})}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button type="button" className="c-x" onClick={onClose} aria-label="Fechar">
        <X size={20} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- tema */

export function ThemeButton({ variant = "icon", className }: { variant?: "icon" | "rail"; className?: string }) {
  const { mode, toggle } = useCustomerTheme();
  const next = mode === "dark" ? "claro" : "escuro";
  const Icon = mode === "dark" ? Sun : Moon;
  if (variant === "rail") {
    return (
      <button type="button" className={cx("c-nav", className)} onClick={toggle} aria-label={`Mudar para tema ${next}`}>
        <span className="c-nav-ic">
          <Icon size={22} />
        </span>
        {mode === "dark" ? "Claro" : "Escuro"}
      </button>
    );
  }
  return (
    <button type="button" className={cx("c-iconbtn", className)} onClick={toggle} aria-label={`Mudar para tema ${next}`}>
      <Icon size={22} />
    </button>
  );
}

const THEME_OPTIONS: Array<{ value: CustomerThemeChoice; label: string; hint: string; swatch: string }> = [
  { value: "light", label: "Claro", hint: "Fundo claro", swatch: "is-light" },
  { value: "dark", label: "Escuro", hint: "Fundo escuro", swatch: "is-dark" },
  { value: "auto", label: "Automático", hint: "Segue o aparelho", swatch: "is-auto" },
];

export function ThemeChoice() {
  const { choice, setChoice } = useCustomerTheme();
  return (
    <div className="c-themes" role="radiogroup" aria-label="Tema do aplicativo">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={choice === opt.value}
          className="c-tcard"
          onClick={() => setChoice(opt.value)}
        >
          <span className={cx("c-sw", opt.swatch)} aria-hidden="true" />
          <span>
            {opt.label}
            <br />
            <small>{opt.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- marca */

interface Branding {
  title: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: Branding = { title: "Viandas e Marmitex", logoUrl: null };
let brandingCache: Branding | null = null;

/** Nome e logo das configurações públicas do sistema, com o nome padrão enquanto carrega. */
export function useBranding(): Branding {
  const [branding, setBranding] = React.useState<Branding>(brandingCache ?? DEFAULT_BRANDING);
  React.useEffect(() => {
    if (brandingCache) return;
    let alive = true;
    fetch("/api/config/public")
      .then((r) => (r.ok ? r.json() : []))
      .then((configs: Array<{ key: string; value: string | null }>) => {
        const get = (key: string) => configs.find((c) => c.key === key)?.value?.trim() || "";
        brandingCache = {
          title: get("branding_system_title") || DEFAULT_BRANDING.title,
          logoUrl: get("branding_logo_url") || null,
        };
        if (alive) setBranding(brandingCache);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return branding;
}

export function BrandMark({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  return (
    <span className={cx("c-mark", className)} aria-hidden="true">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" />
      ) : (
        <ChefHat size={20} />
      )}
    </span>
  );
}

/** Ícone genérico para o botão de PIX (losangos encaixados). */
export function PixIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 4.5 4.5L12 12 7.5 7.5z" />
      <path d="m12 12 4.5 4.5L12 21l-4.5-4.5z" />
      <path d="M3.5 10.5 6 12l-2.5 1.5M20.5 10.5 18 12l2.5 1.5" />
    </svg>
  );
}

/* ----------------------------------------------- carregando, vazio e erro */

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="c-rows" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="c-row" style={{ cursor: "default" }}>
          <span className="c-skel" style={{ width: 42, height: 42, flex: "none" }} />
          <span className="c-row-main" style={{ gap: 8 }}>
            <span className="c-skel" style={{ height: 14, width: "70%" }} />
            <span className="c-skel" style={{ height: 12, width: "40%" }} />
          </span>
          <span className="c-skel" style={{ height: 16, width: 64 }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = "Não deu para carregar",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="c-state" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <button type="button" className="c-btn is-ghost" onClick={onRetry}>
        <RefreshCw size={18} />
        Tentar de novo
      </button>
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="c-state">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

/** Aviso curto que some sozinho. */
export function Toast({ message, onDone, duration = 2400 }: { message: string | null; onDone: () => void; duration?: number }) {
  React.useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(t);
  }, [message, onDone, duration]);
  if (!message) return null;
  return (
    <div className="c-toast" role="status">
      {message}
    </div>
  );
}

export { cx };

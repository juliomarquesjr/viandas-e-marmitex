"use client";

/**
 * Painel da marca das telas de entrar e de senha: luzes quentes que passeiam,
 * ilustrações que se alternam (prato feito, hambúrguer, vianda, frango e sacola
 * sendo montados, ver auth-scenes.tsx) e ingredientes soltos que seguem o
 * ponteiro. Com "reduzir movimento" o parallax e a palavra que alterna param.
 */

import * as React from "react";
import "./auth.css";
import { BagScene, BurgerScene, ChickenScene, PlateScene, ViandaScene } from "./auth-scenes";
import { BrandMark, ThemeButton, cx, useBranding } from "./kit";

const ROT = ["ficha", "entrega", "retirada", "marmita"];

/* ------------------------------------------------- ingredientes flutuantes */

const FLOATIES: React.ReactNode[] = [
  <svg key="tomate" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#e8423a" />
    <circle cx="20" cy="20" r="12.5" fill="#ff7b6b" />
    <path d="M20 8v24M8 20h24M11.5 11.5l17 17M28.5 11.5l-17 17" stroke="#e8423a" strokeWidth="2" />
    <circle cx="15" cy="16" r="1.6" fill="#ffe2a8" />
    <circle cx="25" cy="24" r="1.6" fill="#ffe2a8" />
    <circle cx="24" cy="14" r="1.6" fill="#ffe2a8" />
  </svg>,
  <svg key="folha" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M5 33C5 15 17 4 35 4c0 19-11 31-30 29z" fill="#6db552" />
    <path d="M7 31C15 23 24 14 33 6" stroke="#3f8a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>,
  <svg key="pimenta" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M7 31c11 2 23-4 27-18 1-4-3-6-5-3-4 9-11 14-21 15-3 0-4 5-1 6z" fill="#e23b2e" />
    <path d="M30 10c0-4 2-6 5-7" stroke="#4f9a3c" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M12 28c6 0 12-3 15-8" stroke="#ff8a7a" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />
  </svg>,
  <svg key="limao" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#ffd84a" />
    <circle cx="20" cy="20" r="13" fill="#fff3a6" />
    <path d="M20 7v26M7 20h26M10.8 10.8l18.4 18.4M29.2 10.8 10.8 29.2" stroke="#ffd84a" strokeWidth="2.2" />
  </svg>,
];

/* ------------------------------------------------------------- carrossel */

/** Quanto cada ilustração fica à vista (a montagem leva uns 3 s; o resto é ela pronta, balançando). */
const SCENE_MS = 7600;

/**
 * Prato feito, hambúrguer, vianda, frango e sacola, uma de cada vez. Todas ficam montadas no palco; a classe
 * decide quem aparece: `is-active` (entra deslizando e monta o desenho), `is-leaving` (sai deslizando).
 * Com "reduzir movimento" só o prato feito aparece, parado.
 */
function SceneCarousel({ lidLabel, reduced }: { lidLabel: string; reduced: boolean }) {
  const [active, setActive] = React.useState(0);
  const [leaving, setLeaving] = React.useState<number | null>(null);
  const current = React.useRef(0);

  const scenes = [
    <PlateScene key="prato" label={lidLabel} />,
    <BurgerScene key="hamburguer" />,
    <ViandaScene key="vianda" />,
    <ChickenScene key="frango" />,
    <BagScene key="sacola" label={lidLabel} />,
  ];

  React.useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const old = current.current;
      const next = (old + 1) % 5;
      current.current = next;
      setLeaving(old);
      setActive(next);
    }, SCENE_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  // a cena que saiu some depois do deslize
  React.useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), 600);
    return () => window.clearTimeout(t);
  }, [leaving]);

  return (
    <>
      {scenes.map((scene, i) => (
        <div key={i} className={cx("c-sc", i === active && "is-active", i === leaving && "is-leaving")}>
          {scene}
        </div>
      ))}
    </>
  );
}

/* brilhos que piscam em volta da ilustração (só no computador, ver auth.css) */
const SPARK = (
  <svg viewBox="0 0 24 24">
    <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#fff" />
  </svg>
);
const SPARKS = ["is-1", "is-2", "is-3", "is-4", "is-5"];

/* --------------------------------------------------------------- movimento */

function useReducedMotion() {
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

/** "Sua ficha num toque.", trocando a palavra a cada 2,4 s. */
function RotatingLine({ reduced }: { reduced: boolean }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % ROT.length), 2400);
    return () => window.clearInterval(t);
  }, [reduced]);

  return (
    <p>
      <span className="c-sr">Sua ficha, entrega, retirada e marmita num toque.</span>
      <span aria-hidden="true">
        Sua{" "}
        <span key={index} className={index > 0 ? "c-rot is-tick" : "c-rot"}>
          {ROT[index]}
        </span>{" "}
        num toque.
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ painel */

export function AuthScene({ title, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode }) {
  const branding = useBranding();
  const reduced = useReducedMotion();
  const panel = React.useRef<HTMLDivElement>(null);
  const lidLabel = (branding.title.split(/\s+e\s+|\s+/)[0] || branding.title).toUpperCase();

  React.useEffect(() => {
    if (!reduced) return;
    panel.current?.style.setProperty("--mx", "0");
    panel.current?.style.setProperty("--my", "0");
  }, [reduced]);

  // Celular: ao tocar num campo, o painel da marca recolhe e o formulário sobe, deixando campos e botão à vista
  // mesmo com o teclado aberto. Depois de recolhido, fica assim (reabrir no meio do toque deslocaria o botão
  // e faria o toque errar). O teclado também passa a redimensionar a página (Chrome Android), para o botão
  // fixo no rodapé do formulário subir junto com ele.
  React.useEffect(() => {
    const root = panel.current?.closest<HTMLElement>(".c-auth");
    if (!root) return;
    const narrow = window.matchMedia("(max-width: 859px)");
    let timer: number | undefined;

    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const originalViewport = viewport?.content ?? null;
    if (viewport && !/interactive-widget/.test(viewport.content)) viewport.content = `${viewport.content}, interactive-widget=resizes-content`;

    const onFocusIn = (e: FocusEvent) => {
      const field = e.target as HTMLElement | null;
      if (!field?.matches?.("input, select, textarea") || !narrow.matches) return;
      root.classList.add("is-typing");
      window.clearTimeout(timer);
      // espera o painel recolher e o teclado abrir; aí traz o campo para a parte visível
      timer = window.setTimeout(() => {
        // no último campo, o que importa é ver o botão logo abaixo; nos outros, o próprio campo no meio
        const fields = Array.from(root.querySelectorAll<HTMLElement>("form input:not([type=hidden]), form select, form textarea"));
        const last = fields[fields.length - 1] === field;
        const action = last ? root.querySelector<HTMLElement>("form button[type=submit]") : null;
        (action ?? field).scrollIntoView({ block: action ? "end" : "center", behavior: reduced ? "auto" : "smooth" });
      }, 380);
    };
    root.addEventListener("focusin", onFocusIn);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      window.clearTimeout(timer);
      root.classList.remove("is-typing");
      if (viewport && originalViewport !== null) viewport.content = originalViewport;
    };
  }, [reduced]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  return (
    <div ref={panel} className="c-lbrand" onPointerMove={onPointerMove}>
      <span className="c-glow is-1" aria-hidden="true" />
      <span className="c-glow is-2" aria-hidden="true" />

      <div className="c-ltop">
        <div className="c-brand">
          <BrandMark logoUrl={branding.logoUrl} />
          <span>{branding.title}</span>
        </div>
        <ThemeButton />
      </div>

      <div className="c-scene">
        {/* o palco guarda a ilustração e o que gira em volta; no computador ele ocupa o maior 4:3 que couber */}
        <div className="c-stage">
          <SceneCarousel lidLabel={lidLabel} reduced={reduced} />
          {FLOATIES.map((svg, i) => (
            <span key={i} className={`c-floaty is-${i + 1}`} aria-hidden="true">
              {svg}
            </span>
          ))}
          {SPARKS.map((cls) => (
            <span key={cls} className={`c-spark ${cls}`} aria-hidden="true">
              {SPARK}
            </span>
          ))}
        </div>
      </div>

      <div className="c-lcopy">
        <h2>
          {title ?? (
            <>
              Comida caseira,
              <br />
              na palma da mão.
            </>
          )}
        </h2>
        {subtitle !== undefined ? <p>{subtitle}</p> : <RotatingLine reduced={reduced} />}
      </div>
    </div>
  );
}

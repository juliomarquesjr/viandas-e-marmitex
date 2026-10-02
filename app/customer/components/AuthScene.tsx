"use client";

/**
 * Painel da marca das telas de entrar e de senha: luzes quentes que passeiam,
 * marmita ilustrada (a tampa sai e a comida aparece item a item), vapor e
 * ingredientes soltos que seguem o ponteiro. A coreografia toca uma vez, ao
 * montar. Com "reduzir movimento" o parallax e a palavra que alterna param.
 */

import * as React from "react";
import "../auth/auth.css";
import { BrandMark, ThemeButton, useBranding } from "./kit";

const ROT = ["ficha", "entrega", "retirada", "marmita"];

/* ------------------------------------------------ marmita, desenhada uma vez */

interface Grain {
  x: string;
  y: string;
  a: number;
}

/** Os grãos saem de um gerador com semente fixa: o servidor e o navegador desenham igual. */
const MARMITA = (() => {
  let seed = 7;
  const r = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const f = (n: number) => n.toFixed(1);
  const pick = (x0: number, w: number, y0: number, h: number): Grain => {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    return { x: f(x), y: f(y), a: Math.round(r() * 180) };
  };

  const rice = Array.from({ length: 90 }, () => pick(42, 128, 54, 140));
  const beans = Array.from({ length: 26 }, () => pick(192, 86, 54, 58));
  const leaves = Array.from({ length: 11 }, () => pick(194, 82, 136, 58));
  const carrots = Array.from({ length: 4 }, () => pick(198, 74, 140, 50));
  return { rice, beans, leaves, carrots };
})();

const GREENS = ["#6db552", "#4f9a3c", "#8fcf6a"];
const TOMATOES: Array<[number, number]> = [
  [214, 150],
  [258, 176],
  [236, 186],
];

function Marmita({ lidLabel }: { lidLabel: string }) {
  const id = "c-m" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const longLabel = lidLabel.length > 9;

  return (
    <svg className="c-box" viewBox="0 0 320 240" role="img" aria-label="Marmita com arroz, feijão, salada e filé grelhado">
      <defs>
        <clipPath id={`${id}-cr`}>
          <rect x="36" y="48" width="140" height="152" rx="20" />
        </clipPath>
        <clipPath id={`${id}-cb`}>
          <rect x="186" y="48" width="98" height="70" rx="18" />
        </clipPath>
        <clipPath id={`${id}-cs`}>
          <rect x="186" y="128" width="98" height="72" rx="18" />
        </clipPath>
      </defs>

      <path className="c-lsteam s1" d="M104 30c-9-10 9-17 0-30" />
      <path className="c-lsteam s2" d="M160 26c-9-10 9-17 0-30" />
      <path className="c-lsteam s3" d="M216 30c-9-10 9-17 0-30" />

      <ellipse cx="160" cy="226" rx="122" ry="11" fill="#000" opacity=".2" />
      <rect x="22" y="34" width="276" height="180" rx="30" fill="#f7f3ef" stroke="#e7dfd9" strokeWidth="3" />
      <rect x="36" y="48" width="140" height="152" rx="20" fill="#fffaf0" />
      <rect x="186" y="48" width="98" height="70" rx="18" fill="#6b3420" />
      <rect x="186" y="128" width="98" height="72" rx="18" fill="#eef6e2" />

      <g className="c-food f1" clipPath={`url(#${id}-cr)`}>
        {MARMITA.rice.map((g, i) => (
          <ellipse key={i} cx={g.x} cy={g.y} rx="3.4" ry="1.7" transform={`rotate(${g.a} ${g.x} ${g.y})`} fill="#eadcbc" />
        ))}
      </g>

      <g className="c-food f2" clipPath={`url(#${id}-cb)`}>
        {MARMITA.beans.map((g, i) => (
          <g key={i} transform={`rotate(${g.a} ${g.x} ${g.y})`}>
            <ellipse cx={g.x} cy={g.y} rx="6.6" ry="4.3" fill="#4a2214" />
            <ellipse cx={(Number(g.x) - 2).toFixed(1)} cy={(Number(g.y) - 1.4).toFixed(1)} rx="2.2" ry="1" fill="#a35d3d" />
          </g>
        ))}
      </g>

      <g className="c-food f3" clipPath={`url(#${id}-cs)`}>
        {MARMITA.leaves.map((g, i) => (
          <ellipse key={i} cx={g.x} cy={g.y} rx="13" ry="6.5" transform={`rotate(${g.a} ${g.x} ${g.y})`} fill={GREENS[i % 3]} />
        ))}
        {MARMITA.carrots.map((g, i) => (
          <rect
            key={i}
            x={(Number(g.x) - 8).toFixed(1)}
            y={(Number(g.y) - 2.2).toFixed(1)}
            width="16"
            height="4.4"
            rx="2.2"
            transform={`rotate(${g.a} ${g.x} ${g.y})`}
            fill="#f39a2b"
          />
        ))}
        {TOMATOES.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="9" fill="#e8423a" />
            <circle cx={x} cy={y} r="5.5" fill="#ff806f" />
            <circle cx={x - 2} cy={y - 1} r="1.3" fill="#ffe2a8" />
            <circle cx={x + 2} cy={y + 1.5} r="1.3" fill="#ffe2a8" />
          </g>
        ))}
      </g>

      <g className="c-food f4">
        <g transform="translate(58 104)">
          <path d="M6 30C2 12 18 0 44 2s48 10 50 30-18 34-46 32S10 48 6 30z" fill="#c9762a" />
          <path d="M8 28C6 14 20 5 44 6s42 10 44 26" fill="none" stroke="#e39a45" strokeWidth="5" strokeLinecap="round" opacity=".75" />
          <path d="M24 16l46 24M34 9l46 24M16 30l40 21" stroke="#7d3f12" strokeWidth="5" strokeLinecap="round" opacity=".5" />
          <ellipse cx="72" cy="20" rx="6" ry="3" transform="rotate(-30 72 20)" fill="#4f9a3c" />
          <ellipse cx="79" cy="24" rx="5" ry="2.6" transform="rotate(20 79 24)" fill="#6db552" />
        </g>
      </g>

      <g className="c-lid">
        <rect x="18" y="30" width="284" height="188" rx="32" fill="#fbf8f5" stroke="#e7dfd9" strokeWidth="3" />
        <rect x="118" y="20" width="84" height="16" rx="8" fill="#e7dfd9" />
        <rect x="100" y="104" width="120" height="40" rx="12" fill="#d92d43" />
        <text
          x="160"
          y="130"
          textAnchor="middle"
          fontWeight="800"
          fontSize="17"
          fill="#fff"
          letterSpacing="1"
          style={{ fontFamily: "var(--c-f-display)" }}
          {...(longLabel ? { textLength: 104, lengthAdjust: "spacingAndGlyphs" } : {})}
        >
          {lidLabel}
        </text>
      </g>
    </svg>
  );
}

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
        <Marmita lidLabel={lidLabel} />
        {FLOATIES.map((svg, i) => (
          <span key={i} className={`c-floaty is-${i + 1}`} aria-hidden="true">
            {svg}
          </span>
        ))}
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

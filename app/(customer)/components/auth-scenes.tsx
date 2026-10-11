"use client";

/**
 * Ilustrações que se alternam no painel da marca das telas de entrar (ver AuthScene): prato feito
 * brasileiro, hambúrguer sendo montado, vianda de três andares, frango assado e compras entrando numa
 * sacola. Todas usam o mesmo quadro 320×240 e o mesmo vocabulário de
 * movimento (`.c-dr`: a peça cai e quica no lugar), em auth-scenes.css. Parado (sem a classe `is-active`
 * na cena, ou com "reduzir movimento") o desenho aparece já pronto.
 */

import * as React from "react";
import "./auth-scenes.css";

/** Atraso da animação de cada peça, em segundos (variável CSS lida em auth-scenes.css). */
const d = (seconds: number) => ({ "--d": `${seconds}s` }) as React.CSSProperties;

/* ------------------------------------------------------------ prato feito */

/**
 * Prato feito brasileiro visto de cima: arroz, feijão, bife, batata frita e salada vão caindo no prato.
 * A cloche de inox (com o nome da casa) desce sobre ele enquanto a pessoa digita a senha (`.c-cloche`).
 */
export function PlateScene({ label }: { label: string }) {
  const id = "c-pf" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg className="c-box" viewBox="0 0 320 240" aria-label="Prato feito com arroz, feijão, bife, batata frita e salada" role="img">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9aa0a8" />
          <stop offset="0.3" stopColor="#f6f7f9" />
          <stop offset="0.6" stopColor="#cfd3d9" />
          <stop offset="1" stopColor="#868c95" />
        </linearGradient>
      </defs>

      <path className="c-lsteam s1" d="M120 40c-9-10 9-17 0-30" />
      <path className="c-lsteam s2" d="M164 34c-9-10 9-17 0-30" />
      <path className="c-lsteam s3" d="M208 40c-9-10 9-17 0-30" />

      <ellipse cx="160" cy="224" rx="132" ry="10" fill="#000" opacity=".2" />
      <ellipse cx="160" cy="136" rx="142" ry="90" fill="#fbf8f5" stroke="#e7dfd9" strokeWidth="3" />
      <ellipse cx="160" cy="136" rx="112" ry="68" fill="#f3eee8" />

      {/* feijão: caldo escuro com grãos */}
      <g className="c-dr" style={d(0.65)}>
        <path d="M184 100c8-16 40-20 56-8 14 10 10 30-6 38-22 10-58 4-60-12-1-8 4-14 10-18z" fill="#5a2a16" />
        {[
          [196, 106],
          [212, 98],
          [228, 106],
          [204, 120],
          [222, 122],
          [238, 114],
          [214, 110],
        ].map(([x, y], i) => (
          <g key={`${x}-${y}`} transform={`rotate(${i * 37} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx="6" ry="4" fill="#3f1c0e" />
            <ellipse cx={Number(x) - 1.5} cy={Number(y) - 1.2} rx="2.2" ry="1" fill="#a35d3d" />
          </g>
        ))}
      </g>
      {/* salada: folhas, tomate e cenoura */}
      <g className="c-dr" style={d(1.9)}>
        <g transform="translate(-4 -8)">
        {[
          [96, 98, -20, "#6db552"],
          [114, 88, 30, "#4f9a3c"],
          [130, 100, -50, "#8fcf6a"],
          [108, 108, 70, "#4f9a3c"],
        ].map(([x, y, a, f]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="20" ry="10" transform={`rotate(${a} ${x} ${y})`} fill={f as string} />
        ))}
        <circle cx="112" cy="98" r="9" fill="#e8423a" />
        <circle cx="109" cy="95" r="3.4" fill="#ff8a7a" />
        <rect x="124" y="104" width="22" height="5" rx="2.5" transform="rotate(-24 135 106)" fill="#f39a2b" />
        </g>
      </g>
      {/* arroz branquinho */}
      <g className="c-dr" style={d(0.2)}>
        <g transform="translate(-6 12)">
        <path d="M70 136c-4-22 14-38 40-36s52 14 50 36-18 34-48 34-40-12-42-34z" fill="#fffaf0" />
        {Array.from({ length: 34 }, (_, i) => {
          const a = i * 2.4;
          const x = 112 + Math.cos(a) * (6 + (i % 7) * 6);
          const y = 138 + Math.sin(a * 1.3) * (4 + (i % 5) * 5);
          return <ellipse key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="3.4" ry="1.6" transform={`rotate(${(i * 47) % 180} ${x.toFixed(1)} ${y.toFixed(1)})`} fill="#eadcbc" />;
        })}
        </g>
      </g>
      {/* bife grelhado */}
      <g className="c-dr" style={d(1.05)}>
        <g transform="translate(18 2)">
        <path d="M138 150c-6-18 14-32 42-30s52 12 48 34-24 30-48 28-38-12-42-32z" fill="#a8541a" />
        <path d="M144 146c-2-12 12-22 34-20s44 8 44 22" fill="none" stroke="#c9762a" strokeWidth="5" strokeLinecap="round" opacity=".7" />
        <path d="M156 136l44 30M172 130l44 30M146 152l34 24" stroke="#5a2a10" strokeWidth="5" strokeLinecap="round" opacity=".55" />
        </g>
      </g>
      {/* batata frita: palitinhos amontoados na frente do prato */}
      <g className="c-dr" style={d(1.45)}>
        {[
          [128, 190, -10],
          [150, 194, 8],
          [172, 190, -4],
          [194, 196, 12],
          [140, 182, 14],
          [166, 183, -14],
          [186, 184, 4],
        ].map(([x, y, a]) => (
          <g key={`${x}-${y}`} transform={`rotate(${a} ${x} ${y})`}>
            <rect x={Number(x) - 22} y={Number(y) - 4} width="44" height="8" rx="3" fill="#f5c04a" />
            <rect x={Number(x) - 22} y={Number(y) - 4} width="44" height="3" rx="1.5" fill="#ffe08a" opacity=".85" />
          </g>
        ))}
      </g>

      {/* cloche de inox que cobre o prato quando a senha é digitada */}
      <g className="c-cloche">
        <path d="M30 150C30-40 290-40 290 150A130 56 0 0 1 30 150z" fill={`url(#${id}-s)`} stroke="#9aa0a8" strokeWidth="2" />
        <rect x="154" y="2" width="12" height="14" rx="4" fill="#4a4f57" />
        <circle cx="160" cy="2" r="9" fill="#4a4f57" />
        <path d="M62 112c12-48 48-78 98-82" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".55" />
        <rect x="108" y="104" width="104" height="34" rx="17" fill="#d92d43" />
        <text
          x="160"
          y="128"
          textAnchor="middle"
          fontWeight="800"
          fontSize="17"
          fill="#fff"
          letterSpacing="1"
          style={{ fontFamily: "var(--c-f-display)" }}
          {...(label.length > 9 ? { textLength: 86, lengthAdjust: "spacingAndGlyphs" } : {})}
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- hambúrguer */

export function BurgerScene() {
  return (
    <svg className="c-box" viewBox="0 0 320 240" aria-hidden="true">
      <ellipse cx="160" cy="226" rx="104" ry="10" fill="#000" opacity=".2" />

      <g className="c-burger">
        {/* pão de baixo */}
        <g className="c-dr" style={d(0.15)}>
          <path d="M70 184h180c0 20-14 30-32 30H102c-18 0-32-10-32-30z" fill="#e8a24a" />
          <path d="M86 192h148" stroke="#f6c887" strokeWidth="4" strokeLinecap="round" opacity=".75" />
        </g>
        {/* hambúrguer */}
        <g className="c-dr" style={d(0.5)}>
          <rect x="66" y="158" width="188" height="30" rx="15" fill="#5a2d1a" />
          {[92, 118, 146, 172, 200, 228].map((x, i) => (
            <circle key={x} cx={x} cy={170 + (i % 2) * 8} r="3.2" fill="#7b4226" />
          ))}
        </g>
        {/* queijo escorrendo */}
        <g className="c-dr" style={d(0.85)}>
          <path d="M70 146h180v12h-34l-12 20-14-20h-44l-12 16-12-16H70z" fill="#ffc928" />
          <path d="M80 150h160" stroke="#ffe27a" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        </g>
        {/* tomate */}
        <g className="c-dr" style={d(1.2)}>
          {[100, 160, 220].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="140" rx="32" ry="10" fill="#e8423a" />
              <ellipse cx={x} cy="139" rx="22" ry="5.5" fill="#ff7b6b" />
            </g>
          ))}
        </g>
        {/* alface */}
        <g className="c-dr" style={d(1.55)}>
          <path d="M66 136q12-16 24 0t24 0t24 0t24 0t24 0t24 0t24 0t24 0v12H66z" fill="#6db552" />
          <path d="M72 140q10-9 20 0t20 0t20 0t20 0t20 0t20 0t20 0" stroke="#8fcf6a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* pão de cima, com gergelim */}
        <g className="c-dr" style={d(1.9)}>
          <path d="M68 132C68 62 252 62 252 132z" fill="#e8a24a" />
          <path d="M92 108c14-24 50-34 84-30" stroke="#f6c887" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".6" />
          {[
            [118, 96, 20],
            [152, 84, 80],
            [186, 92, 150],
            [212, 108, 30],
            [136, 112, 120],
            [176, 110, 60],
            [104, 118, 10],
            [230, 122, 100],
          ].map(([x, y, a]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="5.5" ry="2.8" transform={`rotate(${a} ${x} ${y})`} fill="#fff3d6" />
          ))}
        </g>
        {/* palito com bandeirinha, por último */}
        <g className="c-dr c-flag" style={d(2.4)}>
          <rect x="157" y="30" width="3.5" height="104" rx="1.8" fill="#c9a35f" />
          <path d="M160 30l30 10-30 10z" fill="#d92d43" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------ vianda de 3 andares */

/** Vianda de inox: três panelinhas redondas empilhadas, presas por uma armação de metal com alça de cabo preto. */
export function ViandaScene() {
  const id = "c-vi" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tier = (y: number, delay: number) => (
    <g className="c-dr" style={d(delay)}>
      <rect x="92" y={y} width="136" height="50" rx="12" fill={`url(#${id}-s)`} />
      {/* aro de cima, ranhura e brilho vertical do inox */}
      <rect x="88" y={y - 3} width="144" height="9" rx="4.5" fill="#cfd3d9" stroke="#9aa0a8" strokeWidth="1.5" />
      <rect x="96" y={y + 33} width="128" height="3" rx="1.5" fill="#8f959e" opacity=".55" />
      <rect x="108" y={y + 11} width="9" height="22" rx="4.5" fill="#fff" opacity=".6" />
    </g>
  );
  return (
    <svg className="c-box" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9aa0a8" />
          <stop offset="0.28" stopColor="#f6f7f9" />
          <stop offset="0.55" stopColor="#d3d7dc" />
          <stop offset="1" stopColor="#868c95" />
        </linearGradient>
      </defs>

      <ellipse cx="160" cy="230" rx="96" ry="9" fill="#000" opacity=".2" />

      <g className="c-vianda">
        {/* base de metal */}
        <g className="c-dr" style={d(0.1)}>
          <rect x="84" y="212" width="152" height="12" rx="6" fill="#4a4f57" />
        </g>
        {tier(164, 0.45)}
        {tier(114, 0.8)}
        {tier(64, 1.15)}
        {/* tampa abaulada com a ventilação */}
        <g className="c-dr" style={d(1.5)}>
          <path d="M96 62C96 30 224 30 224 62z" fill={`url(#${id}-s)`} stroke="#9aa0a8" strokeWidth="1.5" />
          <circle cx="160" cy="36" r="5" fill="#4a4f57" />
        </g>
        {/* armação com travas vermelhas e alça de cabo preto, por último */}
        <g className="c-dr" style={d(1.9)}>
          <rect x="82" y="58" width="5" height="160" rx="2.5" fill="#4a4f57" />
          <rect x="233" y="58" width="5" height="160" rx="2.5" fill="#4a4f57" />
          <path d="M84 60L100 18H220L236 60" stroke="#4a4f57" strokeWidth="5" fill="none" strokeLinejoin="round" />
          <rect x="126" y="8" width="68" height="18" rx="9" fill="#262a30" />
          <rect x="134" y="11" width="40" height="4" rx="2" fill="#fff" opacity=".28" />
          {[96, 146, 196].map((y) => (
            <rect key={y} x="78" y={y} width="13" height="9" rx="3" fill="#d92d43" />
          ))}
          {[96, 146, 196].map((y) => (
            <rect key={`r${y}`} x="229" y={y} width="13" height="9" rx="3" fill="#d92d43" />
          ))}
        </g>
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------- frango assado */

export function ChickenScene() {
  const id = "c-ch" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const leg = (
    <g>
      <ellipse cx="108" cy="176" rx="36" ry="17" transform="rotate(-24 108 176)" fill={`url(#${id}-g)`} />
      <ellipse cx="100" cy="171" rx="17" ry="5" transform="rotate(-24 100 171)" fill="#fff" opacity=".28" />
      <rect x="56" y="178" width="26" height="9" rx="4.5" transform="rotate(-24 69 182)" fill="#fff3dc" />
      <circle cx="58" cy="190" r="6.5" fill="#fff3dc" />
      <circle cx="68" cy="198" r="6.5" fill="#fff3dc" />
    </g>
  );
  return (
    <svg className="c-box" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0a53a" />
          <stop offset="0.55" stopColor="#cf7a22" />
          <stop offset="1" stopColor="#a8541a" />
        </linearGradient>
      </defs>

      <path className="c-lsteam s1" d="M126 46c-9-10 9-17 0-30" />
      <path className="c-lsteam s2" d="M160 40c-9-10 9-17 0-30" />
      <path className="c-lsteam s3" d="M196 46c-9-10 9-17 0-30" />

      <ellipse cx="160" cy="226" rx="124" ry="9" fill="#000" opacity=".2" />
      <ellipse cx="160" cy="204" rx="126" ry="26" fill="#fbf8f5" stroke="#e7dfd9" strokeWidth="3" />
      <ellipse cx="160" cy="204" rx="100" ry="17" fill="#f1ebe4" />

      {/* batatas e alecrim chegam depois do frango */}
      {[
        [52, 198, 1.15],
        [84, 214, 1.3],
        [236, 214, 1.45],
        [268, 198, 1.6],
      ].map(([x, y, delay]) => (
        <g key={`${x}`} className="c-pop" style={d(delay)}>
          <ellipse cx={x} cy={y} rx="16" ry="12" fill="#e2a43a" />
          <ellipse cx={x - 4} cy={y - 3} rx="8" ry="4" fill="#f4c566" opacity=".85" />
          <circle cx={x + 5} cy={y + 3} r="1.8" fill="#b9791d" />
        </g>
      ))}

      <g className="c-pop c-big" style={d(0.1)}>
        <path
          d="M96 128C92 84 136 52 176 56c46 4 74 34 70 74-3 30-34 52-82 52-40 0-66-22-68-54z"
          fill={`url(#${id}-g)`}
        />
        <ellipse cx="136" cy="96" rx="30" ry="14" transform="rotate(-28 136 96)" fill="#fff" opacity=".3" />
        <ellipse cx="200" cy="132" rx="22" ry="13" transform="rotate(24 200 132)" fill="#a8541a" opacity=".55" />
        {[
          [124, 134],
          [152, 150],
          [186, 108],
          [212, 96],
          [168, 82],
          [142, 120],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#8e4313" opacity=".4" />
        ))}
      </g>

      <g className="c-pop" style={d(0.5)}>{leg}</g>
      {/* o espelho fica num grupo de fora: a animação (CSS) não pode ocupar o `transform` do mesmo grupo */}
      <g transform="matrix(-1 0 0 1 320 0)">
        <g className="c-pop" style={d(0.65)}>
          {leg}
        </g>
      </g>

      {[
        [78, 188, -30],
        [250, 186, 28],
      ].map(([x, y, a]) => (
        <g key={`${x}`} className="c-pop" style={d(1.75)}>
          <path d={`M${x} ${y}l20-12`} stroke="#4f9a3c" strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} ${x} ${y})`} />
          <path d={`M${Number(x) + 6} ${Number(y) - 4}l9-10M${Number(x) + 12} ${Number(y) - 8}l8-9`} stroke="#6db552" strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} ${x} ${y})`} />
        </g>
      ))}

      <g className="c-tw">
        <path d="M218 74l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#fff" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ sacola */

/** Sacola de papel kraft (clara, para destacar do fundo vermelho) recebendo as compras: garrafa, folhas, tomates e pão. */
export function BagScene({ label }: { label: string }) {
  return (
    <svg className="c-box" viewBox="0 0 320 240" aria-hidden="true">
      <ellipse cx="160" cy="230" rx="100" ry="9" fill="#000" opacity=".2" />

      <g className="c-bag">
        {/* alças de corda, atrás de tudo */}
        <path d="M112 128C112 64 208 64 208 128" stroke="#9c7440" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* fundo da sacola, por dentro */}
        <rect x="78" y="116" width="164" height="104" rx="8" fill="#c9a169" />

        {/* pão de forma francês, inclinado, o primeiro a entrar */}
        <g className="c-dr" style={d(0.3)}>
          <g transform="rotate(14 214 110)">
            <rect x="200" y="22" width="30" height="140" rx="15" fill="#e0a85e" />
            <path d="M204 44l22 6M204 70l22 6M204 96l22 6" stroke="#b97d33" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>
        {/* garrafa de suco */}
        <g className="c-dr" style={d(0.85)}>
          <rect x="94" y="62" width="34" height="100" rx="10" fill="#f39a2b" />
          <rect x="102" y="40" width="18" height="26" rx="5" fill="#f6b04e" />
          <rect x="100" y="32" width="22" height="12" rx="4" fill="#d92d43" />
          <rect x="100" y="86" width="22" height="30" rx="5" fill="#fff" opacity=".85" />
          <rect x="99" y="68" width="5" height="40" rx="2.5" fill="#fff" opacity=".4" />
        </g>
        {/* folhas verdes */}
        <g className="c-dr" style={d(1.4)}>
          <path d="M128 130C112 100 124 62 148 52c10 28 6 54-20 78z" fill="#6db552" />
          <path d="M146 128c-6-32 6-62 30-72 14 28 6 58-30 72z" fill="#4f9a3c" />
          <path d="M132 126c3-26 8-46 14-64" stroke="#3f8a2e" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
        {/* tomates */}
        <g className="c-dr" style={d(1.95)}>
          {[
            [166, 112, 26],
            [198, 122, 22],
          ].map(([x, y, r]) => (
            <g key={`${x}`}>
              <circle cx={x} cy={y} r={r} fill="#e8423a" />
              <circle cx={Number(x) - 5} cy={Number(y) - 6} r={Number(r) * 0.4} fill="#ff8a7a" opacity=".85" />
              <path d={`M${Number(x) - 7} ${Number(y) - Number(r) + 3}c5 6 9 6 14 0`} stroke="#4f9a3c" strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          ))}
        </g>

        {/* frente da sacola, em papel claro com a faixa da marca */}
        <rect x="78" y="124" width="164" height="96" rx="12" fill="#f4dfb8" />
        <rect x="78" y="124" width="164" height="12" rx="6" fill="#e6c88f" />
        <path d="M92 214h136" stroke="#d8bd86" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
        <rect x="104" y="156" width="112" height="38" rx="19" fill="#d92d43" />
        <text
          x="160"
          y="181"
          textAnchor="middle"
          fontWeight="800"
          fontSize="19"
          fill="#fff"
          letterSpacing="1.2"
          style={{ fontFamily: "var(--c-f-display)" }}
          {...(label.length > 9 ? { textLength: 92, lengthAdjust: "spacingAndGlyphs" } : {})}
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

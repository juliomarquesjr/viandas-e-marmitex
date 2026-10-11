"use client";

import * as React from "react";
import "./empty.css";

export type EmptyArtKind = "order" | "ficha" | "menu" | "bell";

/**
 * Ilustração animada das listas vazias, no estilo do aplicativo (cores pelos tokens, então acompanha o
 * tema escuro). Anéis que pulsam, o desenho que flutua e detalhes que se mexem; com "reduzir movimento"
 * ligado no aparelho tudo fica parado (ver empty.css).
 */
export function EmptyArt({ kind }: { kind: EmptyArtKind }) {
  return (
    <div className={`c-emp-art${kind === "bell" ? " is-ok" : ""}`} aria-hidden="true">
      <span className="c-emp-ring" />
      <span className="c-emp-ring" />
      <span className="c-emp-bg" />
      <svg viewBox="0 0 120 120">
        {kind === "order" && (
          <>
            <g fill="none" strokeWidth="3.5" strokeLinecap="round" className="s-steam">
              <path className="a-steam" d="M44 40c-6-6 6-10 0-18" />
              <path className="a-steam" style={{ animationDelay: "0.8s" }} d="M60 40c-6-6 6-10 0-18" />
              <path className="a-steam" style={{ animationDelay: "1.6s" }} d="M76 40c-6-6 6-10 0-18" />
            </g>
            <path className="a-brand" d="M26 64h68l-7 31a9 9 0 0 1-9 7H42a9 9 0 0 1-9-7z" />
            <rect className="a-deep" x="21" y="52" width="78" height="15" rx="7.5" />
            <rect className="a-paper" x="30" y="56" width="28" height="3.5" rx="1.75" opacity="0.35" />
            <circle className="a-soft" cx="60" cy="82" r="9" />
            <path className="s-brand" d="M56 82.5l3 3 5.5-6" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path className="a-brand a-twinkle" d="M100 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" style={{ transformOrigin: "100px 37px" }} />
          </>
        )}
        {kind === "ficha" && (
          <>
            <rect className="a-paper s-brand" x="28" y="26" width="58" height="76" rx="9" strokeWidth="3.5" />
            <rect className="a-brand" x="28" y="26" width="58" height="16" rx="9" />
            <rect className="a-brand" x="28" y="34" width="58" height="8" />
            <g fill="none" strokeWidth="3" strokeLinecap="round" className="s-line">
              <path d="M38 56h38" />
              <path d="M38 68h38" />
            </g>
            <path className="s-brand" d="M38 82c6-6 9 4 14-2s8 2 14-1" fill="none" strokeWidth="3" strokeLinecap="round" />
            <g className="a-flip">
              <circle className="a-gold" cx="90" cy="30" r="14" />
              <circle cx="90" cy="30" r="9.5" fill="none" stroke="#c98a2b" strokeWidth="2.4" />
              <path d="M90 25v10M86.5 28.5c1-2 6-2 7 0s-7 2-7 4.5c0 1.8 5.5 2.8 7 0" fill="none" stroke="#c98a2b" strokeWidth="2" strokeLinecap="round" />
            </g>
            <path className="a-brand a-twinkle" d="M104 66l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" style={{ transformOrigin: "104px 72px" }} />
          </>
        )}
        {kind === "menu" && (
          <>
            <g fill="none" strokeWidth="3.5" strokeLinecap="round" className="s-steam">
              <path className="a-steam" d="M48 40c-6-6 6-10 0-18" />
              <path className="a-steam" style={{ animationDelay: "0.9s" }} d="M62 40c-6-6 6-10 0-18" />
            </g>
            <g className="a-lid">
              <rect className="a-deep" x="30" y="50" width="60" height="9" rx="4.5" />
              <rect className="a-deep" x="55" y="43" width="10" height="9" rx="4" />
            </g>
            <path className="a-brand" d="M32 60h56v26a14 14 0 0 1-14 14H46a14 14 0 0 1-14-14z" />
            <rect className="a-deep" x="21" y="66" width="12" height="6" rx="3" />
            <rect className="a-deep" x="87" y="66" width="12" height="6" rx="3" />
            <rect className="a-paper" x="40" y="68" width="24" height="3.5" rx="1.75" opacity="0.3" />
            <circle className="a-paper s-ink" cx="93" cy="33" r="15" strokeWidth="3" />
            <path className="s-ink" d="M93 33V24" fill="none" strokeWidth="3" strokeLinecap="round" />
            <path className="s-brand a-hand" d="M93 33l7 4" fill="none" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === "bell" && (
          <>
            <g className="a-swing">
              <path className="a-ok" d="M60 24c-17 0-27 12-27 29 0 18-7 23-10 28h74c-3-5-10-10-10-28 0-17-10-29-27-29z" />
              <rect className="a-ok" x="58" y="16" width="4" height="10" rx="2" />
              <path className="a-ok" d="M51 88a9 9 0 0 0 18 0z" opacity="0.8" />
              <path d="M44 58c1-8 7-13 13-14" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
            </g>
            <g className="a-ok" fontFamily="var(--c-f-display)" fontWeight="800">
              <text className="a-zz" x="92" y="34" fontSize="15">z</text>
              <text className="a-zz" style={{ animationDelay: "0.9s" }} x="100" y="22" fontSize="11">z</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

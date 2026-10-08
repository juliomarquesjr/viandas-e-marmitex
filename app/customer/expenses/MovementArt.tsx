"use client";

import type { CSSProperties } from "react";
import type { Movement } from "../components/ficha/movements";
import { cx } from "../components/kit";
import "./receipt.css";

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Ilustração animada do lançamento, no mesmo círculo tingido do andamento do pedido (StatusArt):
 * pagamento é o selo que carimba (disco, check, anéis e faíscas); compra é a sacola que recebe os itens.
 */
export function MovementArt({ movement, size = 84 }: { movement: Movement; size?: number }) {
  const isPay = movement.kind === "pay";

  return (
    <span
      className={cx("c-art", isPay ? "is-done" : "is-prog")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 72" width={size} height={size}>
        {isPay ? (
          <>
            <circle className="c-seal-ripple" cx="36" cy="36" r="20" />
            <circle className="c-seal-ripple r2" cx="36" cy="36" r="20" />
            {SPARKS.map((angle) => (
              <line
                key={angle}
                className="c-seal-spark"
                x1="36"
                y1="4"
                x2="36"
                y2="10"
                style={{ "--a": `${angle}deg` } as CSSProperties}
              />
            ))}
            <g className="c-seal-disc">
              <circle cx="36" cy="36" r="20" fill="currentColor" />
              <path
                className="c-seal-check"
                d="m26 37 7 7 13-14"
                fill="none"
                stroke="var(--c-surface)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </>
        ) : (
          <>
            {/* itens caem na sacola, um depois do outro; a frente da sacola os esconde ao entrar */}
            <rect className="c-drop d1" x="25" y="14" width="8" height="18" rx="3" fill="currentColor" opacity=".55" />
            <circle className="c-drop d2" cx="39" cy="24" r="5.5" fill="currentColor" opacity=".55" />
            <rect
              className="c-drop d3"
              x="44"
              y="18"
              width="9"
              height="12"
              rx="2.5"
              fill="currentColor"
              opacity=".55"
            />
            <g className="c-sack">
              <path d="M18 31h36l-3 26a3 3 0 0 1-3 2.6H24a3 3 0 0 1-3-2.6z" fill="currentColor" />
              <path d="M18 31h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path
                d="M28 41c2 3.5 4.5 5 8 5s6-1.5 8-5"
                fill="none"
                stroke="var(--c-surface)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </>
        )}
      </svg>
    </span>
  );
}

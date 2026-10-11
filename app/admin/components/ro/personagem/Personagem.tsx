"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { animarPersonagem, type PersonagemAnimado } from "./animacao";
import { desenhoSVG } from "./desenho";
import type { RoEstado } from "./estados";
import "./personagem.css";

interface PersonagemProps {
  estado: RoEstado;
  /** "corpo" = busto inteiro com braços; "rosto" = só a cabeça (foto do cabeçalho). */
  modo?: "corpo" | "rosto";
  className?: string;
}

/** A RO desenhada e animada. É só enfeite: o que ela está fazendo também aparece em texto na tela. */
export function Personagem({ estado, modo = "corpo", className }: PersonagemProps) {
  const caixa = useRef<HTMLDivElement>(null);
  const animacao = useRef<PersonagemAnimado | null>(null);
  const estadoAtual = useRef(estado);
  const ultimo = useRef<RoEstado | null>(null);
  estadoAtual.current = estado;

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    // o desenho é um texto fixo do código (sem nenhum dado de pessoa)
    el.innerHTML = desenhoSVG(modo === "rosto" ? "rosto" : undefined);
    const svg = el.querySelector("svg");
    if (!svg) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = animarPersonagem(svg as SVGSVGElement, reduzir);
    animacao.current = a;
    ultimo.current = estadoAtual.current;
    a.ir(estadoAtual.current);
    return () => {
      a.destruir();
      animacao.current = null;
      ultimo.current = null;
      el.innerHTML = "";
    };
  }, [modo]);

  useEffect(() => {
    if (ultimo.current === estado) return;
    ultimo.current = estado;
    animacao.current?.ir(estado);
  }, [estado]);

  return <div ref={caixa} aria-hidden="true" className={cn("ro-pers-caixa", className)} />;
}

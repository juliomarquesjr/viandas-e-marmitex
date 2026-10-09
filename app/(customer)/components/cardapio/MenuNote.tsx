"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { addDays, MENUS_URL, type MenusResponse } from "../../lib/menu-api";
import { useCustomerData } from "../../lib/useCustomerData";
import "./cardapio.css";

/**
 * Aviso do Início: o cardápio de hoje está publicado. Sem cardápio (ou sem a busca funcionar),
 * não aparece: nada de espaço vazio nem mensagem de "indisponível" na tela principal.
 */
export function MenuNote({ style }: { style?: React.CSSProperties }) {
  const { data } = useCustomerData<MenusResponse>(`${MENUS_URL}?limit=3`);
  if (!data) return null;

  const today = data.menus.find((m) => m.date === data.today);
  const tomorrow = data.menus.find((m) => m.date === addDays(data.today, 1));
  const menu = today ?? tomorrow;
  if (!menu) return null;

  const extra = menu.itemCount - 1;
  const summary = menu.highlight
    ? extra > 0
      ? `${menu.highlight} e mais ${extra} ${extra === 1 ? "item" : "itens"}`
      : menu.highlight
    : `${menu.itemCount} itens`;
  const label = today ? "Cardápio de hoje disponível" : "Cardápio de amanhã disponível";

  return (
    <Link
      href={today ? "/cardapio" : `/cardapio?dia=${menu.date}`}
      className="c-mn-note-link c-home-menu c-rise"
      style={style}
      aria-label={`${label}: ${summary}. Toque para ver`}
    >
      <span className="c-mn-note-ic" aria-hidden="true">
        <BookOpen size={20} />
      </span>
      <span className="c-mn-note-t">
        <span>{label}</span>
        <strong>{summary}</strong>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  );
}

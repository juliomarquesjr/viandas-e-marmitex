/** Cardápio do dia, no navegador do cliente: endereços, tipos e textos de data. */

import type { MenuSummary } from "@/lib/daily-menu";
import type { MenuDTO } from "@/lib/daily-menu-db";

export const MENUS_URL = "/api/customer/menus";
export const menuUrl = (day: string) => `${MENUS_URL}/${day}`;

export interface MenusResponse {
  /** Hoje em Brasília ("AAAA-MM-DD"), do servidor. */
  today: string;
  menus: MenuSummary[];
}

export interface MenuResponse {
  today: string;
  menu: Omit<MenuDTO, "notifyCustomers" | "updatedAt"> | null;
}

export type { MenuSummary };

/** Soma dias a "AAAA-MM-DD" sem depender do fuso do aparelho. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const dayDate = (day: string) => new Date(`${day}T12:00:00Z`);
const fmt = (day: string, options: Intl.DateTimeFormatOptions) =>
  dayDate(day).toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sex" */
export const weekdayShort = (day: string) => cap(fmt(day, { weekday: "short" }).replace(".", ""));
/** "9" */
export const dayNumber = (day: string) => String(Number(day.slice(8, 10)));
/** "Sexta-feira, 9 de outubro" */
export const longDay = (day: string) => cap(fmt(day, { weekday: "long", day: "numeric", month: "long" }));
/** "sexta-feira" */
export const weekdayLong = (day: string) => fmt(day, { weekday: "long" });
/** "09/10" */
export const shortDate = (day: string) => fmt(day, { day: "2-digit", month: "2-digit" });

/** "Hoje", "Amanhã", "Ontem" ou o dia da semana. */
export function relativeDay(day: string, today: string): string {
  if (day === today) return "Hoje";
  if (day === addDays(today, 1)) return "Amanhã";
  if (day === addDays(today, -1)) return "Ontem";
  return weekdayShort(day);
}

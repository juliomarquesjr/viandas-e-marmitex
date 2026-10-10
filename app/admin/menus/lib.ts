// Cardápio do dia, no admin: tipos, chamadas à API, datas e a conversão entre a tela e o servidor.

import type { MenuSummary } from "@/lib/daily-menu";
import type { MenuDTO } from "@/lib/daily-menu-db";
import { addDaysToDay } from "@/lib/date-range";

export type { MenuDTO, MenuSummary };

export const addDays = addDaysToDay;

const at = (day: string) => new Date(`${day}T12:00:00Z`);
const fmt = (day: string, options: Intl.DateTimeFormatOptions) =>
  at(day).toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const weekdayShort = (day: string) => cap(fmt(day, { weekday: "short" }).replace(".", ""));
export const weekdayLong = (day: string) => fmt(day, { weekday: "long" });
export const dayNumber = (day: string) => String(Number(day.slice(8, 10)));
/** "9/10" */
export const dayMonth = (day: string) => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
/** "sexta-feira, 9 de outubro" */
export const longDay = (day: string) => fmt(day, { weekday: "long", day: "numeric", month: "long" });
/** "5 a 11 de outubro" (a semana de segunda a domingo que começa em `monday`) */
export function weekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const month = (d: string) => fmt(d, { month: "long" });
  return month(monday) === month(sunday)
    ? `${dayNumber(monday)} a ${dayNumber(sunday)} de ${month(sunday)}`
    : `${dayNumber(monday)} de ${month(monday)} a ${dayNumber(sunday)} de ${month(sunday)}`;
}

/** A segunda-feira da semana de `day`. */
export function mondayOf(day: string): string {
  const wd = at(day).getUTCDay(); // 0 = domingo
  return addDays(day, -((wd + 6) % 7));
}

/* ------------------------------------------------------------------ rascunho */

export interface DraftItem {
  key: string;
  name: string;
  description: string;
  featured: boolean;
  vegetarian: boolean;
}

export interface DraftSection {
  key: string;
  name: string;
  items: DraftItem[];
}

export interface Draft {
  title: string;
  note: string;
  status: "draft" | "published";
  showOrderButton: boolean;
  notifyCustomers: boolean;
  sections: DraftSection[];
}

let counter = 0;
export const newKey = () => `k${++counter}`;

export const blankItem = (): DraftItem => ({ key: newKey(), name: "", description: "", featured: false, vegetarian: false });
export const blankSection = (name = ""): DraftSection => ({ key: newKey(), name, items: [blankItem()] });

export const SECTION_SUGGESTIONS = ["Pratos principais", "Acompanhamentos", "Saladas", "Sobremesa", "Bebidas"];

export function emptyDraft(): Draft {
  return { title: "", note: "", status: "draft", showOrderButton: false, notifyCustomers: false, sections: [blankSection("Pratos principais")] };
}

export function toDraft(menu: MenuDTO, asCopy = false): Draft {
  return {
    title: menu.title ?? "",
    note: menu.note ?? "",
    status: asCopy ? "draft" : menu.status,
    showOrderButton: menu.showOrderButton,
    notifyCustomers: asCopy ? false : menu.notifyCustomers,
    sections: menu.sections.map((s) => ({
      key: newKey(),
      name: s.name,
      items: s.items.map((i) => ({
        key: newKey(),
        name: i.name,
        description: i.description ?? "",
        featured: i.featured,
        vegetarian: i.vegetarian,
      })),
    })),
  };
}

/** O que vai para a API (o servidor ainda valida e limpa tudo). */
export function toPayload(draft: Draft) {
  return {
    title: draft.title,
    note: draft.note,
    status: draft.status,
    showOrderButton: draft.showOrderButton,
    notifyCustomers: draft.notifyCustomers,
    sections: draft.sections.map((s) => ({
      name: s.name,
      items: s.items.map((i) => ({ name: i.name, description: i.description, featured: i.featured, vegetarian: i.vegetarian })),
    })),
  };
}

/** Compara o que está na tela com o salvo, sem olhar as chaves internas. */
export const fingerprint = (draft: Draft) => JSON.stringify(toPayload(draft));

export const filledItems = (draft: Draft) => draft.sections.reduce((n, s) => n + s.items.filter((i) => i.name.trim()).length, 0);

/* ----------------------------------------------------------------------- API */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function api<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, message: (json as { error?: string } | null)?.error || "Algo deu errado. Tente de novo." };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "Sem conexão. Tente de novo." };
  }
}

export const menuApi = (day: string) => `/api/admin/menus/${day}`;

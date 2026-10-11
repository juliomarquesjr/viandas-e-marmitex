// Regras do cardápio do dia (sem banco, sem React).
//
// Um cardápio por dia ("AAAA-MM-DD", dia de Brasília), com seções e itens. O administrador salva como
// rascunho ou publica; o cliente só enxerga o publicado, até o dia de amanhã.

import { addDaysToDay } from './date-range';

export const MENU_LIMITS = {
  SECTIONS: 12,
  ITEMS_PER_SECTION: 40,
  TITLE: 80,
  NOTE: 200,
  SECTION_NAME: 60,
  ITEM_NAME: 80,
  ITEM_DESCRIPTION: 160,
} as const;

export type MenuStatus = 'draft' | 'published';

export interface MenuItemInput {
  name: string;
  description: string | null;
  featured: boolean;
  vegetarian: boolean;
}

export interface MenuSectionInput {
  name: string;
  items: MenuItemInput[];
}

export interface MenuInput {
  title: string | null;
  note: string | null;
  status: MenuStatus;
  showOrderButton: boolean;
  notifyCustomers: boolean;
  sections: MenuSectionInput[];
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-09" de verdade (existe no calendário). */
export function isValidDay(day: unknown): day is string {
  if (typeof day !== 'string' || !DAY_RE.test(day)) return false;
  const d = new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export type ValidationResult = { ok: true; value: MenuInput } | { ok: false; error: string };

/** Valida e limpa o que veio do navegador. Seções sem itens e itens sem nome são descartados. */
export function validateMenuInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Cardápio inválido.' };
  const body = raw as Record<string, unknown>;

  const status = body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : null;
  if (!status) return { ok: false, error: 'Escolha se o cardápio fica publicado ou como rascunho.' };
  if (!Array.isArray(body.sections)) return { ok: false, error: 'Cardápio sem seções.' };
  if (body.sections.length > MENU_LIMITS.SECTIONS) {
    return { ok: false, error: `Use até ${MENU_LIMITS.SECTIONS} seções.` };
  }

  const sections: MenuSectionInput[] = [];
  for (const rawSection of body.sections) {
    if (!rawSection || typeof rawSection !== 'object') continue;
    const s = rawSection as Record<string, unknown>;
    const rawItems = Array.isArray(s.items) ? s.items : [];
    if (rawItems.length > MENU_LIMITS.ITEMS_PER_SECTION) {
      return { ok: false, error: `Use até ${MENU_LIMITS.ITEMS_PER_SECTION} itens por seção.` };
    }
    const items: MenuItemInput[] = [];
    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const i = rawItem as Record<string, unknown>;
      const name = text(i.name, MENU_LIMITS.ITEM_NAME);
      if (!name) continue;
      items.push({
        name,
        description: text(i.description, MENU_LIMITS.ITEM_DESCRIPTION),
        featured: i.featured === true,
        vegetarian: i.vegetarian === true,
      });
    }
    if (items.length === 0) continue;
    sections.push({ name: text(s.name, MENU_LIMITS.SECTION_NAME) ?? 'Itens', items });
  }

  if (status === 'published' && sections.length === 0) {
    return { ok: false, error: 'Para publicar, coloque pelo menos um item no cardápio.' };
  }

  // um só destaque por cardápio: o primeiro marcado vale
  let featuredSeen = false;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.featured && featuredSeen) item.featured = false;
      if (item.featured) featuredSeen = true;
    }
  }

  return {
    ok: true,
    value: {
      title: text(body.title, MENU_LIMITS.TITLE),
      note: text(body.note, MENU_LIMITS.NOTE),
      status,
      showOrderButton: body.showOrderButton !== false,
      notifyCustomers: status === 'published' && body.notifyCustomers === true,
      sections,
    },
  };
}

export interface MenuSummary {
  date: string;
  title: string | null;
  status: MenuStatus;
  itemCount: number;
  /** Até 3 itens da primeira seção (o que o cliente reconhece como "o prato do dia"). */
  mains: string[];
  /** O destaque marcado ou, sem ele, o primeiro item. */
  highlight: string | null;
}

interface SummarySource {
  date: string;
  title: string | null;
  status: string;
  sections: { items: { name: string; featured: boolean }[] }[];
}

export function summarizeMenu(menu: SummarySource): MenuSummary {
  const all = menu.sections.flatMap((s) => s.items);
  const featured = all.find((i) => i.featured);
  return {
    date: menu.date,
    title: menu.title,
    status: menu.status === 'published' ? 'published' : 'draft',
    itemCount: all.length,
    mains: (menu.sections[0]?.items ?? []).slice(0, 3).map((i) => i.name),
    highlight: featured?.name ?? all[0]?.name ?? null,
  };
}

/**
 * Quantos dias à frente o cliente enxerga (configurado pelo administrador). Cardápio publicado além disso
 * fica guardado e aparece sozinho quando o dia se aproxima. 1 = só hoje e amanhã.
 */
export const MENU_DAYS_AHEAD = { DEFAULT: 7, MIN: 1, MAX: 30, OPTIONS: [1, 7, 14, 30] } as const;

/** Aceita número ou texto; o que não for inteiro entre o mínimo e o máximo volta ao padrão. */
export function parseDaysAhead(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isInteger(n) && n >= MENU_DAYS_AHEAD.MIN && n <= MENU_DAYS_AHEAD.MAX ? n : MENU_DAYS_AHEAD.DEFAULT;
}

/** O cliente vê cardápio publicado de hoje para trás e até `daysAhead` dias à frente. */
export function lastVisibleDay(today: string, daysAhead: number = MENU_DAYS_AHEAD.DEFAULT): string {
  return addDaysToDay(today, parseDaysAhead(daysAhead));
}

export function isVisibleToCustomer(menu: { date: string; status: string }, today: string, daysAhead: number = MENU_DAYS_AHEAD.DEFAULT): boolean {
  return menu.status === 'published' && menu.date <= lastVisibleDay(today, daysAhead);
}

/** Primeiro dia em que o cliente passa a ver o cardápio deste dia (nunca antes de hoje). */
export function visibleFromDay(day: string, today: string, daysAhead: number = MENU_DAYS_AHEAD.DEFAULT): string {
  const from = addDaysToDay(day, -parseDaysAhead(daysAhead));
  return from < today ? today : from;
}

export type CustomerVisibility = 'visible' | 'soon' | 'hidden';

/** Como o cliente enxerga um cardápio: já vê, aparece em breve (publicado, fora da janela) ou nunca (rascunho). */
export function customerVisibility(menu: { date: string; status: string }, today: string, daysAhead: number = MENU_DAYS_AHEAD.DEFAULT): CustomerVisibility {
  if (menu.status !== 'published') return 'hidden';
  return menu.date <= lastVisibleDay(today, daysAhead) ? 'visible' : 'soon';
}

/** "Esta semana", "Semana passada", "Há 2 semanas"... para agrupar a lista de anteriores. */
export function weekGroupLabel(day: string, today: string): string {
  const monday = (d: string) => {
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay(); // 0 = domingo
    return addDaysToDay(d, -((wd + 6) % 7));
  };
  const weeks = Math.round(
    (new Date(`${monday(today)}T12:00:00Z`).getTime() - new Date(`${monday(day)}T12:00:00Z`).getTime()) / (7 * 86_400_000)
  );
  if (weeks <= 0) return weeks < 0 ? 'Próximos dias' : 'Esta semana';
  if (weeks === 1) return 'Semana passada';
  return `Há ${weeks} semanas`;
}

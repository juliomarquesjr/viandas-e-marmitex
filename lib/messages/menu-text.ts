// Texto do cardápio do dia para a mensagem de WhatsApp (puro, testado em tests/menu-message.test.ts).

export interface MenuForMessage {
  date: string; // "AAAA-MM-DD" de Brasília
  title: string | null;
  note: string | null;
  sections: { name: string; items: { name: string; description: string | null; featured: boolean; vegetarian: boolean }[] }[];
}

/** O quanto do texto do cardápio cabe na mensagem (o WhatsApp aceita 4096 no total). */
export const MENU_MESSAGE_MAX = 3000;

const CAPITALIZE = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Quinta-feira, 09/10" */
export function menuDayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  const weekday = CAPITALIZE(d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }));
  return `${weekday}, ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/** Quantos itens o cardápio tem. */
export const countMenuItems = (menu: MenuForMessage) => menu.sections.reduce((n, s) => n + s.items.length, 0);

/**
 * Cardápio organizado por seção, no formato do WhatsApp (*negrito*), com ⭐ no destaque e "(vegetariano)".
 * Cardápio grande é cortado no fim, com "…e mais N itens", para a mensagem caber.
 */
export function formatMenuMessage(menu: MenuForMessage, max: number = MENU_MESSAGE_MAX): string {
  const head = [`📅 *${menuDayLabel(menu.date)}*`];
  if (menu.title) head.push(`_${menu.title}_`);

  // linhas em blocos (cada seção é um bloco), para cortar item a item
  const total = countMenuItems(menu);
  const reserve = 60; // espaço para o "…e mais N itens"
  let used = head.join('\n').length;
  let shown = 0;
  const blocks: string[] = [];

  for (const section of menu.sections) {
    const lines: string[] = [`*${section.name.trim() || 'Itens'}*`];
    let sectionShown = 0;
    for (const item of section.items) {
      const parts = [`• ${item.name}`];
      if (item.featured) parts.push('⭐');
      if (item.vegetarian) parts.push('(vegetariano)');
      let line = parts.join(' ');
      if (item.description) line += ` – ${item.description}`;
      const next = used + 2 + lines.join('\n').length + 1 + line.length;
      if (next > max - reserve && shown < total) {
        // sem espaço: para de listar
        used = max; // marca como cheio
        break;
      }
      lines.push(line);
      sectionShown += 1;
      shown += 1;
    }
    if (sectionShown > 0) {
      blocks.push(lines.join('\n'));
      if (used < max) used += 2 + lines.join('\n').length;
    }
    if (used >= max) break;
  }

  const out = [head.join('\n'), ...blocks];
  const omitted = total - shown;
  if (omitted > 0) out.push(`_…e mais ${omitted} ${omitted === 1 ? 'item' : 'itens'}. Veja o cardápio completo no aplicativo._`);
  else if (menu.note) out.push(`_${menu.note}_`);
  return out.join('\n\n');
}

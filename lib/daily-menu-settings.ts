// Configuração dos cardápios (servidor): quantos dias à frente o cliente enxerga.
// Fica em SystemConfig (categoria "menus"), então não precisa de migration.

import prisma from '@/lib/prisma';
import { MENU_DAYS_AHEAD, parseDaysAhead } from '@/lib/daily-menu';

const KEY = 'menu_days_ahead';

export async function getMenuDaysAhead(): Promise<number> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: KEY } });
    return parseDaysAhead(row?.value);
  } catch {
    return MENU_DAYS_AHEAD.DEFAULT;
  }
}

export async function setMenuDaysAhead(value: unknown): Promise<number> {
  const daysAhead = parseDaysAhead(value);
  await prisma.systemConfig.upsert({
    where: { key: KEY },
    update: { value: String(daysAhead) },
    create: { key: KEY, value: String(daysAhead), type: 'text', category: 'menus' },
  });
  return daysAhead;
}

// Envio do cardápio do dia pelo WhatsApp: individual e em massa (o navegador percorre a lista, uma pessoa por vez).

import prisma from '@/lib/prisma';
import { getMenu, type MenuDTO } from '@/lib/daily-menu-db';
import { startOfDaySP, todaySP } from '@/lib/date-range';
import { countMenuItems, formatMenuMessage } from './menu-text';
import { channelReadiness, previewCustomerMessage, sendCustomerMessage, type ChannelReadiness, type ChannelResult, type CustomerContact } from './service';

export const DAILY_MENU = 'daily_menu';

/** O cardápio de hoje, se está publicado e tem pelo menos um item. */
export async function loadTodayMenu(): Promise<MenuDTO | null> {
  try {
    const menu = await getMenu(todaySP());
    return menu && menu.status === 'published' && countMenuItems(menu) > 0 ? menu : null;
  } catch {
    return null; // tabela ainda não criada: trata como "sem cardápio"
  }
}

const menuValues = (menu: MenuDTO) => ({ cardapio: formatMenuMessage(menu) });

/** Quando cada cliente recebeu o cardápio hoje (só envios que deram certo). */
export async function receivedToday(customerIds?: string[]): Promise<Map<string, Date>> {
  const since = startOfDaySP(todaySP()) ?? new Date(Date.now() - 86_400_000);
  const rows = await prisma.messageLog.findMany({
    where: { typeKey: DAILY_MENU, status: 'sent', createdAt: { gte: since }, ...(customerIds ? { customerId: { in: customerIds } } : { customerId: { not: null } }) },
    select: { customerId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const map = new Map<string, Date>();
  for (const r of rows) if (r.customerId && !map.has(r.customerId)) map.set(r.customerId, r.createdAt);
  return map;
}

export interface MenuSendOverview {
  menu: { date: string; title: string | null; items: number } | null;
  whatsapp: ChannelReadiness;
}

export async function menuSendOverview(): Promise<MenuSendOverview & { menuDto: MenuDTO | null }> {
  const [menuDto, whatsapp] = await Promise.all([loadTodayMenu(), channelReadiness(DAILY_MENU, 'whatsapp')]);
  return { menuDto, menu: menuDto ? { date: menuDto.date, title: menuDto.title, items: countMenuItems(menuDto) } : null, whatsapp };
}

/** Clientes ativos que podem receber: telefone marcado como WhatsApp. */
export async function eligibleRecipients() {
  const [active, withWhatsapp] = await Promise.all([
    prisma.customer.count({ where: { active: true, NOT: { phone: '' } } }),
    prisma.customer.findMany({
      where: { active: true, phoneIsWhatsapp: true, NOT: { phone: '' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { active, withWhatsapp };
}

export async function previewMenuFor(customer: CustomerContact, menu: MenuDTO): Promise<string> {
  return previewCustomerMessage(DAILY_MENU, 'whatsapp', customer, menuValues(menu));
}

export type MenuSendOutcome =
  | { status: 'sent' | 'failed'; result: ChannelResult }
  | { status: 'no_menu' | 'no_whatsapp' | 'unavailable'; reason: string }
  | { status: 'already_received'; at: string };

/** Envia o cardápio de hoje a um cliente. `force` envia mesmo que ele já tenha recebido hoje. */
export async function sendMenuToCustomer(customer: CustomerContact & { active?: boolean }, force = false): Promise<MenuSendOutcome> {
  if (!customer.phoneIsWhatsapp || !customer.phone || customer.active === false) {
    return { status: 'no_whatsapp', reason: 'O cliente não tem um WhatsApp cadastrado.' };
  }
  const menu = await loadTodayMenu();
  if (!menu) return { status: 'no_menu', reason: 'O cardápio de hoje ainda não foi publicado.' };
  if (!force) {
    const at = (await receivedToday([customer.id])).get(customer.id);
    if (at) return { status: 'already_received', at: at.toISOString() };
  }
  const readiness = await channelReadiness(DAILY_MENU, 'whatsapp');
  if (!readiness.ready) return { status: 'unavailable', reason: readiness.reason ?? 'O WhatsApp não está disponível.' };

  const [result] = await sendCustomerMessage({ typeKey: DAILY_MENU, customer, channels: ['whatsapp'], values: menuValues(menu) });
  return { status: result.ok ? 'sent' : 'failed', result };
}

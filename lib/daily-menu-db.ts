// Cardápio do dia no banco. Os dias são "AAAA-MM-DD" de Brasília (ver lib/date-range.ts).

import prisma from '@/lib/prisma';
import { summarizeMenu, type MenuInput, type MenuSummary } from './daily-menu';

export interface MenuItemDTO {
  id: string;
  name: string;
  description: string | null;
  featured: boolean;
  vegetarian: boolean;
}

export interface MenuSectionDTO {
  id: string;
  name: string;
  items: MenuItemDTO[];
}

export interface MenuDTO {
  date: string;
  title: string | null;
  note: string | null;
  status: 'draft' | 'published';
  showOrderButton: boolean;
  notifyCustomers: boolean;
  publishedAt: string | null;
  updatedAt: string;
  sections: MenuSectionDTO[];
}

const include = {
  sections: { orderBy: { position: 'asc' as const }, include: { items: { orderBy: { position: 'asc' as const } } } },
};

type MenuRow = NonNullable<Awaited<ReturnType<typeof findRow>>>;

function findRow(date: string) {
  return prisma.dailyMenu.findUnique({ where: { date }, include });
}

function toDTO(row: MenuRow): MenuDTO {
  return {
    date: row.date,
    title: row.title,
    note: row.note,
    status: row.status === 'published' ? 'published' : 'draft',
    showOrderButton: row.showOrderButton,
    notifyCustomers: row.notifyCustomers,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    sections: row.sections.map((s) => ({
      id: s.id,
      name: s.name,
      items: s.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        featured: i.featured,
        vegetarian: i.vegetarian,
      })),
    })),
  };
}

/** Tabela ainda não criada (migration pendente): quem lê só para mostrar trata como "sem cardápio". */
export function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

export async function getMenu(date: string): Promise<MenuDTO | null> {
  const row = await findRow(date);
  return row ? toDTO(row) : null;
}

export async function saveMenu(date: string, input: MenuInput): Promise<MenuDTO> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyMenu.findUnique({ where: { date }, select: { id: true, status: true, publishedAt: true } });
    const publishing = input.status === 'published';
    // a data da publicação só muda na primeira vez (ou quando volta de rascunho)
    const publishedAt = publishing ? (existing?.status === 'published' && existing.publishedAt ? existing.publishedAt : new Date()) : null;
    const data = {
      title: input.title,
      note: input.note,
      status: input.status,
      showOrderButton: input.showOrderButton,
      notifyCustomers: input.notifyCustomers,
      publishedAt,
    };
    const menu = existing
      ? await tx.dailyMenu.update({ where: { id: existing.id }, data })
      : await tx.dailyMenu.create({ data: { date, ...data } });

    await tx.dailyMenuSection.deleteMany({ where: { menuId: menu.id } });
    for (const [si, section] of input.sections.entries()) {
      await tx.dailyMenuSection.create({
        data: {
          menuId: menu.id,
          name: section.name,
          position: si,
          items: {
            create: section.items.map((item, ii) => ({
              name: item.name,
              description: item.description,
              featured: item.featured,
              vegetarian: item.vegetarian,
              position: ii,
            })),
          },
        },
      });
    }
  });
  const saved = await getMenu(date);
  if (!saved) throw new Error('Cardápio não encontrado depois de salvar');
  return saved;
}

export async function deleteMenu(date: string): Promise<boolean> {
  const result = await prisma.dailyMenu.deleteMany({ where: { date } });
  return result.count > 0;
}

/** Resumos por dia, do mais novo para o mais antigo. */
export async function listMenuSummaries(opts: {
  from?: string;
  to?: string;
  published?: boolean;
  before?: string;
  limit?: number;
}): Promise<MenuSummary[]> {
  const rows = await prisma.dailyMenu.findMany({
    where: {
      ...(opts.published ? { status: 'published' } : {}),
      date: {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to ? { lte: opts.to } : {}),
        ...(opts.before ? { lt: opts.before } : {}),
      },
    },
    orderBy: { date: 'desc' },
    take: opts.limit ?? 120,
    include: { sections: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' }, select: { name: true, featured: true } } } } },
  });
  return rows.map((row) => summarizeMenu(row));
}

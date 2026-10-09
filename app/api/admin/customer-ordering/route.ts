import { dateStringSP } from '@/lib/date-range';
import { describeOpening, orderingStatus, validateWindowInput } from '@/lib/ordering';
import {
  describeSchedule,
  loadSettings,
  loadSoldOut,
  loadWindows,
  productEligibility,
  saveEnabled,
  savePause,
  saveSoldOut,
} from '@/lib/online-ordering';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// Configuração do pedido online (só o administrador): interruptor, pausa, janelas (dias, horário e
// produtos) e produtos "esgotou hoje".

async function snapshot() {
  const now = new Date();
  const [settings, windows, soldOut, products] = await Promise.all([
    loadSettings(),
    loadWindows(),
    loadSoldOut(now),
    prisma.product.findMany({
      where: { productType: 'sellable' },
      select: {
        id: true,
        name: true,
        priceCents: true,
        pricePerKgCents: true,
        variableProduct: true,
        productType: true,
        active: true,
        imageUrl: true,
        stockEnabled: true,
        stock: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    }),
  ]);
  const status = orderingStatus(windows, settings, now);
  return {
    enabled: settings.enabled,
    pausedUntil: settings.pausedUntil && settings.pausedUntil > now ? settings.pausedUntil.toISOString() : null,
    windows: windows.map((w) => ({ ...w, schedule: describeSchedule(w) })),
    soldOutToday: [...soldOut],
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl,
      category: p.category,
      stockEnabled: p.stockEnabled,
      stock: p.stock,
      ...productEligibility(p),
    })),
    // O que o cliente vê agora, calculado no servidor (Brasília)
    preview: {
      open: status.open,
      reason: status.reason ?? null,
      minutesToClose: status.minutesToClose ?? null,
      nextOpening: status.nextOpening ? describeOpening(status.nextOpening) : null,
      today: dateStringSP(now),
      serverNow: now.toISOString(),
    },
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error loading customer ordering config:', error);
    return NextResponse.json({ error: 'Erro ao carregar a configuração' }, { status: 500 });
  }
}

interface WindowInput {
  id?: unknown;
  name: unknown;
  weekdays: unknown;
  startMinute: unknown;
  endMinute: unknown;
  active?: unknown;
  productIds: unknown;
}

// PUT - Qualquer parte da configuração (todas opcionais):
//   { enabled: boolean }
//   { pause: 'until_tomorrow' | null }            "hoje não" (volta sozinho à meia-noite de Brasília) / tira a pausa
//   { soldOut: { productId, value: boolean } }    "esgotou hoje"
//   { windows: [{ id?, name, weekdays, startMinute, endMinute, active, productIds }] }   substitui TODAS as janelas
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const body = (await request.json().catch(() => null)) as {
      enabled?: unknown;
      pause?: unknown;
      soldOut?: { productId?: unknown; value?: unknown };
      windows?: WindowInput[];
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }

    if (body.windows !== undefined) {
      if (!Array.isArray(body.windows) || body.windows.length > 20) {
        return NextResponse.json({ error: 'Lista de janelas inválida (até 20).' }, { status: 400 });
      }
      for (const window of body.windows) {
        const message = validateWindowInput(window);
        if (message) return NextResponse.json({ error: `${typeof window?.name === 'string' && window.name ? `${window.name}: ` : ''}${message}` }, { status: 400 });
      }

      // Todo produto precisa existir e poder ser pedido (ativo, vendável, com preço, sem peso)
      const productIds = [...new Set(body.windows.flatMap((w) => w.productIds as string[]))];
      const found = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, active: true, productType: true, priceCents: true, pricePerKgCents: true, variableProduct: true },
      });
      const byId = new Map(found.map((p) => [p.id, p]));
      for (const id of productIds) {
        const product = byId.get(id);
        const check = product ? productEligibility(product) : { eligible: false, reason: 'Produto não encontrado' };
        if (!check.eligible) {
          return NextResponse.json({ error: `${product?.name ?? 'Produto'}: ${check.reason}. Tire-o da lista para salvar.` }, { status: 400 });
        }
      }

      await prisma.$transaction(async (tx) => {
        const keep = body.windows!.map((w) => (typeof w.id === 'string' ? w.id : null)).filter((id): id is string => !!id);
        await tx.orderWindow.deleteMany({ where: { id: { notIn: keep } } });
        for (const w of body.windows!) {
          const data = {
            name: (w.name as string).trim(),
            weekdays: [...(w.weekdays as number[])].sort((a, b) => a - b),
            startMinute: w.startMinute as number,
            endMinute: w.endMinute as number,
            active: w.active !== false,
          };
          const existing = typeof w.id === 'string' ? await tx.orderWindow.findUnique({ where: { id: w.id }, select: { id: true } }) : null;
          const saved = existing
            ? await tx.orderWindow.update({ where: { id: existing.id }, data })
            : await tx.orderWindow.create({ data });
          await tx.orderWindowProduct.deleteMany({ where: { windowId: saved.id } });
          await tx.orderWindowProduct.createMany({
            data: (w.productIds as string[]).map((productId) => ({ windowId: saved.id, productId })),
          });
        }
      });
    }

    if (typeof body.enabled === 'boolean') await saveEnabled(body.enabled);
    if (body.pause !== undefined) {
      if (body.pause !== 'until_tomorrow' && body.pause !== null) {
        return NextResponse.json({ error: 'Pausa inválida' }, { status: 400 });
      }
      await savePause(body.pause);
    }
    if (body.soldOut) {
      if (typeof body.soldOut.productId !== 'string' || typeof body.soldOut.value !== 'boolean') {
        return NextResponse.json({ error: 'Produto inválido' }, { status: 400 });
      }
      await saveSoldOut(body.soldOut.productId, body.soldOut.value);
    }

    console.info(JSON.stringify({ event: 'customer_ordering.config_changed', by: auth.staff.userId, keys: Object.keys(body) }));
    return NextResponse.json(await snapshot());
  } catch (error) {
    console.error('Error saving customer ordering config:', error);
    return NextResponse.json({ error: 'Erro ao salvar a configuração' }, { status: 500 });
  }
}

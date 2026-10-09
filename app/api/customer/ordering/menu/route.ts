import { getCustomerSession } from '@/lib/customer-auth';
import { describeOpening, ORDERING, orderingStatus, productsOpenNow } from '@/lib/ordering';
import { describeSchedule, loadSettings, loadSoldOut, loadWindows, productEligibility } from '@/lib/online-ordering';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Cardápio do pedido online para o cliente autenticado
//
// Quem decide se a loja está aberta é o servidor (em Brasília): a tela só mostra o que vem daqui, com
// `serverNow` para ela não confiar no relógio do aparelho. Os produtos liberados aparecem mesmo com a
// loja fechada (ver o cardápio ajuda), mas só pedem os que estão em uma janela aberta agora.
export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const customerId = session.user.customerId;
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { active: true } });
    if (!customer?.active) {
      return NextResponse.json({ error: 'Seu cadastro está inativo. Fale com a loja.', code: 'CUSTOMER_INACTIVE' }, { status: 403 });
    }

    const now = new Date();
    const [settings, windows, soldOut] = await Promise.all([loadSettings(), loadWindows(), loadSoldOut(now)]);
    const status = orderingStatus(windows, settings, now);
    const usable = windows.filter((w) => w.active && w.productIds.length > 0);
    const openIds = status.open ? productsOpenNow(usable, now) : new Set<string>();

    const productIds = [...new Set(usable.flatMap((w) => w.productIds))];
    const rows = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, active: true, productType: 'sellable' },
          select: {
            id: true,
            name: true,
            description: true,
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
        })
      : [];

    const products = rows
      .filter((product) => productEligibility(product).eligible)
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        category: product.category,
        availableNow: openIds.has(product.id),
        soldOut: soldOut.has(product.id) || (product.stockEnabled && (product.stock ?? 0) <= 0),
        // "seg–sex 10:00–13:00": quando dá para pedir este produto
        schedule: usable.filter((w) => w.productIds.includes(product.id)).map(describeSchedule),
      }));

    const awaitingCount = await prisma.preOrder
      .count({ where: { customerId, source: 'online', approval: 'awaiting' } })
      .catch(() => 0);

    return NextResponse.json(
      {
        enabled: settings.enabled,
        open: status.open,
        reason: status.reason ?? null,
        minutesToClose: status.minutesToClose ?? null,
        closesAt: status.closesAt?.toISOString() ?? null,
        nextOpening: status.nextOpening ? { label: describeOpening(status.nextOpening), at: status.nextOpening.at.toISOString() } : null,
        serverNow: now.toISOString(),
        awaitingCount,
        limits: {
          maxPending: ORDERING.MAX_PENDING_PER_CUSTOMER,
          maxItems: ORDERING.MAX_ITEMS,
          maxQuantity: ORDERING.MAX_QTY_PER_ITEM,
          notesMax: ORDERING.NOTES_MAX,
          graceMinutes: ORDERING.GRACE_MINUTES,
        },
        products,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error loading ordering menu:', error);
    return NextResponse.json({ error: 'Não foi possível carregar o cardápio agora.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

// GET - Avisos do cliente autenticado
//
// Não há tabela de avisos: o feed é montado na hora com o que já existe (andamento dos
// pedidos, compras lançadas na ficha e pagamentos recebidos), do mais novo para o mais antigo.
// Quando o operador mexe no pedido, o aviso aparece sozinho, sem ninguém precisar gravar nada.
// Quais já foram vistos fica no aparelho do cliente.

const WINDOW_DAYS = 30;
const MAX_ITEMS = 30;

type Tone = 'go' | 'prog' | 'done' | 'off' | 'pay';
type Kind = 'order' | 'buy' | 'pay';

interface Notice {
  id: string;
  kind: Kind;
  tone: Tone;
  title: string;
  text: string;
  at: string;
  href: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function GET() {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const customerId = session.user.customerId;
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [preOrders, orders] = await Promise.all([
      prisma.preOrder.findMany({
        where: { customerId, updatedAt: { gte: since } },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ITEMS,
        select: {
          id: true,
          deliveryStatus: true,
          createdAt: true,
          updatedAt: true,
          deliveryStartedAt: true,
          deliveredAt: true,
          estimatedDeliveryTime: true,
        },
      }),
      prisma.order.findMany({
        where: { customerId, createdAt: { gte: since }, OR: [{ status: 'pending' }, { paymentMethod: 'ficha_payment' }] },
        orderBy: { createdAt: 'desc' },
        take: MAX_ITEMS,
        select: { id: true, totalCents: true, createdAt: true, paymentMethod: true },
      }),
    ]);

    const notices: Notice[] = [];

    for (const po of preOrders) {
      const href = `/pre-orders?item=${encodeURIComponent(po.id)}`;
      const base = { id: `po:${po.id}:${po.deliveryStatus}`, kind: 'order' as const, href };
      switch (po.deliveryStatus) {
        case 'ready':
          notices.push({ ...base, tone: 'go', title: 'Seu pedido está pronto', text: 'Pode retirar no balcão. Diga o seu nome.', at: po.updatedAt.toISOString() });
          break;
        case 'preparing':
          notices.push({ ...base, tone: 'prog', title: 'Pedido em preparo', text: 'Já estamos cuidando do seu pedido.', at: po.updatedAt.toISOString() });
          break;
        case 'out_for_delivery':
        case 'in_transit':
          notices.push({
            ...base,
            tone: 'go',
            title: 'Seu pedido saiu para entrega',
            text: po.estimatedDeliveryTime ? 'Acompanhe a chegada pelo mapa.' : 'O entregador já está a caminho.',
            at: (po.deliveryStartedAt ?? po.updatedAt).toISOString(),
          });
          break;
        case 'delivered':
          notices.push({ ...base, tone: 'done', title: 'Pedido concluído', text: 'Obrigado! Bom apetite.', at: (po.deliveredAt ?? po.updatedAt).toISOString() });
          break;
        case 'cancelled':
          notices.push({ ...base, tone: 'off', title: 'Pedido cancelado', text: 'Este pedido foi cancelado.', at: po.updatedAt.toISOString() });
          break;
        default:
          notices.push({ ...base, tone: 'prog', title: 'Pedido recebido', text: 'Avisamos quando ele entrar em preparo.', at: po.createdAt.toISOString() });
      }
    }

    for (const order of orders) {
      if (order.paymentMethod === 'ficha_payment') {
        notices.push({
          id: `pay:${order.id}`,
          kind: 'pay',
          tone: 'pay',
          title: 'Pagamento recebido',
          text: `${brl(order.totalCents)} abatidos da sua ficha.`,
          at: order.createdAt.toISOString(),
          href: `/expenses?item=${encodeURIComponent(order.id)}`,
        });
      } else {
        notices.push({
          id: `buy:${order.id}`,
          kind: 'buy',
          tone: 'prog',
          title: 'Compra lançada na ficha',
          text: `${brl(order.totalCents)} somados ao seu saldo.`,
          at: order.createdAt.toISOString(),
          href: `/expenses?item=${encodeURIComponent(order.id)}`,
        });
      }
    }

    notices.sort((a, b) => b.at.localeCompare(a.at));

    return NextResponse.json({ data: notices.slice(0, MAX_ITEMS) });
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    return NextResponse.json({ error: 'Erro ao buscar avisos' }, { status: 500 });
  }
}

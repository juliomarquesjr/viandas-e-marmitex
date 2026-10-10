import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { loadDayOrders, parseDays, previewOrders, purchaseDays, sendOrdersToCustomer } from '@/lib/messages/ficha-send';
import { ORDERS_MAX_DAYS } from '@/lib/messages/ficha-text';
import { customerChannels, channelReadiness } from '@/lib/messages/service';
import { maskPhone } from '@/lib/messages/render';
import { ensureFresh } from '@/lib/whatsapp-service';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

const select = { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true, active: true } as const;

// GET ?days=AAAA-MM-DD,... - Dias com compra e a prévia da mensagem (sem `days`, usa o dia mais recente)
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    await ensureFresh();
    const requested = new URL(request.url).searchParams.get('days');
    const [days, whatsapp] = await Promise.all([purchaseDays(id), channelReadiness('customer_orders', 'whatsapp')]);
    const available = new Set(days.map((d) => d.day));
    const parsed = requested ? parseDays(requested.split(',')) : null;
    const selected = (parsed ?? (days[0] ? [days[0].day] : [])).filter((d) => available.has(d));
    const to = customerChannels(customer).whatsapp;
    const data = to && selected.length > 0 ? await loadDayOrders(id, selected) : [];
    return NextResponse.json(
      {
        name: customer.name,
        recipient: to ? maskPhone(to) : null,
        hasWhatsapp: Boolean(to),
        whatsapp,
        maxDays: ORDERS_MAX_DAYS,
        days,
        selected,
        preview: to && data.length > 0 ? await previewOrders(customer, data) : null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Error loading orders send:', error);
    return NextResponse.json({ error: 'Erro ao preparar o envio das compras' }, { status: 500 });
  }
}

// POST { days } - Envia as compras dos dias escolhidos (até 5) a este cliente
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  const days = parseDays(body.days);
  if (!days) return NextResponse.json({ error: `Escolha de 1 a ${ORDERS_MAX_DAYS} dias.` }, { status: 400 });
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json(await sendOrdersToCustomer(customer, days), { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending orders:', error);
    return NextResponse.json({ error: 'Erro ao enviar as compras' }, { status: 500 });
  }
}

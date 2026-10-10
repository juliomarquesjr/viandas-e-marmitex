import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/staff-session';
import { menuSendOverview, previewMenuFor, receivedToday, sendMenuToCustomer } from '@/lib/messages/daily-menu-send';
import { customerChannels } from '@/lib/messages/service';
import { maskPhone } from '@/lib/messages/render';
import { ensureFresh } from '@/lib/whatsapp-service';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

const select = { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true, active: true } as const;

// GET - Prévia do que o cliente receberia e o que impede o envio (sem cardápio, WhatsApp fora, já recebeu hoje)
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    await ensureFresh();
    const [overview, received] = await Promise.all([menuSendOverview(), receivedToday([id])]);
    const to = customerChannels(customer).whatsapp;
    return NextResponse.json(
      {
        name: customer.name,
        recipient: to ? maskPhone(to) : null,
        hasWhatsapp: Boolean(to),
        menu: overview.menu,
        whatsapp: overview.whatsapp,
        receivedAt: received.get(id)?.toISOString() ?? null,
        preview: overview.menuDto && to ? await previewMenuFor(customer, overview.menuDto) : null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Error loading menu send:', error);
    return NextResponse.json({ error: 'Erro ao preparar o envio do cardápio' }, { status: 500 });
  }
}

// POST { force? } - Envia o cardápio de hoje a este cliente (também usado, um por vez, pelo envio em massa)
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    const outcome = await sendMenuToCustomer(customer, body.force === true);
    return NextResponse.json(outcome, { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending menu:', error);
    return NextResponse.json({ error: 'Erro ao enviar o cardápio' }, { status: 500 });
  }
}

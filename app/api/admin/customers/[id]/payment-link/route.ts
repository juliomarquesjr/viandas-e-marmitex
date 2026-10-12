import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { preparePaymentLink, sendPaymentLink } from '@/lib/messages/closing-send';
import { isMessageChannel, type MessageChannel } from '@/lib/messages/registry';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

const select = { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true } as const;

// GET - O link de pagamento deste cliente, o saldo, quem pode receber e o texto de cada canal
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ name: customer.name, ...(await preparePaymentLink(customer)) }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error preparing payment link:', error);
    return NextResponse.json({ error: 'Erro ao preparar o link de pagamento' }, { status: 500, headers: NO_STORE });
  }
}

// POST { channels: ["whatsapp","email"] } - envia o link de pagamento ao cliente
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const channels = Array.isArray(body?.channels) ? [...new Set(body.channels.filter(isMessageChannel))] : [];
  if (channels.length === 0) return NextResponse.json({ error: 'Escolha por onde enviar.' }, { status: 400, headers: NO_STORE });
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404, headers: NO_STORE });
    const outcome = await sendPaymentLink(customer, channels as MessageChannel[]);
    if (outcome.status === 'nothing_to_pay') return NextResponse.json({ error: outcome.reason }, { status: 409, headers: NO_STORE });
    return NextResponse.json({ results: outcome.results }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending payment link:', error);
    return NextResponse.json({ error: 'Erro ao enviar o link de pagamento' }, { status: 500, headers: NO_STORE });
  }
}

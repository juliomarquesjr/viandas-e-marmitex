import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { previewBalance, sendBalanceToCustomer } from '@/lib/messages/ficha-send';
import { channelReadiness, customerChannels } from '@/lib/messages/service';
import { maskPhone } from '@/lib/messages/render';
import { ensureFresh } from '@/lib/whatsapp-service';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

const select = { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true, active: true } as const;

// GET - Saldo da ficha e a prévia da mensagem
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    await ensureFresh();
    const to = customerChannels(customer).whatsapp;
    const [whatsapp, balance] = await Promise.all([channelReadiness('customer_balance', 'whatsapp'), to ? previewBalance(customer) : null]);
    return NextResponse.json(
      {
        name: customer.name,
        recipient: to ? maskPhone(to) : null,
        hasWhatsapp: Boolean(to),
        whatsapp,
        balanceCents: balance?.balanceCents ?? null,
        kind: balance?.kind ?? null,
        preview: balance?.preview ?? null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Error loading balance send:', error);
    return NextResponse.json({ error: 'Erro ao preparar o envio do saldo' }, { status: 500 });
  }
}

// POST - Envia o saldo da ficha a este cliente
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json(await sendBalanceToCustomer(customer), { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending balance:', error);
    return NextResponse.json({ error: 'Erro ao enviar o saldo' }, { status: 500 });
  }
}

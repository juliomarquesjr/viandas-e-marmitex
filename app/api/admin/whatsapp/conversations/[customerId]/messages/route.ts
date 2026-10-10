import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { sendChatMessage } from '@/lib/whatsapp-chat-service';
import { describeWhatsAppError } from '@/lib/whatsapp-service';

const MAX = 1500;

// POST { text } - O administrador escreve ao cliente pelo WhatsApp do estabelecimento
export async function POST(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  const text = typeof body.text === 'string' ? body.text.replace(/\r\n/g, '\n').trim() : '';
  if (!text) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });
  if (text.length > MAX) return NextResponse.json({ error: `A mensagem pode ter até ${MAX} caracteres.` }, { status: 400 });
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, phone: true, phoneIsWhatsapp: true } });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    const message = await sendChatMessage(customer, text, auth.staff.name || 'Administrador');
    return NextResponse.json({ message });
  } catch (error) {
    const known = error instanceof Error && error.message === 'Este cliente não tem WhatsApp marcado.';
    return NextResponse.json({ error: known ? (error as Error).message : describeWhatsAppError(error) }, { status: known ? 400 : 502 });
  }
}

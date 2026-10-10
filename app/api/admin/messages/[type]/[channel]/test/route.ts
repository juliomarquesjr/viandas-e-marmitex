import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { getMessageType, isMessageChannel } from '@/lib/messages/registry';
import { sendTest } from '@/lib/messages/service';

// POST - Envia o modelo, com dados de exemplo, para o próprio administrador
export async function POST(_request: Request, { params }: { params: Promise<{ type: string; channel: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { type, channel } = await params;
  if (!getMessageType(type) || !isMessageChannel(channel)) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.staff.userId }, select: { email: true } });
    const result = await sendTest(type, channel, user?.email ?? null);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível enviar o teste' }, { status: 400 });
  }
}

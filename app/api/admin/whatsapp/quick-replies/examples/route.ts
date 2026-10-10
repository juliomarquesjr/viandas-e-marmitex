import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { EXAMPLE_REPLIES } from '@/lib/whatsapp-quick-replies';

// POST - Cria os exemplos (só se ainda não existe nenhuma resposta rápida)
export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    if ((await prisma.whatsAppQuickReply.count()) > 0) return NextResponse.json({ error: 'Já existem respostas rápidas.' }, { status: 409 });
    await prisma.whatsAppQuickReply.createMany({ data: EXAMPLE_REPLIES.map((r, position) => ({ ...r, position })) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating example quick replies:', error);
    return NextResponse.json({ error: 'Erro ao criar os exemplos' }, { status: 500 });
  }
}

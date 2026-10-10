import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { validateQuickReply } from '@/lib/whatsapp-quick-replies';

const select = { id: true, title: true, text: true, shortcut: true, position: true } as const;

// GET - Respostas rápidas do atendimento (na ordem em que o administrador organizou)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    const replies = await prisma.whatsAppQuickReply.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }], select });
    return NextResponse.json({ replies }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error listing quick replies:', error);
    return NextResponse.json({ error: 'Erro ao carregar as respostas rápidas' }, { status: 500 });
  }
}

// POST { title, text, shortcut? } - Cria uma resposta rápida
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const checked = validateQuickReply(await request.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  try {
    if (checked.value.shortcut && (await prisma.whatsAppQuickReply.findUnique({ where: { shortcut: checked.value.shortcut } }))) {
      return NextResponse.json({ error: `O atalho /${checked.value.shortcut} já está em uso.` }, { status: 409 });
    }
    const last = await prisma.whatsAppQuickReply.aggregate({ _max: { position: true } });
    const reply = await prisma.whatsAppQuickReply.create({ data: { ...checked.value, position: (last._max.position ?? -1) + 1 }, select });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error creating quick reply:', error);
    return NextResponse.json({ error: 'Erro ao salvar a resposta' }, { status: 500 });
  }
}

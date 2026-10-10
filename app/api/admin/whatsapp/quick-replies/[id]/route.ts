import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { validateQuickReply } from '@/lib/whatsapp-quick-replies';

type Ctx = { params: Promise<{ id: string }> };
const select = { id: true, title: true, text: true, shortcut: true, position: true } as const;

// PUT { title, text, shortcut? } - Atualiza uma resposta rápida
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const checked = validateQuickReply(await request.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  try {
    if (checked.value.shortcut) {
      const other = await prisma.whatsAppQuickReply.findUnique({ where: { shortcut: checked.value.shortcut } });
      if (other && other.id !== id) return NextResponse.json({ error: `O atalho /${checked.value.shortcut} já está em uso.` }, { status: 409 });
    }
    const reply = await prisma.whatsAppQuickReply.update({ where: { id }, data: checked.value, select });
    return NextResponse.json({ reply });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 });
    console.error('Error updating quick reply:', error);
    return NextResponse.json({ error: 'Erro ao salvar a resposta' }, { status: 500 });
  }
}

// DELETE - Apaga uma resposta rápida
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    await prisma.whatsAppQuickReply.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    return NextResponse.json({ error: 'Erro ao apagar a resposta' }, { status: 500 });
  }
}

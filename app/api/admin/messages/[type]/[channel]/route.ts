import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { getMessageType, isMessageChannel } from '@/lib/messages/registry';
import { validateTemplate } from '@/lib/messages/render';
import { loadTemplate, resetTemplate, saveTemplate } from '@/lib/messages/service';

type Ctx = { params: Promise<{ type: string; channel: string }> };

async function resolve(ctx: Ctx) {
  const { type, channel } = await ctx.params;
  const def = getMessageType(type);
  if (!def || !isMessageChannel(channel) || !def.defaults[channel]) return null;
  return { def, channel };
}

// PUT - Salva o texto (e se está ligado) deste canal
export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const target = await resolve(ctx);
  if (!target) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const checked = validateTemplate(target.def, target.channel, body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  try {
    await saveTemplate(target.def.key, target.channel, checked.value, auth.staff.userId);
    return NextResponse.json(await loadTemplate(target.def.key, target.channel));
  } catch (error) {
    console.error('Error saving message template:', error);
    return NextResponse.json({ error: 'Erro ao salvar a mensagem' }, { status: 500 });
  }
}

// DELETE - Restaura o texto padrão
export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const target = await resolve(ctx);
  if (!target) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
  try {
    await resetTemplate(target.def.key, target.channel);
    return NextResponse.json(await loadTemplate(target.def.key, target.channel));
  } catch (error) {
    console.error('Error resetting message template:', error);
    return NextResponse.json({ error: 'Erro ao restaurar o texto padrão' }, { status: 500 });
  }
}

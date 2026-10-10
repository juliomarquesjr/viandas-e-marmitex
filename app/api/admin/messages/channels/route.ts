import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/staff-session';
import { channelReadiness } from '@/lib/messages/service';
import { getMessageType, MESSAGE_CHANNELS } from '@/lib/messages/registry';
import { ensureFresh } from '@/lib/whatsapp-service';

// GET ?type= - Cada canal está pronto para enviar? (modelo ligado e canal funcionando)
export async function GET(request: Request) {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  const typeKey = new URL(request.url).searchParams.get('type') ?? '';
  const type = getMessageType(typeKey);
  if (!type) return NextResponse.json({ error: 'Tipo de mensagem desconhecido' }, { status: 400 });
  try {
    await ensureFresh();
    const entries = await Promise.all(MESSAGE_CHANNELS.filter((c) => type.defaults[c]).map(async (c) => [c, await channelReadiness(typeKey, c)] as const));
    return NextResponse.json(Object.fromEntries(entries), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error checking channels:', error);
    return NextResponse.json({ error: 'Erro ao verificar os canais' }, { status: 500 });
  }
}

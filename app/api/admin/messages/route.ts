import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { getSignature, loadTemplate, storeName } from '@/lib/messages/service';
import { MESSAGE_CHANNELS, MESSAGE_LIMITS, MESSAGE_TYPES, UPCOMING_MESSAGES } from '@/lib/messages/registry';

// GET - Tipos de mensagem com o texto de cada canal (o padrão ou o que o administrador salvou)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    const types = await Promise.all(
      MESSAGE_TYPES.map(async (type) => {
        const channels = Object.fromEntries(
          await Promise.all(
            MESSAGE_CHANNELS.filter((c) => type.defaults[c]).map(async (c) => [c, { ...(await loadTemplate(type.key, c)), default: type.defaults[c] }])
          )
        );
        return { key: type.key, name: type.name, description: type.description, group: type.group, variables: type.variables, required: type.required, alwaysOn: type.alwaysOn === true, channels };
      })
    );
    return NextResponse.json(
      { types, upcoming: UPCOMING_MESSAGES, signature: await getSignature(), storeName: await storeName(), limits: MESSAGE_LIMITS },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading messages:', error);
    return NextResponse.json({ error: 'Erro ao carregar as mensagens' }, { status: 500 });
  }
}

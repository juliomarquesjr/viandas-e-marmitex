import { lerConfiguracoes } from '@/lib/ai/ro/settings';
import { salvarConfiguracoes } from '@/lib/ai/ro/settings-admin';
import { validarPedido } from '@/lib/ai/ro/settings-tipos';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET/PUT - Configurações da RO (só administrador). Nenhuma resposta fica em cache.
const SEM_CACHE = { 'Cache-Control': 'no-store' };

function semCache<T extends Response>(resposta: T): T {
  resposta.headers.set('Cache-Control', 'no-store');
  return resposta;
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return semCache(auth.error);
  return NextResponse.json(await lerConfiguracoes(), { headers: SEM_CACHE });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return semCache(auth.error);
  const corpo = await request.json().catch(() => null);
  const pedido = validarPedido(corpo);
  if (!pedido.ok) return NextResponse.json({ error: pedido.erro }, { status: 400, headers: SEM_CACHE });
  try {
    return NextResponse.json(await salvarConfiguracoes(pedido.valores), { headers: SEM_CACHE });
  } catch (error) {
    console.error('Error saving RO settings:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Não foi possível salvar agora. Tente de novo.' }, { status: 500, headers: SEM_CACHE });
  }
}

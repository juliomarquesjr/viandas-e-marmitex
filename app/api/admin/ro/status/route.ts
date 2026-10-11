import { estadoIa, testarIa } from '@/lib/ai/ro/gemini';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET - Estado da conexão com a Gemini (sem gastar cota). POST - testa a conexão com uma pergunta mínima por modelo.
const SEM_CACHE = { 'Cache-Control': 'no-store' };

function semCache<T extends Response>(resposta: T): T {
  resposta.headers.set('Cache-Control', 'no-store');
  return resposta;
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return semCache(auth.error);
  return NextResponse.json(estadoIa(), { headers: SEM_CACHE });
}

export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return semCache(auth.error);
  return NextResponse.json(await testarIa(), { headers: SEM_CACHE });
}

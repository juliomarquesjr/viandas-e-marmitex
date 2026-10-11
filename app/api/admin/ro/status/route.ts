import { estadoIa, testarIa } from '@/lib/ai/ro/gemini';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET - Estado da conexão com a Gemini (sem gastar cota). POST - testa a conexão com uma pergunta mínima.
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json(estadoIa(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json(await testarIa());
}

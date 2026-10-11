import { lerConfiguracoes } from '@/lib/ai/ro/settings';
import { salvarConfiguracoes } from '@/lib/ai/ro/settings-admin';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET/PUT - Configurações da RO (só administrador)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json(await lerConfiguracoes(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const corpo = (await request.json().catch(() => null)) ?? {};
  try {
    return NextResponse.json(await salvarConfiguracoes({ ligada: corpo.ligada, tom: corpo.tom, limiteDiario: corpo.limiteDiario, mostrarBotao: corpo.mostrarBotao }));
  } catch (error) {
    console.error('Error saving RO settings:', error);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}

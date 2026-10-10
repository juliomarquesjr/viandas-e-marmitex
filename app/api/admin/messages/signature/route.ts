import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { saveSignature } from '@/lib/messages/service';

// PUT - Assinatura que fecha todas as mensagens enviadas
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.text !== 'string') return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });
  try {
    return NextResponse.json(await saveSignature(body.text, body.enabled === true));
  } catch (error) {
    console.error('Error saving signature:', error);
    return NextResponse.json({ error: 'Erro ao salvar a assinatura' }, { status: 500 });
  }
}

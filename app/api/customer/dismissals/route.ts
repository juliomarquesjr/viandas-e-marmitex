import { getCustomerSession } from '@/lib/customer-auth';
import { addDismissals, cleanDismissKeys, removeDismissals } from '@/lib/customer-dismissals';
import { NextResponse } from 'next/server';

// POST - o cliente dispensou avisos/cartões. DELETE - desfez ("Desfazer").
// O cliente vem da sessão: só dá para mexer nas próprias dispensas.

async function readKeys(request: Request): Promise<string[]> {
  const body = await request.json().catch(() => null);
  return cleanDismissKeys((body as { keys?: unknown } | null)?.keys);
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const keys = await readKeys(request);
    await addDismissals(session.user.customerId, keys);
    return NextResponse.json({ ok: true, count: keys.length });
  } catch (error) {
    console.error('Error saving customer dismissals:', error);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const keys = await readKeys(request);
    await removeDismissals(session.user.customerId, keys);
    return NextResponse.json({ ok: true, count: keys.length });
  } catch (error) {
    console.error('Error removing customer dismissals:', error);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}

import { getCustomerSession } from '@/lib/customer-auth';
import { isValidDay, isVisibleToCustomer } from '@/lib/daily-menu';
import { getMenu, isMissingTable } from '@/lib/daily-menu-db';
import { todaySP } from '@/lib/date-range';
import { NextResponse } from 'next/server';

// GET - Cardápio de um dia. `menu` vem nulo se não existe, é rascunho ou ainda é de um dia futuro.
export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { date } = await params;
  if (!isValidDay(date)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });

  const today = todaySP();
  try {
    const menu = await getMenu(date);
    const visible = menu && isVisibleToCustomer(menu, today) ? menu : null;
    // o que o cliente não precisa saber
    const safe = visible ? { ...visible, notifyCustomers: undefined, updatedAt: undefined } : null;
    return NextResponse.json({ today, menu: safe }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ today, menu: null });
    console.error('Error loading customer menu:', error);
    return NextResponse.json({ error: 'Erro ao buscar o cardápio' }, { status: 500 });
  }
}

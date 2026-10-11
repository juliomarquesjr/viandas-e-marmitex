import { getCustomerSession } from '@/lib/customer-auth';
import { isValidDay, lastVisibleDay } from '@/lib/daily-menu';
import { getMenuDaysAhead } from '@/lib/daily-menu-settings';
import { addDaysToDay } from '@/lib/date-range';
import { isMissingTable, listMenuSummaries } from '@/lib/daily-menu-db';
import { todaySP } from '@/lib/date-range';
import { NextRequest, NextResponse } from 'next/server';

// GET - Cardápios publicados que o cliente pode ver (até a janela de dias à frente que o administrador definiu),
// do mais novo ao mais antigo. ?before=AAAA-MM-DD (só os anteriores a esse dia), ?limit=N (padrão 30, máximo 60)
// e ?until=today|tomorrow (corta no dia: o aviso do Início só precisa de hoje ou amanhã).
export async function GET(request: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const before = params.get('before') ?? undefined;
  if (before && !isValidDay(before)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  const limit = Math.min(60, Math.max(1, Number(params.get('limit')) || 30));

  const today = todaySP();
  try {
    const daysAhead = await getMenuDaysAhead();
    const lastVisible = lastVisibleDay(today, daysAhead);
    const until = params.get('until');
    const to = until === 'today' ? today : until === 'tomorrow' ? addDaysToDay(today, 1) : lastVisible;
    const menus = await listMenuSummaries({ published: true, to: to < lastVisible ? to : lastVisible, before, limit });
    return NextResponse.json({ today, daysAhead, lastVisible, menus }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // migration ainda não aplicada: nada de cardápio, sem quebrar o app
    if (isMissingTable(error)) return NextResponse.json({ today, menus: [] });
    console.error('Error listing customer menus:', error);
    return NextResponse.json({ error: 'Erro ao buscar os cardápios' }, { status: 500 });
  }
}

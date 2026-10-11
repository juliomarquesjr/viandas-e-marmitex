import { MENU_DAYS_AHEAD } from '@/lib/daily-menu';
import { getMenuDaysAhead, setMenuDaysAhead } from '@/lib/daily-menu-settings';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET/PUT - Quantos dias à frente o cliente enxerga os cardápios publicados (só administrador)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ daysAhead: await getMenuDaysAhead() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => null)) ?? {};
  const asked = Number(body.daysAhead);
  if (!Number.isInteger(asked) || asked < MENU_DAYS_AHEAD.MIN || asked > MENU_DAYS_AHEAD.MAX) {
    return NextResponse.json({ error: `Escolha de ${MENU_DAYS_AHEAD.MIN} a ${MENU_DAYS_AHEAD.MAX} dias.` }, { status: 400 });
  }
  try {
    return NextResponse.json({ daysAhead: await setMenuDaysAhead(asked) });
  } catch (error) {
    console.error('Error saving menu days ahead:', error);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}

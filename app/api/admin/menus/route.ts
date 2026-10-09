import { isValidDay } from '@/lib/daily-menu';
import { listMenuSummaries } from '@/lib/daily-menu-db';
import { requireAdmin } from '@/lib/staff-session';
import { NextRequest, NextResponse } from 'next/server';

// GET - Resumos dos cardápios (só administrador). ?from=AAAA-MM-DD&to=AAAA-MM-DD
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const from = request.nextUrl.searchParams.get('from') ?? undefined;
  const to = request.nextUrl.searchParams.get('to') ?? undefined;
  if ((from && !isValidDay(from)) || (to && !isValidDay(to))) {
    return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
  }
  try {
    const menus = await listMenuSummaries({ from, to, limit: 400 });
    return NextResponse.json({ menus });
  } catch (error) {
    console.error('Error listing menus:', error);
    return NextResponse.json({ error: 'Erro ao buscar os cardápios' }, { status: 500 });
  }
}

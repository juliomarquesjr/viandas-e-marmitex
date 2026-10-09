import { isValidDay, validateMenuInput } from '@/lib/daily-menu';
import { deleteMenu, getMenu, saveMenu } from '@/lib/daily-menu-db';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

type Ctx = { params: Promise<{ date: string }> };

// GET - Cardápio de um dia (menu: null quando ainda não existe). Só administrador.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { date } = await params;
  if (!isValidDay(date)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  try {
    return NextResponse.json({ menu: await getMenu(date) });
  } catch (error) {
    console.error('Error loading menu:', error);
    return NextResponse.json({ error: 'Erro ao buscar o cardápio' }, { status: 500 });
  }
}

// PUT - Cria ou substitui o cardápio do dia (seções e itens vêm completos)
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { date } = await params;
  if (!isValidDay(date)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const result = validateMenuInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    return NextResponse.json({ menu: await saveMenu(date, result.value) });
  } catch (error) {
    console.error('Error saving menu:', error);
    return NextResponse.json({ error: 'Erro ao salvar o cardápio' }, { status: 500 });
  }
}

// DELETE - Apaga o cardápio do dia
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { date } = await params;
  if (!isValidDay(date)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  try {
    await deleteMenu(date);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ error: 'Erro ao apagar o cardápio' }, { status: 500 });
  }
}

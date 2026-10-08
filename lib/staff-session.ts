import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/** Perfis de funcionário. Quem faz login como cliente não tem nenhum deles. */
export const STAFF_ROLES = ['admin', 'pdv'] as const;

export interface StaffSession {
  userId: string;
  name: string;
  role: string;
}

/**
 * Funcionário logado (admin ou PDV). Devolve a sessão ou a resposta pronta para retornar.
 *
 * Checar só "existe sessão" não basta: é o perfil (admin ou pdv) que separa funcionário
 * de cliente, e é por ele que esta função decide.
 */
export async function requireStaff(): Promise<{ staff: StaffSession } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id || !role) {
    return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    return { error: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
  }
  return { staff: { userId: session.user.id, name: session.user.name ?? '', role } };
}

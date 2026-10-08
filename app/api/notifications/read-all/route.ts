import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// POST - Marca todas como lidas. As que ainda pedem ação continuam contando no sino.
export async function POST() {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const result = await prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Erro ao marcar como lidas' }, { status: 500 });
  }
}

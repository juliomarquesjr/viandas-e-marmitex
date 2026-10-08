import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// POST - Marca uma notificação como lida (não a resolve: o que pede ação continua pedindo)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const result = await prisma.notification.updateMany({
      where: { id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { getThread } from '@/lib/whatsapp-chat-service';

// GET ?before=ISO - O cliente e as mensagens da conversa (as últimas; `before` traz as anteriores)
export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  const beforeParam = new URL(request.url).searchParams.get('before');
  const before = beforeParam ? new Date(beforeParam) : undefined;
  if (before && Number.isNaN(before.getTime())) return NextResponse.json({ error: 'Parâmetro "before" inválido' }, { status: 400 });
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true, phoneIsWhatsapp: true, imageUrl: true, createdAt: true },
    });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    const thread = await getThread(customerId, before);
    return NextResponse.json({ customer: { ...customer, createdAt: customer.createdAt.toISOString() }, ...thread }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading WhatsApp thread:', error);
    return NextResponse.json({ error: 'Erro ao carregar a conversa' }, { status: 500 });
  }
}

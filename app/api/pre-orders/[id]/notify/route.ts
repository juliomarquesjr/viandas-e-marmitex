import prisma from '@/lib/prisma';
import { canNotifyOnWhatsapp } from '@/lib/messages/order-status-send';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// PUT { notify: boolean } - liga ou desliga o aviso do andamento do pedido pelo WhatsApp.
// Não envia nada na hora: vale para as próximas etapas. Só liga para cliente com WhatsApp.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { notify?: unknown } | null;
    if (typeof body?.notify !== 'boolean') return NextResponse.json({ error: 'Informe se o cliente deve ser avisado.' }, { status: 400 });

    const order = await prisma.preOrder.findUnique({ where: { id }, select: { customer: { select: { phone: true, phoneIsWhatsapp: true } } } });
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    if (body.notify && !canNotifyOnWhatsapp(order.customer)) {
      return NextResponse.json({ error: 'O cliente deste pedido não tem WhatsApp cadastrado.' }, { status: 409 });
    }

    await prisma.preOrder.update({ where: { id }, data: { notifyCustomer: body.notify } });
    return NextResponse.json({ notifyCustomer: body.notify });
  } catch (error) {
    console.error('Error updating order notice:', error);
    return NextResponse.json({ error: 'Não foi possível salvar a escolha.' }, { status: 500 });
  }
}

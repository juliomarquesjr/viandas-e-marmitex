import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/staff-session';
import { eligibleRecipients, menuSendOverview, receivedToday } from '@/lib/messages/daily-menu-send';
import { ensureFresh } from '@/lib/whatsapp-service';

// GET - Situação do envio do cardápio em massa: cardápio de hoje, WhatsApp e quem pode receber
export async function GET() {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  try {
    await ensureFresh();
    const [overview, recipients] = await Promise.all([menuSendOverview(), eligibleRecipients()]);
    const received = await receivedToday(recipients.withWhatsapp.map((c) => c.id));
    return NextResponse.json(
      {
        menu: overview.menu,
        whatsapp: overview.whatsapp,
        activeCustomers: recipients.active,
        withWhatsapp: recipients.withWhatsapp.length,
        // quem entra na fila, na ordem; `received` diz quem já recebeu hoje
        recipients: recipients.withWhatsapp.map((c) => ({ id: c.id, name: c.name, receivedAt: received.get(c.id)?.toISOString() ?? null })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading menu broadcast:', error);
    return NextResponse.json({ error: 'Erro ao verificar o envio do cardápio' }, { status: 500 });
  }
}

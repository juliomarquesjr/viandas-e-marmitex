import { after, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendCustomerMessage, channelReadiness } from '@/lib/messages/service';
import { createPasswordResetToken, RESET_TOKEN_TTL_MINUTES } from '@/lib/customer-password-reset';
import { findWhatsappAccountsByPhone, parseRecoveryChannel, phoneLimitKey, type RecoveryChannel } from '@/lib/customer-recovery';
import { checkRateLimit, checkUserRateLimit, getClientIP } from '@/lib/rate-limit';

const GENERIC = {
  email: 'Se o email estiver cadastrado, você receberá um link para redefinir a senha.',
  whatsapp: 'Se o telefone estiver cadastrado com WhatsApp, você receberá um link para redefinir a senha.',
} as const;
const genericResponse = (channel: RecoveryChannel) => NextResponse.json({ success: true, message: GENERIC[channel] });

// Cooldown entre pedidos para o mesmo cliente (evita spam de emails e de mensagens)
const COOLDOWN_MS = 60 * 1000;
// O endereço faz o WhatsApp do estabelecimento escrever para um telefone qualquer: limite por IP e por telefone
const IP_LIMIT = { attempts: 10, windowMs: 15 * 60 * 1000 };
const PHONE_LIMIT = { attempts: 3, windowMs: 60 * 60 * 1000 };

const RESET_TYPE = 'customer_password_reset';

// GET - Quais jeitos de receber o link existem agora. O e-mail sempre; o WhatsApp só se o do
// estabelecimento estiver conectado e o modelo ligado. Não diz nada sobre nenhuma conta.
export async function GET() {
  try {
    const whatsapp = await channelReadiness(RESET_TYPE, 'whatsapp');
    return NextResponse.json({ whatsapp: whatsapp.ready }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ whatsapp: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  let channel: RecoveryChannel = 'email';
  try {
    const body = (await request.json().catch(() => null)) ?? {};
    channel = parseRecoveryChannel(body.channel);

    if (!checkRateLimit(`forgot:${getClientIP(request)}`, IP_LIMIT.attempts, IP_LIMIT.windowMs).allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
    }

    let customer;
    if (channel === 'whatsapp') {
      const phone = typeof body.phone === 'string' ? body.phone : '';
      const { login, accounts } = await findWhatsappAccountsByPhone(phone);
      if (!login) return NextResponse.json({ error: 'Informe o telefone com DDD, por exemplo (55) 99999-9999' }, { status: 400 });
      if (!checkUserRateLimit(phoneLimitKey(login), PHONE_LIMIT.attempts, PHONE_LIMIT.windowMs).allowed) return genericResponse(channel);
      // Duas contas no mesmo número: não há como saber qual é a do cliente sem a senha, então não envia a nenhuma
      customer = accounts.length === 1 ? accounts[0] : null;
    } else {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email) return NextResponse.json({ error: 'Informe o email cadastrado' }, { status: 400 });
      customer = await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, active: true } });
      if (customer && !customer.email) customer = null;
    }

    // Resposta idêntica exista o cliente ou não, para não revelar quem é cliente
    if (!customer) return genericResponse(channel);

    const recent = await prisma.customerPasswordResetToken.findFirst({
      where: { customerId: customer.id, createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
    });
    if (recent) return genericResponse(channel);

    // Trabalho pesado (SMTP, WhatsApp) roda depois da resposta para que o tempo não revele se a conta existe
    const contact = { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, phoneIsWhatsapp: customer.phoneIsWhatsapp };
    const via = channel;
    after(async () => {
      try {
        const token = await createPasswordResetToken(contact.id);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        // Texto editável em Configurações > Mensagens (o mesmo padrão nos dois canais); o resultado vai para o histórico
        const [result] = await sendCustomerMessage({
          typeKey: RESET_TYPE,
          customer: contact,
          channels: [via],
          values: { link: resetUrl, validade: String(RESET_TOKEN_TTL_MINUTES) },
        });
        if (!result.ok) console.error(`forgot-password: falha ao enviar a redefinição por ${via}:`, result.error);
      } catch (error) {
        console.error(`forgot-password: falha ao enviar a redefinição por ${via}:`, error);
      }
    });

    return genericResponse(channel);
  } catch (error) {
    // Falhas internas também não podem diferenciar clientes existentes dos inexistentes
    console.error('Error in forgot-password:', error);
    return genericResponse(channel);
  }
}

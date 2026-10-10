import { after, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendCustomerMessage } from '@/lib/messages/service';
import { createPasswordResetToken, RESET_TOKEN_TTL_MINUTES } from '@/lib/customer-password-reset';

const GENERIC_RESPONSE = {
  success: true,
  message: 'Se o email estiver cadastrado, você receberá um link para redefinir a senha.',
};

// Cooldown entre pedidos para o mesmo cliente (evita spam de emails)
const COOLDOWN_MS = 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Informe o email cadastrado' }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, active: true },
    });

    // Resposta idêntica exista o cliente ou não, para não revelar emails cadastrados
    if (!customer || !customer.email) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const recent = await prisma.customerPasswordResetToken.findFirst({
      where: { customerId: customer.id, createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
    });
    if (recent) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Trabalho pesado (SMTP) roda depois da resposta para que o tempo não revele se o email existe
    const contact = { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, phoneIsWhatsapp: customer.phoneIsWhatsapp };
    after(async () => {
      try {
        const token = await createPasswordResetToken(contact.id);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        // Texto editável em Configurações > Mensagens; o resultado vai para o histórico
        const [result] = await sendCustomerMessage({
          typeKey: 'customer_password_reset',
          customer: contact,
          channels: ['email'],
          values: { link: resetUrl, validade: String(RESET_TOKEN_TTL_MINUTES) },
        });
        if (!result.ok) console.error('forgot-password: falha ao enviar email de redefinição:', result.error);
      } catch (error) {
        console.error('forgot-password: falha ao enviar email de redefinição:', error);
      }
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    // Falhas internas também não podem diferenciar clientes existentes dos inexistentes
    console.error('Error in forgot-password:', error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}

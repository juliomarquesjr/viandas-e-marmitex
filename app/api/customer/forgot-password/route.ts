import { after, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { EmailTemplates } from '@/lib/email-templates';
import { createPasswordResetToken, RESET_TOKEN_TTL_MINUTES } from '@/lib/customer-password-reset';
import { SystemConfig } from '@/lib/types';

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
    const { id, name, email: to } = customer;
    after(async () => {
      try {
        const configs = await prisma.systemConfig.findMany({ where: { category: 'email' } });
        if (configs.length === 0) {
          console.error('forgot-password: configurações de email não encontradas');
          return;
        }
        await emailService.configure(configs as SystemConfig[]);

        const token = await createPasswordResetToken(id);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await emailService.sendEmail({
          to,
          subject: 'Redefinição de senha - Sabores de Casa',
          html: EmailTemplates.generatePasswordResetHtml(name, resetUrl, RESET_TOKEN_TTL_MINUTES),
          text: EmailTemplates.generatePasswordResetText(name, resetUrl, RESET_TOKEN_TTL_MINUTES),
        });
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

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { findValidResetToken, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/customer-password-reset';

const INVALID_TOKEN = 'Link inválido ou expirado. Solicite uma nova redefinição de senha.';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) ?? {};
    const token = typeof body.token === 'string' ? body.token : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token e nova senha são obrigatórios' }, { status: 400 });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const record = await findValidResetToken(token);
    if (!record) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Marca o token como usado só se ainda estiver livre: protege contra uso concorrente
    const consumed = await prisma.$transaction(async (tx) => {
      const claim = await tx.customerPasswordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) return false;

      await tx.customer.update({
        where: { id: record.customerId },
        data: { password: hashedPassword },
      });
      return true;
    });

    if (!consumed) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 });
  }
}

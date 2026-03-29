import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Returns the date of the last ficha_payment for the customer.
// Falls back to the first order date if no payment exists.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    const lastPayment = await prisma.order.findFirst({
      where: { customerId, paymentMethod: 'ficha_payment' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const firstOrder = !lastPayment
      ? await prisma.order.findFirst({
          where: { customerId, paymentMethod: { not: 'ficha_payment' } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        })
      : null;

    const date = lastPayment?.createdAt ?? firstOrder?.createdAt ?? null;

    return NextResponse.json({
      lastEntryDate: date ? date.toISOString().split('T')[0] : null,
    });
  } catch (error) {
    console.error('Error fetching last entry date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

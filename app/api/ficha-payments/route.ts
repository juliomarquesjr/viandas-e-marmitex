import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// POST - Registrar pagamento de ficha
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validação básica
    if (!body.customerId || !body.amountCents || body.amountCents <= 0) {
      return NextResponse.json(
        { error: 'Customer ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Verificar método de pagamento válido
    const validPaymentMethods = ['cash', 'credit', 'debit', 'pix'];
    if (!body.paymentMethod || !validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (cash, credit, debit, pix)' },
        { status: 400 }
      );
    }

    // Verificar se o cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Criar um pedido especial para registrar o pagamento
    const paymentData: any = {
      customerId: body.customerId,
      status: 'pending',
      subtotalCents: body.amountCents,
      discountCents: 0,
      deliveryFeeCents: 0,
      totalCents: body.amountCents,
      paymentMethod: 'ficha_payment', // Tipo especial para pagamentos de ficha
      items: {
        create: []
      }
    };

    // Definir createdAt com base na data de pagamento fornecida, ou usar a data atual
    if (body.paymentDate) {
      // Converter a string de data (YYYY-MM-DD) para Date, ajustando para timezone Brasil (UTC-3)
      // Para evitar problemas de fuso horário, criamos a data com hora meio-dia (12:00) no horário UTC
      const [year, month, day] = body.paymentDate.split('-').map(Number);
      paymentData.createdAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }

    // Adicionar dados específicos do método de pagamento
    if (body.paymentMethod === 'cash' && body.cashReceivedCents !== undefined) {
      paymentData.cashReceivedCents = body.cashReceivedCents;
      paymentData.changeCents = body.changeCents || 0;
    }

    const paymentOrder = await prisma.order.create({
      data: paymentData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        items: true
      }
    });

    return NextResponse.json(paymentOrder);
  } catch (error) {
    console.error('Error creating ficha payment:', error);
    return NextResponse.json(
      { error: 'Failed to create ficha payment' },
      { status: 500 }
    );
  }
}

// GET - Obter saldo devedor do cliente
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Obter todas as vendas pendentes do cliente (excluindo pagamentos de ficha)
    const pendingOrders = await prisma.order.findMany({
      where: {
        customerId,
        status: 'pending',
        paymentMethod: {
          not: 'ficha_payment'
        }
      },
      select: {
        id: true,
        totalCents: true
      }
    });

    // Calcular o total das vendas pendentes
    const totalPending = pendingOrders.reduce((sum, order) => sum + order.totalCents, 0);

    // Obter todos os pagamentos de ficha do cliente
    const fichaPayments = await prisma.order.findMany({
      where: {
        customerId,
        paymentMethod: 'ficha_payment'
      },
      select: {
        id: true,
        totalCents: true,
        createdAt: true,
        status: true,
        paymentMethod: true,
        cashReceivedCents: true,
        changeCents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular o total dos pagamentos
    const totalPayments = fichaPayments.reduce((sum, payment) => sum + payment.totalCents, 0);

    // Calcular o saldo devedor
    const balanceCents = totalPending - totalPayments;

    return NextResponse.json({
      balanceCents,
      pendingOrders,
      fichaPayments,
      totalPending,
      totalPayments
    });
  } catch (error) {
    console.error('Error fetching customer balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer balance' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir pagamento de ficha
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Verificar se o pagamento existe e é realmente um pagamento de ficha
    const payment = await prisma.order.findUnique({
      where: {
        id,
        paymentMethod: 'ficha_payment'
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Ficha payment not found or not a valid ficha payment' },
        { status: 404 }
      );
    }

    // Excluir pagamento de ficha
    await prisma.order.delete({
      where: {
        id,
        paymentMethod: 'ficha_payment' // Ensure it's actually a ficha payment
      }
    });

    return NextResponse.json({ message: 'Ficha payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting ficha payment:', error);
    // Verificar se é um erro de constraint
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Não é possível excluir o pagamento pois ele possui registros relacionados.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete ficha payment' },
      { status: 500 }
    );
  }
}

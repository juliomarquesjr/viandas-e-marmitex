import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      );
    }

    // Converter datas para UTC
    const startDateTime = new Date(startDate + 'T00:00:00.000Z');
    const endDateTime = new Date(endDate + 'T23:59:59.999Z');

    // Calcular receitas
    const [salesRevenue, fichaPaymentsRevenue, expenses] = await Promise.all([
      // Vendas confirmadas (excluindo ficha_payment)
      prisma.order.aggregate({
        where: {
          status: 'confirmed',
          paymentMethod: { not: 'ficha_payment' },
          createdAt: {
            gte: startDateTime,
            lte: endDateTime
          }
        },
        _sum: {
          totalCents: true
        }
      }),

      // Pagamentos ficha (entrada real de dinheiro)
      prisma.order.aggregate({
        where: {
          paymentMethod: 'ficha_payment',
          createdAt: {
            gte: startDateTime,
            lte: endDateTime
          }
        },
        _sum: {
          totalCents: true
        }
      }),

      // Despesas do período
      prisma.expense.aggregate({
        where: {
          date: {
            gte: startDateTime,
            lte: endDateTime
          }
        },
        _sum: {
          amountCents: true
        }
      })
    ]);

    const salesTotal = Number(salesRevenue._sum.totalCents || 0);
    const fichaPaymentsTotal = Number(fichaPaymentsRevenue._sum.totalCents || 0);
    const expensesTotal = Number(expenses._sum.amountCents || 0);
    
    const totalRevenue = salesTotal + fichaPaymentsTotal;
    const profit = totalRevenue - expensesTotal;
    const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Buscar detalhes das despesas por tipo
    const expensesByType = await prisma.expense.groupBy({
      by: ['typeId'],
      where: {
        date: {
          gte: startDateTime,
          lte: endDateTime
        }
      },
      _sum: {
        amountCents: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          amountCents: 'desc'
        }
      }
    });

    // Buscar tipos de despesa para os detalhes
    const expenseTypeIds = expensesByType.map(e => e.typeId);
    const expenseTypes = await prisma.expenseType.findMany({
      where: { id: { in: expenseTypeIds } },
      select: { id: true, name: true }
    });

    const expenseTypeMap = new Map(expenseTypes.map(et => [et.id, et.name]));

    const expensesDetails = expensesByType.map(expense => ({
      typeId: expense.typeId,
      typeName: expenseTypeMap.get(expense.typeId) || 'Tipo não encontrado',
      amountCents: expense._sum.amountCents || 0,
      count: expense._count.id
    }));

    // Buscar detalhes das receitas por dia
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        SUM(CASE 
          WHEN status = 'confirmed' AND "paymentMethod" != 'ficha_payment' THEN "totalCents"
          ELSE 0 
        END) as sales_revenue,
        SUM(CASE 
          WHEN "paymentMethod" = 'ficha_payment' THEN "totalCents"
          ELSE 0 
        END) as ficha_revenue
      FROM "Order"
      WHERE "createdAt" >= ${startDateTime} 
        AND "createdAt" <= ${endDateTime}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date DESC
    `;

    // Normalizar BigInt retornado por SUM() no $queryRaw
    const dailyRevenueNormalized = (dailyRevenue as any[]).map((row) => ({
      date: row.date,
      sales_revenue: Number(row.sales_revenue || 0),
      ficha_revenue: Number(row.ficha_revenue || 0),
    }));

    const response = {
      period: {
        startDate,
        endDate
      },
      revenue: {
        sales: salesTotal,
        fichaPayments: fichaPaymentsTotal,
        total: totalRevenue
      },
      expenses: {
        total: expensesTotal,
        details: expensesDetails
      },
      profit: {
        total: profit,
        percentage: Math.round(profitPercentage * 100) / 100 // Arredondar para 2 casas decimais
      },
      dailyBreakdown: dailyRevenueNormalized
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating profit report:', error);
    return NextResponse.json(
      { error: 'Failed to generate profit report' },
      { status: 500 }
    );
  }
}

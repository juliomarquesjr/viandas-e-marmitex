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
    
    // Para despesas, usar apenas a data (sem hora) para evitar problemas de timezone
    const startDateOnly = new Date(startDate + 'T00:00:00.000Z');
    const endDateOnly = new Date(endDate + 'T23:59:59.999Z');

    // Calcular receitas e métricas
    // IMPORTANTE: Para relatório de lucros, consideramos TODOS os pedidos (pending + confirmed)
    // pois mesmo os pendentes representam receita do período
    const [salesRevenue, fichaPaymentsRevenue, expenses, ordersCount] = await Promise.all([
      // Vendas (todos os status, excluindo ficha_payment)
      prisma.order.aggregate({
        where: {
          paymentMethod: { not: 'ficha_payment' },
          createdAt: {
            gte: startDateTime,
            lte: endDateTime
          }
        },
        _sum: {
          totalCents: true
        },
        _count: {
          id: true
        }
      }),

      // Pagamentos ficha (todos os status)
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
        },
        _count: {
          id: true
        }
      }),

      // Despesas do período (usar apenas data, sem hora)
      prisma.expense.aggregate({
        where: {
          date: {
            gte: startDateOnly,
            lte: endDateOnly
          }
        },
        _sum: {
          amountCents: true
        },
        _count: {
          id: true
        }
      }),

      // Contagem total de pedidos (todos os status)
      prisma.order.count({
        where: {
          createdAt: {
            gte: startDateTime,
            lte: endDateTime
          }
        }
      })
    ]);

    const salesTotal = Number(salesRevenue._sum.totalCents || 0);
    const fichaPaymentsTotal = Number(fichaPaymentsRevenue._sum.totalCents || 0);
    const expensesTotal = Number(expenses._sum.amountCents || 0);
    const totalOrders = Number(ordersCount || 0);
    
    const totalRevenue = salesTotal + fichaPaymentsTotal;
    const profit = totalRevenue - expensesTotal;
    const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    // Calcular ticket médio
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calcular número de dias no período
    const daysDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const averageDailyRevenue = daysDiff > 0 ? totalRevenue / daysDiff : 0;
    const averageDailyExpenses = daysDiff > 0 ? expensesTotal / daysDiff : 0;

    // Buscar detalhes das despesas por tipo
    const expensesByType = await prisma.expense.groupBy({
      by: ['typeId'],
      where: {
        date: {
          gte: startDateOnly,
          lte: endDateOnly
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
    // Converter para timezone do Brasil e retornar como string YYYY-MM-DD para evitar problemas de timezone
    // IMPORTANTE: Considerar TODOS os pedidos (pending + confirmed) para o relatório de lucros
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') as date,
        SUM(CASE 
          WHEN "paymentMethod" != 'ficha_payment' THEN "totalCents"
          ELSE 0 
        END) as sales_revenue,
        SUM(CASE 
          WHEN "paymentMethod" = 'ficha_payment' THEN "totalCents"
          ELSE 0 
        END) as ficha_revenue
      FROM "Order"
      WHERE "createdAt" >= ${startDateTime} 
        AND "createdAt" <= ${endDateTime}
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date DESC
    `;

    // Buscar despesas por dia para o gráfico
    // Usar apenas a data diretamente, sem conversão de timezone (campo date já é DATE)
    const dailyExpenses = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        SUM("amountCents") as expenses
      FROM "Expense"
      WHERE date >= ${startDate}::date
        AND date <= ${endDate}::date
      GROUP BY date
      ORDER BY date DESC
    `;

    // Normalizar BigInt retornado por SUM() no $queryRaw
    const dailyRevenueNormalized = (dailyRevenue as any[]).map((row) => ({
      date: row.date, // Já vem como string YYYY-MM-DD
      sales_revenue: Number(row.sales_revenue || 0),
      ficha_revenue: Number(row.ficha_revenue || 0),
    }));

    // Normalizar despesas diárias
    const dailyExpensesNormalized = (dailyExpenses as any[]).map((row) => ({
      date: row.date,
      expenses: Number(row.expenses || 0),
    }));

    // Criar mapa de despesas por data
    const expensesMap = new Map(dailyExpensesNormalized.map((e) => [e.date, e.expenses]));

    // Combinar receitas e despesas por dia para o gráfico
    const dailyChartData = dailyRevenueNormalized.map((revenue) => {
      const expenses = expensesMap.get(revenue.date) || 0;
      return {
        date: revenue.date,
        sales_revenue: revenue.sales_revenue,
        ficha_revenue: revenue.ficha_revenue,
        total_revenue: revenue.sales_revenue + revenue.ficha_revenue,
        expenses,
        profit: (revenue.sales_revenue + revenue.ficha_revenue) - expenses,
      };
    });

    // Ordenar por data crescente para o gráfico
    dailyChartData.sort((a, b) => a.date.localeCompare(b.date));

    // Calcular top 5 dias mais lucrativos
    const topDays = [...dailyChartData]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const response = {
      period: {
        startDate,
        endDate,
        days: daysDiff
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
      metrics: {
        totalOrders,
        averageTicket: Math.round(averageTicket),
        averageDailyRevenue: Math.round(averageDailyRevenue),
        averageDailyExpenses: Math.round(averageDailyExpenses),
      },
      dailyBreakdown: dailyRevenueNormalized,
      dailyChartData,
      topDays
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

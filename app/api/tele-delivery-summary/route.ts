import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const TELE_DELIVERY_PRODUCT_ID = '3d0379a9-ad65-454b-8069-38f326462218';

interface TeleDeliverySale {
  id: string;
  date: string;
  quantity: number;
  priceCents: number;
  totalCents: number;
}

interface TeleDeliveryByDay {
  date: string;
  quantity: number;
  totalCents: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Parâmetros startDate e endDate são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar e parsear datas como locais (evita off-by-one por UTC)
    const parseLocalDate = (dateStr: string, endOfDay: boolean): Date => {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (endOfDay) {
        return new Date(y, m - 1, d, 23, 59, 59, 999);
      }
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };
    const start = parseLocalDate(startDate, false);
    const end = parseLocalDate(endDate, true);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Datas inválidas' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Data inicial deve ser menor ou igual à data final' },
        { status: 400 }
      );
    }

    // Buscar vendas de tele entrega no período
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        items: {
          some: {
            productId: TELE_DELIVERY_PRODUCT_ID,
          },
        },
      },
      include: {
        items: {
          where: {
            productId: TELE_DELIVERY_PRODUCT_ID,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Formatar data em YYYY-MM-DD no fuso local (evita deslocamento ao agrupar)
    const toLocalDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Processar dados
    const sales: TeleDeliverySale[] = orders.flatMap((order: any) =>
      order.items.map((item: any) => ({
        id: order.id,
        date: toLocalDateKey(order.createdAt),
        quantity: item.quantity,
        priceCents: item.priceCents,
        totalCents: item.quantity * item.priceCents,
      }))
    );

    // Agrupar por dia (date já é YYYY-MM-DD local)
    const salesByDay: TeleDeliveryByDay[] = sales.reduce((acc: TeleDeliveryByDay[], sale: TeleDeliverySale) => {
      const dateKey = sale.date;
      const existingDay = acc.find(day => day.date === dateKey);
      
      if (existingDay) {
        existingDay.quantity += sale.quantity;
        existingDay.totalCents += sale.totalCents;
      } else {
        acc.push({
          date: dateKey,
          quantity: sale.quantity,
          totalCents: sale.totalCents,
        });
      }
      
      return acc;
    }, []);

    // Ordenar por data
    salesByDay.sort((a, b) => a.date.localeCompare(b.date));

    // Calcular resumo
    const totalSales = sales.length;
    const totalAmountCents = sales.reduce((sum: number, sale: TeleDeliverySale) => sum + sale.totalCents, 0);
    const averageAmountCents = totalSales > 0 ? Math.round(totalAmountCents / totalSales) : 0;
    const totalDays = salesByDay.length;

    return NextResponse.json({
      summary: {
        totalSales,
        totalAmountCents,
        averageAmountCents,
        totalDays,
      },
      salesByDay,
      period: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de tele entrega:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados de tele entrega' },
      { status: 500 }
    );
  }
}

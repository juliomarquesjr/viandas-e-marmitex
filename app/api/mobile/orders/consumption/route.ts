import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileSession } from '@/lib/mobile-auth';

export async function GET(request: Request) {
    try {
        // Verificar autenticação mobile
        const session = await getMobileSession();

        if (!session || !session.id) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        const customerId = session.id as string;
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Validar parâmetros obrigatórios
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Data inicial e final são obrigatórias' },
                { status: 400 }
            );
        }

        // Parse das datas e ajuste de timezone (mesma lógica do relatório de fechamento)
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

        // Início do dia (00:00:00)
        const startDateTimeLocal = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        const startDateTime = new Date(startDateTimeLocal.getTime() - startDateTimeLocal.getTimezoneOffset() * 60000);

        // Fim do dia (23:59:59.999)
        const endDateTimeLocal = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        const endDateTime = new Date(endDateTimeLocal.getTime() - endDateTimeLocal.getTimezoneOffset() * 60000);

        // Buscar pedidos do período (excluir ficha_payment)
        const periodOrders = await prisma.order.findMany({
            where: {
                customerId,
                createdAt: {
                    gte: startDateTime,
                    lte: endDateTime
                },
                paymentMethod: {
                    not: 'ficha_payment'
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Buscar pedidos pendentes (para saldo devedor)
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
                totalCents: true,
                createdAt: true,
                status: true
            }
        });

        // Buscar pagamentos de ficha
        const fichaPayments = await prisma.order.findMany({
            where: {
                customerId,
                paymentMethod: 'ficha_payment'
            },
            select: {
                id: true,
                totalCents: true,
                createdAt: true,
                status: true
            }
        });

        // Calcular totais
        const periodConsumptionCents = periodOrders.reduce((sum, order) => sum + order.totalCents, 0);

        // Filtrar pagamentos até a data final
        const fichaPaymentsUntilEndDate = fichaPayments.filter(payment => {
            return payment.createdAt <= endDateTime;
        });

        // Filtrar pedidos pendentes até a data final
        const pendingOrdersUntilEndDate = pendingOrders.filter(order => {
            return order.createdAt <= endDateTime;
        });

        // Pagamentos no período
        const fichaPaymentsInPeriod = fichaPayments.filter(payment => {
            return payment.createdAt >= startDateTime && payment.createdAt <= endDateTime;
        });

        const totalPaymentsInPeriodCents = fichaPaymentsInPeriod.reduce(
            (sum, payment) => sum + payment.totalCents,
            0
        );

        const totalPaymentsUntilEndDateCents = fichaPaymentsUntilEndDate.reduce(
            (sum, payment) => sum + payment.totalCents,
            0
        );

        const pendingAmountUntilEndDateCents = pendingOrdersUntilEndDate.reduce(
            (sum, order) => sum + order.totalCents,
            0
        );

        // Saldo devedor
        const debtBalanceCents = pendingAmountUntilEndDateCents - totalPaymentsUntilEndDateCents;

        // Calcular resumo mensal
        const monthlyGroups = new Map<string, {
            purchases: number;
            payments: number;
        }>();

        // Adicionar compras do período
        periodOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyGroups.has(monthKey)) {
                monthlyGroups.set(monthKey, { purchases: 0, payments: 0 });
            }
            const group = monthlyGroups.get(monthKey);
            if (group) {
                group.purchases += order.totalCents;
            }
        });

        // Adicionar pagamentos do período
        fichaPaymentsInPeriod.forEach(payment => {
            const paymentDate = new Date(payment.createdAt);
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyGroups.has(monthKey)) {
                monthlyGroups.set(monthKey, { purchases: 0, payments: 0 });
            }
            const group = monthlyGroups.get(monthKey);
            if (group) {
                group.payments += payment.totalCents;
            }
        });

        // Calcular saldo inicial (antes do período)
        const ordersBeforePeriod = pendingOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate < startDateTime;
        });
        const paymentsBeforePeriod = fichaPayments.filter(p => {
            const paymentDate = new Date(p.createdAt);
            return paymentDate < startDateTime;
        });
        const initialBalanceCents =
            ordersBeforePeriod.reduce((sum, o) => sum + o.totalCents, 0) -
            paymentsBeforePeriod.reduce((sum, p) => sum + p.totalCents, 0);

        // Ordenar meses e calcular saldos acumulados
        const sortedMonths = Array.from(monthlyGroups.keys()).sort();
        let accumulatedBalance = initialBalanceCents;

        const monthlySummary = sortedMonths.map((monthKey) => {
            const group = monthlyGroups.get(monthKey);
            if (!group) return null;

            const monthlyBalance = group.purchases - group.payments;
            const initialBalance = accumulatedBalance;
            accumulatedBalance += monthlyBalance;

            const [year, month] = monthKey.split('-');
            const monthFormatted = `${month}/${year}`;

            return {
                month: monthKey,
                monthFormatted,
                initialBalanceCents: initialBalance,
                purchasesCents: group.purchases,
                paymentsCents: group.payments,
                monthlyBalanceCents: monthlyBalance,
                finalBalanceCents: accumulatedBalance,
                status: accumulatedBalance > 0 ? 'devedor' : accumulatedBalance < 0 ? 'credito' : 'zerado'
            };
        }).filter(Boolean);

        // Preparar resposta
        const responseData = {
            period: {
                startDate,
                endDate
            },
            summary: {
                periodConsumptionCents,
                debtBalanceCents,
                totalPaymentsCents: totalPaymentsInPeriodCents
            },
            orders: periodOrders,
            monthlySummary
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Erro ao buscar consumo:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar consumo' },
            { status: 500 }
        );
    }
}

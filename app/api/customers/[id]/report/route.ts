import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Generate customer closing report for a specific period
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Validate required parameters
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Debug log to trace the issue
    console.log('Report API - Received parameters:', {
      customerId,
      startDate,
      endDate
    });

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        doc: true,
        barcode: true,
        address: true,
        active: true,
        createdAt: true
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Parse dates and set time boundaries
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    // Create dates using local timezone and adjust for UTC
    // Set start of day (00:00:00)
    const startDateTimeLocal = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const startDateTime = new Date(startDateTimeLocal.getTime() - startDateTimeLocal.getTimezoneOffset() * 60000);
    
    // Set end of day (23:59:59.999)
    const endDateTimeLocal = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    const endDateTime = new Date(endDateTimeLocal.getTime() - endDateTimeLocal.getTimezoneOffset() * 60000);

    // Get all orders for the customer in the period
    const periodOrders = await prisma.order.findMany({
      where: {
        customerId,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime
        },
        paymentMethod: {
          not: 'ficha_payment' // Exclude ficha payments from consumption
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

    // Get all pending orders (debt balance)
    const pendingOrders = await prisma.order.findMany({
      where: {
        customerId,
        status: 'pending',
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

    // Get all ficha payments for the customer
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate totals
    const periodConsumptionCents = periodOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const pendingAmountCents = pendingOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const totalPaymentsCents = fichaPayments.reduce((sum, payment) => sum + payment.totalCents, 0);
    const debtBalanceCents = pendingAmountCents - totalPaymentsCents;

    // Separate pending orders by period (in period vs outside period)
    const pendingInPeriod = pendingOrders.filter(order => 
      order.createdAt >= startDateTime && order.createdAt <= endDateTime
    );
    const pendingOutsidePeriod = pendingOrders.filter(order => 
      order.createdAt < startDateTime || order.createdAt > endDateTime
    );

    const pendingInPeriodCents = pendingInPeriod.reduce((sum, order) => sum + order.totalCents, 0);
    const pendingOutsidePeriodCents = pendingOutsidePeriod.reduce((sum, order) => sum + order.totalCents, 0);

    // Prepare report data
    const reportData = {
      customer,
      period: {
        startDate,
        endDate,
        startDateTime,
        endDateTime
      },
      summary: {
        periodConsumptionCents,
        debtBalanceCents,
        pendingAmountCents,
        totalPaymentsCents,
        pendingInPeriodCents,
        pendingOutsidePeriodCents
      },
      details: {
        periodOrders,
        pendingOrders: {
          inPeriod: pendingInPeriod,
          outsidePeriod: pendingOutsidePeriod,
          all: pendingOrders
        },
        fichaPayments
      },
      metadata: {
        generatedAt: new Date(),
        totalPeriodOrders: periodOrders.length,
        totalPendingOrders: pendingOrders.length,
        totalFichaPayments: fichaPayments.length
      }
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating customer report:', error);
    return NextResponse.json(
      { error: 'Failed to generate customer report' },
      { status: 500 }
    );
  }
}
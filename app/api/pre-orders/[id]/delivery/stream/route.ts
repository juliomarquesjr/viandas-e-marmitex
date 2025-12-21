import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

// GET - Server-Sent Events para atualizações em tempo real
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id: preOrderId } = await params;

    const preOrder = await prisma.preOrder.findUnique({
      where: { id: preOrderId },
      select: {
        id: true,
        customerId: true
      }
    });

    if (!preOrder) {
      return new Response('Pre-order not found', { status: 404 });
    }

    // Verificar permissões
    const isAdmin = session.user.role === 'admin';
    const isCustomer = preOrder.customerId === session.user.id;

    if (!isAdmin && !isCustomer) {
      return new Response('Forbidden', { status: 403 });
    }

    // Criar stream SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Enviar dados iniciais
        const initialData = await prisma.preOrder.findUnique({
          where: { id: preOrderId },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true
              }
            },
            deliveryPerson: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            tracking: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 1
            }
          }
        });

        if (initialData) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
          );
        }

        // Polling a cada 5 segundos
        const interval = setInterval(async () => {
          try {
            const updatedData = await prisma.preOrder.findUnique({
              where: { id: preOrderId },
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    address: true
                  }
                },
                deliveryPerson: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                tracking: {
                  orderBy: {
                    timestamp: 'desc'
                  },
                  take: 1
                }
              }
            });

            if (updatedData) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(updatedData)}\n\n`)
              );
            }
          } catch (error) {
            console.error('Error in SSE stream:', error);
            clearInterval(interval);
            controller.close();
          }
        }, 5000);

        // Limpar intervalo quando a conexão for fechada
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error creating SSE stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}


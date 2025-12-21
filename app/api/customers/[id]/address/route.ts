import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

// PUT - Atualizar coordenadas do endereço do cliente
export async function PUT(
  request: NextRequest,
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

    const { id } = await params;
    const body = await request.json();

    if (!body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: 'Latitude e longitude são obrigatórias' },
        { status: 400 }
      );
    }

    // Buscar cliente atual
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar endereço com coordenadas
    const currentAddress = customer.address as any || {};
    const updatedAddress = {
      ...currentAddress,
      latitude: body.latitude.toString(),
      longitude: body.longitude.toString()
    };

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        address: updatedAddress
      }
    });

    // Não retornar a senha
    const { password, ...customerWithoutPassword } = updatedCustomer;
    return NextResponse.json(customerWithoutPassword);
  } catch (error) {
    console.error('Error updating customer address:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar endereço do cliente' },
      { status: 500 }
    );
  }
}


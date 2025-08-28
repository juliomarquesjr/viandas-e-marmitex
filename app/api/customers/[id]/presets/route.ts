import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";



// GET - Buscar presets de produtos de um cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }



    // Verificar se o cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar presets com informações dos produtos
    const presets = await prisma.customerProductPreset.findMany({
      where: {
        customerId,
        active: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            priceCents: true,
            barcode: true,
            imageUrl: true,
            active: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error("Erro ao buscar presets:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST - Criar ou atualizar presets de produtos para um cliente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const body = await request.json();
    const { presets } = body; // Array de { productId, quantity }

    if (!Array.isArray(presets)) {
      return NextResponse.json(
        { error: "Formato inválido: presets deve ser um array" },
        { status: 400 }
      );
    }

    // Verificar se o cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se todos os produtos existem e estão ativos
    const productIds = presets.map((p: any) => p.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Um ou mais produtos não foram encontrados ou estão inativos" },
        { status: 400 }
      );
    }

    // Usar upsert para cada preset (criar se não existir, atualizar se existir)
    const upsertPromises = presets.map((preset: any) =>
      prisma.customerProductPreset.upsert({
        where: {
          customerId_productId: {
            customerId,
            productId: preset.productId,
          },
        },
        update: {
          quantity: preset.quantity || 1,
          active: true,
        },
        create: {
          customerId,
          productId: preset.productId,
          quantity: preset.quantity || 1,
          active: true,
        },
      })
    );

    const createdPresets = await Promise.all(upsertPromises);

    // Desativar presets que não estão mais na lista atual
    await prisma.customerProductPreset.updateMany({
      where: {
        customerId,
        productId: {
          notIn: presets.map((p: any) => p.productId),
        },
      },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      message: `${createdPresets.length} presets atualizados com sucesso`,
      data: { count: createdPresets.length },
    });
  } catch (error) {
    console.error("Erro ao criar presets:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Remover todos os presets de um cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status:401 });
    }

    // Verificar se o cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Desativar todos os presets do cliente
    await prisma.customerProductPreset.updateMany({
      where: { customerId },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      message: "Todos os presets foram removidos com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover presets:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

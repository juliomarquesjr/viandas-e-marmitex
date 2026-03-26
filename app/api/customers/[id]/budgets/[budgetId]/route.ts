import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Buscar orçamento completo (incluindo budgetData) para recarregar no modal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> }
) {
  const { id: customerId, budgetId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const budget = await prisma.customerBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.customerId !== customerId) {
      return NextResponse.json(
        { error: "Orçamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: budget });
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um orçamento salvo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> }
) {
  const { id: customerId, budgetId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const budget = await prisma.customerBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.customerId !== customerId) {
      return NextResponse.json(
        { error: "Orçamento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.customerBudget.delete({ where: { id: budgetId } });

    return NextResponse.json({
      success: true,
      message: "Orçamento excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

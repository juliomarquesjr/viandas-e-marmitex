import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kanban/cards/[cardId]/assignments
export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { userId } = await req.json();

  const assignment = await prisma.kanbanCardAssignment.upsert({
    where: { cardId_userId: { cardId, userId } },
    create: { cardId, userId },
    update: {},
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });

  await prisma.kanbanActivity.create({
    data: { cardId, userId: session.user.id, type: "member_assigned", meta: { assignedUserId: userId } },
  });

  return NextResponse.json(assignment, { status: 201 });
}

// DELETE /api/kanban/cards/[cardId]/assignments
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { userId } = await req.json();

  await prisma.kanbanCardAssignment.delete({
    where: { cardId_userId: { cardId, userId } },
  });

  return NextResponse.json({ success: true });
}

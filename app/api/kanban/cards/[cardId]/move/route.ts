import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kanban/cards/[cardId]/move
// Body: { targetColumnId, afterCardId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { targetColumnId, sortOrder } = await req.json();

  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    include: {
      column: { include: { board: { include: { members: true } } } },
    },
  });
  if (!card) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const isOwner = card.column.board.ownerId === session.user.id;
  const isMember = card.column.board.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const fromColumnId = card.columnId;

  const updated = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      columnId: targetColumnId,
      sortOrder: sortOrder ?? card.sortOrder,
    },
  });

  if (fromColumnId !== targetColumnId) {
    const [fromCol, toCol] = await Promise.all([
      prisma.kanbanColumn.findUnique({ where: { id: fromColumnId }, select: { title: true } }),
      prisma.kanbanColumn.findUnique({ where: { id: targetColumnId }, select: { title: true } }),
    ]);
    await prisma.kanbanActivity.create({
      data: {
        cardId,
        userId: session.user.id,
        type: "card_moved",
        meta: { from: fromCol?.title, to: toCol?.title },
      },
    });
  }

  return NextResponse.json(updated);
}

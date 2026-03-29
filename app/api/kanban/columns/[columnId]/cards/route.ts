import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const cardInclude = {
  labels: { include: { label: true } },
  assignments: {
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  },
  checklists: {
    orderBy: { sortOrder: "asc" as const },
    include: { items: { orderBy: { sortOrder: "asc" as const } } },
  },
} as const;

// POST /api/kanban/columns/[columnId]/cards
export async function POST(req: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { columnId } = await params;
  const column = await prisma.kanbanColumn.findUnique({
    where: { id: columnId },
    include: {
      board: { include: { members: true } },
      cards: { select: { sortOrder: true }, where: { isArchived: false } },
    },
  });
  if (!column) return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });

  const isOwner = column.board.ownerId === session.user.id;
  const isMember = column.board.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { title, description, priority, dueDate, coverColor } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const maxOrder = column.cards.reduce((max, c) => Math.max(max, c.sortOrder), -1000);

  const card = await prisma.kanbanCard.create({
    data: {
      columnId,
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || "none",
      dueDate: dueDate ? new Date(dueDate) : null,
      coverColor: coverColor || null,
      sortOrder: maxOrder + 1000,
      createdById: session.user.id,
    },
    include: cardInclude,
  });

  // Registrar atividade
  await prisma.kanbanActivity.create({
    data: { cardId: card.id, userId: session.user.id, type: "card_created" },
  });

  return NextResponse.json(card, { status: 201 });
}

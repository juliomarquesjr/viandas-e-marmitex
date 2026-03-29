import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kanban/boards/[boardId]/columns
export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const board = await prisma.kanbanBoard.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    include: { columns: { select: { sortOrder: true } } },
  });
  if (!board) return NextResponse.json({ error: "Board não encontrado" }, { status: 404 });

  const body = await req.json();
  const { title, color } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const maxOrder = board.columns.reduce((max, c) => Math.max(max, c.sortOrder), -1000);

  const column = await prisma.kanbanColumn.create({
    data: {
      boardId,
      title: title.trim(),
      color: color || null,
      sortOrder: maxOrder + 1000,
    },
    include: { cards: true },
  });

  return NextResponse.json(column, { status: 201 });
}

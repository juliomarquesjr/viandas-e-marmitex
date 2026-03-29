import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireColumnAccess(columnId: string, userId: string) {
  const column = await prisma.kanbanColumn.findUnique({
    where: { id: columnId },
    include: { board: { include: { members: true } } },
  });
  if (!column) return null;
  const isOwner = column.board.ownerId === userId;
  const isMember = column.board.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) return null;
  return column;
}

// PATCH /api/kanban/columns/[columnId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { columnId } = await params;
  const column = await requireColumnAccess(columnId, session.user.id);
  if (!column) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const { title, color, isArchived } = body;

  const updated = await prisma.kanbanColumn.update({
    where: { id: columnId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(color !== undefined && { color }),
      ...(isArchived !== undefined && { isArchived }),
    },
    include: { cards: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/kanban/columns/[columnId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { columnId } = await params;
  const column = await requireColumnAccess(columnId, session.user.id);
  if (!column) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.kanbanColumn.update({ where: { id: columnId }, data: { isArchived: true } });
  return NextResponse.json({ success: true });
}

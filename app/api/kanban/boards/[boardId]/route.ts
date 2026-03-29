import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const boardInclude = {
  owner: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  },
  labels: true,
  columns: {
    where: { isArchived: false },
    orderBy: { sortOrder: "asc" as const },
    include: {
      cards: {
        where: { isArchived: false },
        orderBy: { sortOrder: "asc" as const },
        include: {
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
          comments: { select: { id: true } },
          attachments: { select: { id: true } },
        },
      },
    },
  },
} as const;

async function requireBoardAccess(boardId: string, userId: string, ownerOnly = false) {
  const board = await prisma.kanbanBoard.findUnique({
    where: { id: boardId },
    include: { members: true },
  });
  if (!board) return null;

  const isOwner = board.ownerId === userId;
  const isMember = board.members.some((m) => m.userId === userId);

  if (ownerOnly && !isOwner) return null;
  if (!isOwner && !isMember) return null;

  return board;
}

// GET /api/kanban/boards/[boardId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const access = await requireBoardAccess(boardId, session.user.id);
  if (!access) return NextResponse.json({ error: "Board não encontrado" }, { status: 404 });

  const board = await prisma.kanbanBoard.findUnique({ where: { id: boardId }, include: boardInclude });
  return NextResponse.json(board);
}

// PATCH /api/kanban/boards/[boardId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const access = await requireBoardAccess(boardId, session.user.id, true);
  if (!access) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { title, description, background } = body;

  const board = await prisma.kanbanBoard.update({
    where: { id: boardId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(background !== undefined && { background }),
    },
    include: boardInclude,
  });

  return NextResponse.json(board);
}

// DELETE /api/kanban/boards/[boardId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const access = await requireBoardAccess(boardId, session.user.id, true);
  if (!access) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await prisma.kanbanBoard.update({ where: { id: boardId }, data: { isArchived: true } });
  return NextResponse.json({ success: true });
}

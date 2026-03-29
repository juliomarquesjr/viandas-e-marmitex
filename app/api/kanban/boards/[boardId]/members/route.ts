import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/boards/[boardId]/members
export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const members = await prisma.kanbanBoardMember.findMany({
    where: { boardId },
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });
  return NextResponse.json(members);
}

// POST /api/kanban/boards/[boardId]/members
export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const board = await prisma.kanbanBoard.findFirst({
    where: { id: boardId, ownerId: session.user.id },
  });
  if (!board) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { userId, role = "member" } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  const member = await prisma.kanbanBoardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    create: { boardId, userId, role },
    update: { role },
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}

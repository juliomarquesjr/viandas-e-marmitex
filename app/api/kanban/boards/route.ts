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
        },
      },
    },
  },
} as const;

// GET /api/kanban/boards — listar boards do usuário (owned + member)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = session.user.id;

  const boards = await prisma.kanbanBoard.findMany({
    where: {
      isArchived: false,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      owner: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
        },
      },
      labels: true,
      _count: { select: { columns: true } },
    },
  });

  return NextResponse.json(boards);
}

// POST /api/kanban/boards — criar board
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { title, description, background } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  // Contar boards existentes para sortOrder
  const count = await prisma.kanbanBoard.count({ where: { ownerId: userId } });

  const board = await prisma.kanbanBoard.create({
    data: {
      ownerId: userId,
      title: title.trim(),
      description: description?.trim() || null,
      background: background ?? { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
      sortOrder: count * 1000,
    },
    include: boardInclude,
  });

  // Criar coluna inicial padrão
  await prisma.kanbanColumn.createMany({
    data: [
      { boardId: board.id, title: "A Fazer",      sortOrder: 0    },
      { boardId: board.id, title: "Em Progresso", sortOrder: 1000 },
      { boardId: board.id, title: "Concluído",    sortOrder: 2000 },
    ],
  });

  // Re-buscar com colunas
  const fullBoard = await prisma.kanbanBoard.findUnique({
    where: { id: board.id },
    include: boardInclude,
  });

  return NextResponse.json(fullBoard, { status: 201 });
}

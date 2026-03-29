import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/cards/[cardId]/checklists
export async function GET(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const checklists = await prisma.kanbanChecklist.findMany({
    where: { cardId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(checklists);
}

// POST /api/kanban/cards/[cardId]/checklists
export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const count = await prisma.kanbanChecklist.count({ where: { cardId } });
  const checklist = await prisma.kanbanChecklist.create({
    data: { cardId, title: title.trim(), sortOrder: count * 1000 },
    include: { items: true },
  });
  return NextResponse.json(checklist, { status: 201 });
}

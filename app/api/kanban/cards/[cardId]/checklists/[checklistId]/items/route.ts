import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kanban/cards/[cardId]/checklists/[checklistId]/items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string; checklistId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { checklistId } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });

  const count = await prisma.kanbanChecklistItem.count({ where: { checklistId } });
  const item = await prisma.kanbanChecklistItem.create({
    data: { checklistId, text: text.trim(), sortOrder: count * 1000 },
  });
  return NextResponse.json(item, { status: 201 });
}

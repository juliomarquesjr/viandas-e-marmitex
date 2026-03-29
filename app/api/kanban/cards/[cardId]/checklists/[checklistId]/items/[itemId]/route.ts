import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/kanban/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string; checklistId: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { itemId, cardId } = await params;
  const body = await req.json();
  const { text, isChecked } = body;

  const item = await prisma.kanbanChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(text !== undefined && { text: text.trim() }),
      ...(isChecked !== undefined && { isChecked }),
    },
  });

  if (isChecked !== undefined) {
    await prisma.kanbanActivity.create({
      data: {
        cardId,
        userId: session.user.id,
        type: "checklist_item_checked",
        meta: { itemText: item.text, isChecked },
      },
    });
  }

  return NextResponse.json(item);
}

// DELETE /api/kanban/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { itemId } = await params;
  await prisma.kanbanChecklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}

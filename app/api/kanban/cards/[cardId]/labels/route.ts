import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kanban/cards/[cardId]/labels
export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { labelId } = await req.json();

  await prisma.kanbanCardLabel.upsert({
    where: { cardId_labelId: { cardId, labelId } },
    create: { cardId, labelId },
    update: {},
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/kanban/cards/[cardId]/labels
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { labelId } = await req.json();

  await prisma.kanbanCardLabel.deleteMany({ where: { cardId, labelId } });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/kanban/boards/[boardId]/columns/reorder
// Body: { items: [{ id: string, sortOrder: number }] }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const board = await prisma.kanbanBoard.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
  });
  if (!board) return NextResponse.json({ error: "Board não encontrado" }, { status: 404 });

  const body = await req.json();
  const { items } = body as { items: { id: string; sortOrder: number }[] };

  await prisma.$transaction(
    items.map((item) =>
      prisma.kanbanColumn.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}

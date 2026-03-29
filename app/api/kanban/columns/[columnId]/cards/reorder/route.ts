import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/kanban/columns/[columnId]/cards/reorder
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { columnId } = await params;
  const body = await req.json();
  const { items } = body as { items: { id: string; sortOrder: number }[] };

  await prisma.$transaction(
    items.map((item) =>
      prisma.kanbanCard.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder, columnId },
      })
    )
  );

  return NextResponse.json({ success: true });
}

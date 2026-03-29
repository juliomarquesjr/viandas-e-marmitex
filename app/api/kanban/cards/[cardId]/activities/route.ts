import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/cards/[cardId]/activities
export async function GET(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const activities = await prisma.kanbanActivity.findMany({
    where: { cardId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });
  return NextResponse.json(activities);
}

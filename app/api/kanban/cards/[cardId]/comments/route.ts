import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/cards/[cardId]/comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const comments = await prisma.kanbanComment.findMany({
    where: { cardId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });
  return NextResponse.json(comments);
}

// POST /api/kanban/cards/[cardId]/comments
export async function POST(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });

  const comment = await prisma.kanbanComment.create({
    data: { cardId, authorId: session.user.id, content },
    include: {
      author: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  });

  await prisma.kanbanActivity.create({
    data: { cardId, userId: session.user.id, type: "comment_added" },
  });

  return NextResponse.json(comment, { status: 201 });
}

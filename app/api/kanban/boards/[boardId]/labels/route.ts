import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/boards/[boardId]/labels
export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const labels = await prisma.kanbanLabel.findMany({ where: { boardId } });
  return NextResponse.json(labels);
}

// POST /api/kanban/boards/[boardId]/labels
export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { boardId } = await params;
  const { name, color } = await req.json();
  if (!name?.trim() || !color) return NextResponse.json({ error: "name e color obrigatórios" }, { status: 400 });

  const label = await prisma.kanbanLabel.create({
    data: { boardId, name: name.trim(), color },
  });
  return NextResponse.json(label, { status: 201 });
}

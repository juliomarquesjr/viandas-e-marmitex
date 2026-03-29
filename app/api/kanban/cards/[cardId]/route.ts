import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const cardFullInclude = {
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
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  },
  attachments: {
    orderBy: { createdAt: "desc" as const },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  },
  activities: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true, role: true } },
    },
  },
} as const;

async function requireCardAccess(cardId: string, userId: string) {
  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          board: { include: { members: true } },
        },
      },
    },
  });
  if (!card) return null;
  const isOwner = card.column.board.ownerId === userId;
  const isMember = card.column.board.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) return null;
  return card;
}

// GET /api/kanban/cards/[cardId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const access = await requireCardAccess(cardId, session.user.id);
  if (!access) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const card = await prisma.kanbanCard.findUnique({ where: { id: cardId }, include: cardFullInclude });
  return NextResponse.json(card);
}

// PATCH /api/kanban/cards/[cardId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const access = await requireCardAccess(cardId, session.user.id);
  if (!access) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const body = await req.json();
  const { title, description, content, dueDate, priority, coverColor, coverImageUrl, columnId, isArchived } = body;

  // Registrar atividade relevante
  const activities: { type: string; meta?: object }[] = [];
  if (title !== undefined && title !== access.title) activities.push({ type: "card_renamed", meta: { from: access.title, to: title } });
  if (dueDate !== undefined) activities.push({ type: "due_date_set", meta: { dueDate } });
  if (description !== undefined || content !== undefined) activities.push({ type: "description_updated" });

  const card = await prisma.kanbanCard.update({
    where: { id: cardId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(content !== undefined && { content }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(priority !== undefined && { priority }),
      ...(coverColor !== undefined && { coverColor }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(columnId !== undefined && { columnId }),
      ...(isArchived !== undefined && { isArchived }),
    },
    include: cardFullInclude,
  });

  // Criar activities em paralelo
  if (activities.length > 0) {
    await prisma.kanbanActivity.createMany({
      data: activities.map((a) => ({
        cardId,
        userId: session.user.id,
        type: a.type,
        meta: a.meta ? JSON.parse(JSON.stringify(a.meta)) : undefined,
      })),
    });
  }

  // Processar menções se content foi atualizado
  if (content !== undefined) {
    await processMentions(cardId, content, "description", null, session.user.id);
  }

  return NextResponse.json(card);
}

// DELETE /api/kanban/cards/[cardId] (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cardId } = await params;
  const access = await requireCardAccess(cardId, session.user.id);
  if (!access) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  await prisma.kanbanCard.update({ where: { id: cardId }, data: { isArchived: true } });
  return NextResponse.json({ success: true });
}

// ─── Helper: processar @mentions do TipTap JSON ───────────────────────────────
async function processMentions(
  cardId: string,
  content: object,
  sourceType: "description" | "comment",
  sourceId: string | null,
  actorUserId: string
) {
  try {
    const mentionNodes = extractMentionNodes(content);

    // Remover menções antigas desta fonte
    await prisma.kanbanMention.deleteMany({
      where: { cardId, sourceType, sourceId: sourceId ?? undefined },
    });

    if (mentionNodes.length === 0) return;

    // Criar novas menções
    await prisma.kanbanMention.createMany({
      data: mentionNodes.map((node) => ({
        cardId,
        sourceType,
        sourceId,
        mentionType: node.type,
        mentionTargetId: node.id,
      })),
      skipDuplicates: true,
    });

    // Criar notificações para usuários mencionados
    const userMentions = mentionNodes.filter((n) => n.type === "user");
    if (userMentions.length > 0) {
      const card = await prisma.kanbanCard.findUnique({
        where: { id: cardId },
        include: { column: { include: { board: true } } },
      });
      if (card) {
        await prisma.kanbanNotification.createMany({
          data: userMentions
            .filter((m) => m.id !== actorUserId) // não notificar o próprio autor
            .map((m) => ({
              boardId: card.column.board.id,
              cardId,
              userId: m.id,
              type: "mention",
              title: `Você foi mencionado`,
              body: `em "${card.title}"`,
              meta: { cardId, cardTitle: card.title, boardTitle: card.column.board.title },
            })),
          skipDuplicates: true,
        });
      }
    }
  } catch {
    // Silencia erros de mention processing para não bloquear a resposta
  }
}

function extractMentionNodes(
  node: unknown
): { id: string; type: "user" | "customer" | "product"; label: string }[] {
  const results: { id: string; type: "user" | "customer" | "product"; label: string }[] = [];
  if (!node || typeof node !== "object") return results;
  const obj = node as Record<string, unknown>;

  if (obj.type === "mention" && obj.attrs) {
    const attrs = obj.attrs as Record<string, unknown>;
    if (attrs.id && attrs.mentionType) {
      results.push({
        id: String(attrs.id),
        type: attrs.mentionType as "user" | "customer" | "product",
        label: String(attrs.label ?? ""),
      });
    }
  }

  if (Array.isArray(obj.content)) {
    for (const child of obj.content) {
      results.push(...extractMentionNodes(child));
    }
  }

  return results;
}

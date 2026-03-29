import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/notifications
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";

  const [notifications, unreadCount] = await Promise.all([
    prisma.kanbanNotification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.kanbanNotification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

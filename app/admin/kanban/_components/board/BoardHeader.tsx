"use client";

import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import type { KanbanBoard, KanbanUser } from "../shared/types";
import { AvatarGroup } from "../shared/AvatarGroup";

interface BoardHeaderProps {
  board: KanbanBoard;
  onOpenCard?: (cardId: string | null) => void;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const allMembers: KanbanUser[] = [board.owner, ...board.members.map((m) => m.user)];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/10 backdrop-blur-sm">
      <Link
        href="/admin/kanban"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-white truncate">{board.title}</h1>
        {board.description && (
          <p className="text-xs text-white/50 truncate">{board.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <AvatarGroup users={allMembers} size="sm" max={5} />

        <Link
          href={`/admin/kanban/${board.id}/settings`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

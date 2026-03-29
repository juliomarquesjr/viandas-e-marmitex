"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { KanbanSquare, Users } from "lucide-react";
import type { KanbanBoard } from "../shared/types";
import { AvatarGroup } from "../shared/AvatarGroup";

interface BoardCardProps {
  board: KanbanBoard & { _count?: { columns: number } };
  index: number;
}

export function BoardCard({ board, index }: BoardCardProps) {
  const bgStyle =
    board.background.type === "image"
      ? {
          backgroundImage: `url(${board.background.value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: board.background.value };

  const totalMembers = 1 + (board.members?.length ?? 0); // owner + members
  const allMembers = [board.owner, ...(board.members?.map((m) => m.user) ?? [])];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link href={`/admin/kanban/${board.id}`} className="group block">
        <div
          className="relative h-40 w-full overflow-hidden rounded-2xl shadow-lg transition-all duration-200 group-hover:shadow-2xl group-hover:scale-[1.02]"
          style={bgStyle}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <KanbanSquare className="h-4 w-4 text-white" />
              </div>
              {totalMembers > 1 && (
                <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 backdrop-blur-sm">
                  <Users className="h-3 w-3 text-white/70" />
                  <span className="text-[10px] font-medium text-white/80">{totalMembers}</span>
                </div>
              )}
            </div>

            {/* Bottom */}
            <div className="space-y-1.5">
              <AvatarGroup users={allMembers.slice(0, 4)} size="sm" />
              <h3 className="font-semibold text-white drop-shadow line-clamp-1">
                {board.title}
              </h3>
              {board.description && (
                <p className="text-xs text-white/70 line-clamp-1">{board.description}</p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

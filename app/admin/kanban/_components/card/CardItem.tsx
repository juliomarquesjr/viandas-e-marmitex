"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  AlertOctagon, ArrowDown, ArrowUp, CheckSquare, MessageSquare, Minus, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard, KanbanCardLabelRef } from "../shared/types";
import { PRIORITY_CONFIG } from "../shared/types";
import { CardDueDate } from "./CardDueDate";
import { AvatarGroup } from "../shared/AvatarGroup";

const PRIORITY_ICONS = {
  urgent: AlertOctagon,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
  none: null,
};

interface CardItemProps {
  card: KanbanCard;
  isDragging?: boolean;
  onOpen: (cardId: string) => void;
}

export function CardItem({ card, isDragging = false, onOpen }: CardItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const PriorityIcon = PRIORITY_ICONS[card.priority];
  const priorityColor = PRIORITY_CONFIG[card.priority].color;

  const totalChecklist = card.checklists.reduce((s, cl) => s + cl.items.length, 0);
  const checkedChecklist = card.checklists.reduce(
    (s, cl) => s + cl.items.filter((i) => i.isChecked).length,
    0
  );
  const checklistProgress = totalChecklist > 0 ? (checkedChecklist / totalChecklist) * 100 : 0;

  const assignees = card.assignments.map((a) => a.user);

  if (isSortableDragging && !isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="h-20 rounded-xl border border-white/10 bg-white/5 opacity-40" />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "kanban-card-glass kanban-card-enter cursor-pointer select-none",
          isDragging && "opacity-90 rotate-1 scale-105 shadow-2xl"
        )}
        onClick={() => onOpen(card.id)}
        {...listeners}
      >
        {/* Cover */}
        {(card.coverColor || card.coverImageUrl) && (
          <div
            className="h-8 w-full rounded-t-xl"
            style={
              card.coverImageUrl
                ? { backgroundImage: `url(${card.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: card.coverColor! }
            }
          />
        )}

        <div className={cn("p-3 space-y-2", (card.coverColor || card.coverImageUrl) && "pt-2")}>
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.labels.slice(0, 4).map((cl: KanbanCardLabelRef) => (
                <span
                  key={cl.labelId}
                  className="h-1.5 w-8 rounded-full"
                  style={{ background: cl.label?.color ?? "#94a3b8" }}
                  title={cl.label?.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <div className="flex items-start gap-1.5">
            {PriorityIcon && (
              <PriorityIcon
                className="mt-0.5 h-3 w-3 flex-shrink-0"
                style={{ color: priorityColor }}
              />
            )}
            <p className="text-sm font-medium text-white leading-snug line-clamp-3">
              {card.title}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {card.dueDate && <CardDueDate dueDate={card.dueDate} compact />}

              {totalChecklist > 0 && (
                <div className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  checklistProgress === 100
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-white/10 text-white/60 border-white/10"
                )}>
                  <CheckSquare className="h-2.5 w-2.5" />
                  {checkedChecklist}/{totalChecklist}
                </div>
              )}

              {card.comments.length > 0 && (
                <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                  <MessageSquare className="h-2.5 w-2.5" />
                  {card.comments.length}
                </div>
              )}

              {card.attachments.length > 0 && (
                <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                  <Paperclip className="h-2.5 w-2.5" />
                  {card.attachments.length}
                </div>
              )}
            </div>

            {assignees.length > 0 && (
              <AvatarGroup users={assignees} size="sm" max={3} />
            )}
          </div>

          {/* Checklist progress bar */}
          {totalChecklist > 0 && (
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${checklistProgress}%`,
                  background: checklistProgress === 100 ? "#10b981" : "rgba(255,255,255,0.4)",
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

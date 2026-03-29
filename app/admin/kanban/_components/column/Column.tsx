"use client";

import { useState, useRef } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, MoreHorizontal, Plus, Trash2, X, Check } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import type { KanbanColumn as KanbanColumnType } from "../shared/types";
import { CardItem } from "../card/CardItem";
import { useKanban } from "../shared/useKanbanStore";

interface ColumnProps {
  column: KanbanColumnType;
  onCardOpen: (cardId: string) => void;
}

export function Column({ column, onCardOpen }: ColumnProps) {
  const { dispatch } = useKanban();
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);
  const addCardRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes, listeners, setNodeRef: setSortableRef,
    transform, transition, isDragging,
  } = useSortable({ id: column.id, data: { type: "column", column } });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardIds = column.cards.map((c) => c.id);

  async function handleAddCard() {
    if (!newCardTitle.trim()) { setAddingCard(false); return; }
    try {
      const res = await fetch(`/api/kanban/columns/${column.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newCardTitle.trim() }),
      });
      if (res.ok) {
        const card = await res.json();
        dispatch({ type: "ADD_CARD", card });
      }
    } finally {
      setNewCardTitle("");
      setAddingCard(false);
    }
  }

  async function handleRenameColumn() {
    if (!columnTitle.trim() || columnTitle === column.title) {
      setColumnTitle(column.title);
      setEditingTitle(false);
      return;
    }
    dispatch({ type: "UPDATE_COLUMN", columnId: column.id, patch: { title: columnTitle } });
    setEditingTitle(false);
    await fetch(`/api/kanban/columns/${column.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: columnTitle }),
    });
  }

  async function handleDeleteColumn() {
    dispatch({ type: "REMOVE_COLUMN", columnId: column.id });
    await fetch(`/api/kanban/columns/${column.id}`, { method: "DELETE" });
  }

  if (isDragging) {
    return (
      <div
        ref={setSortableRef}
        style={style}
        className="h-full w-72 flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 opacity-40"
      />
    );
  }

  return (
    <div ref={setSortableRef} style={style} className="flex h-full w-72 flex-shrink-0 flex-col">
      <div className="kanban-column-glass flex h-full flex-col">
        {/* Column Header */}
        <div className="flex items-center gap-1 p-3 pb-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 text-white/30 hover:text-white/60 active:cursor-grabbing rounded"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              onBlur={handleRenameColumn}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameColumn();
                if (e.key === "Escape") { setColumnTitle(column.title); setEditingTitle(false); }
              }}
              className="flex-1 rounded bg-white/10 px-1.5 py-0.5 text-sm font-semibold text-white outline-none border border-white/30"
            />
          ) : (
            <button
              className="flex-1 text-left text-sm font-semibold text-white/90 hover:text-white transition-colors truncate"
              onClick={() => setEditingTitle(true)}
            >
              {column.title}
            </button>
          )}

          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
            {column.cards.length}
          </span>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded text-white/30 hover:bg-white/10 hover:text-white/70 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[160px] rounded-xl bg-slate-800 border border-white/10 p-1 shadow-xl"
                sideOffset={4}
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setAddingCard(true)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar card
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  onClick={handleDeleteColumn}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover coluna
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Column line */}
        {column.color && (
          <div className="mx-3 h-0.5 rounded-full mb-2" style={{ background: column.color }} />
        )}

        {/* Cards list */}
        <div
          ref={setDropRef}
          className={cn(
            "kanban-column-scroll flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px] transition-colors",
            isOver && "bg-white/5"
          )}
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {column.cards.map((card) => (
                <CardItem key={card.id} card={card} onOpen={onCardOpen} />
              ))}
            </AnimatePresence>
          </SortableContext>

          {column.cards.length === 0 && !isOver && (
            <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/10">
              <span className="text-xs text-white/30">Sem cards</span>
            </div>
          )}
        </div>

        {/* Add Card */}
        <div className="p-2 pt-0">
          <AnimatePresence>
            {addingCard ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <textarea
                  ref={addCardRef}
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                    if (e.key === "Escape") { setAddingCard(false); setNewCardTitle(""); }
                  }}
                  placeholder="Título do card..."
                  rows={2}
                  className="w-full resize-none rounded-xl bg-white/10 border border-white/20 p-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddCard}
                    className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
                  >
                    <Check className="h-3 w-3" /> Adicionar
                  </button>
                  <button
                    onClick={() => { setAddingCard(false); setNewCardTitle(""); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setAddingCard(true)}
                className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar card
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

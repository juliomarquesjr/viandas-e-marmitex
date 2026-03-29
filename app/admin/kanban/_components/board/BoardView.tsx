"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import type { KanbanBoard, KanbanCard, KanbanColumn } from "../shared/types";
import { useKanban } from "../shared/useKanbanStore";
import { Column } from "../column/Column";
import { CardItem } from "../card/CardItem";
import { AvatarGroup } from "../shared/AvatarGroup";
import { BoardHeader } from "./BoardHeader";

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { state, dispatch } = useKanban();
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/kanban/boards/${boardId}`);
        if (res.ok) {
          const board = await res.json();
          dispatch({ type: "SET_ACTIVE_BOARD", board });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { dispatch({ type: "SET_ACTIVE_BOARD", board: null }); };
  }, [boardId, dispatch]);

  const board = state.activeBoard;
  const columns = board?.columns ?? [];

  const bgStyle = board
    ? board.background.type === "image"
      ? { backgroundImage: `url(${board.background.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: board.background.value }
    : { background: "linear-gradient(135deg, #1e293b, #334155)" };

  // ─── Drag handlers ─────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card);
    } else if (active.data.current?.type === "column") {
      setActiveColumn(active.data.current.column);
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !board) return;
    const activeType = active.data.current?.type;
    if (activeType !== "card") return;

    const activeCardId = String(active.id);
    const overId = String(over.id);

    // Find source column
    const sourceCol = board.columns.find((col) =>
      col.cards.some((c) => c.id === activeCardId)
    );
    if (!sourceCol) return;

    // Determine target column
    const targetCol =
      board.columns.find((col) => col.id === overId) ??
      board.columns.find((col) => col.cards.some((c) => c.id === overId));

    if (!targetCol || sourceCol.id === targetCol.id) return;

    // Optimistic cross-column move
    const movingCard = sourceCol.cards.find((c) => c.id === activeCardId)!;
    const overIndex = targetCol.cards.findIndex((c) => c.id === overId);
    const newCards = [...targetCol.cards];
    newCards.splice(overIndex >= 0 ? overIndex : newCards.length, 0, {
      ...movingCard,
      columnId: targetCol.id,
    });

    dispatch({
      type: "MOVE_CARD",
      cardId: activeCardId,
      fromColumnId: sourceCol.id,
      toColumnId: targetCol.id,
      newOrder: newCards,
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    setActiveColumn(null);
    if (!over || !board) return;

    const activeType = active.data.current?.type;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeType === "column") {
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(columns, oldIndex, newIndex).map((col, i) => ({
          ...col,
          sortOrder: i * 1000,
        }));
        dispatch({ type: "REORDER_COLUMNS", columns: reordered });
        await fetch(`/api/kanban/boards/${board.id}/columns/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder })) }),
        });
      }
      return;
    }

    if (activeType === "card") {
      // Find current column after possible cross-column move in onDragOver
      const currentCol = board.columns.find((col) =>
        col.cards.some((c) => c.id === activeId)
      );
      if (!currentCol) return;

      const targetCol =
        board.columns.find((col) => col.id === overId) ??
        board.columns.find((col) => col.cards.some((c) => c.id === overId));

      if (!targetCol) return;

      if (currentCol.id === targetCol.id) {
        // Reorder within same column
        const oldIndex = currentCol.cards.findIndex((c) => c.id === activeId);
        const newIndex = currentCol.cards.findIndex((c) => c.id === overId);
        if (oldIndex !== newIndex) {
          const reordered = arrayMove(currentCol.cards, oldIndex, newIndex).map((c, i) => ({
            ...c,
            sortOrder: i * 1000,
          }));
          dispatch({ type: "REORDER_CARDS", columnId: currentCol.id, cards: reordered });
          await fetch(`/api/kanban/columns/${currentCol.id}/cards/reorder`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder })) }),
          });
        }
      } else {
        // Already moved in onDragOver — just persist
        const newSortOrder = currentCol.cards.findIndex((c) => c.id === activeId) * 1000;
        await fetch(`/api/kanban/cards/${activeId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetColumnId: currentCol.id, sortOrder: newSortOrder }),
        });
      }
    }
  }

  async function handleAddColumn() {
    if (!board) return;
    const title = `Coluna ${columns.length + 1}`;
    const res = await fetch(`/api/kanban/boards/${board.id}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const col = await res.json();
      dispatch({ type: "ADD_COLUMN", column: col });
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={bgStyle}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900">
        <p className="text-white/60">Board não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={bgStyle}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        <BoardHeader board={board} onOpenCard={setOpenCardId} />

        {/* Board area */}
        <div className="kanban-board-scroll flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex h-full items-start gap-3 p-4">
                {columns.map((col) => (
                  <Column key={col.id} column={col} onCardOpen={setOpenCardId} />
                ))}

                {/* Add Column */}
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleAddColumn}
                  className="flex h-10 w-64 flex-shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-3 text-sm text-white/50 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white/80"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar coluna
                </motion.button>
              </div>
            </SortableContext>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard && (
                <CardItem card={activeCard} isDragging onOpen={() => {}} />
              )}
              {activeColumn && (
                <div className="w-72 rounded-2xl border border-white/20 bg-white/10 opacity-80 p-4 shadow-2xl backdrop-blur-xl">
                  <p className="font-semibold text-white">{activeColumn.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Card Modal (lazy loaded) */}
      {openCardId && (
        <CardModalLazy
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
          boardLabels={board.labels}
          boardMembers={[board.owner, ...board.members.map((m) => m.user)]}
        />
      )}
    </div>
  );
}

// Lazy-load the card modal to keep the bundle lean
import dynamic from "next/dynamic";
const CardModalLazy = dynamic(
  () => import("../card-modal/CardModal").then((m) => ({ default: m.CardModal })),
  { ssr: false }
);

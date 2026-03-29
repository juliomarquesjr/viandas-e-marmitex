"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KanbanSquare, Plus, Sparkles } from "lucide-react";
import { BoardCard } from "./_components/board-gallery/BoardCard";
import { CreateBoardDialog } from "./_components/board-gallery/CreateBoardDialog";
import type { KanbanBoard } from "./_components/shared/types";
import { useKanban } from "./_components/shared/useKanbanStore";

export default function KanbanGalleryPage() {
  const { state, dispatch } = useKanban();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/kanban/boards");
        if (res.ok) {
          const boards = await res.json();
          dispatch({ type: "SET_BOARDS", boards });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dispatch]);

  function handleBoardCreated(board: KanbanBoard) {
    dispatch({ type: "ADD_BOARD", board });
  }

  return (
    <div className="h-full overflow-auto bg-[#f8fafc]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
              <KanbanSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meus Boards</h1>
              <p className="text-sm text-slate-500">Gerencie suas tarefas e projetos</p>
            </div>
          </div>

          <CreateBoardDialog
            onCreated={handleBoardCreated}
            trigger={
              <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md">
                <Plus className="h-4 w-4" />
                Novo Board
              </button>
            }
          />
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && state.boards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 shadow-inner">
              <Sparkles className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-slate-700">Nenhum board ainda</h2>
            <p className="mb-6 max-w-xs text-sm text-slate-500">
              Crie seu primeiro board para começar a organizar suas tarefas com estilo.
            </p>
            <CreateBoardDialog onCreated={handleBoardCreated} />
          </motion.div>
        )}

        {/* Boards Grid */}
        {!loading && state.boards.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {state.boards.map((board, i) => (
              <BoardCard key={board.id} board={board as KanbanBoard & { _count?: { columns: number } }} index={i} />
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: state.boards.length * 0.05 }}
            >
              <CreateBoardDialog onCreated={handleBoardCreated} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

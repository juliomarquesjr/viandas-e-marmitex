"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { KanbanSquare, Plus, X } from "lucide-react";
import { BackgroundPicker } from "./BackgroundPicker";
import type { BoardBackground, KanbanBoard } from "../shared/types";
import { GRADIENT_PRESETS } from "../shared/types";

interface CreateBoardDialogProps {
  onCreated: (board: KanbanBoard) => void;
  trigger?: React.ReactNode;
}

export function CreateBoardDialog({ onCreated, trigger }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [background, setBackground] = useState<BoardBackground>({
    type: "gradient",
    value: GRADIENT_PRESETS[0].value,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bgStyle =
    background.type === "image"
      ? { backgroundImage: `url(${background.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: background.value };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Informe um título"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, background }),
      });
      if (!res.ok) throw new Error("Erro ao criar board");
      const board = await res.json();
      onCreated(board);
      setOpen(false);
      setTitle("");
      setDescription("");
      setBackground({ type: "gradient", value: GRADIENT_PRESETS[0].value });
    } catch {
      setError("Não foi possível criar o board. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button className="group flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500">
            <Plus className="h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">Novo Board</span>
          </button>
        )}
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div
                  className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
                  style={bgStyle}
                >
                  {/* Overlay escuro para legibilidade */}
                  <div className="absolute inset-0 bg-black/40" />

                  <div className="relative z-10 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <KanbanSquare className="h-5 w-5 text-white" />
                        </div>
                        <Dialog.Title className="text-lg font-semibold text-white">
                          Criar Board
                        </Dialog.Title>
                      </div>
                      <Dialog.Close asChild>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </Dialog.Close>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                      {/* Preview */}
                      <div
                        className="h-16 w-full rounded-xl border border-white/20"
                        style={bgStyle}
                      >
                        <div className="flex h-full items-center justify-center">
                          <span className="text-sm font-medium text-white/80 drop-shadow">
                            {title || "Título do board"}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Título *</label>
                        <input
                          value={title}
                          onChange={(e) => { setTitle(e.target.value); setError(""); }}
                          placeholder="Ex: Sprint Q1, Projeto Cliente..."
                          autoFocus
                          className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:bg-white/15"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Descrição (opcional)</label>
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Descreva o objetivo do board..."
                          className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:bg-white/15"
                        />
                      </div>

                      {/* Background */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Background</label>
                        <BackgroundPicker value={background} onChange={setBackground} />
                      </div>

                      {error && (
                        <p className="text-xs text-red-300">{error}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                          >
                            Cancelar
                          </button>
                        </Dialog.Close>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 rounded-lg bg-white py-2 text-sm font-semibold text-slate-900 transition-all hover:bg-white/90 disabled:opacity-60"
                        >
                          {loading ? "Criando..." : "Criar Board"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

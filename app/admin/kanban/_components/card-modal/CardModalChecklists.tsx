"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard } from "../shared/types";

interface CardModalChecklistsProps {
  card: KanbanCard;
  onUpdate: (card: KanbanCard) => void;
}

export function CardModalChecklists({ card, onUpdate }: CardModalChecklistsProps) {
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);

  async function addChecklist() {
    if (!newChecklistTitle.trim()) return;
    const res = await fetch(`/api/kanban/cards/${card.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChecklistTitle }),
    });
    if (res.ok) {
      const checklist = await res.json();
      onUpdate({ ...card, checklists: [...card.checklists, checklist] });
    }
    setNewChecklistTitle("");
    setAddingChecklist(false);
  }

  async function toggleItem(checklistId: string, itemId: string, isChecked: boolean) {
    await fetch(`/api/kanban/cards/${card.id}/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isChecked }),
    });
    onUpdate({
      ...card,
      checklists: card.checklists.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map((i) => i.id === itemId ? { ...i, isChecked } : i) }
          : cl
      ),
    });
  }

  async function addItem(checklistId: string, text: string) {
    const res = await fetch(`/api/kanban/cards/${card.id}/checklists/${checklistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const item = await res.json();
      onUpdate({
        ...card,
        checklists: card.checklists.map((cl) =>
          cl.id === checklistId ? { ...cl, items: [...cl.items, item] } : cl
        ),
      });
    }
  }

  async function deleteItem(checklistId: string, itemId: string) {
    await fetch(`/api/kanban/cards/${card.id}/checklists/${checklistId}/items/${itemId}`, { method: "DELETE" });
    onUpdate({
      ...card,
      checklists: card.checklists.map((cl) =>
        cl.id === checklistId ? { ...cl, items: cl.items.filter((i) => i.id !== itemId) } : cl
      ),
    });
  }

  if (card.checklists.length === 0 && !addingChecklist) {
    return (
      <div>
        <button
          onClick={() => setAddingChecklist(true)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar checklist
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Checklists</h3>
        <button
          onClick={() => setAddingChecklist(true)}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Nova lista
        </button>
      </div>

      {card.checklists.map((checklist) => {
        const total = checklist.items.length;
        const checked = checklist.items.filter((i) => i.isChecked).length;
        const pct = total > 0 ? (checked / total) * 100 : 0;

        return (
          <ChecklistBlock
            key={checklist.id}
            checklist={checklist}
            progress={pct}
            checked={checked}
            total={total}
            onToggleItem={toggleItem}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
          />
        );
      })}

      {/* Add checklist form */}
      <AnimatePresence>
        {addingChecklist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <input
              autoFocus
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addChecklist();
                if (e.key === "Escape") { setAddingChecklist(false); setNewChecklistTitle(""); }
              }}
              placeholder="Título da checklist..."
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
            />
            <div className="flex gap-1.5">
              <button onClick={addChecklist} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors">
                Adicionar
              </button>
              <button onClick={() => { setAddingChecklist(false); setNewChecklistTitle(""); }} className="rounded-lg px-2 py-1.5 text-white/40 hover:text-white/70 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ChecklistBlock({
  checklist, progress, checked, total,
  onToggleItem, onAddItem, onDeleteItem,
}: {
  checklist: KanbanCard["checklists"][0];
  progress: number;
  checked: number;
  total: number;
  onToggleItem: (clId: string, itemId: string, v: boolean) => void;
  onAddItem: (clId: string, text: string) => void;
  onDeleteItem: (clId: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="text-white/50 hover:text-white/80">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="flex-1 text-sm font-medium text-white/80">{checklist.title}</span>
        <span className="text-xs text-white/40">{checked}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: progress === 100 ? "#10b981" : "#3b82f6" }}
        />
      </div>

      {/* Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1 pt-1">
            {checklist.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => onToggleItem(checklist.id, item.id, !item.isChecked)}
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                    item.isChecked
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-white/30 hover:border-white/60"
                  )}
                >
                  {item.isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                </button>
                <span className={cn("flex-1 text-sm text-white/80", item.isChecked && "line-through text-white/40")}>
                  {item.text}
                </span>
                <button
                  onClick={() => onDeleteItem(checklist.id, item.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Add item */}
            {addingItem ? (
              <div className="flex items-center gap-2 pt-1">
                <div className="h-4 w-4 flex-shrink-0 rounded border border-white/20" />
                <input
                  autoFocus
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim()) {
                      onAddItem(checklist.id, newItem);
                      setNewItem("");
                    }
                    if (e.key === "Escape") { setAddingItem(false); setNewItem(""); }
                  }}
                  placeholder="Adicionar item..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none border-b border-white/20"
                />
                <button onClick={() => { setAddingItem(false); setNewItem(""); }} className="text-white/30 hover:text-white/60">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors pt-1"
              >
                <Plus className="h-3 w-3" /> Adicionar item
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

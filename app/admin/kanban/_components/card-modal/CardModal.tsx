"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon, ArrowDown, ArrowUp, Calendar, CheckSquare,
  Minus, Palette, Paperclip, Tag, Trash2, User, X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import type { KanbanCard, KanbanCardLabelRef, KanbanLabel, KanbanUser, Priority } from "../shared/types";
import { PRIORITY_CONFIG } from "../shared/types";
import { RichTextEditor } from "../editor/RichTextEditor";
import { AvatarGroup } from "../shared/AvatarGroup";
import { CardModalChecklists } from "./CardModalChecklists";
import { CardModalComments } from "./CardModalComments";
import { CardModalActivity } from "./CardModalActivity";
import { useKanban } from "../shared/useKanbanStore";

interface CardModalProps {
  cardId: string;
  onClose: () => void;
  boardLabels: KanbanLabel[];
  boardMembers: KanbanUser[];
}

const PRIORITY_ICONS = {
  urgent: AlertOctagon, high: ArrowUp, medium: Minus, low: ArrowDown, none: Minus,
};

export function CardModal({ cardId, onClose, boardLabels, boardMembers }: CardModalProps) {
  const { dispatch } = useKanban();
  const [card, setCard] = useState<KanbanCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/kanban/cards/${cardId}`);
      if (res.ok) {
        const data = await res.json();
        setCard(data);
        setTitleDraft(data.title);
      }
      setLoading(false);
    }
    load();
  }, [cardId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patchCard(patch: Partial<KanbanCard>) {
    if (!card) return;
    const optimistic = { ...card, ...patch };
    setCard(optimistic);
    dispatch({ type: "UPDATE_CARD", cardId: card.id, patch });
    await fetch(`/api/kanban/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === card?.title) {
      setEditingTitle(false);
      setTitleDraft(card?.title ?? "");
      return;
    }
    setEditingTitle(false);
    await patchCard({ title: titleDraft });
  }

  async function saveDescription(json: object, text: string) {
    if (!card) return;
    setSavingDescription(true);
    await patchCard({ content: json, description: text.slice(0, 200) });
    setSavingDescription(false);
  }

  async function toggleLabel(label: KanbanLabel) {
    if (!card) return;
    const exists = card.labels.some((cl: KanbanCardLabelRef) => cl.labelId === label.id);
    if (exists) {
      const newLabels = card.labels.filter((cl: KanbanCardLabelRef) => cl.labelId !== label.id);
      setCard({ ...card, labels: newLabels });
      await fetch(`/api/kanban/cards/${card.id}/labels`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      });
    } else {
      await fetch(`/api/kanban/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      });
      const res = await fetch(`/api/kanban/cards/${card.id}`);
      if (res.ok) setCard(await res.json());
    }
  }

  async function toggleMember(user: KanbanUser) {
    if (!card) return;
    const assigned = card.assignments.some((a) => a.userId === user.id);
    if (assigned) {
      setCard({ ...card, assignments: card.assignments.filter((a) => a.userId !== user.id) });
      await fetch(`/api/kanban/cards/${card.id}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
    } else {
      await fetch(`/api/kanban/cards/${card.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const res = await fetch(`/api/kanban/cards/${card.id}`);
      if (res.ok) setCard(await res.json());
    }
  }

  async function handleDelete() {
    if (!card) return;
    await fetch(`/api/kanban/cards/${card.id}`, { method: "DELETE" });
    dispatch({ type: "REMOVE_CARD", cardId: card.id });
    onClose();
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel — slides in from right */}
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
          className="relative ml-auto h-full w-full max-w-3xl bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          ) : !card ? (
            <div className="flex flex-1 items-center justify-center text-white/40">
              Card não encontrado
            </div>
          ) : (
            <>
              {/* Cover */}
              {(card.coverColor || card.coverImageUrl) && (
                <div
                  className="h-24 w-full flex-shrink-0"
                  style={
                    card.coverImageUrl
                      ? { backgroundImage: `url(${card.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: card.coverColor! }
                  }
                />
              )}

              {/* Header */}
              <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-white/10">
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <textarea
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle(); } }}
                      rows={2}
                      className="w-full resize-none bg-transparent text-xl font-bold text-white outline-none border-b border-white/30 pb-1"
                    />
                  ) : (
                    <h2
                      className="text-xl font-bold text-white cursor-text hover:text-white/90 leading-snug"
                      onClick={() => setEditingTitle(true)}
                    >
                      {card.title}
                    </h2>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Main content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Descrição</h3>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <RichTextEditor
                        content={card.content as object ?? undefined}
                        onBlur={saveDescription}
                        placeholder="Adicione uma descrição detalhada..."
                      />
                    </div>
                    {savingDescription && (
                      <p className="mt-1 text-[10px] text-white/30">Salvando...</p>
                    )}
                  </section>

                  {/* Checklists */}
                  <CardModalChecklists
                    card={card}
                    onUpdate={setCard}
                  />

                  {/* Comments */}
                  <CardModalComments
                    card={card}
                    onUpdate={setCard}
                  />

                  {/* Activity */}
                  <CardModalActivity cardId={card.id} />
                </div>

                {/* Sidebar */}
                <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-white/10 p-4 space-y-4">
                  {/* Priority */}
                  <SidebarSection title="Prioridade">
                    <div className="space-y-1">
                      {(["none", "low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                        const Icon = PRIORITY_ICONS[p];
                        const cfg = PRIORITY_CONFIG[p];
                        return (
                          <button
                            key={p}
                            onClick={() => patchCard({ priority: p })}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                              card.priority === p ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </SidebarSection>

                  {/* Due Date */}
                  <SidebarSection title="Data de Entrega">
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/70 hover:bg-white/20 transition-colors">
                          <Calendar className="h-3.5 w-3.5" />
                          {card.dueDate
                            ? format(new Date(card.dueDate), "dd MMM yyyy", { locale: ptBR })
                            : "Definir data"}
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          className="z-50 rounded-xl bg-slate-800 border border-white/10 p-3 shadow-2xl"
                          sideOffset={4}
                        >
                          <DayPicker
                            mode="single"
                            selected={card.dueDate ? new Date(card.dueDate) : undefined}
                            onSelect={(date) => patchCard({ dueDate: date ? date.toISOString() : null })}
                            locale={ptBR}
                            classNames={{
                              root: "text-white text-sm",
                              day_selected: "bg-blue-600 text-white rounded-lg",
                              day_today: "font-bold text-blue-400",
                              nav_button: "text-white/60 hover:text-white",
                              caption: "text-white/80 font-medium",
                            }}
                          />
                          {card.dueDate && (
                            <button
                              onClick={() => patchCard({ dueDate: null })}
                              className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors"
                            >
                              Remover data
                            </button>
                          )}
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  </SidebarSection>

                  {/* Labels */}
                  <SidebarSection title="Labels">
                    <div className="space-y-1">
                      {boardLabels.map((label) => {
                        const active = card.labels.some((cl: KanbanCardLabelRef) => cl.labelId === label.id);
                        return (
                          <button
                            key={label.id}
                            onClick={() => toggleLabel(label)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                              active ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ background: label.color }}
                            />
                            {label.name}
                          </button>
                        );
                      })}
                      {boardLabels.length === 0 && (
                        <p className="text-[10px] text-white/30 px-2">Nenhuma label no board</p>
                      )}
                    </div>
                  </SidebarSection>

                  {/* Members */}
                  <SidebarSection title="Membros">
                    <div className="space-y-1">
                      {boardMembers.map((user) => {
                        const assigned = card.assignments.some((a) => a.userId === user.id);
                        return (
                          <button
                            key={user.id}
                            onClick={() => toggleMember(user)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                              assigned ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            <div className="h-5 w-5 rounded-full bg-blue-500 flex-shrink-0 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white">
                              {user.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.imageUrl} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                user.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="truncate">{user.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {card.assignments.length > 0 && (
                      <div className="mt-2">
                        <AvatarGroup users={card.assignments.map((a) => a.user)} size="sm" />
                      </div>
                    )}
                  </SidebarSection>

                  {/* Cover */}
                  <SidebarSection title="Capa">
                    <div className="grid grid-cols-5 gap-1">
                      {["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#64748b"].map((color) => (
                        <button
                          key={color}
                          onClick={() => patchCard({ coverColor: card.coverColor === color ? null : color, coverImageUrl: null })}
                          className={cn("h-6 w-full rounded transition-transform hover:scale-110", card.coverColor === color && "ring-2 ring-white/60 scale-110")}
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                    {(card.coverColor || card.coverImageUrl) && (
                      <button
                        onClick={() => patchCard({ coverColor: null, coverImageUrl: null })}
                        className="mt-1 w-full rounded-lg bg-white/10 py-1 text-[10px] text-white/50 hover:bg-white/20 transition-colors"
                      >
                        Remover capa
                      </button>
                    )}
                  </SidebarSection>

                  {/* Danger */}
                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Arquivar card
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">{title}</h4>
      {children}
    </div>
  );
}

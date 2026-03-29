"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity } from "lucide-react";
import type { KanbanActivity } from "../shared/types";

const ACTIVITY_LABELS: Record<string, (meta?: Record<string, unknown>) => string> = {
  card_created:            () => "criou este card",
  card_moved:              (m) => `moveu de "${m?.from ?? "?"}" para "${m?.to ?? "?"}"`,
  card_renamed:            (m) => `renomeou de "${m?.from ?? "?"}" para "${m?.to ?? "?"}"`,
  comment_added:           () => "adicionou um comentário",
  due_date_set:            (m) => m?.dueDate ? `definiu entrega para ${m.dueDate}` : "removeu a data de entrega",
  label_added:             () => "adicionou uma label",
  member_assigned:         () => "atribuiu um membro",
  checklist_item_checked:  (m) => `${m?.isChecked ? "marcou" : "desmarcou"} "${m?.itemText}"`,
  attachment_added:        () => "adicionou um anexo",
  description_updated:     () => "atualizou a descrição",
};

interface CardModalActivityProps {
  cardId: string;
}

export function CardModalActivity({ cardId }: CardModalActivityProps) {
  const [activities, setActivities] = useState<KanbanActivity[]>([]);

  useEffect(() => {
    fetch(`/api/kanban/cards/${cardId}/activities`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => {});
  }, [cardId]);

  if (activities.length === 0) return null;

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
        <Activity className="h-3 w-3" />
        Atividade
      </h3>
      <div className="space-y-2.5">
        {activities.map((act) => {
          const label = ACTIVITY_LABELS[act.type]?.(act.meta as Record<string, unknown> | undefined) ?? act.type;
          return (
            <div key={act.id} className="flex items-center gap-2.5">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white/60 overflow-hidden">
                {act.user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={act.user.imageUrl} alt={act.user.name} className="h-full w-full object-cover" />
                ) : (
                  initials(act.user.name)
                )}
              </div>
              <p className="text-xs text-white/50 leading-snug">
                <span className="font-medium text-white/70">{act.user.name}</span>
                {" "}{label}
                <span className="ml-1 text-white/30">
                  · {format(new Date(act.createdAt), "dd MMM HH:mm", { locale: ptBR })}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

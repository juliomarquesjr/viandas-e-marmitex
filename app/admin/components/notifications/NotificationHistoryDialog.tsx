"use client";

import * as React from "react";
import { Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { NotificationDTO } from "@/lib/notification-types";
import { NotificationItem } from "./NotificationItem";
import { useNotificationHistory, type HistoryFilter } from "./useNotificationHistory";

interface NotificationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Muda quando algo foi resolvido fora do modal, para a lista se atualizar. */
  version: number;
  pendingCount: number;
  onSelect: (notification: NotificationDTO) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

const TABS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
];

export function NotificationHistoryDialog({
  open,
  onOpenChange,
  version,
  pendingCount,
  onSelect,
  onCloseAutoFocus,
}: NotificationHistoryDialogProps) {
  const [filter, setFilter] = React.useState<HistoryFilter>("all");
  const history = useNotificationHistory({ enabled: open, filter, version });

  const handleSelect = (notification: NotificationDTO) => {
    history.markLocalRead(notification.id);
    onSelect(notification);
  };

  const emptyMessage =
    filter === "pending" ? "Nada pendente por enquanto." : "Nenhuma notificação por enquanto.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[110]"
        className="z-[111] flex max-h-[90vh] max-w-lg flex-col gap-0 border-t-[3px] border-t-primary bg-[color:var(--card)] p-0"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Bell className="h-5 w-5 text-primary" />
            </div>
            Histórico de Notificações
          </DialogTitle>
          <DialogDescription>Todos os alertas e avisos do sistema</DialogDescription>
        </DialogHeader>

        <div
          role="tablist"
          aria-label="Filtrar notificações"
          className="flex gap-1 border-b border-[color:var(--border)] px-4 pt-2"
        >
          {TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "-mb-px min-h-[40px] border-b-2 px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                )}
              >
                {tab.label}
                {tab.id === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-[color:var(--muted)] px-1.5 py-0.5 text-[11px] text-[color:var(--muted-foreground-strong)]">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          className="h-96 min-h-0 flex-1 overflow-y-auto bg-[color:var(--card)] p-2"
          aria-busy={history.loading}
        >
          {history.loading ? (
            <div className="flex h-full items-center justify-center text-[color:var(--muted-foreground)]">
              <Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando" />
            </div>
          ) : history.error && history.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Não foi possível carregar as notificações.
              </p>
              <Button variant="outline" onClick={() => void history.reload()}>
                Tentar de novo
              </Button>
            </div>
          ) : history.items.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-[color:var(--muted-foreground)]">
              {emptyMessage}
            </p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {history.items.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem notification={notification} variant="history" onSelect={handleSelect} />
                  </li>
                ))}
              </ul>
              {history.error && (
                <p className="px-3 py-2 text-center text-xs text-[color:var(--muted-foreground)]">
                  Não foi possível carregar mais. Tente de novo.
                </p>
              )}
              {history.hasMore && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="outline"
                    loading={history.loadingMore}
                    onClick={() => void history.loadMore()}
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

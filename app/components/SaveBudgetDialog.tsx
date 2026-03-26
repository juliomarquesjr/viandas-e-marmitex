"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface SaveBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  onConfirm: (title: string) => Promise<void>;
  isSaving: boolean;
}

export function SaveBudgetDialog({
  open,
  onOpenChange,
  defaultTitle,
  onConfirm,
  isSaving,
}: SaveBudgetDialogProps) {
  const [title, setTitle] = useState(defaultTitle ?? "");

  const handleOpenChange = (value: boolean) => {
    if (!isSaving) {
      if (!value) setTitle(defaultTitle ?? "");
      onOpenChange(value);
    }
  };

  const handleConfirm = async () => {
    if (!title.trim()) return;
    await onConfirm(title.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Save className="h-5 w-5 text-primary" />
            </div>
            Salvar Orçamento
          </DialogTitle>
          <DialogDescription>
            Dê um nome para identificar este orçamento na ficha do cliente
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Título <span className="text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Orçamento Janeiro 2026"
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { BookOpen, Copy } from "lucide-react";
import { useState } from "react";
import { dayMonth, longDay, type MenuSummary } from "../lib";

interface Props {
  mode: "new" | "copy";
  /** Dia sugerido para o novo cardápio. */
  suggestedDay: string;
  /** Cardápios que podem servir de modelo (do mais novo ao mais antigo). */
  sources: MenuSummary[];
  /** Origem já escolhida (ex.: "Duplicar" na lista). */
  presetSource?: string;
  onClose: () => void;
  onConfirm: (day: string, copyFrom?: string) => void;
}

/** Escolhe o dia do cardápio (e, ao copiar, de qual dia vêm os itens). */
export function NewMenuDialog({ mode, suggestedDay, sources, presetSource, onClose, onConfirm }: Props) {
  const [day, setDay] = useState(suggestedDay);
  const [source, setSource] = useState(presetSource ?? sources[0]?.date ?? "");
  const copy = mode === "copy";
  const canConfirm = Boolean(day) && (!copy || Boolean(source));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {copy ? <Copy className="h-5 w-5" aria-hidden="true" /> : <BookOpen className="h-5 w-5" aria-hidden="true" />}
            {copy ? "Copiar de outro dia" : "Novo cardápio"}
          </DialogTitle>
          <DialogDescription>
            {copy ? "Os itens do dia escolhido viram o ponto de partida. Nada é publicado até você salvar." : "Escolha o dia do cardápio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {copy && (
            <div>
              <Label className="mb-1.5 block text-sm font-semibold">Copiar do dia</Label>
              {sources.length === 0 ? (
                <p className="text-sm text-[color:var(--muted-foreground)]">Ainda não há cardápios para copiar.</p>
              ) : (
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="min-h-[44px]" aria-label="Dia de origem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((m) => (
                      <SelectItem key={m.date} value={m.date}>
                        {dayMonth(m.date)} · {m.highlight ?? m.title ?? "Cardápio"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="menu-new-day" className="mb-1.5 block text-sm font-semibold">
              {copy ? "Para o dia" : "Dia do cardápio"}
            </Label>
            <Input id="menu-new-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className="min-h-[44px]" />
            {day && <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">{longDay(day)}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className="min-h-[44px]" disabled={!canConfirm} onClick={() => onConfirm(day, copy ? source : undefined)}>
            {copy ? "Copiar e editar" : "Criar cardápio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

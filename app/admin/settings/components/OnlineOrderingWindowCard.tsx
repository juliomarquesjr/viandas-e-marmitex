"use client";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { AlertCircle, Copy, Info, Package, Trash2 } from "lucide-react";
import {
  formatMinute,
  minuteOptions,
  plural,
  WEEKDAY_CHIPS,
  type DraftWindow,
  type WindowErrors,
} from "./OnlineOrderingShared";

interface Props {
  window: DraftWindow;
  index: number;
  errors: WindowErrors;
  overlapsWith: string[];
  canDuplicate: boolean;
  onChange: (patch: Partial<DraftWindow>) => void;
  onPickProducts: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-[color:var(--state-cobrar-fg)]">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function OnlineOrderingWindowCard({
  window: w,
  index,
  errors,
  overlapsWith,
  canDuplicate,
  onChange,
  onPickProducts,
  onDuplicate,
  onRemove,
}: Props) {
  const uid = `oo-${w.key}`;
  const label = w.name.trim() || `Horário ${index + 1}`;

  const toggleDay = (day: number) =>
    onChange({
      weekdays: w.weekdays.includes(day) ? w.weekdays.filter((d) => d !== day) : [...w.weekdays, day],
    });

  return (
    <article
      aria-label={`Horário: ${label}`}
      className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5 ${
        w.active ? "" : "opacity-90"
      }`}
    >
      {/* Nome e ações */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor={`${uid}-name`} className="mb-1.5 block text-xs text-[color:var(--muted-foreground)]">
            Nome do horário
          </Label>
          <Input
            id={`${uid}-name`}
            value={w.name}
            maxLength={60}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex.: Almoço"
            variant={errors.name ? "error" : "default"}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
            className="min-h-[44px]"
          />
          {errors.name && <FieldError id={`${uid}-name-err`}>{errors.name}</FieldError>}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex min-h-[44px] items-center gap-2 pr-2">
            <Switch
              id={`${uid}-active`}
              checked={w.active}
              onCheckedChange={(v) => onChange({ active: v })}
            />
            <Label htmlFor={`${uid}-active`} className="cursor-pointer text-sm">
              {w.active ? "Ativo" : "Pausado"}
            </Label>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] min-w-[44px]"
            onClick={onDuplicate}
            disabled={!canDuplicate}
            title={canDuplicate ? undefined : "Limite de 20 horários"}
            aria-label={`Duplicar o horário ${label}`}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Duplicar</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-[color:var(--state-cobrar-fg)]"
            onClick={onRemove}
            aria-label={`Remover o horário ${label}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Remover</span>
          </Button>
        </div>
      </div>

      {!w.id && (
        <div className="mt-2">
          <Badge variant="info" size="sm">
            Novo, ainda não salvo
          </Badge>
        </div>
      )}

      {/* Dias */}
      <div className="mt-4" role="group" aria-labelledby={`${uid}-days`}>
        <p id={`${uid}-days`} className="mb-1.5 text-xs font-medium text-[color:var(--muted-foreground)]">
          Dias da semana
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_CHIPS.map((d) => {
            const on = w.weekdays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                aria-label={d.full}
                onClick={() => toggleDay(d.value)}
                className={`min-h-[44px] min-w-[52px] rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  on
                    ? "border-primary bg-primary text-white"
                    : "border-[color:var(--border-dark)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {errors.weekdays && <FieldError id={`${uid}-days-err`}>{errors.weekdays}</FieldError>}
      </div>

      {/* Horário */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-[color:var(--muted-foreground)]">Horário de pedidos</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[color:var(--foreground)]">das</span>
          <Select value={String(w.startMinute)} onValueChange={(v) => onChange({ startMinute: Number(v) })}>
            <SelectTrigger className="min-h-[44px] w-[120px]" aria-label={`Hora inicial de ${label}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions("start", w.startMinute).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {formatMinute(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-[color:var(--foreground)]">às</span>
          <Select value={String(w.endMinute)} onValueChange={(v) => onChange({ endMinute: Number(v) })}>
            <SelectTrigger className="min-h-[44px] w-[120px]" aria-label={`Hora final de ${label}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions("end", w.endMinute).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {formatMinute(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.time ? (
          <FieldError id={`${uid}-time-err`}>{errors.time}</FieldError>
        ) : (
          <p className="mt-1.5 text-xs text-[color:var(--muted-foreground)]">
            Para atravessar a meia-noite, crie dois horários.
          </p>
        )}
      </div>

      {/* Produtos */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-[color:var(--muted-foreground)]">Produtos deste horário</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
            <Package className="h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden="true" />
            {w.productIds.length === 0 ? "Nenhum produto" : plural(w.productIds.length, "produto", "produtos")}
          </span>
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={onPickProducts}>
            Escolher produtos
          </Button>
        </div>
        {errors.products && <FieldError id={`${uid}-products-err`}>{errors.products}</FieldError>}
      </div>

      {overlapsWith.length > 0 && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--state-producao-bg)", color: "var(--state-producao-fg)" }}
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            Este horário se encontra com {overlapsWith.map((n) => `“${n}”`).join(", ")} em algum dia. Tudo bem: os
            produtos ficam disponíveis enquanto qualquer um dos horários estiver aberto.
          </span>
        </p>
      )}
    </article>
  );
}

"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Switch } from "@/app/components/ui/switch";
import { Button } from "@/app/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useId } from "react";

interface ViewSettingsProps {
  showRail: boolean;
  onShowRailChange: (value: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (value: boolean) => void;
  cancelledCount: number;
}

/**
 * As preferências de exibição da tela, reunidas fora do caminho. São escolhas
 * que a pessoa faz uma vez e mantém — não merecem espaço permanente no
 * cabeçalho, mas precisam ser achadas sem procurar.
 */
export function ViewSettings({
  showRail,
  onShowRailChange,
  showCancelled,
  onShowCancelledChange,
  cancelledCount,
}: ViewSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Exibição"
          aria-label="Preferências de exibição"
          className="h-10 w-10 shrink-0"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[292px] p-1.5">
        <p className="px-2.5 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
          Exibição
        </p>

        <SettingRow
          label="Resumo do dia"
          hint="A faixa com itens e etapas no topo."
          checked={showRail}
          onCheckedChange={onShowRailChange}
        />
        <SettingRow
          label="Pedidos cancelados"
          hint={
            cancelledCount > 0
              ? `${cancelledCount} cancelado${cancelledCount !== 1 ? "s" : ""} neste período.`
              : "Nenhum cancelado neste período."
          }
          checked={showCancelled}
          onCheckedChange={onShowCancelledChange}
        />
      </PopoverContent>
    </Popover>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-[color:var(--muted)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[color:var(--foreground)]">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-[color:var(--muted-foreground-strong)]">
          {hint}
        </span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </label>
  );
}

"use client";

import * as React from "react";
import { Printer, RefreshCcw, Trash2 } from "lucide-react";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import {
  getDesktopPrintPreferences,
  listDesktopPrinters,
  saveDesktopPrintPreferences,
} from "@/lib/runtime/capabilities";
import {
  createDesktopPrintPreferencesInput,
  DEFAULT_DESKTOP_PRINT_PREFERENCES,
  type DesktopPrintPreferencesInput,
  type PrintMode,
  type PrinterInfo,
} from "@/lib/runtime/printing";

interface DesktopPrintManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_PRINTER_VALUE = "__none__";

export function DesktopPrintManagerDialog({
  open,
  onOpenChange,
}: DesktopPrintManagerDialogProps) {
  const { showToast } = useToast();
  const [printers, setPrinters] = React.useState<PrinterInfo[]>([]);
  const [form, setForm] = React.useState<DesktopPrintPreferencesInput>(
    createDesktopPrintPreferencesInput(DEFAULT_DESKTOP_PRINT_PREFERENCES),
  );
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [missingStandardPrinter, setMissingStandardPrinter] = React.useState(false);
  const [missingThermalPrinter, setMissingThermalPrinter] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [availablePrinters, savedPreferences] = await Promise.all([
        listDesktopPrinters(),
        getDesktopPrintPreferences(),
      ]);

      const nextMissingStandardPrinter =
        Boolean(savedPreferences.defaultPrinterId) &&
        !availablePrinters.some((printer) => printer.id === savedPreferences.defaultPrinterId);

      const nextMissingThermalPrinter =
        Boolean(savedPreferences.defaultThermalPrinterId) &&
        !availablePrinters.some((printer) => printer.id === savedPreferences.defaultThermalPrinterId);

      setMissingStandardPrinter(nextMissingStandardPrinter);
      setMissingThermalPrinter(nextMissingThermalPrinter);

      setPrinters(availablePrinters);
      setForm(
        createDesktopPrintPreferencesInput({
          ...savedPreferences,
          defaultPrinterId: nextMissingStandardPrinter ? null : savedPreferences.defaultPrinterId,
          defaultPrinterName: nextMissingStandardPrinter ? null : savedPreferences.defaultPrinterName,
          defaultThermalPrinterId: nextMissingThermalPrinter ? null : savedPreferences.defaultThermalPrinterId,
          defaultThermalPrinterName: nextMissingThermalPrinter ? null : savedPreferences.defaultThermalPrinterName,
          autoPrintStandard: nextMissingStandardPrinter ? false : savedPreferences.autoPrintStandard,
          autoPrintThermal: nextMissingThermalPrinter ? false : savedPreferences.autoPrintThermal,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível carregar as preferências de impressão.";
      setLoadError(message);
      setMissingStandardPrinter(false);
      setMissingThermalPrinter(false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    loadData();
  }, [loadData, open]);

  const hasStandardPrinter = Boolean(form.defaultPrinterId);
  const hasThermalPrinter = Boolean(form.defaultThermalPrinterId);

  const handlePrinterChange = React.useCallback(
    (mode: PrintMode, printerId: string) => {
      const nextPrinterId = printerId === EMPTY_PRINTER_VALUE ? null : printerId;
      const selectedPrinter =
        nextPrinterId === null
          ? null
          : printers.find((printer) => printer.id === nextPrinterId) ?? null;

      if (mode === "thermal") {
        setMissingThermalPrinter(false);
      } else {
        setMissingStandardPrinter(false);
      }

      setForm((current) => {
        if (mode === "thermal") {
          return createDesktopPrintPreferencesInput({
            ...current,
            defaultThermalPrinterId: nextPrinterId,
            defaultThermalPrinterName: selectedPrinter?.name ?? null,
            autoPrintThermal: nextPrinterId ? current.autoPrintThermal : false,
          });
        }

        return createDesktopPrintPreferencesInput({
          ...current,
          defaultPrinterId: nextPrinterId,
          defaultPrinterName: selectedPrinter?.name ?? null,
          autoPrintStandard: nextPrinterId ? current.autoPrintStandard : false,
        });
      });
    },
    [printers],
  );

  const handleSwitchChange = React.useCallback((mode: PrintMode, checked: boolean) => {
    setForm((current) =>
      createDesktopPrintPreferencesInput({
        ...current,
        autoPrintThermal:
          mode === "thermal" ? checked && Boolean(current.defaultThermalPrinterId) : current.autoPrintThermal,
        autoPrintStandard:
          mode === "standard" ? checked && Boolean(current.defaultPrinterId) : current.autoPrintStandard,
      }),
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const saved = await saveDesktopPrintPreferences(form);
      setForm(createDesktopPrintPreferencesInput(saved));
      showToast("Preferências de impressão salvas com sucesso.", "success");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar as preferências de impressão.";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderPrinterSelect = (
    mode: PrintMode,
    value: string | null,
    placeholder: string,
    missingPrinter: boolean,
  ) => (
    <div className="space-y-2">
      <Select
        value={value ?? EMPTY_PRINTER_VALUE}
        onValueChange={(nextValue) => handlePrinterChange(mode, nextValue)}
      >
        <SelectTrigger className={missingPrinter ? "border-amber-400" : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_PRINTER_VALUE}>Nenhuma impressora selecionada</SelectItem>
          {printers.map((printer) => (
            <SelectItem key={printer.id} value={printer.id}>
              {printer.name}
              {printer.isDefaultSystem ? " (Padrão do Windows)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handlePrinterChange(mode, EMPTY_PRINTER_VALUE)}
          disabled={value === null}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          Limpar seleção
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-t-[3px] border-t-primary">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Printer className="h-5 w-5 text-primary" />
            </div>
            Gerenciador de Impressão
          </DialogTitle>
          <DialogDescription>
            Defina as impressoras padrão do desktop e se o envio automático deve ser habilitado.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">Falha ao carregar dados de impressão.</p>
              <p className="mt-1">{loadError}</p>
            </div>
          )}

          {!loadError && missingStandardPrinter && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A impressora padrão comum salva anteriormente não está mais disponível no Windows. Selecione outra
              impressora para continuar usando impressão automática comum.
            </div>
          )}

          {!loadError && missingThermalPrinter && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A impressora térmica salva anteriormente não está mais disponível no Windows. Selecione outra
              impressora para continuar usando impressão automática térmica.
            </div>
          )}

          {!loadError && printers.length === 0 && !loading && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Nenhuma impressora foi encontrada no sistema operacional.
            </div>
          )}

          <section className="space-y-4 rounded-xl border border-[color:var(--border)] p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Impressão comum</h3>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Usada futuramente para relatórios e impressões não térmicas.
              </p>
            </div>

            {renderPrinterSelect(
              "standard",
              form.defaultPrinterId,
              "Selecione a impressora padrão comum",
              missingStandardPrinter,
            )}

            <div className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--border)] p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">Enviar automaticamente</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Quando ativo, as telas poderão pular a escolha manual do Windows para impressões comuns.
                </p>
              </div>
              <Switch
                checked={form.autoPrintStandard}
                onCheckedChange={(checked) => handleSwitchChange("standard", checked)}
                disabled={!hasStandardPrinter}
                aria-label="Habilitar impressão automática comum"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[color:var(--border)] p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Impressão térmica</h3>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Usada futuramente para recibos e demais saídas térmicas.
              </p>
            </div>

            {renderPrinterSelect(
              "thermal",
              form.defaultThermalPrinterId,
              "Selecione a impressora padrão térmica",
              missingThermalPrinter,
            )}

            <div className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--border)] p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">Enviar automaticamente</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Quando ativo, as telas poderão pular a escolha manual do Windows para impressões térmicas.
                </p>
              </div>
              <Switch
                checked={form.autoPrintThermal}
                onCheckedChange={(checked) => handleSwitchChange("thermal", checked)}
                disabled={!hasThermalPrinter}
                aria-label="Habilitar impressão automática térmica"
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading || saving}
            leftIcon={<RefreshCcw className="h-4 w-4" />}
          >
            Recarregar impressoras
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} loading={saving} disabled={loading || !!loadError}>
              Salvar preferências
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

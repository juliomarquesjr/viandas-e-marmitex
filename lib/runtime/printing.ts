"use client";

export type PrintMode = "standard" | "thermal";

export interface PrinterInfo {
  id: string;
  name: string;
  isDefaultSystem?: boolean;
}

export interface DesktopPrintPreferences {
  defaultPrinterId: string | null;
  defaultPrinterName: string | null;
  defaultThermalPrinterId: string | null;
  defaultThermalPrinterName: string | null;
  autoPrintStandard: boolean;
  autoPrintThermal: boolean;
  updatedAt: string | null;
}

export interface DesktopPrintPreferencesInput {
  defaultPrinterId: string | null;
  defaultPrinterName: string | null;
  defaultThermalPrinterId: string | null;
  defaultThermalPrinterName: string | null;
  autoPrintStandard: boolean;
  autoPrintThermal: boolean;
}

export const DEFAULT_DESKTOP_PRINT_PREFERENCES: DesktopPrintPreferences = {
  defaultPrinterId: null,
  defaultPrinterName: null,
  defaultThermalPrinterId: null,
  defaultThermalPrinterName: null,
  autoPrintStandard: false,
  autoPrintThermal: false,
  updatedAt: null,
};

export function normalizeDesktopPrintPreferences(
  input?: Partial<DesktopPrintPreferences> | null,
): DesktopPrintPreferences {
  const defaultPrinterId = input?.defaultPrinterId ?? null;
  const defaultPrinterName = input?.defaultPrinterName ?? null;
  const defaultThermalPrinterId = input?.defaultThermalPrinterId ?? null;
  const defaultThermalPrinterName = input?.defaultThermalPrinterName ?? null;

  return {
    defaultPrinterId,
    defaultPrinterName,
    defaultThermalPrinterId,
    defaultThermalPrinterName,
    autoPrintStandard: Boolean(input?.autoPrintStandard && defaultPrinterId),
    autoPrintThermal: Boolean(input?.autoPrintThermal && defaultThermalPrinterId),
    updatedAt: input?.updatedAt ?? null,
  };
}

export function createDesktopPrintPreferencesInput(
  input?: Partial<DesktopPrintPreferencesInput> | null,
): DesktopPrintPreferencesInput {
  const normalized = normalizeDesktopPrintPreferences({
    ...DEFAULT_DESKTOP_PRINT_PREFERENCES,
    ...input,
  });

  return {
    defaultPrinterId: normalized.defaultPrinterId,
    defaultPrinterName: normalized.defaultPrinterName,
    defaultThermalPrinterId: normalized.defaultThermalPrinterId,
    defaultThermalPrinterName: normalized.defaultThermalPrinterName,
    autoPrintStandard: normalized.autoPrintStandard,
    autoPrintThermal: normalized.autoPrintThermal,
  };
}

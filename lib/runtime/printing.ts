"use client";

export type PrintMode = "standard" | "thermal";

export type ThermalAutoPrintModuleKey =
  | "sales"
  | "preOrders"
  | "customerReport"
  | "expenses"
  | "pdv"
  | "budgets";

export interface PrinterInfo {
  id: string;
  name: string;
  isDefaultSystem?: boolean;
}

export interface ThermalAutoPrintModules {
  sales: boolean;
  preOrders: boolean;
  customerReport: boolean;
  expenses: boolean;
  pdv: boolean;
  budgets: boolean;
}

export interface DesktopPrintPreferences {
  defaultPrinterId: string | null;
  defaultPrinterName: string | null;
  defaultThermalPrinterId: string | null;
  defaultThermalPrinterName: string | null;
  thermalAutoPrintModules: ThermalAutoPrintModules;
  updatedAt: string | null;
}

export interface DesktopPrintPreferencesInput {
  defaultPrinterId: string | null;
  defaultPrinterName: string | null;
  defaultThermalPrinterId: string | null;
  defaultThermalPrinterName: string | null;
  thermalAutoPrintModules: ThermalAutoPrintModules;
}

export const DEFAULT_THERMAL_AUTO_PRINT_MODULES: ThermalAutoPrintModules = {
  sales: false,
  preOrders: false,
  customerReport: false,
  expenses: false,
  pdv: false,
  budgets: false,
};

export const DEFAULT_DESKTOP_PRINT_PREFERENCES: DesktopPrintPreferences = {
  defaultPrinterId: null,
  defaultPrinterName: null,
  defaultThermalPrinterId: null,
  defaultThermalPrinterName: null,
  thermalAutoPrintModules: DEFAULT_THERMAL_AUTO_PRINT_MODULES,
  updatedAt: null,
};

function normalizeThermalAutoPrintModules(
  input?: Partial<ThermalAutoPrintModules> | null,
  hasThermalPrinter = false,
): ThermalAutoPrintModules {
  const normalized = {
    sales: Boolean(input?.sales),
    preOrders: Boolean(input?.preOrders),
    customerReport: Boolean(input?.customerReport),
    expenses: Boolean(input?.expenses),
    pdv: Boolean(input?.pdv),
    budgets: Boolean(input?.budgets),
  };

  return hasThermalPrinter ? normalized : DEFAULT_THERMAL_AUTO_PRINT_MODULES;
}

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
    thermalAutoPrintModules: normalizeThermalAutoPrintModules(
      input?.thermalAutoPrintModules,
      Boolean(defaultThermalPrinterId),
    ),
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
    thermalAutoPrintModules: normalized.thermalAutoPrintModules,
  };
}

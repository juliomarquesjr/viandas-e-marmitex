"use client";

import {
  createDesktopPrintPreferencesInput,
  DEFAULT_DESKTOP_PRINT_PREFERENCES,
  type DesktopPrintPreferences,
  type DesktopPrintPreferencesInput,
  type ThermalAutoPrintModuleKey,
  type PrinterInfo,
} from "@/lib/runtime/printing";

export type AppRuntime = "web" | "desktop";

export interface DesktopRuntimeConfig {
  runtime: "desktop";
  serverPort: number | null;
  dataDir: string;
}

const hasWindow = typeof window !== "undefined";

export function detectRuntime(): AppRuntime {
  if (!hasWindow) return "web";

  const desktopFlag =
    (window as any).__TAURI_INTERNALS__ ||
    process.env.NEXT_PUBLIC_APP_RUNTIME === "desktop";

  return desktopFlag ? "desktop" : "web";
}

export function isDesktopRuntime(): boolean {
  return detectRuntime() === "desktop";
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime()) {
    throw new Error("Comando desktop chamado fora do runtime desktop");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function getDesktopRuntimeConfig(): Promise<DesktopRuntimeConfig | null> {
  if (!isDesktopRuntime()) return null;
  return invoke<DesktopRuntimeConfig>("get_desktop_config");
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  if (isDesktopRuntime()) {
    await invoke<void>("open_external_url", { url });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function selectFilePath(): Promise<string | null> {
  if (!isDesktopRuntime()) return null;
  return invoke<string | null>("select_file");
}

export async function openPathInExplorer(path: string): Promise<void> {
  if (!path) return;

  if (isDesktopRuntime()) {
    await invoke<void>("open_path_in_file_explorer", { path });
    return;
  }

  console.warn("openPathInExplorer não suportado no runtime web");
}

export async function saveBlobWithNativeDialog(blob: Blob, defaultFilename: string): Promise<string | null> {
  if (!isDesktopRuntime()) return null;

  const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
  return invoke<string | null>("save_bytes_to_file", {
    defaultFilename,
    bytes,
  });
}

export async function listDesktopPrinters(): Promise<PrinterInfo[]> {
  if (!isDesktopRuntime()) return [];
  return invoke<PrinterInfo[]>("list_printers");
}

export async function getDesktopPrintPreferences(): Promise<DesktopPrintPreferences> {
  if (!isDesktopRuntime()) return DEFAULT_DESKTOP_PRINT_PREFERENCES;
  return invoke<DesktopPrintPreferences>("get_print_preferences");
}

export async function saveDesktopPrintPreferences(
  input: DesktopPrintPreferencesInput,
): Promise<DesktopPrintPreferences> {
  if (!isDesktopRuntime()) {
    throw new Error("Preferências de impressão desktop só estão disponíveis no runtime desktop");
  }

  return invoke<DesktopPrintPreferences>("save_print_preferences", {
    input: createDesktopPrintPreferencesInput(input),
  });
}

export async function getThermalAutoPrintDecision(
  moduleKey: ThermalAutoPrintModuleKey,
): Promise<boolean> {
  if (!isDesktopRuntime()) return false;

  const preferences = await getDesktopPrintPreferences();
  return Boolean(
    preferences.defaultThermalPrinterId && preferences.thermalAutoPrintModules[moduleKey],
  );
}

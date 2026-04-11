"use client";

import { isDesktopRuntime } from "@/lib/runtime/capabilities";
import { Minus, Square, X } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

const TITLE_BAR_HEIGHT = 40;

async function invokeDesktop<T>(command: string): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command);
}

export function DesktopWindowFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  const hideForPrint = pathname?.startsWith("/print");
  const showTitleBar = isDesktop && !hideForPrint;

  React.useEffect(() => {
    if (!isDesktopRuntime()) return;

    setIsDesktop(true);
    document.documentElement.classList.add("desktop-runtime");
    document.body.classList.add("desktop-runtime");
    let unlistenResize: (() => void) | undefined;

    const setupWindowState = async () => {
      try {
        setIsMaximized(await invokeDesktop<boolean>("window_is_maximized"));

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWindow = getCurrentWindow();
        unlistenResize = await currentWindow.onResized(async () => {
          setIsMaximized(await invokeDesktop<boolean>("window_is_maximized"));
        });
      } catch (error) {
        console.error("Falha ao configurar controles de janela:", error);
      }
    };

    setupWindowState();

    return () => {
      unlistenResize?.();
      document.documentElement.classList.remove("desktop-runtime");
      document.body.classList.remove("desktop-runtime");
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty(
      "--desktop-titlebar-height",
      showTitleBar ? `${TITLE_BAR_HEIGHT}px` : "0px",
    );

    return () => {
      document.documentElement.style.setProperty("--desktop-titlebar-height", "0px");
    };
  }, [showTitleBar]);

  const handleMinimize = async () => {
    try {
      await invokeDesktop("window_minimize");
    } catch (error) {
      console.error("Falha ao minimizar janela:", error);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await invokeDesktop("window_toggle_maximize");
      setIsMaximized(await invokeDesktop<boolean>("window_is_maximized"));
    } catch (error) {
      console.error("Falha ao alternar janela:", error);
    }
  };

  const handleClose = async () => {
    try {
      await invokeDesktop("window_close");
    } catch (error) {
      console.error("Falha ao fechar janela:", error);
    }
  };

  const handleStartDrag = async (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) return;
    try {
      await invokeDesktop("window_start_dragging");
    } catch (error) {
      console.error("Falha ao arrastar janela:", error);
    }
  };

  return (
    <div className="desktop-window-frame">
      {showTitleBar && (
        <header className="desktop-window-titlebar">
          <div
            className="desktop-window-brand"
            onMouseDown={handleStartDrag}
            onDoubleClick={handleToggleMaximize}
          >
            <img
              src="/img/icon.png"
              alt="Viandas e Marmitex"
              className="desktop-window-brand-icon"
              draggable={false}
            />
            <span>Viandas e Marmitex</span>
          </div>
          <div
            className="desktop-window-titlebar-drag-area"
            onMouseDown={handleStartDrag}
            onDoubleClick={handleToggleMaximize}
          />

          <div className="desktop-window-controls">
            <button
              aria-label="Minimizar"
              className="desktop-window-control-button"
              type="button"
              onClick={handleMinimize}
            >
              <Minus size={14} />
            </button>
            <button
              aria-label={isMaximized ? "Restaurar" : "Maximizar"}
              className="desktop-window-control-button"
              type="button"
              onClick={handleToggleMaximize}
            >
              <Square size={12} />
            </button>
            <button
              aria-label="Fechar"
              className="desktop-window-control-button desktop-window-control-button-close"
              type="button"
              onClick={handleClose}
            >
              <X size={14} />
            </button>
          </div>
        </header>
      )}

      <div className="desktop-window-content">{children}</div>
    </div>
  );
}

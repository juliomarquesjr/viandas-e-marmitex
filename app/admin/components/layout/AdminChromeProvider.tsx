"use client";

import * as React from "react";

/**
 * Controla como o layout do admin se comporta em torno de uma página.
 *
 * - `fullBleed`: a página gerencia o próprio espaçamento e ocupa toda a área,
 *   sem o container centralizado de 1280 px que o resto do sistema usa.
 * - `immersive`: some com a barra lateral e o cabeçalho, entregando a tela
 *   inteira para a página. Acompanha a API de tela cheia do navegador quando
 *   ela está disponível.
 */
type AdminChromeValue = {
  fullBleed: boolean;
  setFullBleed: (value: boolean) => void;
  immersive: boolean;
  toggleImmersive: () => void;
  exitImmersive: () => void;
};

const AdminChromeContext = React.createContext<AdminChromeValue | undefined>(undefined);

export function AdminChromeProvider({ children }: { children: React.ReactNode }) {
  const [fullBleed, setFullBleed] = React.useState(false);
  const [immersive, setImmersive] = React.useState(false);

  // Sair pelo Esc ou pelo F11 dispara o evento do navegador; o estado segue.
  React.useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const exitImmersive = React.useCallback(() => {
    setImmersive(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Sair da tela cheia pode falhar; o modo imersivo já foi desligado.
      });
    }
  }, []);

  const toggleImmersive = React.useCallback(() => {
    setImmersive((current) => {
      const next = !current;

      if (next) {
        // Se o navegador recusar a tela cheia, o modo imersivo continua valendo:
        // esconder a barra lateral e o cabeçalho já entrega a área extra.
        void document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }

      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ fullBleed, setFullBleed, immersive, toggleImmersive, exitImmersive }),
    [fullBleed, immersive, toggleImmersive, exitImmersive],
  );

  return <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>;
}

export function useAdminChrome(): AdminChromeValue {
  const context = React.useContext(AdminChromeContext);

  if (!context) {
    throw new Error("useAdminChrome precisa estar dentro de AdminChromeProvider");
  }

  return context;
}

/**
 * Declara que a página ocupa toda a área do layout. Monte uma vez na raiz da
 * página; ao sair, o container padrão volta sozinho.
 */
export function useFullBleedLayout(): void {
  const { setFullBleed } = useAdminChrome();

  React.useEffect(() => {
    setFullBleed(true);
    return () => setFullBleed(false);
  }, [setFullBleed]);
}

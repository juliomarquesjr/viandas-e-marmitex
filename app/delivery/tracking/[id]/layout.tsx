"use client";

import { usePathname } from "next/navigation";

// Layout vazio para a página de rastreamento - não usa o layout padrão do sistema
export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  // Este layout específico sobrescreve o layout do delivery
  // Retornando apenas os children sem o layout padrão
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      {children}
    </div>
  );
}


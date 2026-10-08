"use client";

// Layout vazio para a página de rastreamento - não usa o layout padrão do cliente
// Isso permite que o link compartilhado funcione sem autenticação e sem mostrar navegação
export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


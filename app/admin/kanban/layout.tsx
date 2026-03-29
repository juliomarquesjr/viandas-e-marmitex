"use client";

import { KanbanProvider } from "./_components/shared/useKanbanStore";

export default function KanbanLayout({ children }: { children: React.ReactNode }) {
  return (
    <KanbanProvider>
      <div className="kanban-layout h-[calc(100vh-64px)] overflow-hidden">
        {children}
      </div>
    </KanbanProvider>
  );
}

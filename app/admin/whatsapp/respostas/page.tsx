"use client";

import { Zap } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { QuickRepliesView } from "../components/QuickRepliesView";

export default function WhatsAppQuickRepliesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Respostas rápidas"
        description="Textos prontos para inserir na conversa, pelo botão ou digitando /"
        icon={Zap}
      />
      <QuickRepliesView />
    </div>
  );
}

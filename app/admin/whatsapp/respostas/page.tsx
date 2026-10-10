"use client";

import { Zap } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { QuickRepliesView } from "../components/QuickRepliesView";

export default function WhatsAppQuickRepliesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Respostas rápidas"
        description="Textos prontos que o atendente insere na conversa, pelo botão ou digitando / no campo de mensagem."
        icon={Zap}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "WhatsApp" }, { label: "Respostas rápidas" }]}
      />
      <QuickRepliesView />
    </div>
  );
}

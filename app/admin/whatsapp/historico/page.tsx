"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageHistoryView } from "../components/MessagesViews";

export default function WhatsAppHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de envios"
        description="O que o sistema já enviou sozinho e se deu certo"
        icon={MessagesSquare}
      />
      <MessageHistoryView />
    </div>
  );
}

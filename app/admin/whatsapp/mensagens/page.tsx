"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageTemplatesView } from "../components/MessagesViews";

export default function WhatsAppMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens automáticas"
        description="Textos que o sistema envia sozinho aos clientes, por WhatsApp e e-mail"
        icon={MessagesSquare}
      />
      <MessageTemplatesView />
    </div>
  );
}

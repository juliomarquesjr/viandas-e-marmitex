"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageTemplatesView } from "../components/MessagesViews";

export default function WhatsAppMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens automáticas"
        description="Textos que o sistema envia sozinho aos clientes (senha de acesso, cardápio…), por WhatsApp e e-mail. Para conversar com o cliente, use Conversas."
        icon={MessagesSquare}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Envios automáticos" }, { label: "Mensagens automáticas" }]}
      />
      <MessageTemplatesView />
    </div>
  );
}

"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageTemplatesView } from "../components/MessagesViews";

export default function WhatsAppMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Edite os textos prontos enviados aos clientes (WhatsApp e e-mail), com prévia no celular."
        icon={MessagesSquare}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "WhatsApp" }, { label: "Mensagens" }]}
      />
      <MessageTemplatesView />
    </div>
  );
}

"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageHistoryView } from "../components/MessagesViews";

export default function WhatsAppHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        description="Veja o que já foi enviado aos clientes e se deu certo."
        icon={MessagesSquare}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "WhatsApp" }, { label: "Histórico" }]}
      />
      <MessageHistoryView />
    </div>
  );
}

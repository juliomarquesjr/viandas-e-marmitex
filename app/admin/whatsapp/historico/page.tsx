"use client";

import { MessagesSquare } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { MessageHistoryView } from "../components/MessagesViews";

export default function WhatsAppHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de envios"
        description="O que o sistema já enviou sozinho aos clientes e se deu certo. As conversas ficam em Conversas."
        icon={MessagesSquare}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Envios automáticos" }, { label: "Histórico de envios" }]}
      />
      <MessageHistoryView />
    </div>
  );
}

"use client";

import { MessageCircle } from "lucide-react";
import { PageHeader } from "../../components/layout";
import { ConversationsView } from "../components/ConversationsView";

export default function WhatsAppConversationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversas"
        description="As conversas do WhatsApp do estabelecimento com os clientes cadastrados."
        icon={MessageCircle}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "WhatsApp" }, { label: "Conversas" }]}
      />
      <ConversationsView />
    </div>
  );
}

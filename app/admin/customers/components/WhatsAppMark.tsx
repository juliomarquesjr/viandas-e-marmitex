import { MessageCircle } from "lucide-react";

/** Selo pequeno ao lado do telefone: o número também é WhatsApp. */
export function WhatsAppMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center align-middle text-green-600 ${className}`}
      title="Este número é WhatsApp"
      aria-label="Este número é WhatsApp"
      role="img"
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

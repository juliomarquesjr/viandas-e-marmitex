import * as React from "react";
import { parseFormatting, type FormatNode } from "@/lib/messages/format";

function render(nodes: FormatNode[], keyPrefix = ""): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    if (node.type === "text") return <React.Fragment key={key}>{node.text}</React.Fragment>;
    if (node.type === "mono") return <code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.92em]">{node.text}</code>;
    const children = render(node.children, `${key}.`);
    if (node.type === "bold") return <strong key={key}>{children}</strong>;
    if (node.type === "italic") return <em key={key}>{children}</em>;
    return <s key={key}>{children}</s>;
  });
}

/** O texto como o WhatsApp mostra: *negrito*, _itálico_, ~tachado~ e ```mono``` já aplicados. */
export function FormattedText({ text }: { text: string }) {
  return <>{render(parseFormatting(text))}</>;
}

/** Balão de mensagem enviada, com a formatação aplicada. */
export function WhatsAppBubble({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-[#e7ddd3] p-3">
      <div className={`ml-auto max-w-[92%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-relaxed text-slate-900 shadow-sm ${className}`}>
        <FormattedText text={text} />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import type { KanbanCard, KanbanComment } from "../shared/types";
import { RichTextEditor } from "../editor/RichTextEditor";

interface CardModalCommentsProps {
  card: KanbanCard;
  onUpdate: (card: KanbanCard) => void;
}

export function CardModalComments({ card, onUpdate }: CardModalCommentsProps) {
  const { data: session } = useSession();
  const [commentContent, setCommentContent] = useState<object | null>(null);
  const [sending, setSending] = useState(false);
  const [key, setKey] = useState(0); // reset editor

  async function sendComment() {
    if (!commentContent) return;
    setSending(true);
    try {
      const res = await fetch(`/api/kanban/cards/${card.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent }),
      });
      if (res.ok) {
        const comment = await res.json();
        onUpdate({ ...card, comments: [...card.comments, comment] });
        setCommentContent(null);
        setKey((k) => k + 1);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
        Comentários ({card.comments.length})
      </h3>

      {/* Comment list */}
      <div className="space-y-3 mb-4">
        {card.comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {/* New comment input */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
        <RichTextEditor
          key={key}
          placeholder="Escreva um comentário... (use @ para mencionar)"
          onChange={(json) => setCommentContent(json)}
          minHeight={60}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={sendComment}
            disabled={!commentContent || sending}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
            {sending ? "Enviando..." : "Comentar"}
          </button>
        </div>
      </div>
    </section>
  );
}

function CommentItem({ comment }: { comment: KanbanComment }) {
  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }

  return (
    <div className="flex gap-2.5">
      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
        {comment.author.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.author.imageUrl} alt={comment.author.name} className="h-full w-full object-cover" />
        ) : (
          initials(comment.author.name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-white/80">{comment.author.name}</span>
          <span className="text-[10px] text-white/30">
            {format(new Date(comment.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
          </span>
          {comment.isEdited && <span className="text-[10px] text-white/20">(editado)</span>}
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <CommentContent content={comment.content} />
        </div>
      </div>
    </div>
  );
}

function CommentContent({ content }: { content: object }) {
  // Render TipTap JSON as plain text for simplicity
  // In production, use @tiptap/react's generateHTML for proper rendering
  function extractText(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const obj = node as Record<string, unknown>;
    if (obj.type === "text" && typeof obj.text === "string") return obj.text;
    if (obj.type === "mention" && obj.attrs) {
      const attrs = obj.attrs as Record<string, unknown>;
      return `@${attrs.label ?? ""}`;
    }
    if (Array.isArray(obj.content)) {
      return obj.content.map(extractText).join("");
    }
    return "";
  }

  const text = extractText(content);
  return <p className="text-sm text-white/70 whitespace-pre-wrap">{text || "(vazio)"}</p>;
}

"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight,
  Bold, CheckSquare, Code, Heading2, Heading3,
  Highlighter, Italic, Link2, List, ListOrdered,
  Quote, Strikethrough, Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarBtn {
  icon: React.ElementType;
  title: string;
  action: () => void;
  isActive?: () => boolean;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const groups: ToolbarBtn[][] = [
    [
      { icon: Bold, title: "Negrito (Ctrl+B)", action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive("bold") },
      { icon: Italic, title: "Itálico (Ctrl+I)", action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive("italic") },
      { icon: Underline, title: "Sublinhado (Ctrl+U)", action: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive("underline") },
      { icon: Strikethrough, title: "Tachado", action: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive("strike") },
    ],
    [
      { icon: Heading2, title: "Título 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive("heading", { level: 2 }) },
      { icon: Heading3, title: "Título 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive("heading", { level: 3 }) },
    ],
    [
      { icon: List, title: "Lista", action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive("bulletList") },
      { icon: ListOrdered, title: "Lista numerada", action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive("orderedList") },
      { icon: CheckSquare, title: "Checklist", action: () => editor.chain().focus().toggleTaskList().run(), isActive: () => editor.isActive("taskList") },
    ],
    [
      { icon: AlignLeft,   title: "Alinhar esquerda",  action: () => editor.chain().focus().setTextAlign("left").run(),   isActive: () => editor.isActive({ textAlign: "left" }) },
      { icon: AlignCenter, title: "Centralizar",        action: () => editor.chain().focus().setTextAlign("center").run(), isActive: () => editor.isActive({ textAlign: "center" }) },
      { icon: AlignRight,  title: "Alinhar direita",   action: () => editor.chain().focus().setTextAlign("right").run(),  isActive: () => editor.isActive({ textAlign: "right" }) },
    ],
    [
      { icon: Quote, title: "Citação", action: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive("blockquote") },
      { icon: Code,  title: "Código",  action: () => editor.chain().focus().toggleCode().run(),       isActive: () => editor.isActive("code") },
      { icon: Highlighter, title: "Destaque", action: () => editor.chain().focus().toggleHighlight().run(), isActive: () => editor.isActive("highlight") },
    ],
  ];

  return (
    <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-lg bg-white/5 border border-white/10 p-1">
      {groups.map((group, gi) => (
        <div key={gi} className={cn("flex items-center gap-0.5", gi < groups.length - 1 && "pr-1 mr-0.5 border-r border-white/10")}>
          {group.map((btn) => {
            const Icon = btn.icon;
            const active = btn.isActive?.() ?? false;
            return (
              <button
                key={btn.title}
                type="button"
                title={btn.title}
                onClick={btn.action}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  active ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

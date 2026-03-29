"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { MentionExtension } from "./MentionExtension";
import { EditorToolbar } from "./EditorToolbar";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content?: object | null;
  placeholder?: string;
  onChange?: (json: object, text: string) => void;
  onBlur?: (json: object, text: string) => void;
  className?: string;
  editable?: boolean;
  minHeight?: number;
}

export function RichTextEditor({
  content,
  placeholder = "Escreva uma descrição...",
  onChange,
  onBlur,
  className,
  editable = true,
  minHeight = 120,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-400 underline cursor-pointer" } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      MentionExtension,
    ],
    content: content ?? undefined,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON(), editor.getText());
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getJSON(), editor.getText());
    },
  });

  return (
    <div className={cn("tiptap-editor flex flex-col", className)}>
      {editable && editor && <EditorToolbar editor={editor} />}
      <div
        className={cn(
          "flex-1 overflow-y-auto text-white/90 text-sm",
          editable && "cursor-text"
        )}
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

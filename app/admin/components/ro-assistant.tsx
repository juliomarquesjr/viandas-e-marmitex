"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    ChefHat,
    Loader2,
    Send,
    Sparkles,
    X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  rows?: Array<Record<string, unknown>>;
  reason?: string;
}

interface RoAssistantProps {
  variant?: "floating" | "contained";
  defaultOpen?: boolean;
}

// Removido: balões de sugestão

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "init",
  role: "assistant",
  content:
    "Oiê! Eu sou a RO, a cozinheira digital da casa. Pode mandar suas dúvidas que eu mexo nas panelas de dados e trago tudo quentinho, combinado?",
};

function createMessage(partial: Omit<ChatMessage, "id">): ChatMessage {
  return { id: crypto.randomUUID(), ...partial };
}

export default function RoAssistant({ variant = "floating", defaultOpen = false }: RoAssistantProps) {
  const isFloating = variant === "floating";
  const [isOpen, setIsOpen] = useState(() => (isFloating ? defaultOpen : true));
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  const conversationPayload = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }

    const content = input.trim();
    const userMessage = createMessage({ role: "user", content });
    const historyForApi = [...conversationPayload, { role: "user", content }];

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data } = await api.post("/ai/chat", { messages: historyForApi });
      const assistantMessage = createMessage({
        role: "assistant",
        content: data.message ?? "",
        sql: data.sql,
        rows: Array.isArray(data.rows) ? data.rows : undefined,
        reason: data.reason,
      });
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Não consegui falar com a cozinha da RO.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        createMessage({
          role: "assistant",
          content:
            "Ui, o fogão deu uma faisquinha aqui e não consegui puxar os dados. Pode tentar de novo em instantes?",
        }),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Removido: função de clique em sugestão

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(event as any);
      }
    }
  }

  function handleClose() {
    if (!isFloating) return;
    setIsOpen(false);
  }

  const panel = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 40 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        isFloating
          ? "h-full max-h-[calc(100vh-160px)] w-[360px] sm:w-[420px]"
          : "w-full max-w-4xl min-h-[640px]"
      )}
    >
      <motion.div
        className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-60px] left-[-50px] h-48 w-48 rounded-full bg-amber-200/40 blur-3xl"
        animate={{ scale: [1.05, 1.2, 1.05], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, delay: 0.5 }}
      />

      <div className="relative z-10 flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-white">
        <div>
          <p className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-white/60">
            <Sparkles className="h-4 w-4" /> RO no comando
          </p>
          <h2 className="text-lg font-semibold">Cozinha dos Dados</h2>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs"
              >
                <motion.span
                  className="inline-flex items-center gap-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  Pensando...
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          {isFloating && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-white shadow-md transition-all hover:scale-105"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      <CardContent
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-6",
          isFloating && "overflow-y-auto"
        )}
      >
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl bg-white/60 p-4 shadow-inner"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Card className="border-primary/20 bg-white/80 shadow-sm">
              <Textarea
                placeholder="Ex.: Qual foi o total de vendas confirmadas hoje?"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={isLoading}
                className="resize-none border-0 bg-transparent text-sm text-slate-700 focus-visible:ring-0"
              />
            </Card>
            
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isLoading ? "Cozinhando..." : "Enviar mensagem"}
            </Button>
            
            {error && <span className="text-xs text-red-600">{error}</span>}
          </form>
        </div>
      </CardContent>
    </motion.div>
  );

  if (!isFloating) {
    return (
      <div className="relative flex w-full justify-center px-4">
        <div className="flex w-full max-w-5xl items-end justify-center gap-8">
          <RoIllustration mode="contained" />
          {panel}
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-[95] bg-slate-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            <motion.div
              key="panel-wrapper"
              className="fixed bottom-24 right-6 z-[100] flex items-end gap-5"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <RoIllustration key="floating-illustration" mode="floating" />
              {panel}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white shadow-xl shadow-primary/40 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        whileHover={{ rotate: [-2, 2, 0] }}
        whileTap={{ scale: 0.9 }}
      >
        <ChefHat className="h-6 w-6" />
        <span className="sr-only">Abrir assistente RO</span>
      </motion.button>
    </>
  );
}

function RoIllustration({ mode }: { mode: "floating" | "contained" }) {
  const isFloating = mode === "floating";
  const size = isFloating ? 220 : 300;
  const visibilityClass = isFloating ? "hidden sm:flex" : "hidden md:flex";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      className={cn("relative select-none", visibilityClass)}
    >
      <motion.div
        className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl"
        animate={{ opacity: [0.45, 0.7, 0.45], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <Image
        src="/img/ro_ia.png"
        alt="Ilustração da RO, nossa cozinheira digital"
        width={size}
        height={size}
        sizes={isFloating ? "(max-width: 768px) 0px, 220px" : "(max-width: 1024px) 220px, 300px"}
        className="relative z-10 drop-shadow-[0_18px_30px_rgba(15,23,42,0.25)]"
        priority={mode === "contained"}
      />
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const hasData = Array.isArray(message.rows) && message.rows.length > 0;
  const firstRowKeys = hasData ? Object.keys(message.rows![0] ?? {}) : [];

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all",
          isUser
            ? "border-primary/30 bg-primary text-white"
            : "border-primary/10 bg-white text-slate-600"
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        {message.sql && (
          <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 font-mono text-[11px] text-primary">
            {message.sql}
          </div>
        )}
        {message.reason && (
          <div className="mt-2 text-[11px] italic text-primary/70">
            Motivo da consulta: {message.reason}
          </div>
        )}
        {hasData && (
          <div className="mt-3 overflow-hidden rounded-xl border border-primary/10 bg-white">
            <table className="min-w-full text-left text-[11px]">
              <thead className="bg-primary/5 text-primary">
                <tr>
                  {firstRowKeys.map((header) => (
                    <th key={header} className="px-3 py-2 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {message.rows!.slice(0, 15).map((row, index) => (
                  <tr key={index} className="border-t border-primary/10">
                    {firstRowKeys.map((header) => (
                      <td key={header} className="px-3 py-2">
                        {formatCellValue((row as Record<string, unknown>)[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {message.rows!.length > 15 && (
              <div className="bg-primary/5 px-3 py-2 text-[10px] text-primary/70">
                Mostrando 15 de {message.rows!.length} linhas.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

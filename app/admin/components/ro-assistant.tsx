"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChefHat, Copy, Loader2, RotateCcw, Send, Settings, Square, SquarePen, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoBloco, RoErro, RoResposta } from "@/lib/ai/ro/types";
import { cn } from "@/lib/utils";
import { Blocos } from "./ro/blocos";
import { Markdown } from "./ro/markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  contexto?: string;
  blocos?: RoBloco[];
  erro?: RoErro;
}

interface RoAssistantProps {
  /** Sobe o botão para não cobrir o campo de mensagem de telas que ocupam a página inteira (Conversas). */
  raised?: boolean;
  defaultOpen?: boolean;
}

interface Config {
  ligada: boolean;
  mostrarBotao: boolean;
}

const MAX_SALVAS = 40;
const TEMPO_MAXIMO_MS = 60_000;

const SUGESTOES: { grupo: string; itens: { rotulo: string; pergunta?: string; preencher?: string }[] }[] = [
  {
    grupo: "Clientes",
    itens: [
      { rotulo: "Procurar um cliente", preencher: "Procure o cliente " },
      { rotulo: "Quem está devendo?", pergunta: "Quem está devendo?" },
      { rotulo: "Quem sumiu há 30 dias?", pergunta: "Quem sumiu há 30 dias?" },
    ],
  },
  {
    grupo: "Vendas e dinheiro",
    itens: [
      { rotulo: "Vendas de hoje", pergunta: "Vendas de hoje" },
      { rotulo: "Vendas da semana", pergunta: "Vendas desta semana" },
      { rotulo: "Mais vendidos do mês", pergunta: "Produtos mais vendidos do mês" },
      { rotulo: "Lucro do mês", pergunta: "Lucro do mês" },
    ],
  },
  {
    grupo: "No dia a dia",
    itens: [
      { rotulo: "Pedidos em aberto", pergunta: "Pedidos em aberto" },
      { rotulo: "Cardápio de hoje", pergunta: "Cardápio de hoje" },
      { rotulo: "WhatsApp sem ler", pergunta: "Mensagens do WhatsApp não lidas" },
    ],
  },
];

const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));
const hora = (at: number) => new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function lerSalvas(chave: string): ChatMessage[] {
  try {
    const bruto = window.localStorage.getItem(chave);
    const lista = bruto ? (JSON.parse(bruto) as ChatMessage[]) : [];
    return Array.isArray(lista) ? lista.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")).slice(-MAX_SALVAS) : [];
  } catch {
    return [];
  }
}

function guardar(chave: string, mensagens: ChatMessage[]) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(mensagens.slice(-MAX_SALVAS)));
  } catch {
    /* sem armazenamento: a conversa vale só até recarregar */
  }
}

export default function RoAssistant({ raised = false, defaultOpen = false }: RoAssistantProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const reduzir = useReducedMotion();

  const [config, setConfig] = useState<Config>({ ligada: true, mostrarBotao: true });
  const [aberto, setAberto] = useState(defaultOpen);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [copiado, setCopiado] = useState<string | null>(null);

  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const aborto = useRef<AbortController | null>(null);
  const chaveSalva = userId ? `ro:chat:v1:${userId}` : null;
  const carregouSalvas = useRef(false);

  // configurações (ligada, botão): leem de novo quando a tela de configurações muda algo
  const lerConfig = useCallback(() => {
    fetch("/api/admin/ro/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Config | null) => c && setConfig({ ligada: c.ligada !== false, mostrarBotao: c.mostrarBotao !== false }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    lerConfig();
    window.addEventListener("ro-settings-changed", lerConfig);
    return () => window.removeEventListener("ro-settings-changed", lerConfig);
  }, [lerConfig]);

  // a conversa volta como estava (por pessoa, neste navegador)
  useEffect(() => {
    if (!chaveSalva || carregouSalvas.current) return;
    carregouSalvas.current = true;
    setMensagens(lerSalvas(chaveSalva));
  }, [chaveSalva]);
  useEffect(() => {
    if (chaveSalva && carregouSalvas.current) guardar(chaveSalva, mensagens);
  }, [mensagens, chaveSalva]);

  // pergunta nova: vai ao fim. Resposta nova: mostra o começo dela (respostas longas se leem de cima para baixo)
  useEffect(() => {
    if (!aberto) return;
    const ultima = mensagens[mensagens.length - 1];
    const comportamento = reduzir ? "auto" : "smooth";
    if (ultima?.role === "assistant" && !carregando) {
      document.getElementById(`ro-msg-${ultima.id}`)?.scrollIntoView({ behavior: comportamento, block: "start" });
    } else {
      fim.current?.scrollIntoView({ behavior: comportamento, block: "end" });
    }
  }, [mensagens, carregando, aberto, reduzir]);

  // o campo cresce com o texto, até cinco linhas
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [texto, aberto]);

  // contador de espera ("está demorando")
  useEffect(() => {
    if (!carregando) return;
    setSegundos(0);
    const t = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [carregando]);

  const abrir = useCallback(() => {
    setAberto(true);
    window.setTimeout(() => campo.current?.focus(), 250);
  }, []);
  const fechar = useCallback(() => {
    setAberto(false);
    botao.current?.focus();
  }, []);

  const enviar = useCallback(
    async (bruto: string, repetindo = false) => {
      const pergunta = bruto.trim();
      if (!pergunta || carregando) return;
      const historico = mensagens.filter((m) => !m.erro);
      const nova: ChatMessage = { id: novoId(), role: "user", content: pergunta, at: Date.now() };
      setMensagens((prev) => (repetindo ? prev : [...prev, nova]));
      setTexto("");
      setCarregando(true);

      const controle = new AbortController();
      aborto.current = controle;
      const limite = window.setTimeout(() => controle.abort("tempo"), TEMPO_MAXIMO_MS);
      const payload = (repetindo ? historico : [...historico, nova]).slice(-12).map((m) => ({ role: m.role, content: m.content, contexto: m.contexto }));

      try {
        const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: payload }), signal: controle.signal });
        const corpo = (await res.json().catch(() => null)) as (RoResposta & { erro?: RoErro }) | null;
        if (!res.ok || !corpo || corpo.erro) {
          const erro: RoErro = corpo?.erro ?? { codigo: "interno", mensagem: "Não consegui consultar agora. Tente de novo em instantes." };
          setMensagens((prev) => [...prev, { id: novoId(), role: "assistant", content: erro.mensagem, at: Date.now(), erro }]);
        } else {
          setMensagens((prev) => [...prev, { id: novoId(), role: "assistant", content: corpo.mensagem, at: Date.now(), blocos: corpo.blocos, contexto: corpo.contexto }]);
        }
      } catch (error) {
        if (controle.signal.aborted && controle.signal.reason !== "tempo") {
          // a pessoa parou: não entra mensagem de erro
        } else {
          const erro: RoErro = controle.signal.aborted
            ? { codigo: "ia", mensagem: "A resposta demorou demais. Tente de novo; se continuar, a inteligência pode estar lenta." }
            : { codigo: "interno", mensagem: "Sem conexão com o sistema. Confira a internet e tente de novo." };
          setMensagens((prev) => [...prev, { id: novoId(), role: "assistant", content: erro.mensagem, at: Date.now(), erro }]);
        }
        void error;
      } finally {
        window.clearTimeout(limite);
        aborto.current = null;
        setCarregando(false);
        window.setTimeout(() => campo.current?.focus(), 50);
      }
    },
    [carregando, mensagens],
  );

  const parar = () => aborto.current?.abort("usuario");

  const tentarDeNovo = (erroId: string) => {
    const indice = mensagens.findIndex((m) => m.id === erroId);
    const pergunta = [...mensagens.slice(0, indice)].reverse().find((m) => m.role === "user");
    if (!pergunta) return;
    // a pergunta já está na tela: tira só o erro e pergunta de novo, sem repetir a mensagem
    setMensagens((prev) => prev.filter((m) => m.id !== erroId));
    void enviar(pergunta.content, true);
  };

  const novaConversa = () => {
    aborto.current?.abort("usuario");
    setMensagens([]);
    setTexto("");
    if (chaveSalva) {
      try {
        window.localStorage.removeItem(chaveSalva);
      } catch {
        /* ignora */
      }
    }
    campo.current?.focus();
  };

  const copiar = async (m: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(m.content.replace(/\*\*/g, ""));
      setCopiado(m.id);
      window.setTimeout(() => setCopiado((id) => (id === m.id ? null : id)), 1800);
    } catch {
      /* sem permissão para copiar: o texto continua selecionável */
    }
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // no celular o Enter quebra a linha (a tecla de enviar é o botão); no computador o Enter envia
    const toque = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !toque) {
      e.preventDefault();
      void enviar(texto);
    }
  };

  if (!config.ligada) return null;

  const vazio = mensagens.length === 0;
  const dica = segundos >= 20 ? "Está demorando mais que o normal…" : segundos >= 6 ? "Ainda procurando…" : "Procurando a resposta…";

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <motion.aside
            key="painel"
            role="dialog"
            aria-label="Assistente RO"
            onKeyDown={(e) => e.key === "Escape" && fechar()}
            initial={reduzir ? { opacity: 0 } : { opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[color:var(--card)] text-[color:var(--foreground)] shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:border-l md:border-[color:var(--border)]"
            style={{ height: "100dvh" }}
          >
            <header className="flex h-14 flex-none items-center gap-2 border-b border-[color:var(--border)] pl-4 pr-2" style={{ paddingTop: "env(safe-area-inset-top, 0px)", boxSizing: "content-box" }}>
              <span className="relative h-9 w-9 flex-none overflow-hidden rounded-full bg-primary/10">
                <Image src="/img/ro_ia.png" alt="" width={36} height={36} className="h-full w-full object-cover object-top" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">RO</p>
                <p className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                  <span className={cn("h-2 w-2 rounded-full", carregando ? "animate-pulse bg-amber-500" : "bg-emerald-500")} aria-hidden="true" />
                  {carregando ? "Procurando…" : "Pronta para ajudar"}
                </p>
              </div>
              <button type="button" onClick={novaConversa} disabled={vazio && !texto} aria-label="Nova conversa" title="Nova conversa" className="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40">
                <SquarePen className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link href="/admin/settings?tab=assistente-ro" onClick={fechar} aria-label="Configurações da RO" title="Configurações da RO" className="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button type="button" onClick={fechar} aria-label="Fechar a RO" title="Fechar" className="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div role="log" aria-live="polite" aria-label="Conversa com a RO" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[color:var(--muted)]/40 px-4 py-4">
              {vazio && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                    <p className="text-base font-semibold">Oi! Eu sou a RO.</p>
                    <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted-foreground)]">Pergunto ao sistema por você: clientes, ficha, vendas, pedidos. <b className="font-semibold text-[color:var(--foreground)]">Não precisa saber o nome inteiro</b>: escreva o que lembrar do nome ou o telefone, que eu procuro.</p>
                  </div>
                  {SUGESTOES.map((g) => (
                    <section key={g.grupo} aria-label={g.grupo}>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">{g.grupo}</h3>
                      <div className="flex flex-wrap gap-2">
                        {g.itens.map((s) => (
                          <button
                            key={s.rotulo}
                            type="button"
                            onClick={() => (s.pergunta ? void enviar(s.pergunta) : (setTexto(s.preencher ?? ""), campo.current?.focus()))}
                            className="min-h-10 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {s.rotulo}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {mensagens.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex flex-col items-end gap-1">
                    <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
                    <span className="px-1 text-[11px] text-[color:var(--muted-foreground)]">{hora(m.at)}</span>
                  </div>
                ) : (
                  <div key={m.id} id={`ro-msg-${m.id}`} className="flex scroll-mt-3 flex-col items-start gap-1">
                    <div className={cn("w-full max-w-[96%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm", m.erro ? "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100" : "border-[color:var(--border)] bg-[color:var(--card)]")}>
                      <Markdown texto={m.content} />
                      {m.blocos && m.blocos.length > 0 && <Blocos blocos={m.blocos} onPerguntar={(p) => void enviar(p)} />}
                      {m.erro && m.erro.codigo !== "desligada" && m.erro.codigo !== "permissao" && m.erro.codigo !== "login" && (
                        <button type="button" onClick={() => tentarDeNovo(m.id)} disabled={carregando} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:bg-transparent dark:text-rose-100">
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Tentar de novo
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-1 text-[11px] text-[color:var(--muted-foreground)]">
                      <span>{hora(m.at)}</span>
                      {!m.erro && (
                        <button type="button" onClick={() => void copiar(m)} className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 font-semibold hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Copiar a resposta">
                          {copiado === m.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                          {copiado === m.id ? "Copiado" : "Copiar"}
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}

              {carregando && (
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]" role="status">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  {dica}
                </div>
              )}
              <div ref={fim} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enviar(texto);
              }}
              className="flex flex-none items-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--card)] p-3"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <label htmlFor="ro-campo" className="sr-only">
                Pergunte à RO
              </label>
              <textarea
                id="ro-campo"
                ref={campo}
                rows={1}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={aoTeclar}
                placeholder="Nome do cliente, vendas, ficha…"
                enterKeyHint="send"
                className="block max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--card)] px-3.5 py-2.5 text-base leading-5 outline-none placeholder:text-[color:var(--muted-foreground)] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary md:text-sm"
              />
              {carregando ? (
                <button type="button" onClick={parar} aria-label="Parar" title="Parar" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--card)] hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                </button>
              ) : (
                <button type="submit" disabled={!texto.trim()} aria-label="Enviar" title="Enviar" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40">
                  {carregando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                </button>
              )}
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      {!aberto && config.mostrarBotao && (
        <motion.button
          ref={botao}
          type="button"
          onClick={abrir}
          aria-label="Abrir a RO, assistente do sistema"
          className={`fixed right-6 z-[90] ${raised ? "bottom-52 lg:bottom-24" : "bottom-6"} flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white shadow-xl shadow-primary/40 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
          whileTap={{ scale: 0.92 }}
        >
          <ChefHat className="h-6 w-6" aria-hidden="true" />
        </motion.button>
      )}
    </>
  );
}

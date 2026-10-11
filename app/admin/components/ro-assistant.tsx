"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChefHat, Copy, RotateCcw, Send, Settings, Square, SquarePen, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoBloco, RoErro, RoResposta } from "@/lib/ai/ro/types";
import { cn } from "@/lib/utils";
import { Blocos, textoDosBlocos } from "./ro/blocos";
import { RoErrorBoundary } from "./ro/error-boundary";
import { Markdown } from "./ro/markdown";
import { semId, tempoCurto, textoSimples } from "./ro/texto";
import { RO_ABRIR, useRoConfig } from "./ro/use-ro-config";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  contexto?: string;
  blocos?: RoBloco[];
  erro?: RoErro;
  /** A pessoa tocou em "Parar": mostra "Parei" e oferece tentar de novo. */
  parada?: boolean;
}

interface RoAssistantProps {
  /** Sem botão flutuante (telas que ocupam tudo, como o PDV): a gaveta abre só pelo botão do cabeçalho. */
  semBotaoFlutuante?: boolean;
  /** Sobe o botão para não cobrir o campo de mensagem de telas que ocupam a página inteira (Conversas). */
  raised?: boolean;
  defaultOpen?: boolean;
}

const MAX_SALVAS = 40;
const TEMPO_MAXIMO_MS = 60_000;
/** Espera acima disto (em segundos) é longa demais para um botão com contagem: fica só o aviso. */
const ESPERA_MAXIMA_DO_BOTAO = 300;

const SUGESTOES: { grupo: string; itens: { rotulo: string; pergunta?: string; dica?: string }[] }[] = [
  {
    grupo: "Clientes",
    itens: [
      { rotulo: "Procurar um cliente", dica: "Digite o nome ou o telefone" },
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

const ERRO_PADRAO: RoErro = { codigo: "interno", mensagem: "Não consegui consultar agora. Tente de novo em instantes." };

export default function RoAssistant(props: RoAssistantProps) {
  // um erro dentro da RO nunca derruba o resto do admin
  return (
    <RoErrorBoundary>
      <RoPainel {...props} />
    </RoErrorBoundary>
  );
}

function RoPainel({ raised = false, semBotaoFlutuante = false, defaultOpen = false }: RoAssistantProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const reduzir = useReducedMotion();

  const config = useRoConfig() ?? { ligada: true, posicao: "flutuante" as const };
  const [aberto, setAberto] = useState(defaultOpen);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [texto, setTexto] = useState("");
  const [dicaDoCampo, setDicaDoCampo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [celular, setCelular] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const fim = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const aborto = useRef<AbortController | null>(null);
  const quemAbriu = useRef<HTMLElement | null>(null);
  const devolverFoco = useRef(false);
  const chaveSalva = userId ? `ro:chat:v1:${userId}` : null;
  const carregouSalvas = useRef(false);

  // celular = tela cheia: aí a RO é uma janela só (o resto da página fica de fora)
  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767.98px)");
    const ler = () => setCelular(consulta.matches);
    ler();
    consulta.addEventListener("change", ler);
    return () => consulta.removeEventListener("change", ler);
  }, []);

  // a conversa volta como estava (por pessoa, neste navegador)
  useEffect(() => {
    if (!chaveSalva || carregouSalvas.current) return;
    carregouSalvas.current = true;
    setMensagens(lerSalvas(chaveSalva));
  }, [chaveSalva]);
  useEffect(() => {
    if (chaveSalva && carregouSalvas.current) guardar(chaveSalva, mensagens);
  }, [mensagens, chaveSalva]);

  // pergunta nova: vai ao fim. Resposta nova: mostra o começo dela. Tela vazia: abre no topo
  useEffect(() => {
    if (!aberto) return;
    const comportamento = reduzir ? "auto" : "smooth";
    if (mensagens.length === 0) {
      lista.current?.scrollTo({ top: 0 });
      return;
    }
    const ultima = mensagens[mensagens.length - 1];
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

  // relógio dos avisos de espera ("Tente de novo em 2 minutos")
  const temEspera = mensagens.some((m) => m.erro?.tentarEm && m.at + m.erro.tentarEm * 1000 > agora);
  useEffect(() => {
    if (!temEspera) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [temEspera]);

  const abrir = useCallback(() => {
    const ativo = document.activeElement;
    quemAbriu.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
    setAberto(true);
    window.setTimeout(() => campo.current?.focus(), 250);
  }, []);
  const fechar = useCallback((opcoes?: { devolverFoco?: boolean }) => {
    devolverFoco.current = opcoes?.devolverFoco !== false;
    setAberto(false);
  }, []);
  /** Ao abrir outra tela (cadastro, WhatsApp) a RO sai da frente e o foco vai para a página nova. */
  const aoNavegar = useCallback(() => fechar({ devolverFoco: false }), [fechar]);

  // ao fechar, o foco volta ao botão que abriu (o flutuante só existe depois de fechar, por isso o efeito)
  useEffect(() => {
    if (aberto || !devolverFoco.current) return;
    devolverFoco.current = false;
    const alvo = quemAbriu.current?.isConnected ? quemAbriu.current : (botao.current ?? document.querySelector<HTMLElement>("[data-ro-botao]"));
    window.requestAnimationFrame(() => alvo?.focus());
  }, [aberto]);

  // os botões do cabeçalho (admin e PDV) abrem a gaveta por este evento
  useEffect(() => {
    window.addEventListener(RO_ABRIR, abrir);
    return () => window.removeEventListener(RO_ABRIR, abrir);
  }, [abrir]);

  // Esc fecha mesmo com o foco fora da RO, sem atrapalhar menus e janelas da página
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const outro = document.querySelector('[role="menu"][data-state="open"], [role="listbox"][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"]');
      if (outro && !painel.current?.contains(outro)) return;
      fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  // no celular a RO ocupa a tela toda: o resto da página não recebe foco nem é lido por leitor de tela
  useEffect(() => {
    if (!aberto || !celular || !painel.current) return;
    const isolados: Element[] = [];
    let no: Element = painel.current;
    while (no.parentElement && no !== document.body) {
      for (const irmao of Array.from(no.parentElement.children)) {
        if (irmao !== no && !irmao.hasAttribute("inert") && !["SCRIPT", "STYLE", "LINK"].includes(irmao.tagName)) {
          irmao.setAttribute("inert", "");
          isolados.push(irmao);
        }
      }
      no = no.parentElement;
    }
    return () => isolados.forEach((el) => el.removeAttribute("inert"));
  }, [aberto, celular]);

  const enviar = useCallback(
    async (bruto: string, repetindo = false) => {
      const pergunta = bruto.trim();
      if (!pergunta || carregando) return;
      const estavaDigitando = document.activeElement === campo.current;
      const historico = mensagens.filter((m) => !m.erro && !m.parada);
      const nova: ChatMessage = { id: novoId(), role: "user", content: pergunta, at: Date.now() };
      setMensagens((prev) => (repetindo ? prev : [...prev, nova]));
      setTexto("");
      setDicaDoCampo(null);
      setCarregando(true);

      const controle = new AbortController();
      aborto.current = controle;
      const limite = window.setTimeout(() => controle.abort("tempo"), TEMPO_MAXIMO_MS);
      const payload = (repetindo ? historico : [...historico, nova]).slice(-12).map((m) => ({ role: m.role, content: m.content, contexto: m.contexto }));
      const acrescentar = (m: Omit<ChatMessage, "id" | "at">) => setMensagens((prev) => [...prev, { id: novoId(), at: Date.now(), ...m }]);

      try {
        const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: payload }), signal: controle.signal });
        const corpo = (await res.json().catch(() => null)) as (Partial<RoResposta> & { erro?: RoErro }) | null;
        const mensagemValida = corpo && typeof corpo.mensagem === "string" && corpo.mensagem.trim() !== "";
        if (!res.ok || !corpo || corpo.erro || !mensagemValida) {
          const erro: RoErro = corpo?.erro && typeof corpo.erro.mensagem === "string" ? corpo.erro : ERRO_PADRAO;
          acrescentar({ role: "assistant", content: erro.mensagem, erro });
        } else {
          acrescentar({ role: "assistant", content: corpo.mensagem as string, blocos: Array.isArray(corpo.blocos) ? corpo.blocos : [], contexto: typeof corpo.contexto === "string" ? corpo.contexto : undefined });
        }
      } catch {
        if (controle.signal.aborted && controle.signal.reason === "usuario") {
          acrescentar({ role: "assistant", content: "Parei. Quer tentar de novo?", parada: true });
        } else if (controle.signal.aborted && controle.signal.reason === "nova") {
          // conversa nova: nada a mostrar
        } else {
          const erro: RoErro = controle.signal.aborted
            ? { codigo: "ocupada", mensagem: "Está demorando muito. Toque em Tentar de novo." }
            : { codigo: "interno", mensagem: "Sem conexão com o sistema. Confira a internet e tente de novo." };
          acrescentar({ role: "assistant", content: erro.mensagem, erro });
        }
      } finally {
        window.clearTimeout(limite);
        aborto.current = null;
        setCarregando(false);
        // no celular, devolver o foco ao campo reabre o teclado em cima da resposta: só se a pessoa estava digitando
        const toque = window.matchMedia("(pointer: coarse)").matches;
        if (!toque || estavaDigitando) window.setTimeout(() => campo.current?.focus(), 50);
      }
    },
    [carregando, mensagens],
  );

  const parar = () => aborto.current?.abort("usuario");

  const tentarDeNovo = (erroId: string) => {
    const indice = mensagens.findIndex((m) => m.id === erroId);
    const pergunta = [...mensagens.slice(0, indice)].reverse().find((m) => m.role === "user");
    if (!pergunta) return;
    // a pergunta já está na tela: tira só o aviso e pergunta de novo, sem repetir a mensagem
    setMensagens((prev) => prev.filter((m) => m.id !== erroId));
    void enviar(pergunta.content, true);
  };

  const novaConversa = () => {
    aborto.current?.abort("nova");
    setMensagens([]);
    setTexto("");
    setDicaDoCampo(null);
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
      const completo = [m.content, textoDosBlocos(m.blocos)].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(textoSimples(completo));
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

  /** Botão (ou aviso) de tentar de novo, de acordo com o tipo de problema. */
  const novaTentativa = (m: ChatMessage) => {
    if (m.parada) return { mostrar: true, restante: 0, texto: "Tentar de novo" };
    const erro = m.erro;
    if (!erro || ["desligada", "permissao", "login"].includes(erro.codigo)) return { mostrar: false, restante: 0, texto: "" };
    if (erro.codigo === "limite" && !erro.tentarEm) return { mostrar: false, restante: 0, texto: "" };
    if (erro.tentarEm && erro.tentarEm > ESPERA_MAXIMA_DO_BOTAO) return { mostrar: false, restante: 0, texto: "" };
    const restante = erro.tentarEm ? Math.max(0, Math.ceil((m.at + erro.tentarEm * 1000 - agora) / 1000)) : 0;
    return { mostrar: true, restante, texto: restante > 0 ? `Tente de novo em ${tempoCurto(restante)}` : "Tentar de novo" };
  };

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <motion.aside
            ref={painel}
            key="painel"
            role="dialog"
            aria-modal={celular ? "true" : undefined}
            aria-label="Assistente RO"
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
                  <span className={cn("h-2 w-2 flex-none rounded-full", carregando ? "animate-pulse bg-amber-500" : "bg-emerald-500")} aria-hidden="true" />
                  <span className="truncate">{carregando ? "Procurando…" : "Pronta para ajudar"}</span>
                </p>
              </div>
              <button type="button" onClick={novaConversa} disabled={vazio && !texto} aria-label="Nova conversa" title="Nova conversa" className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40">
                <SquarePen className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link href="/admin/settings?tab=assistente-ro" onClick={aoNavegar} aria-label="Configurações da RO" title="Configurações da RO" className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button type="button" onClick={() => fechar()} aria-label="Fechar a RO" title="Fechar" className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div ref={lista} role="log" aria-live="polite" aria-label="Conversa com a RO" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[color:var(--muted)]/40 px-4 py-4">
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
                            onClick={() => {
                              if (s.pergunta) void enviar(s.pergunta);
                              else {
                                setTexto("");
                                setDicaDoCampo(s.dica ?? null);
                                campo.current?.focus();
                              }
                            }}
                            className="min-h-11 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {s.rotulo}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {mensagens.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex flex-col items-end gap-1">
                      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground dark:bg-blue-600 dark:text-white">{semId(m.content)}</div>
                      <span className="px-1 text-[11px] text-[color:var(--muted-foreground)]">{hora(m.at)}</span>
                    </div>
                  );
                }
                const tentativa = novaTentativa(m);
                return (
                  <div key={m.id} id={`ro-msg-${m.id}`} className="flex scroll-mt-3 flex-col items-start gap-1">
                    <div className={cn("w-full max-w-[96%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm", m.erro ? "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100" : "border-[color:var(--border)] bg-[color:var(--card)]")}>
                      <Markdown texto={m.content} />
                      {m.blocos && m.blocos.length > 0 && <Blocos blocos={m.blocos} onPerguntar={(p) => void enviar(p)} onNavegar={aoNavegar} />}
                      {tentativa.mostrar && (
                        <button
                          type="button"
                          onClick={() => tentarDeNovo(m.id)}
                          disabled={carregando || tentativa.restante > 0}
                          className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:border-rose-800 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-950"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          {tentativa.texto}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-1 text-[11px] text-[color:var(--muted-foreground)]">
                      <span>{hora(m.at)}</span>
                      {!m.erro && !m.parada && (
                        <button type="button" onClick={() => void copiar(m)} className="inline-flex min-h-11 items-center gap-1 rounded px-3 font-semibold hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-8 md:px-1.5" aria-label="Copiar a resposta">
                          {copiado === m.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                          {copiado === m.id ? "Copiado" : "Copiar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

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
                placeholder={dicaDoCampo ?? (celular ? "Escreva aqui…" : "Nome do cliente, vendas, ficha…")}
                enterKeyHint="send"
                className="block max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--card)] px-3.5 py-2.5 text-base leading-5 outline-none placeholder:text-[color:var(--muted-foreground)] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary lg:text-sm"
              />
              {carregando ? (
                <button type="button" onClick={parar} aria-label="Parar a busca" title="Parar a busca" className="flex h-11 flex-none items-center justify-center gap-2 rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--card)] px-3 text-sm font-semibold hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  Parar
                </button>
              ) : (
                <button type="submit" disabled={!texto.trim()} aria-label="Enviar" title="Enviar" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40">
                  <Send className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      {!aberto && !semBotaoFlutuante && config.posicao === "flutuante" && (
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

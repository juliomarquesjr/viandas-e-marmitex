"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { MENSAGEM_LIMITE_INVALIDO, RO_LIMITE_DIARIO, type RoConfiguracoes } from "@/lib/ai/ro/settings-tipos";
import { AlertCircle, CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Estado {
  chave: boolean;
  modelos: { nome: string; descansaAte: string | null; indisponivel: boolean }[];
}

interface ResultadoDoTeste {
  ok: boolean;
  mensagem: string;
  detalhes?: string[];
}

const PADRAO: RoConfiguracoes = { ligada: true, tom: "divertida", limiteDiario: 150, posicao: "flutuante", mostrarBotao: true };

function Interruptor({ ligado, onChange, rotulo, descricao, disabled }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; descricao: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4 lg:px-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{rotulo}</p>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={rotulo}
        disabled={disabled}
        onClick={() => onChange(!ligado)}
        className={`relative mt-0.5 h-7 w-12 flex-none rounded-full transition-colors before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${ligado ? "bg-primary" : "bg-slate-400 dark:bg-slate-500"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** Aba "Assistente RO": cada ajuste salva na hora. Só administrador (a API recusa os outros). */
export function RoTab() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<RoConfiguracoes | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDoTeste | null>(null);
  const [erroDoLimite, setErroDoLimite] = useState<string | null>(null);
  const [limite, setLimite] = useState("150");

  const carregar = useCallback(async () => {
    const [c, e] = await Promise.all([fetch("/api/admin/ro/settings", { cache: "no-store" }), fetch("/api/admin/ro/status", { cache: "no-store" })]);
    if (c.ok) {
      const dados = (await c.json()) as RoConfiguracoes;
      setConfig(dados);
      setLimite(String(dados.limiteDiario));
    } else setConfig(PADRAO);
    if (e.ok) setEstado((await e.json()) as Estado);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async (parcial: Partial<RoConfiguracoes>) => {
    if (!config) return;
    const anterior = config;
    setConfig({ ...config, ...parcial });
    setSalvando(true);
    const res = await fetch("/api/admin/ro/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parcial) });
    setSalvando(false);
    if (res.ok) {
      const salvo = (await res.json()) as RoConfiguracoes;
      setConfig(salvo);
      setLimite(String(salvo.limiteDiario));
      showToast("Ajuste salvo", "success");
      window.dispatchEvent(new Event("ro-settings-changed"));
    } else {
      setConfig(anterior);
      setLimite(String(anterior.limiteDiario));
      const motivo = (await res.json().catch(() => null)) as { error?: string } | null;
      showToast(motivo?.error ?? "Não foi possível salvar. Tente de novo.", "error");
    }
  };

  const salvarLimite = () => {
    const n = Number(limite);
    if (limite.trim() === "" || !Number.isInteger(n) || n < RO_LIMITE_DIARIO.MIN || n > RO_LIMITE_DIARIO.MAX) {
      setErroDoLimite(MENSAGEM_LIMITE_INVALIDO);
      return;
    }
    setErroDoLimite(null);
    void salvar({ limiteDiario: n });
  };

  const testar = async () => {
    setTestando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/admin/ro/status", { method: "POST" });
      setResultado(res.ok ? ((await res.json()) as ResultadoDoTeste) : { ok: false, mensagem: "Não foi possível testar agora." });
    } catch {
      setResultado({ ok: false, mensagem: "Não foi possível testar agora. Confira a internet." });
    }
    setTestando(false);
    void carregar();
  };

  if (!config) return <div className="flex items-center gap-2 px-8 py-10 text-sm text-[color:var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>;

  const modelos = estado?.modelos ?? [];
  const situacao = ((): { ok: boolean; texto: string } => {
    if (!estado?.chave) return { ok: false, texto: "As perguntas livres ainda não foram ligadas neste sistema. As perguntas simples funcionam normalmente." };
    const vivos = modelos.filter((m) => !m.indisponivel);
    if (vivos.length === 0) return { ok: false, texto: "Os modelos configurados não existem mais. Peça para quem cuida do sistema atualizar a lista." };
    if (vivos.every((m) => m.descansaAte)) {
      const volta = vivos.map((m) => new Date(m.descansaAte as string).getTime()).sort((a, b) => a - b)[0];
      return { ok: false, texto: `A RO está descansando: o limite gratuito de hoje acabou. Volta por volta de ${new Date(volta).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. As perguntas simples continuam funcionando.` };
    }
    if (modelos.some((m) => m.indisponivel)) return { ok: true, texto: "Nenhum limite atingido, mas um dos modelos de reserva não existe mais. Veja os detalhes." };
    return { ok: true, texto: "Nenhum limite atingido agora. Toque em “Testar agora” para conferir." };
  })();

  return (
    <div className="divide-y divide-[color:var(--border)]">
      <Interruptor ligado={config.ligada} onChange={(v) => void salvar({ ligada: v })} disabled={salvando} rotulo="Assistente RO ligado" descricao="Desligada, a RO some do sistema e a API recusa as perguntas." />
      <div className="px-4 py-4 lg:px-8">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Onde fica o botão da RO</p>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">Escolha onde as pessoas encontram a RO. No cabeçalho, ela fica ao lado do sino, no admin e no PDV.</p>
        <div role="radiogroup" aria-label="Onde fica o botão da RO" className="mt-3 grid gap-2 sm:grid-cols-3">
          {([
            ["flutuante", "Botão flutuante", "No canto da tela, em todas as telas do admin"],
            ["cabecalho", "No cabeçalho", "Ao lado do sino, no admin e no PDV"],
            ["nenhum", "Escondido", "Sem botão. A RO continua ligada"],
          ] as const).map(([valor, nome, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={config.posicao === valor}
              disabled={salvando || !config.ligada}
              onClick={() => void salvar({ posicao: valor })}
              className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${config.posicao === valor ? "border-primary bg-primary/5" : "border-[color:var(--border)] hover:bg-[color:var(--muted)]"}`}
            >
              <span className="block text-sm font-semibold text-[color:var(--foreground)]">{nome}</span>
              <span className="block text-xs text-[color:var(--muted-foreground)]">{texto}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Jeito de falar</p>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">A mesma informação, com ou sem o toque de cozinha.</p>
        <div role="radiogroup" aria-label="Jeito de falar" className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ["divertida", "Divertida", "Um toque leve de humor de cozinha"],
            ["direta", "Direta", "Só a informação, sem enfeite"],
          ] as const).map(([valor, nome, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={config.tom === valor}
              disabled={salvando || !config.ligada}
              onClick={() => void salvar({ tom: valor })}
              className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${config.tom === valor ? "border-primary bg-primary/5" : "border-[color:var(--border)] hover:bg-[color:var(--muted)]"}`}
            >
              <span className="block text-sm font-semibold text-[color:var(--foreground)]">{nome}</span>
              <span className="block text-xs text-[color:var(--muted-foreground)]">{texto}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8">
        <label htmlFor="ro-limite" className="text-sm font-semibold text-[color:var(--foreground)]">Perguntas por dia, por pessoa</label>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">De {RO_LIMITE_DIARIO.MIN} a {RO_LIMITE_DIARIO.MAX}. Evita gastar o limite gratuito do serviço que entende as perguntas livres.</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            id="ro-limite"
            type="number"
            inputMode="numeric"
            min={RO_LIMITE_DIARIO.MIN}
            max={RO_LIMITE_DIARIO.MAX}
            value={limite}
            disabled={!config.ligada}
            aria-invalid={erroDoLimite ? true : undefined}
            aria-describedby={erroDoLimite ? "ro-limite-erro" : undefined}
            onChange={(e) => {
              setLimite(e.target.value);
              setErroDoLimite(null);
            }}
            className="h-11 w-28 rounded-lg border border-[color:var(--border-dark)] bg-[color:var(--card)] px-3 text-base lg:h-10 lg:text-sm"
          />
          <Button size="sm" variant="outline" disabled={salvando || !config.ligada || Number(limite) === config.limiteDiario} onClick={salvarLimite}>
            Salvar
          </Button>
        </div>
        {erroDoLimite && (
          <p id="ro-limite-erro" role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            {erroDoLimite}
          </p>
        )}
      </div>

      <div className="px-4 py-4 lg:px-8">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Perguntas livres</p>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">As perguntas comuns (cliente, ficha, vendas, quem deve, pedidos, cardápio) a RO responde sozinha. As outras ela precisa mandar para um serviço do Google (Gemini) entender.</p>
        <div className="mt-3 flex items-start gap-2 text-sm text-[color:var(--foreground)]" role="status">
          {situacao.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />}
          <span>{situacao.texto}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => void testar()} disabled={testando || !estado?.chave}>
            {testando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
            Testar agora
          </Button>
          {resultado && <span className={`text-sm ${resultado.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`} role="status">{resultado.mensagem}</span>}
        </div>
        <p className="mt-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/50 px-3 py-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
          Privacidade: nas perguntas livres, o que você digita e o primeiro nome dos clientes que apareceram na conversa vão para o Google. Os números e dados do sistema não vão. A chave gratuita pode não ter a mesma proteção de privacidade de uma chave paga.
        </p>
        <details className="mt-3 text-xs text-[color:var(--muted-foreground)]">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold lg:min-h-0 lg:py-1">Detalhes</summary>
          <ul className="mt-1 space-y-1">
            <li>Chave: {estado?.chave ? "configurada neste ambiente" : "não configurada"}.</li>
            {(estado?.modelos ?? []).map((m) => (
              <li key={m.nome}>
                {m.nome}: {m.indisponivel ? "não existe mais para esta chave" : m.descansaAte ? `limite atingido, volta por volta de ${new Date(m.descansaAte).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "disponível"}.
              </li>
            ))}
            {(resultado?.detalhes ?? []).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

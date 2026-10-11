"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { RO_LIMITE_DIARIO, type RoConfiguracoes } from "@/lib/ai/ro/settings-tipos";
import { AlertCircle, CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Estado {
  chave: boolean;
  modelos: { nome: string; descansaAte: string | null }[];
}

const PADRAO: RoConfiguracoes = { ligada: true, tom: "divertida", limiteDiario: 150, mostrarBotao: true };

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
        className={`relative mt-0.5 h-7 w-12 flex-none rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${ligado ? "bg-primary" : "bg-slate-300"}`}
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
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);
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
      showToast("Não foi possível salvar. Tente de novo.", "error");
    }
  };

  const testar = async () => {
    setTestando(true);
    setResultado(null);
    const res = await fetch("/api/admin/ro/status", { method: "POST" });
    setResultado(res.ok ? await res.json() : { ok: false, mensagem: "Não foi possível testar agora." });
    setTestando(false);
    void carregar();
  };

  if (!config) return <div className="flex items-center gap-2 px-8 py-10 text-sm text-[color:var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>;

  const emDescanso = estado?.modelos.filter((m) => m.descansaAte) ?? [];

  return (
    <div className="divide-y divide-[color:var(--border)]">
      <Interruptor ligado={config.ligada} onChange={(v) => void salvar({ ligada: v })} disabled={salvando} rotulo="Assistente RO ligado" descricao="Desligada, a RO some do sistema e a API recusa as perguntas." />
      <Interruptor ligado={config.mostrarBotao} onChange={(v) => void salvar({ mostrarBotao: v })} disabled={salvando || !config.ligada} rotulo="Botão flutuante em todas as telas" descricao="O botão com o chapéu de cozinheira no canto da tela. Sem ele, a RO fica desligada para quem não a procura." />

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
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">De {RO_LIMITE_DIARIO.MIN} a {RO_LIMITE_DIARIO.MAX}. Protege a cota gratuita da inteligência artificial.</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            id="ro-limite"
            type="number"
            inputMode="numeric"
            min={RO_LIMITE_DIARIO.MIN}
            max={RO_LIMITE_DIARIO.MAX}
            value={limite}
            disabled={!config.ligada}
            onChange={(e) => setLimite(e.target.value)}
            className="h-10 w-28 rounded-lg border border-[color:var(--border-dark)] bg-[color:var(--card)] px-3 text-sm"
          />
          <Button size="sm" variant="outline" disabled={salvando || !config.ligada || Number(limite) === config.limiteDiario} onClick={() => void salvar({ limiteDiario: Number(limite) })}>
            Salvar
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Conexão com a inteligência artificial (Gemini)</p>
        <ul className="mt-2 space-y-1 text-sm text-[color:var(--muted-foreground)]">
          <li className="flex items-center gap-2">
            {estado?.chave ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            {estado?.chave ? "Chave configurada neste ambiente." : "Chave não configurada: só as perguntas simples funcionam."}
          </li>
          {emDescanso.map((m) => (
            <li key={m.nome} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              {m.nome} em descanso por causa da cota gratuita, volta por volta de {new Date(m.descansaAte as string).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
            </li>
          ))}
          {estado?.chave && emDescanso.length === 0 && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Nenhum limite de cota atingido agora.</li>}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => void testar()} disabled={testando || !estado?.chave}>
            {testando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
            Testar conexão
          </Button>
          {resultado && <span className={`text-sm ${resultado.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{resultado.mensagem}</span>}
        </div>
        <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">Perguntas simples (cliente, vendas, devendo, pedidos, cardápio) não gastam a cota: a RO as entende sozinha.</p>
      </div>
    </div>
  );
}

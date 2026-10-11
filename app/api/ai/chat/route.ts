import { NextRequest, NextResponse } from 'next/server';

import { responder } from '@/lib/ai/ro/chat';
import { lerContexto, montarContexto } from '@/lib/ai/ro/contexto';
import { RoErroIa } from '@/lib/ai/ro/gemini';
import { lerConfiguracoes } from '@/lib/ai/ro/settings';
import { esperaHumana } from '@/lib/ai/ro/text';
import type { RoErro, RoMensagemEntrada } from '@/lib/ai/ro/types';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/staff-session';
import { dateStringSP } from '@/lib/date-range';

// POST - Pergunta à RO. Só administrador. A IA escolhe uma ferramenta pronta (lib/ai/ro/tools.ts): nenhuma SQL vem dela.
// Resposta: RoResposta; erro: { erro: RoErro } com o status HTTP correspondente. Nada daqui é guardado em cache.

const MAX_MENSAGENS = 12;
const MAX_TEXTO = 1500;
/** Tamanho máximo do corpo da requisição (uma conversa normal tem poucos KB). */
const MAX_CORPO = 64 * 1024;

const usoDiario = new Map<string, number>();
/** Dia a que o contador se refere: ao virar o dia (Brasília) a contagem recomeça do zero. */
let diaDoContador = '';

const SEM_CACHE = { 'Cache-Control': 'no-store' };

const falha = (erro: RoErro, status: number) =>
  NextResponse.json({ erro }, { status, headers: erro.tentarEm ? { ...SEM_CACHE, 'Retry-After': String(erro.tentarEm) } : SEM_CACHE });

function limparMensagens(bruto: unknown): RoMensagemEntrada[] {
  if (!Array.isArray(bruto)) return [];
  const lista: RoMensagemEntrada[] = [];
  for (const m of bruto) {
    if (!m || typeof m !== 'object') continue;
    const { role, content, contexto } = m as { role?: unknown; content?: unknown; contexto?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) continue;
    // do contexto só fica o que segue o formato conhecido (quem apareceu na tela, com o id); texto solto é descartado
    lista.push({ role, content: content.trim().slice(0, MAX_TEXTO), contexto: role === 'assistant' && typeof contexto === 'string' ? montarContexto(lerContexto(contexto.slice(0, 4000)).map((c) => ({ id: c.id, nome: c.nome }))) : undefined });
  }
  return lista.slice(-MAX_MENSAGENS);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    const status = auth.error.status;
    return falha(
      status === 401
        ? { codigo: 'login', mensagem: 'Entre no sistema para falar com a RO.' }
        : { codigo: 'permissao', mensagem: 'A RO é só para o administrador. Se precisar dela, peça a quem administra o sistema.' },
      status,
    );
  }

  const config = await lerConfiguracoes();
  if (!config.ligada) return falha({ codigo: 'desligada', mensagem: 'A RO está desligada. Quem administra o sistema pode ligar de novo em Configurações, na aba Assistente RO.' }, 403);

  // corpo: tamanho e formato conferidos ANTES de gastar o limite da pessoa
  const bruto = await req.text().catch(() => '');
  if (bruto.length > MAX_CORPO) return falha({ codigo: 'pedido', mensagem: 'A mensagem ficou grande demais. Escreva só a pergunta.' }, 413);
  let corpo: unknown = null;
  try {
    corpo = bruto ? JSON.parse(bruto) : null;
  } catch {
    corpo = null;
  }
  const mensagens = limparMensagens((corpo as { messages?: unknown } | null)?.messages);
  if (mensagens.length === 0 || mensagens[mensagens.length - 1].role !== 'user') {
    return falha({ codigo: 'pedido', mensagem: 'Escreva uma pergunta.' }, 400);
  }

  const usuario = auth.staff.userId;
  const janela = checkUserRateLimit(`ro:${usuario}`, 40, 10 * 60 * 1000);
  if (!janela.allowed) {
    const espera = Math.max(1, Math.ceil((janela.resetAt - Date.now()) / 1000));
    return falha({ codigo: 'limite', mensagem: `Muitas perguntas em pouco tempo. Tente de novo ${esperaHumana(espera)}.`, tentarEm: espera }, 429);
  }

  // limite do dia: lido e somado sem nenhum "await" no meio, para perguntas ao mesmo tempo não furarem a conta
  const hoje = dateStringSP();
  if (diaDoContador !== hoje) {
    usoDiario.clear();
    diaDoContador = hoje;
  }
  const chaveDia = `${usuario}:${hoje}`;
  const usadas = usoDiario.get(chaveDia) ?? 0;
  if (usadas >= config.limiteDiario) {
    return falha({ codigo: 'limite', mensagem: `Você chegou ao limite de ${config.limiteDiario} perguntas de hoje. Amanhã a RO volta, ou quem administra pode aumentar o limite em Configurações.` }, 429);
  }
  usoDiario.set(chaveDia, usadas + 1);

  const devolverCredito = () => usoDiario.set(chaveDia, Math.max(0, (usoDiario.get(chaveDia) ?? 1) - 1));

  try {
    const resposta = await responder({ mensagens, tom: config.tom });
    return NextResponse.json(resposta, { headers: SEM_CACHE });
  } catch (error) {
    // pergunta que falhou por culpa do sistema não conta no limite do dia
    devolverCredito();
    if (error instanceof RoErroIa) return falha(error.erro, error.status);
    // só o tipo do erro vai para o log: o texto do erro pode trazer o que a pessoa digitou
    console.error('[RO][ERRO]', error instanceof Error ? error.name : 'erro', (error as { code?: string })?.code ?? '');
    return falha({ codigo: 'interno', mensagem: 'Tive um problema para consultar os dados. Tente de novo; se continuar, avise quem cuida do sistema.' }, 500);
  }
}

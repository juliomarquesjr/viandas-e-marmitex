// Configurações da RO (puro, serve ao servidor e à tela de configurações): tipos, padrões e leitura dos valores guardados.

export interface RoConfiguracoes {
  ligada: boolean;
  tom: 'divertida' | 'direta';
  /** Perguntas por pessoa por dia. */
  limiteDiario: number;
  /** Onde fica o botão da RO: flutuante no canto, no cabeçalho do admin e do PDV, ou escondido. */
  posicao: RoPosicao;
  /** Atalho de leitura: o botão aparece em algum lugar (posicao diferente de "nenhum"). */
  mostrarBotao: boolean;
}

export type RoPosicao = 'flutuante' | 'cabecalho' | 'nenhum';
export const RO_POSICOES: readonly RoPosicao[] = ['flutuante', 'cabecalho', 'nenhum'];

export const RO_PADRAO: RoConfiguracoes = { ligada: true, tom: 'divertida', limiteDiario: 150, posicao: 'flutuante', mostrarBotao: true };
export const RO_LIMITE_DIARIO = { MIN: 10, MAX: 1000 } as const;

export const CHAVES_RO = { ligada: 'ro_enabled', tom: 'ro_tone', limiteDiario: 'ro_daily_limit', mostrarBotao: 'ro_show_button', posicao: 'ro_placement' } as const;

export function interpretar(valores: Record<string, string | null | undefined>): RoConfiguracoes {
  const limite = Number(valores[CHAVES_RO.limiteDiario]);
  const guardada = valores[CHAVES_RO.posicao];
  // sem a chave nova, vale o antigo "mostrar botão" (desligado = escondido)
  const posicao: RoPosicao = RO_POSICOES.includes(guardada as RoPosicao) ? (guardada as RoPosicao) : valores[CHAVES_RO.mostrarBotao] === 'false' ? 'nenhum' : 'flutuante';
  return {
    ligada: valores[CHAVES_RO.ligada] !== 'false',
    tom: valores[CHAVES_RO.tom] === 'direta' ? 'direta' : 'divertida',
    limiteDiario: Number.isInteger(limite) && limite >= RO_LIMITE_DIARIO.MIN && limite <= RO_LIMITE_DIARIO.MAX ? limite : RO_PADRAO.limiteDiario,
    posicao,
    mostrarBotao: posicao !== 'nenhum',
  };
}


export const MENSAGEM_LIMITE_INVALIDO = `Digite um número inteiro de ${RO_LIMITE_DIARIO.MIN} a ${RO_LIMITE_DIARIO.MAX}.`;

export type ConfiguracoesPedidas = Partial<Pick<RoConfiguracoes, 'ligada' | 'tom' | 'limiteDiario' | 'posicao' | 'mostrarBotao'>>;

/** Confere o que veio da tela. Valor fora do combinado volta como erro com o motivo, nunca é aceito em silêncio. */
export function validarPedido(corpo: unknown): { ok: true; valores: ConfiguracoesPedidas } | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { ok: false, erro: 'Não recebi nenhum ajuste para salvar.' };
  const c = corpo as Record<string, unknown>;
  const valores: ConfiguracoesPedidas = {};
  if ('ligada' in c && c.ligada !== undefined) {
    if (typeof c.ligada !== 'boolean') return { ok: false, erro: 'Escolha entre ligada e desligada.' };
    valores.ligada = c.ligada;
  }
  if ('tom' in c && c.tom !== undefined) {
    if (c.tom !== 'divertida' && c.tom !== 'direta') return { ok: false, erro: 'Escolha o jeito de falar: divertida ou direta.' };
    valores.tom = c.tom;
  }
  if ('limiteDiario' in c && c.limiteDiario !== undefined) {
    const n = c.limiteDiario;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < RO_LIMITE_DIARIO.MIN || n > RO_LIMITE_DIARIO.MAX) return { ok: false, erro: MENSAGEM_LIMITE_INVALIDO };
    valores.limiteDiario = n;
  }
  if ('posicao' in c && c.posicao !== undefined) {
    if (!RO_POSICOES.includes(c.posicao as RoPosicao)) return { ok: false, erro: 'Escolha onde fica o botão: flutuante, no cabeçalho ou escondido.' };
    valores.posicao = c.posicao as RoPosicao;
  }
  if ('mostrarBotao' in c && c.mostrarBotao !== undefined) {
    if (typeof c.mostrarBotao !== 'boolean') return { ok: false, erro: 'Escolha entre mostrar e esconder o botão.' };
    valores.mostrarBotao = c.mostrarBotao;
  }
  if (Object.keys(valores).length === 0) return { ok: false, erro: 'Não recebi nenhum ajuste para salvar.' };
  return { ok: true, valores };
}

/** Aplica o pedido (já validado) sobre as configurações atuais. Aceita também o antigo "mostrar botão". */
export function aplicarPedido(atual: RoConfiguracoes, pedido: ConfiguracoesPedidas): RoConfiguracoes {
  const posicao: RoPosicao =
    pedido.posicao ?? (typeof pedido.mostrarBotao === 'boolean' ? (pedido.mostrarBotao ? (atual.posicao === 'nenhum' ? 'flutuante' : atual.posicao) : 'nenhum') : atual.posicao);
  return {
    ligada: pedido.ligada ?? atual.ligada,
    tom: pedido.tom ?? atual.tom,
    limiteDiario: pedido.limiteDiario ?? atual.limiteDiario,
    posicao,
    mostrarBotao: posicao !== 'nenhum',
  };
}

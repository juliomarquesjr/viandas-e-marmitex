// Configurações da RO (puro, serve ao servidor e à tela de configurações): tipos, padrões e leitura dos valores guardados.

export interface RoConfiguracoes {
  ligada: boolean;
  tom: 'divertida' | 'direta';
  /** Perguntas por pessoa por dia. */
  limiteDiario: number;
  /** Mostra o botão flutuante em todas as telas do admin. */
  mostrarBotao: boolean;
}

export const RO_PADRAO: RoConfiguracoes = { ligada: true, tom: 'divertida', limiteDiario: 150, mostrarBotao: true };
export const RO_LIMITE_DIARIO = { MIN: 10, MAX: 1000 } as const;

export const CHAVES_RO = { ligada: 'ro_enabled', tom: 'ro_tone', limiteDiario: 'ro_daily_limit', mostrarBotao: 'ro_show_button' } as const;

export function interpretar(valores: Record<string, string | null | undefined>): RoConfiguracoes {
  const limite = Number(valores[CHAVES_RO.limiteDiario]);
  return {
    ligada: valores[CHAVES_RO.ligada] !== 'false',
    tom: valores[CHAVES_RO.tom] === 'direta' ? 'direta' : 'divertida',
    limiteDiario: Number.isInteger(limite) && limite >= RO_LIMITE_DIARIO.MIN && limite <= RO_LIMITE_DIARIO.MAX ? limite : RO_PADRAO.limiteDiario,
    mostrarBotao: valores[CHAVES_RO.mostrarBotao] !== 'false',
  };
}


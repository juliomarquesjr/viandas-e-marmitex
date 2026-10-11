// Contrato entre o servidor da RO e o painel: o que uma resposta carrega (puro, serve aos dois lados).

export interface RoCliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  /** Positivo é o que o cliente deve; zero ou negativo, nada a pagar. Ausente quando a conta não foi feita. */
  saldoCents?: number;
  whatsapp: boolean;
  ultimaCompra?: string | null;
  /** Texto curto extra (ex.: "3 mensagens novas"). */
  nota?: string;
}

export type RoFormato = 'texto' | 'dinheiro' | 'inteiro' | 'data' | 'dataHora';

export interface RoColuna {
  key: string;
  label: string;
  align?: 'left' | 'right';
  formato?: RoFormato;
}

export type RoBloco =
  | { tipo: 'clientes'; titulo?: string; itens: RoCliente[]; dica?: string }
  | { tipo: 'tabela'; titulo?: string; colunas: RoColuna[]; linhas: Record<string, unknown>[]; total?: Record<string, unknown> }
  | { tipo: 'metricas'; titulo?: string; itens: { rotulo: string; valor: string; dica?: string; tom?: 'ok' | 'atencao' | 'neutro' }[] }
  | { tipo: 'opcoes'; titulo?: string; itens: { rotulo: string; pergunta: string }[] };

export interface RoResposta {
  /** Texto em markdown simples (**negrito**, listas com "- "). */
  mensagem: string;
  blocos: RoBloco[];
  /** O que a RO consultou, para a próxima pergunta ("e o telefone dela?") fazer sentido. Não aparece na tela. */
  contexto?: string;
  meta: {
    ms: number;
    ferramentas: string[];
    /** "regra" (sem IA), "ia" ou "fixa" (texto pronto). */
    origem: 'regra' | 'ia' | 'fixa';
    modelo?: string;
  };
}

export type RoErroCodigo = 'login' | 'permissao' | 'desligada' | 'limite' | 'cota' | 'ocupada' | 'ia' | 'pedido' | 'interno';

export interface RoErro {
  codigo: RoErroCodigo;
  mensagem: string;
  /** Segundos até valer a pena tentar de novo. */
  tentarEm?: number;
}

export interface RoMensagemEntrada {
  role: 'user' | 'assistant';
  content: string;
  contexto?: string;
}

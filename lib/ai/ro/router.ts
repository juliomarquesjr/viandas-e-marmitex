// Atalhos da RO: perguntas comuns e curtas são entendidas aqui, sem chamar a IA. Isso deixa a resposta mais rápida,
// poupa a cota gratuita da Gemini e faz a RO continuar útil mesmo quando a cota acaba. Se a frase tiver qualquer palavra
// que o atalho não conhece (um nome, um detalhe), devolve null e a IA decide. Puro, testado em tests/ro.test.ts.
//
// Ordem: id de cliente -> ajuda -> conversa -> segurança -> pedido de escrita -> telefone/e-mail -> período
// -> intenções por palavra-chave -> preço/estoque -> nome de cliente (só se parecer mesmo um nome).

import { addDaysToDay } from '@/lib/date-range';
import type { Argumentos, NomeFerramenta } from './tools';
import { distancia, normalizar } from './text';

export interface Decisao {
  ferramenta: NomeFerramenta;
  args: Argumentos;
  /** O atalho achou que era um nome solto; se nada for encontrado, vale tentar produtos também. */
  nomeSolto?: boolean;
  /** Resposta pronta (conversa fiada, recusa), sem consultar nada. */
  fixo?: string;
  /** Se a busca de produto não achar nada, vale procurar um cliente com o mesmo texto ("tem a Angela?"). */
  clienteSeVazio?: boolean;
}

export interface OpcoesDoAtalho {
  /** Dia de hoje em Brasília ("AAAA-MM-DD"). Sem ele, frases que dependem de datas vão para a IA. */
  hoje?: string;
  /** Já houve conversa antes desta pergunta (a frase pode ser continuação: "e ontem?"). */
  temConversa?: boolean;
}

const set = (...palavras: string[]) => new Set(palavras);

/** Palavras de enfeite que não mudam o assunto. */
const ENFEITE = set('qual', 'quais', 'quanto', 'quantos', 'quanta', 'quantas', 'qnto', 'qto', 'me', 'mostra', 'mostre', 'mostrar', 'ver', 'veja', 'ha', 'esta', 'estao', 'estou', 'sao', 'foi', 'foram', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'por', 'favor', 'pra', 'pro', 'para', 'que', 'quem', 'to', 'ta', 'tao', 'tem', 'algum', 'alguma', 'algo', 'meu', 'minha', 'meus', 'minhas', 'agora', 'ainda', 'total', 'lista', 'listar', 'liste', 'oi', 'ola', 'bom', 'boa', 'tarde', 'noite', 'vc', 'voce', 'pode', 'poderia', 'gostaria', 'queria', 'quero', 'preciso', 'saber', 'ro', 'ai', 'ver', 've', 'mim', 'eu', 'tenho', 'uns', 'ate', 'com', 'la', 'aqui', 'so', 'hein', 'ne', 'faz', 'fazer');

/** Palavras que só acompanham o período ("este", "desse", "atual"). */
const MODIFICADORES_DE_PERIODO = set('este', 'esta', 'esse', 'essa', 'neste', 'nesta', 'nesse', 'nessa', 'deste', 'desta', 'desse', 'dessa', 'atual', 'corrente', 'nos', 'nas', 'no', 'na', 'de', 'do', 'da', 'em', 'num', 'ao', 'a', 'o');

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/* ------------------------------------------------------------------ período */

interface PeriodoAchado {
  args: Argumentos;
  indices: number[];
}

const ehNumero = (t: string | undefined) => t !== undefined && /^\d{1,3}$/.test(t);
const ehAno = (t: string | undefined) => t !== undefined && /^(20\d{2})$/.test(t);

function ultimoDoMes(ano: number, mes: number): string {
  const primeiro = `${ano}-${String(mes).padStart(2, '0')}-01`;
  return addDaysToDay(`${addDaysToDay(primeiro, 32).slice(0, 7)}-01`, -1);
}

/**
 * Acha os períodos citados. `incerto` = tem palavra de período que o atalho não sabe resolver (ex.: "últimos dias",
 * "passado" solto) ou datas demais: nesses casos a pergunta vai para a IA.
 */
function acharPeriodos(tokens: string[], hoje?: string): { achados: PeriodoAchado[]; incerto: boolean } {
  const achados: PeriodoAchado[] = [];
  const usados = new Set<number>();
  let incerto = false;
  const nome = (n: string, ...indices: number[]) => {
    achados.push({ args: { periodo: n }, indices });
    indices.forEach((i) => usados.add(i));
  };
  const PASSADO = set('passado', 'passada', 'anterior');

  for (let i = 0; i < tokens.length; i++) {
    if (usados.has(i)) continue;
    const t = tokens[i];
    const prox = tokens[i + 1];
    const prox2 = tokens[i + 2];
    if (t === 'ano' && prox && PASSADO.has(prox)) nome('ano_passado', i, i + 1);
    else if (t === 'mes' && prox && PASSADO.has(prox)) nome('mes_passado', i, i + 1);
    else if (t === 'semana' && prox && PASSADO.has(prox)) nome('semana_passada', i, i + 1);
    else if ((t === 'ultimo' || t === 'ultima') && prox === 'mes') nome('mes_passado', i, i + 1);
    else if ((t === 'ultimo' || t === 'ultima') && prox === 'semana') nome('semana_passada', i, i + 1);
    else if ((t === 'ultimos' || t === 'ultimas') && ehNumero(prox) && (prox2 === 'dias' || prox2 === 'dia')) {
      const n = Number(prox);
      if (n === 7) nome('ultimos_7_dias', i, i + 1, i + 2);
      else if (n === 30) nome('ultimos_30_dias', i, i + 1, i + 2);
      else if (hoje && n >= 1 && n <= 365) {
        achados.push({ args: { periodo: 'intervalo', de: addDaysToDay(hoje, -(n - 1)), ate: hoje }, indices: [i, i + 1, i + 2] });
        [i, i + 1, i + 2].forEach((k) => usados.add(k));
      } else incerto = true;
    } else if (ehNumero(t) && (prox === 'dias' || prox === 'dia') && !usados.has(i + 1)) {
      const n = Number(t);
      if (n === 7) nome('ultimos_7_dias', i, i + 1);
      else if (n === 30) nome('ultimos_30_dias', i, i + 1);
      else if (hoje && n >= 1 && n <= 365) {
        achados.push({ args: { periodo: 'intervalo', de: addDaysToDay(hoje, -(n - 1)), ate: hoje }, indices: [i, i + 1] });
        [i, i + 1].forEach((k) => usados.add(k));
      } else incerto = true;
    } else if (MESES.includes(t)) {
      if (!hoje) {
        incerto = true;
        continue;
      }
      const mes = MESES.indexOf(t) + 1;
      const mesAtual = Number(hoje.slice(5, 7));
      const anoAtual = Number(hoje.slice(0, 4));
      const indices = [i];
      let ano = mes <= mesAtual ? anoAtual : anoAtual - 1;
      const posAno = prox === 'de' ? i + 2 : i + 1;
      if (ehAno(tokens[posAno])) {
        ano = Number(tokens[posAno]);
        for (let k = i + 1; k <= posAno; k++) indices.push(k);
      }
      const mm = String(mes).padStart(2, '0');
      achados.push({ args: { periodo: 'intervalo', de: `${ano}-${mm}-01`, ate: ultimoDoMes(ano, mes) }, indices });
      indices.forEach((k) => usados.add(k));
    } else if (ehAno(t)) {
      if (!hoje) {
        incerto = true;
        continue;
      }
      const ano = Number(t);
      if (ano === Number(hoje.slice(0, 4))) nome('este_ano', i);
      else achados.push({ args: { periodo: 'intervalo', de: `${ano}-01-01`, ate: `${ano}-12-31` }, indices: [i] });
      usados.add(i);
    } else if (t === 'hoje' || t === 'hj' || t === 'hoej') nome('hoje', i);
    else if (t === 'ontem') nome('ontem', i);
    else if (t === 'semana') nome('esta_semana', i);
    else if (t === 'mes' || t === 'mez') nome('este_mes', i);
    else if (t === 'ano') nome('este_ano', i);
    else if (t === 'dia' && !(ehNumero(tokens[i - 1]) || tokens[i - 1] === 'um')) nome('hoje', i);
    else if (t === 'ultimos' || t === 'ultimas' || t === 'dias' || PASSADO.has(t)) incerto = true;
  }
  // "semana passada e esta": a segunda data não foi entendida, então não responde só a primeira
  const SUBSTANTIVOS_DE_PERIODO = set('semana', 'mes', 'ano', 'dia', 'hoje', 'ontem');
  if (tokens.some((t, i) => ['esta', 'este', 'deste', 'desta', 'esse', 'essa', 'desse', 'dessa', 'atual'].includes(t) && tokens[i - 1] === 'e' && !SUBSTANTIVOS_DE_PERIODO.has(tokens[i + 1] ?? ''))) incerto = true;
  const distintos = new Set(achados.map((a) => JSON.stringify(a.args)));
  if (distintos.size > 1) incerto = true;
  return { achados, incerto };
}

/* ------------------------------------------------------------------ vocabulário */

interface Intencao {
  ferramenta: NomeFerramenta;
  /** Palavras que disparam. */
  gatilhos: Set<string>;
  /** Outras palavras que podem aparecer sem mudar o sentido. */
  aceitas?: Set<string>;
  periodoPadrao?: string;
  /** Exige uma destas palavras junto (ex.: "mais" em "mais vendidos"). */
  exige?: string[];
}

const FORMAS_DE_PAGAMENTO = set('pix', 'dinheiro', 'cartao', 'debito', 'credito', 'fiado');

const INTENCOES: Intencao[] = [
  { ferramenta: 'produtos_mais_vendidos', gatilhos: set('vendidos', 'vendido', 'vendida', 'vendidas', 'vende', 'vendem', 'vendeu', 'saem', 'sai', 'saiu', 'ranking', 'top'), aceitas: set('mais', 'produtos', 'produto', 'itens', 'item', 'marmitas', 'pratos'), periodoPadrao: 'este_mes', exige: ['mais', 'ranking', 'top'] },
  { ferramenta: 'clientes_top', gatilhos: set('compra', 'compram', 'comprou', 'compraram', 'gasta', 'gastam', 'gastou', 'melhores', 'melhor', 'principais', 'clientes', 'ranking', 'top'), aceitas: set('mais', 'clientes', 'cliente', 'fregueses', 'ranking', 'top'), periodoPadrao: 'este_mes', exige: ['mais', 'melhores', 'melhor', 'principais', 'ranking', 'top'] },
  { ferramenta: 'clientes_credito', gatilhos: set('credito', 'creditos'), aceitas: set('clientes', 'cliente', 'ficha', 'fichas', 'gente', 'pessoas') },
  { ferramenta: 'clientes_devendo', gatilhos: set('devendo', 'deve', 'devem', 'devedor', 'devedores', 'devedora', 'devedoras', 'fiado', 'fiados', 'divida', 'dividas', 'inadimplentes', 'inadimplente', 'receber', 'pendurado', 'penduradas', 'pendurados'), aceitas: set('clientes', 'cliente', 'ficha', 'fichas', 'abertos', 'aberto', 'aberta', 'abertas', 'pagar', 'tudo', 'gente', 'pessoas', 'mais', 'maiores', 'maior', 'principais', 'com', 'nao', 'pagou') },
  { ferramenta: 'clientes_devendo', gatilhos: set('pagar'), exige: ['alguem', 'ninguem', 'gente', 'quem'], aceitas: set('alguem', 'ninguem', 'gente', 'clientes', 'cliente', 'mais') },
  { ferramenta: 'clientes_devendo', gatilhos: set('pagou', 'pagaram'), exige: ['nao', 'nunca'], aceitas: set('nao', 'nunca', 'clientes', 'cliente', 'gente', 'ainda', 'ninguem') },
  { ferramenta: 'clientes_devendo', gatilhos: set('aberta', 'abertas', 'aberto', 'abertos'), exige: ['ficha', 'fichas'], aceitas: set('ficha', 'fichas', 'clientes', 'cliente') },
  { ferramenta: 'vendas', gatilhos: set('vendas', 'venda', 'vendi', 'vendemos', 'vendeu', 'faturamento', 'faturei', 'faturamos', 'vendido', 'fiz', 'fizemos', 'movimento', 'caixa', 'entrou', 'receita', 'recebi', 'recebemos', 'recebimento', 'recebimentos', 'entradas', 'entrada', 'ticket'), aceitas: set('fatura', 'faturou', 'dinheiro', 'registradas', 'registrado', 'pix', 'cartao', 'debito', 'credito', 'fiado', 'ficha', 'fichas', 'medio', 'media', 'valor'), periodoPadrao: 'hoje' },
  { ferramenta: 'vendas', gatilhos: set('pagamentos', 'pagamento'), exige: ['ficha', 'fichas'], aceitas: set('ficha', 'fichas'), periodoPadrao: 'hoje' },
  { ferramenta: 'pedidos_em_aberto', gatilhos: set('aberto', 'abertos', 'andamento', 'pendentes', 'pendente', 'fila', 'esperando', 'preparo', 'preparando', 'entregar', 'entregas'), aceitas: set('pedidos', 'pedido', 'pre', 'prepedidos', 'prepedido', 'online', 'novos', 'novo', 'aceitar'), exige: ['pedidos', 'pedido', 'pre', 'prepedidos', 'prepedido', 'entregas', 'entregar'] },
  { ferramenta: 'despesas', gatilhos: set('despesas', 'despesa', 'gastos', 'gasto', 'gastei', 'gastamos', 'contas', 'saidas', 'paguei', 'pagamos'), aceitas: set('paguei', 'pagamos'), periodoPadrao: 'este_mes' },
  { ferramenta: 'lucro', gatilhos: set('lucro', 'lucrei', 'lucramos', 'lucrativo', 'lucrando', 'sobrou', 'resultado', 'ganhei', 'ganho', 'ganhos', 'ganhamos', 'prejuizo', 'fechamento', 'balanco', 'resumo', 'relatorio'), aceitas: set('liquido'), periodoPadrao: 'este_mes' },
  { ferramenta: 'cardapio', gatilhos: set('cardapio', 'cardapios'), aceitas: set('amanha') },
  { ferramenta: 'whatsapp_nao_lidas', gatilhos: set('whatsapp', 'zap', 'whats', 'conversas', 'mensagens', 'mensagem'), aceitas: set('nao', 'lidas', 'lida', 'novas', 'nova', 'sem', 'responder', 'chegaram', 'chegou') },
];

const GATILHOS_DE_FECHAMENTO = set('fechamento');

/** Palavras que indicam uma análise que o atalho não sabe fazer: deixa para a IA. */
const COMPLEXAS = set('media', 'maior', 'menor', 'compare', 'comparar', 'comparando', 'versus', 'porcentagem', 'percentual', 'crescimento', 'cresceu', 'caiu', 'queda', 'diferenca', 'por', 'cada', 'entre', 'desde', 'quando', 'primeira', 'primeiro', 'ultima', 'ultimo', 'depois', 'antes', 'fez', 'fizeram', 'comprar', 'pagou', 'pagaram', 'projecao', 'previsao', 'pior');

/** Palavras que ensinam como se pede um cliente (e não fazem parte do nome). */
const VERBOS_BUSCA = set('procure', 'procura', 'procurar', 'busca', 'busque', 'buscar', 'acha', 'ache', 'achar', 'encontre', 'encontra', 'encontrar', 'localiza', 'localize', 'cadastro', 'cliente', 'clientes', 'dados', 'contato', 'telefone', 'celular', 'numero', 'fone', 'whatsapp', 'zap', 'email', 'quem', 'seria', 'conhece', 'conhecer', 'lembra', 'lembro', 'chama', 'chamada', 'chamado', 'nome', 'pessoa', 'dona', 'dono', 'senhora', 'seu', 'sr', 'sra');
const PALAVRAS_FICHA = set('ficha', 'saldo', 'deve', 'devendo', 'divida', 'fiado', 'pagar', 'pendente', 'conta', 'historico', 'extrato', 'compras', 'comprou', 'credito');

/** Pedidos de dado que a RO não traz. */
const SEM_ENDERECO = set('endereco', 'enderecos', 'rua', 'bairro', 'cep');

/** Conversa fiada que não precisa de IA nem de ferramenta de dados. */
const CONVERSA = set('oi', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'obrigado', 'obrigada', 'obg', 'brigado', 'brigada', 'valeu', 'vlw', 'ok', 'certo', 'beleza', 'blz', 'tchau', 'ate', 'logo', 'e', 'voce', 'vc', 'como', 'vai', 'tranquilo', 'opa', 'eae', 'salve', 'hey', 'hello', 'ro', 'ai', 'show', 'top', 'legal', 'massa', 'perfeito', 'otimo', 'nossa', 'entendi', 'muito', 'demais', 'fala', 'de', 'nada');
const SO_CONFIRMACAO = set('ok', 'certo', 'beleza', 'blz', 'show', 'legal', 'massa', 'perfeito', 'otimo', 'entendi', 'top', 'e', 'ai', 'ro', 'nossa');

/** Palavras que nunca são nome de gente: assunto do negócio, pagamento, segurança, pronomes e referências. */
const NAO_NOME = set(
  // palavras soltas
  'mais', 'menos', 'muito', 'muita', 'pouco', 'todos', 'todas', 'tudo', 'nada', 'sim', 'nao', 'porque', 'entao', 'tambem', 'isso', 'isto', 'aquilo', 'qual', 'quais', 'quando', 'onde', 'como',
  'ele', 'ela', 'eles', 'elas', 'dele', 'dela', 'deles', 'delas', 'alguem', 'ninguem', 'fulano', 'beltrano', 'outro', 'outra', 'outros', 'outras', 'segunda', 'segundo', 'terceiro', 'terceira', 'primeiro', 'primeira', 'ultimo', 'ultima', 'mesmo', 'mesma', 'esse', 'essa', 'aquele', 'aquela', 'dono',
  // negócio e dinheiro
  'pix', 'troco', 'marmita', 'marmitas', 'marmitex', 'vianda', 'viandas', 'quentinha', 'quentinhas', 'pedido', 'pedidos', 'preco', 'precos', 'custa', 'custam', 'custo', 'valor', 'valores', 'estoque', 'tem', 'ganhei', 'ganho', 'recebi', 'ticket', 'medio', 'fechamento', 'balanco', 'resumo', 'relatorio', 'devedores', 'devedor', 'devo', 'credito', 'creditos', 'dinheiro', 'cartao', 'debito', 'pagamento', 'pagamentos', 'paga', 'pagou', 'pagaram', 'pago', 'paguei', 'cobranca', 'cobrancas', 'venda', 'vendas', 'vendi', 'vendeu', 'vende', 'lucro', 'prejuizo', 'despesa', 'despesas', 'gasto', 'gastos', 'caixa', 'cardapio', 'produto', 'produtos', 'entrega', 'entregas', 'delivery', 'sobrenome', 'apelido', 'nome', 'mercado', 'cadastros', 'amanha', 'hoje', 'ontem', 'semana', 'mes', 'ano', 'dias',
  // segurança e sistema
  'senha', 'senhas', 'chave', 'chaves', 'api', 'token', 'tokens', 'prompt', 'select', 'drop', 'insert', 'tabela', 'tabelas', 'instrucoes', 'instrucao', 'sql', 'sistema', 'usuario', 'usuarios', 'admin', 'administrador', 'login', 'configuracao', 'configuracoes',
  // o assistente e conversa
  'ro', 'ai', 've', 'mim', 'eu', 'voce', 'piada', 'ajuda', 'help', 'menu', 'show',
);

/** Palavras do negócio que são produto: vão para a busca de produto. */
const PALAVRAS_DE_PRODUTO = set('marmita', 'marmitas', 'marmitex', 'vianda', 'viandas', 'quentinha', 'quentinhas');

/** Termos de segurança: nunca viram busca, pedem recusa curta. */
const SEGURANCA = set('senha', 'senhas', 'chave', 'chaves', 'api', 'token', 'tokens', 'prompt', 'select', 'drop', 'tabela', 'tabelas', 'instrucoes', 'instrucao', 'sql', 'credenciais', 'password', 'segredo', 'segredos', 'execute', 'executar', 'ignore');

/** Verbos de escrita, na forma formal e na do dia a dia. */
const ESCRITA = set(
  'cancela', 'cancelar', 'cancele', 'apaga', 'apagar', 'apague', 'deleta', 'deletar', 'delete', 'exclui', 'excluir', 'exclua', 'cria', 'criar', 'crie', 'cadastra', 'cadastrar', 'cadastre', 'registra', 'registrar', 'registre',
  'baixa', 'muda', 'mudar', 'mude', 'altera', 'alterar', 'altere', 'atualiza', 'atualizar', 'atualize', 'edita', 'editar', 'edite', 'bloqueia', 'bloquear', 'bloqueie', 'desbloqueia', 'inativa', 'inativar', 'inative', 'reativa',
  'zera', 'zerar', 'zere', 'perdoa', 'perdoar', 'perdoe', 'cobra', 'cobrar', 'cobre', 'manda', 'mandar', 'mande', 'envia', 'enviar', 'envie', 'adiciona', 'adicionar', 'adicione', 'remove', 'remover', 'remova', 'lanca', 'lancar', 'lance', 'anota', 'anotar', 'anote', 'fecha', 'fechar', 'feche', 'imprime', 'imprimir', 'emite', 'emitir',
);
const ENVIOS = set('manda', 'mandar', 'mande', 'envia', 'enviar', 'envie');

function recusaDeEscrita(tokens: string[]): string {
  const tem = (...palavras: string[]) => tokens.some((t) => palavras.includes(t));
  let destino: string;
  if (tem('fecha', 'fechar', 'feche') && tem('caixa')) destino = 'O sistema não tem fechamento de caixa. Para ver o dia, pergunte "vendas de hoje" ou "lucro de hoje".';
  else if (tem('cobra', 'cobrar', 'cobre', 'cobranca', 'cobrancas', 'manda', 'mandar', 'mande', 'envia', 'enviar', 'envie', 'mensagem', 'mensagens', 'whatsapp', 'zap')) destino = 'Para mandar mensagem ou a ficha, use a tela **Clientes** ou **WhatsApp > Conversas**.';
  else if (tem('cliente', 'clientes', 'ficha', 'telefone', 'cadastro', 'divida', 'baixa', 'pagamento', 'perdoa', 'perdoar', 'perdoe', 'zera', 'zerar', 'zere', 'bloqueia', 'bloquear', 'bloqueie', 'inativa', 'inativar', 'inative', 'reativa', 'desbloqueia')) destino = 'Isso se faz na tela **Clientes**.';
  else if (tem('pedido', 'pedidos', 'venda', 'vendas', 'pre')) destino = 'Pedidos e vendas ficam nas telas **Vendas** e **Pré-Pedidos**.';
  else if (tem('preco', 'precos', 'produto', 'produtos', 'estoque', 'marmita', 'marmitas', 'pizza')) destino = 'Isso se faz na tela **Produtos**.';
  else if (tem('despesa', 'despesas', 'gasto', 'gastos')) destino = 'Isso se faz na tela **Despesas**.';
  else if (tem('cardapio', 'cardapios')) destino = 'Isso se faz na tela **Cardápios**.';
  else if (tem('backup', 'backups')) destino = 'Isso se faz na tela **Backups**.';
  else destino = 'Use a tela do assunto no menu do lado esquerdo.';
  return `Isso eu não faço: a RO só consulta, não altera nada no sistema. ${destino}`;
}

const PALAVRAS_DE_TELEFONE = set('telefone', 'fone', 'celular', 'numero', 'cpf', 'ficha', 'cliente', 'do', 'da', 'de', 'termina', 'terminado', 'terminando', 'final', 'finais', 'em', 'com', 'no', 'saldo', 'whatsapp', 'zap', 'o', 'a');

const GUIA_CLIENTE = 'De qual cliente? Digite o nome (ou um pedaço dele) ou o telefone.';

function ehAjuda(norm: string): boolean {
  return /^(ajuda|help|menu|o que (voce|vc) (faz|sabe|consegue|pode)|como (funciona|te uso|uso|usar)|(voce|vc) (faz|sabe|consegue) o que|para que (voce )?serve)\b/.test(norm);
}

/** Corrige erro comum de digitação nas palavras-chave ("vnedas", "dispesas", "pasado"), sem mexer em nomes. */
const VOCABULARIO = ['vendas', 'venda', 'despesas', 'despesa', 'lucro', 'devendo', 'ontem', 'semana', 'passado', 'passada', 'faturamento', 'cardapio', 'pedidos', 'vendidos', 'gastos', 'devedores', 'inativos', 'balanco', 'fechamento'];
const ALIAS: Record<string, string> = { mez: 'mes', hj: 'hoje', hoej: 'hoje', onten: 'ontem', vendi: 'vendi' };

const PALAVRAS_CONHECIDAS = new Set<string>([
  ...INTENCOES.flatMap((it) => [...it.gatilhos, ...(it.aceitas ?? []), ...(it.exige ?? [])]),
  ...ENFEITE,
  ...NAO_NOME,
  ...VERBOS_BUSCA,
  ...PALAVRAS_FICHA,
  ...ESCRITA,
  ...CONVERSA,
  ...VOCABULARIO,
]);

function corrigir(tokens: string[]): string[] {
  return tokens.map((t) => {
    if (Object.prototype.hasOwnProperty.call(ALIAS, t)) return ALIAS[t];
    if (t.length < 5 || PALAVRAS_CONHECIDAS.has(t)) return t;
    const perto = VOCABULARIO.filter((v) => Math.abs(v.length - t.length) <= 1 && distancia(t, v, 1) <= 1);
    return perto.length === 1 ? perto[0] : t;
  });
}

/* ------------------------------------------------------------------ o roteador */

const UUID_NA_FRASE = /\[id:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i;

export function rotearRapido(mensagem: string, opcoes: OpcoesDoAtalho = {}): Decisao | null {
  const { hoje, temConversa = false } = opcoes;

  // botão "Ver ficha" / opção escolhida: leva o id do cadastro, nunca cai em "Qual deles?" de novo
  const comId = UUID_NA_FRASE.exec(mensagem);
  if (comId) {
    const normSemId = normalizar(mensagem.replace(UUID_NA_FRASE, ''));
    const querContato = /\b(telefone|fone|celular|contato|whatsapp)\b/.test(normSemId);
    return { ferramenta: querContato ? 'buscar_cliente' : 'ficha_cliente', args: { cliente_id: comId[1].toLowerCase() } };
  }

  const norm = normalizar(mensagem);
  if (!norm) return null;
  if (ehAjuda(norm)) return { ferramenta: 'ajuda', args: {} };

  const bruto = norm.split(' ');

  // senha, chave, prompt, SQL...: recusa curta, sem procurar nada
  if (bruto.some((t) => SEGURANCA.has(t))) {
    return { ferramenta: 'ajuda', args: {}, fixo: 'Isso eu não mostro. Posso ajudar com clientes, vendas, ficha, pedidos e cardápio.' };
  }

  // "ficha do cliente <Nome completo>": o botão antigo e quem escreve assim (nomes longos não podem ir para a IA)
  const fichaDoCliente = /^ficha (?:do|da) cliente (.+)$/.exec(norm);
  if (fichaDoCliente && fichaDoCliente[1].split(' ').length <= 14) return { ferramenta: 'ficha_cliente', args: { consulta: fichaDoCliente[1] } };

  // conversa fiada
  if (bruto.every((t) => CONVERSA.has(t))) {
    const tem = (...p: string[]) => bruto.some((t) => p.includes(t));
    const fixo = tem('obrigado', 'obrigada', 'obg', 'brigado', 'brigada', 'valeu', 'vlw')
      ? 'Por nada! Se precisar de mais alguma coisa, é só chamar.'
      : tem('tchau')
        ? 'Até mais! Quando precisar, estou por aqui.'
        : bruto.every((t) => SO_CONFIRMACAO.has(t)) && !tem('oi', 'ola')
          ? 'Certo! Se precisar de algo, é só chamar.'
          : 'Oi! Em que posso ajudar? Pode perguntar por um cliente, pelas vendas, pela ficha, pelos pedidos em aberto ou pelo cardápio.';
    return { ferramenta: 'ajuda', args: {}, fixo };
  }

  // pedido para alterar algo: a RO só consulta
  const pedeParaMim = bruto.includes('mim') || bruto.some((t, i) => t === 'me' && ENVIOS.has(bruto[i + 1] ?? ''));
  if (bruto.some((t) => ESCRITA.has(t) && !(ENVIOS.has(t) && pedeParaMim))) {
    return { ferramenta: 'ajuda', args: {}, fixo: recusaDeEscrita(bruto) };
  }

  // e-mail inteiro, na frase ou sozinho
  const comArroba = /\S+@\S+/.exec(mensagem);
  if (comArroba) {
    const resto = normalizar(mensagem.replace(comArroba[0], ' ')).split(' ').filter((t) => t && !ENFEITE.has(t) && !VERBOS_BUSCA.has(t) && !PALAVRAS_FICHA.has(t));
    if (resto.length === 0) return { ferramenta: /ficha|saldo/i.test(mensagem) ? 'ficha_cliente' : 'buscar_cliente', args: { consulta: comArroba[0].replace(/[?!.,;]+$/, '') } };
  }

  // telefone, CPF ou o final do telefone ("8021", "termina em 8021"): quase só números
  const digitos = mensagem.replace(/\D/g, '');
  const soNumeroEPalavras = bruto.every((t) => /^\d+$/.test(t) || PALAVRAS_DE_TELEFONE.has(t));
  if (digitos.length >= 3 && soNumeroEPalavras) {
    return { ferramenta: bruto.some((t) => t === 'ficha' || t === 'saldo') ? 'ficha_cliente' : 'buscar_cliente', args: { consulta: digitos.length >= 6 ? digitos : `final ${digitos}` } };
  }

  if (bruto.length > 12) return null;
  // uma palavra só com letras e números ou pontos ("bruna17567", "qa.cliente2"): pedaço de e-mail
  const semEspacos = mensagem.trim();
  if (/^[\w.+-]{4,}$/.test(semEspacos) && /[a-z]/i.test(semEspacos) && /[\d._]/.test(semEspacos) && !/^\d+$/.test(semEspacos)) return { ferramenta: 'buscar_cliente', args: { consulta: semEspacos } };
  if (/\b(melhor|pior) (dia|mes|semana)\b/.test(norm)) return null;

  const tokens = corrigir(bruto);
  const importante = (t: string) => !ENFEITE.has(t) && !MODIFICADORES_DE_PERIODO.has(t) && !(pedeParaMim && ENVIOS.has(t));

  // quem sumiu / parou de comprar: precisa de uma duração clara ("há 7 dias", "2 meses") ou de nenhum período
  const duracao = /\b(\d{1,3}) (dia|dias|semana|semanas|mes|meses)\b/.exec(norm);
  const falaDeSumico = tokens.some((t) => ['sumiu', 'sumiram', 'sumidos', 'inativos', 'inativo', 'ausentes', 'parados', 'parou', 'pararam'].includes(t)) || (tokens.includes('nao') && tokens.some((t) => ['compra', 'compram', 'comprou', 'compraram', 'aparece', 'aparecem', 'vem'].includes(t))) || (tokens.includes('sem') && tokens.some((t) => ['comprar', 'comprando'].includes(t)));
  if (falaDeSumico) {
    const ACEITAS_DO_SUMICO = set('clientes', 'cliente', 'comprar', 'comprando', 'compra', 'compram', 'comprou', 'compraram', 'sem', 'nao', 'ha', 'mais', 'faz', 'muito', 'tempo', 'sumiu', 'sumiram', 'sumidos', 'inativos', 'inativo', 'ausentes', 'parados', 'parou', 'pararam', 'aparece', 'aparecem', 'vem', 'dia', 'dias', 'semana', 'semanas', 'mes', 'meses', 'gente', 'pessoas', 'quem', 'apareceu', 'voltou');
    const sobra = tokens.filter((t) => importante(t) && !ACEITAS_DO_SUMICO.has(t) && !/^\d+$/.test(t));
    if (sobra.length > 0) return null;
    if (duracao) {
      const n = Number(duracao[1]);
      const unidade = duracao[2];
      const dias = unidade.startsWith('dia') ? n : unidade.startsWith('semana') ? n * 7 : n * 30;
      return dias >= 1 && dias <= 365 ? { ferramenta: 'clientes_inativos', args: { dias } } : null;
    }
    // "quem não comprou hoje?" é outra pergunta: sem duração e com período, vai para a IA
    const semDuracao = acharPeriodos(tokens, hoje);
    return semDuracao.achados.length === 0 && !semDuracao.incerto ? { ferramenta: 'clientes_inativos', args: { dias: 30 } } : null;
  }

  const { achados: periodos, incerto } = acharPeriodos(tokens, hoje);
  const tokensSemPeriodo = tokens.filter((_, i) => !periodos.some((p) => p.indices.includes(i)));
  const argsPeriodo: Argumentos = periodos.length === 1 ? periodos[0].args : {};

  // 1) intenções por palavra-chave: só vale se sobrar nada além das palavras conhecidas
  for (const it of INTENCOES) {
    const alvo = tokensSemPeriodo;
    if (!alvo.some((t) => it.gatilhos.has(t))) continue;
    if (it.exige && !it.exige.some((w) => alvo.includes(w))) continue;
    const aceita = (t: string) => it.gatilhos.has(t) || Boolean(it.aceitas?.has(t)) || Boolean(it.exige?.includes(t)) || /^\d+$/.test(t) && it.ferramenta === 'clientes_inativos';
    if (alvo.some((t) => COMPLEXAS.has(t) && !it.aceitas?.has(t) && !it.gatilhos.has(t))) continue;
    const restante = alvo.filter((t) => importante(t) && !aceita(t));
    if (restante.length > 0) continue;
    if (incerto) return null;
    if (periodos.length > 1) return null;

    if (it.ferramenta === 'cardapio') {
      if (periodos.length > 0 && periodos[0].args.periodo !== 'hoje') return null;
      return { ferramenta: 'cardapio', args: tokens.includes('amanha') ? { data: 'amanha' } : {} };
    }
    const args: Argumentos = { ...argsPeriodo };

    if (it.ferramenta === 'clientes_devendo') {
      // "fiado do mês" não é a dívida total: é o que foi vendido na ficha naquele período
      if (periodos.length === 1) {
        if (tokens.includes('fiado') || tokens.includes('fiados')) return { ferramenta: 'vendas', args: { ...argsPeriodo, forma: 'fiado' } };
        return null;
      }
      const maior = tokens.includes('maior') && tokens.includes('devedor');
      return { ferramenta: 'clientes_devendo', args: maior ? { limite: 1 } : {} };
    }
    if (it.ferramenta === 'clientes_credito' || it.ferramenta === 'pedidos_em_aberto' || it.ferramenta === 'whatsapp_nao_lidas') {
      if (periodos.length > 0) return null;
      return { ferramenta: it.ferramenta, args: {} };
    }
    if (it.ferramenta === 'vendas') {
      const forma = tokens.find((t) => FORMAS_DE_PAGAMENTO.has(t));
      if (forma) args.forma = forma;
    }
    if (it.ferramenta === 'lucro' && periodos.length === 0 && alvo.some((t) => GATILHOS_DE_FECHAMENTO.has(t))) args.periodo = 'hoje';
    else if (!args.periodo && it.periodoPadrao) args.periodo = it.periodoPadrao;
    return { ferramenta: it.ferramenta, args };
  }

  if (tokens.length === 1 && tokens[0] === 'cardapio') return { ferramenta: 'cardapio', args: {} };

  // 2) forma de pagamento sozinha ("pix", "troco"): mostra o que dá para perguntar
  const soAssunto = tokensSemPeriodo.filter(importante);
  if (soAssunto.length > 0 && soAssunto.every((t) => ['pix', 'troco', 'dinheiro', 'cartao', 'debito', 'pagamento', 'pagamentos', 'paga'].includes(t)) && periodos.length === 0) {
    return { ferramenta: 'ajuda', args: {}, fixo: 'Posso mostrar quanto foi vendido no PIX, no dinheiro ou no cartão. Pergunte, por exemplo: **quanto vendi no pix hoje?**' };
  }

  // uma palavra de assunto sem atalho que sirva (ex.: "vendemos de marmita de frango em outubro"): deixa para a IA
  if (tokensSemPeriodo.some((t) => !PALAVRAS_FICHA.has(t) && INTENCOES.some((it) => it.gatilhos.has(t)))) return null;

  // "pedidos" sozinho: pode ser tanta coisa que vale mostrar os caminhos
  const soPedidos = tokensSemPeriodo.filter(importante);
  if (soPedidos.length > 0 && soPedidos.every((t) => t === 'pedido' || t === 'pedidos') && periodos.length === 0) {
    return { ferramenta: 'ajuda', args: {}, fixo: 'Quer ver os **pedidos em aberto** ou as **vendas de hoje**? É só perguntar.' };
  }

  // 3) endereço: ainda não aparece na RO
  if (tokensSemPeriodo.some((t) => SEM_ENDERECO.has(t))) {
    return { ferramenta: 'ajuda', args: {}, fixo: 'Eu ainda não mostro endereço. Mostro o nome, o telefone, o e-mail e a ficha do cliente.' };
  }

  // 4) preço, custo, estoque, "tem frango?": busca de produto
  const PALAVRAS_DE_PRECO = set('preco', 'precos', 'custa', 'custam', 'custo', 'estoque', 'valor');
  const querPreco = tokensSemPeriodo.some((t) => PALAVRAS_DE_PRECO.has(t));
  const comecaComTem = tokensSemPeriodo[0] === 'tem' && tokensSemPeriodo.length > 1;
  if ((querPreco || comecaComTem) && periodos.length === 0 && !incerto) {
    const consulta = tokensSemPeriodo.filter((t) => importante(t) && !PALAVRAS_DE_PRECO.has(t) && !['tem', 'sai', 'qual', 'quanto', 'ainda', 'sobrou'].includes(t));
    const ok = consulta.every((t) => /^[a-z]{3,}$/.test(t) && !VERBOS_BUSCA.has(t) && !PALAVRAS_FICHA.has(t) && (!NAO_NOME.has(t) || PALAVRAS_DE_PRODUTO.has(t)));
    if (ok && consulta.length <= 3) return { ferramenta: 'produto_buscar', args: { consulta: consulta.join(' ') }, clienteSeVazio: comecaComTem && !querPreco };
    return null;
  }

  // 5) palavra do negócio que é produto, sozinha ("marmita")
  const restoDoProduto = tokensSemPeriodo.filter(importante);
  if (restoDoProduto.length === 1 && PALAVRAS_DE_PRODUTO.has(restoDoProduto[0])) return { ferramenta: 'produto_buscar', args: { consulta: restoDoProduto[0] } };

  // 6) um nome solto, com ou sem "procure", "telefone da", "ficha da"
  if (periodos.length > 0 || incerto) {
    // só "hoje", "ontem"...: sem conversa, mostra o que dá para perguntar; com conversa pode ser continuação ("e ontem?")
    if (!temConversa && !incerto && tokensSemPeriodo.every((t) => !importante(t))) {
      return { ferramenta: 'ajuda', args: {}, fixo: 'O que você quer saber? Por exemplo: **vendas de hoje**, **despesas do mês**, **pedidos em aberto** ou **quem está devendo**.' };
    }
    return null;
  }
  if (tokens.some((t) => COMPLEXAS.has(t))) return null;
  const querFicha = tokens.some((t) => PALAVRAS_FICHA.has(t));
  const nome = tokens.filter((t) => importante(t) && !VERBOS_BUSCA.has(t) && !PALAVRAS_FICHA.has(t));
  if (nome.length === 0) {
    // só "ficha", "cliente", "telefone"...: ensina o caminho
    const soGuia = tokens.length <= 3 && tokens.some((t) => VERBOS_BUSCA.has(t) || PALAVRAS_FICHA.has(t));
    return soGuia ? { ferramenta: 'ajuda', args: {}, fixo: GUIA_CLIENTE } : null;
  }
  const pareceNome = nome.length <= 4 && nome.every((t) => /^[a-z]+$/.test(t) && !NAO_NOME.has(t));
  if (pareceNome) {
    return { ferramenta: querFicha ? 'ficha_cliente' : 'buscar_cliente', args: { consulta: nome.join(' ') }, nomeSolto: true };
  }
  return null;
}

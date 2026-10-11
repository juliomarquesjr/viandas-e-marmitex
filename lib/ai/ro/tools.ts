// Ferramentas da RO: cada uma responde uma família de perguntas com consultas escritas aqui no código (nada de
// SQL vindo da IA). A IA só escolhe qual ferramenta usar e com quais argumentos; o texto e os cartões saem daqui.
//
// Regras de negócio (as mesmas das telas do admin):
// - Venda = pedido não cancelado que não é "pagamento de ficha". Inclui o fiado (paymentMethod "invoice").
// - À vista = dinheiro, PIX, débito e crédito. Fiado = lançado na ficha, ainda a receber.
// - Recebido = vendas à vista + pagamentos de ficha (contam assim que são lançados, mesmo ainda não confirmados).
// - Saldo da ficha: compras pendentes (fora pagamento de ficha) menos pagamentos de ficha, como getCustomerBalance.
// - Dia = dia de Brasília. Exceção: a data da despesa é um dia puro (00:00 UTC), comparada por dia.

import { lerSomente, type Leitura } from './db';
import { dateStringSP } from '@/lib/date-range';
import { buscarClientes, nomeParaConversa, resolverUnico, type ClienteBase, type ResultadoBusca } from './customer-index';
import { montarContexto } from './contexto';
import { limitesDeDespesa, periodoDosArgs, PERIODOS, type PeriodoResolvido } from './periods';
import { brl, concorda, dataBR, formatarTelefone, normalizar, palavras, plural } from './text';
import type { RoBloco, RoCliente } from './types';

export interface FerramentaSaida {
  mensagem: string;
  blocos: RoBloco[];
  /** Uma linha para a próxima pergunta se apoiar (quem apareceu na tela, na ordem). */
  contexto?: string;
  /** Busca de cliente sem nenhum candidato de verdade (nada, ou só nomes parecidos): a IA pode tentar entender melhor. */
  incerta?: boolean;
}

export type Argumentos = Record<string, unknown>;

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const texto = (v: unknown, max = 120): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const inteiro = (v: unknown, padrao: number, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Período pedido nos argumentos; devolve a resposta de erro pronta quando a data não existe. */
function periodoDe(args: Argumentos, padrao: string): PeriodoResolvido | FerramentaSaida {
  const r = periodoDosArgs({ periodo: args.periodo, de: args.de, ate: args.ate }, dateStringSP(), padrao);
  return 'erro' in r ? { mensagem: r.erro, blocos: [] } : r;
}
const deuErro = (r: PeriodoResolvido | FerramentaSaida): r is FerramentaSaida => 'mensagem' in r;

/** Dias de calendário entre dois dias "AAAA-MM-DD". */
const diasEntre = (de: string, ate: string): number => Math.round((new Date(`${ate}T12:00:00Z`).getTime() - new Date(`${de}T12:00:00Z`).getTime()) / 86_400_000);

/* ------------------------------------------------------------------ clientes (cache curto) */

let cacheClientes: { em: number; lista: ClienteBase[] } | null = null;
const CACHE_MS = 30_000;

export function limparCacheClientes() {
  cacheClientes = null;
}

async function todosClientes(db: Leitura): Promise<ClienteBase[]> {
  if (cacheClientes && Date.now() - cacheClientes.em < CACHE_MS) return cacheClientes.lista;
  const lista = await db.customer.findMany({ select: { id: true, name: true, phone: true, email: true, doc: true, active: true, phoneIsWhatsapp: true }, orderBy: { name: 'asc' } });
  cacheClientes = { em: Date.now(), lista };
  return lista;
}

/** Saldo da ficha de todos (ou de alguns) clientes, pela mesma conta de getCustomerBalance. */
async function saldos(db: Leitura, ids?: string[]): Promise<Map<string, number>> {
  const filtro = ids ? { customerId: { in: ids } } : { customerId: { not: null } };
  const [pendentes, pagos] = await Promise.all([
    db.order.groupBy({ by: ['customerId'], where: { ...filtro, status: 'pending', paymentMethod: { not: 'ficha_payment' } }, _sum: { totalCents: true } }),
    db.order.groupBy({ by: ['customerId'], where: { ...filtro, paymentMethod: 'ficha_payment' }, _sum: { totalCents: true } }),
  ]);
  const mapa = new Map<string, number>();
  for (const p of pendentes) if (p.customerId) mapa.set(p.customerId, (mapa.get(p.customerId) ?? 0) + (p._sum.totalCents ?? 0));
  for (const p of pagos) if (p.customerId) mapa.set(p.customerId, (mapa.get(p.customerId) ?? 0) - (p._sum.totalCents ?? 0));
  return mapa;
}

async function ultimasCompras(db: Leitura, ids: string[]): Promise<Map<string, Date>> {
  if (ids.length === 0) return new Map();
  const linhas = await db.order.groupBy({
    by: ['customerId'],
    where: { customerId: { in: ids }, status: { not: 'cancelled' }, paymentMethod: { not: 'ficha_payment' } },
    _max: { createdAt: true },
  });
  const mapa = new Map<string, Date>();
  for (const l of linhas) if (l.customerId && l._max.createdAt) mapa.set(l.customerId, l._max.createdAt);
  return mapa;
}

async function paraCartoes(db: Leitura, lista: ClienteBase[], extras?: Map<string, string>): Promise<RoCliente[]> {
  const ids = lista.map((c) => c.id);
  const [saldo, ultimas] = await Promise.all([saldos(db, ids), ultimasCompras(db, ids)]);
  return lista.map((c) => ({
    id: c.id,
    nome: c.name,
    telefone: formatarTelefone(c.phone),
    email: c.email,
    ativo: c.active,
    saldoCents: saldo.get(c.id) ?? 0,
    whatsapp: c.phoneIsWhatsapp,
    ultimaCompra: ultimas.get(c.id)?.toISOString() ?? null,
    nota: extras?.get(c.id),
  }));
}

const resumoContexto = (clientes: { id: string; nome: string }[]) => montarContexto(clientes);

/* ------------------------------------------------------------------ buscar_cliente / ficha */

const MAXIMO_DE_CARTOES = 8;

function situacaoDaFicha(saldoCents: number): string {
  if (saldoCents > 0) return `Está com **${brl(saldoCents)}** a pagar na ficha.`;
  if (saldoCents < 0) return `Tem **${brl(-saldoCents)}** de crédito.`;
  return 'A ficha está em dia.';
}

const nomesDe = (lista: ClienteBase[]) => lista.map((c) => c.name).join(', ');

function mensagemSemResultado(consulta: string, tipo: ResultadoBusca['tipo']): string {
  if (tipo === 'telefone_final') return `Não achei nenhum telefone que termine em **${consulta.replace(/\D/g, '') || consulta}**. Confira os números ou procure pelo nome.`;
  if (tipo === 'telefone' || tipo === 'documento') return 'Não achei esse telefone. Confira os números (pode ser sem o DDD) ou procure pelo nome.';
  if (tipo === 'email') return 'Não achei esse e-mail. Procure pelo nome ou pelo telefone.';
  const letras = normalizar(consulta).replace(/\s/g, '');
  if (letras.length > 0 && letras.length < 3) return 'Escreva pelo menos 3 letras do nome, ou o telefone, para eu procurar.';
  if (palavras(consulta).length <= 1) return `Não achei **${consulta}**. Procure pelo telefone ou por um pedaço do sobrenome.`;
  return `Não achei **${consulta}**. Tente só o primeiro nome ou o telefone (pode ser sem o DDD).`;
}

function mensagemLista(consulta: string, r: ResultadoBusca, mostrados: number): string {
  const { achados, tipo, total } = r;
  const fortes = achados.some((a) => a.forte);
  if (tipo === 'telefone') return `Achei ${plural(total, 'cadastro', 'cadastros')} com esse telefone:`;
  if (tipo === 'telefone_final') return `Achei ${plural(total, 'cadastro', 'cadastros')} com telefone terminado em **${consulta.replace(/\D/g, '')}**:`;
  if (tipo === 'email') return `Achei ${plural(total, 'cadastro', 'cadastros')} com esse e-mail:`;
  const letras = normalizar(consulta).replace(/\s/g, '');
  if (!fortes) {
    if (achados.length === 1 && achados[0].forca === 'parcial') return `Achei provável: **${achados[0].cliente.name}**. Combina só com parte de **${consulta}**. É esse?`;
    if (achados.every((a) => a.forca === 'parcial')) return `Não achei ninguém que tenha tudo o que você escreveu, mas ${concorda(mostrados, 'este combina', 'estes combinam')} com parte de **${consulta}**. ${concorda(mostrados, 'É esse?', 'É algum deles?')}`;
    return `Não achei **${consulta}**. Será que ${concorda(mostrados, 'é esta pessoa', 'é um destes')}?`;
  }
  if (letras.length < 3) return `Com tão poucas letras tem muita gente (${plural(total, 'cadastro', 'cadastros')}). Escreva pelo menos 3 letras do nome, ou o telefone. Estes são os primeiros:`;
  if (total > mostrados) return `Achei ${plural(total, 'cadastro', 'cadastros')} que combinam com **${consulta}**; estou mostrando ${mostrados}. Escreva mais um pedaço do nome para achar o certo.`;
  return `Achei ${plural(total, 'cadastro', 'cadastros')} que combinam com **${consulta}**. Toque no certo ou me diga mais um pedaço do nome.`;
}

/** Cadastro único: texto com telefone e situação da ficha, mais "Também tem" quando outro começa igual. */
async function respostaDeUm(db: Leitura, cliente: ClienteBase, tambem: ClienteBase[]): Promise<FerramentaSaida> {
  const [cartao, ...outros] = await paraCartoes(db, [cliente, ...tambem]);
  const fone = cartao.telefone ? `, telefone ${cartao.telefone}` : ', sem telefone cadastrado';
  const aviso = tambem.length ? `\n\nTambém tem: ${nomesDe(tambem)}.` : '';
  const blocos: RoBloco[] = [{ tipo: 'clientes', itens: [cartao] }];
  if (outros.length) blocos.push({ tipo: 'clientes', titulo: 'Também tem', itens: outros });
  return {
    mensagem: `Achei: **${cartao.nome}**${cartao.ativo ? '' : ' (cadastro inativo)'}${fone}. ${situacaoDaFicha(cartao.saldoCents ?? 0)}${aviso}`,
    blocos,
    contexto: resumoContexto([cartao, ...outros]),
  };
}

export async function buscarCliente(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const consulta = texto(args.consulta ?? args.nome);
  const idPedido = texto(args.cliente_id, 60) || (UUID.test(consulta) ? consulta : '');
  if (!consulta && !idPedido) {
    return { mensagem: 'Me diga o nome (ou um pedaço), o telefone ou o e-mail do cliente que eu procuro.', blocos: [] };
  }
  const todos = await todosClientes(db);

  if (idPedido) {
    const achado = todos.find((c) => c.id.toLowerCase() === idPedido.toLowerCase());
    if (!achado) return { mensagem: 'Não achei esse cadastro. Diga o nome ou o telefone do cliente.', blocos: [] };
    return respostaDeUm(db, achado, []);
  }

  const resultado = buscarClientes(todos, consulta, MAXIMO_DE_CARTOES);
  const unico = resolverUnico(resultado.achados);
  if (unico) return respostaDeUm(db, unico.cliente, unico.tambem);

  const cartoes = await paraCartoes(db, resultado.achados.map((a) => a.cliente));
  const semCandidato = !resultado.achados.some((a) => a.forte);
  if (cartoes.length === 0) return { mensagem: mensagemSemResultado(consulta, resultado.tipo), blocos: [], incerta: true };
  return {
    mensagem: mensagemLista(consulta, resultado, cartoes.length),
    blocos: [{ tipo: 'clientes', itens: cartoes, dica: 'Toque em "Ver ficha" no cliente certo.' }],
    contexto: resumoContexto(cartoes),
    incerta: semCandidato,
  };
}

const ROTULO_PAGAMENTO: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', debit: 'Débito', credit: 'Crédito', invoice: 'Ficha (fiado)', ficha_payment: 'Pagamento de ficha' };

/** Rótulo de botão: o nome, e o fim do telefone quando há mais de um cadastro com o mesmo nome. */
function rotuloDaOpcao(c: RoCliente, todos: RoCliente[]): string {
  const repetido = todos.filter((o) => normalizar(o.nome) === normalizar(c.nome)).length > 1;
  const fim = (c.telefone ?? '').replace(/\D/g, '').slice(-4);
  return repetido && fim ? `${c.nome} (telefone final ${fim})` : c.nome;
}

export async function fichaCliente(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const consulta = texto(args.consulta ?? args.nome);
  const id = texto(args.cliente_id, 60) || (UUID.test(consulta) ? consulta : '');
  const todos = await todosClientes(db);

  let cliente: ClienteBase | null = id ? (todos.find((c) => c.id.toLowerCase() === id.toLowerCase()) ?? null) : null;
  let tambem: ClienteBase[] = [];
  if (id && !cliente) return { mensagem: 'Não achei esse cadastro. Diga o nome ou o telefone do cliente.', blocos: [] };
  if (!cliente) {
    if (!consulta) return { mensagem: 'De qual cliente você quer ver a ficha? Me diga o nome (ou um pedaço) ou o telefone.', blocos: [] };
    const resultado = buscarClientes(todos, consulta, 6);
    const unico = resolverUnico(resultado.achados);
    if (unico) {
      cliente = unico.cliente;
      tambem = unico.tambem;
    } else {
      const cartoes = await paraCartoes(db, resultado.achados.map((a) => a.cliente));
      if (cartoes.length === 0) return { mensagem: mensagemSemResultado(consulta, resultado.tipo), blocos: [], incerta: true };
      const fortes = resultado.achados.some((a) => a.forte);
      const pergunta = fortes
        ? `Tem ${plural(resultado.total, 'cliente', 'clientes')} que ${concorda(resultado.total, 'combina', 'combinam')} com **${consulta}**. Qual ${concorda(resultado.total, 'é', 'deles')}?`
        : `Não achei **${consulta}**. Será que ${concorda(cartoes.length, 'é esta pessoa', 'é um destes')}? Toque para ver a ficha.`;
      return {
        mensagem: resultado.total > cartoes.length ? `${pergunta} (Mostrando ${cartoes.length} de ${resultado.total}; escreva mais um pedaço do nome para achar o certo.)` : pergunta,
        blocos: [{ tipo: 'opcoes', itens: cartoes.map((c) => ({ rotulo: rotuloDaOpcao(c, cartoes), pergunta: `ficha do cliente ${c.nome} [id:${c.id}]` })) }],
        contexto: resumoContexto(cartoes),
        incerta: !fortes,
      };
    }
  }

  const [saldo, compras, pagamentos] = await Promise.all([
    saldos(db, [cliente.id]),
    db.order.findMany({
      where: { customerId: cliente.id, status: { not: 'cancelled' }, paymentMethod: { not: 'ficha_payment' } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { createdAt: true, totalCents: true, status: true, paymentMethod: true, items: { take: 4, orderBy: { id: 'asc' }, select: { quantity: true, product: { select: { name: true } } } } },
    }),
    db.order.findMany({ where: { customerId: cliente.id, paymentMethod: 'ficha_payment' }, orderBy: { createdAt: 'desc' }, take: 3, select: { createdAt: true, totalCents: true } }),
  ]);
  const [cartao, ...outros] = await paraCartoes(db, [cliente, ...tambem]);
  cartao.saldoCents = saldo.get(cliente.id) ?? 0;

  const blocos: RoBloco[] = [{ tipo: 'clientes', itens: [cartao] }];
  if (outros.length) blocos.push({ tipo: 'clientes', titulo: 'Também tem', itens: outros });
  if (compras.length) {
    blocos.push({
      tipo: 'tabela',
      titulo: 'Últimas compras',
      colunas: [
        { key: 'quando', label: 'Quando', formato: 'dataHora' },
        { key: 'itens', label: 'Itens' },
        { key: 'pagamento', label: 'Pagamento' },
        { key: 'valor', label: 'Valor', align: 'right', formato: 'dinheiro' },
      ],
      linhas: compras.map((c) => ({
        quando: c.createdAt.toISOString(),
        itens: c.items.map((i) => `${i.quantity}× ${i.product?.name ?? 'Item'}`).join(', ') || '—',
        pagamento: ROTULO_PAGAMENTO[String(c.paymentMethod)] ?? '—',
        valor: c.totalCents,
      })),
    });
  }
  if (pagamentos.length) {
    blocos.push({
      tipo: 'tabela',
      titulo: 'Últimos pagamentos da ficha',
      colunas: [
        { key: 'quando', label: 'Quando', formato: 'dataHora' },
        { key: 'valor', label: 'Valor', align: 'right', formato: 'dinheiro' },
      ],
      linhas: pagamentos.map((p) => ({ quando: p.createdAt.toISOString(), valor: p.totalCents })),
    });
  }

  const s = cartao.saldoCents ?? 0;
  const nome = nomeParaConversa(cliente, todos);
  const situacao = s > 0 ? `**${nome}** deve **${brl(s)}** na ficha.` : s < 0 ? `**${nome}** tem **${brl(-s)}** de crédito.` : `A ficha de **${nome}** está em dia.`;
  const fone = cartao.telefone ? ` Telefone: ${cartao.telefone}.` : '';
  const aviso = tambem.length ? `\n\nTambém tem: ${nomesDe(tambem)}.` : '';
  return { mensagem: `${situacao}${fone}${aviso}`, blocos, contexto: resumoContexto([cartao, ...outros]) };
}

const mostrandoOs = (limite: number) => (limite === 1 ? 'Mostrando o maior.' : `Mostrando os ${limite} maiores.`);

export async function clientesDevendo(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const limite = inteiro(args.limite, 15, 1, 40);
  const minimoReais = typeof args.valor_minimo === 'number' ? args.valor_minimo : typeof args.valor_minimo === 'string' ? Number(args.valor_minimo.replace(',', '.')) : NaN;
  const minimo = Number.isFinite(minimoReais) && minimoReais > 0 ? Math.round(minimoReais * 100) : 0;
  const [mapa, todos] = await Promise.all([saldos(db), todosClientes(db)]);
  const devendo = [...mapa.entries()].filter(([, v]) => v > 0 && v >= minimo).sort((a, b) => b[1] - a[1]);
  const total = devendo.reduce((soma, [, v]) => soma + v, 0);
  if (devendo.length === 0) return { mensagem: minimo ? `Ninguém deve ${brl(minimo)} ou mais na ficha agora.` : 'Ninguém está devendo na ficha agora.', blocos: [] };

  const porId = new Map(todos.map((c) => [c.id, c]));
  const recorte = devendo.slice(0, limite).filter(([id]) => porId.has(id));
  const cartoes = await paraCartoes(db, recorte.map(([id]) => porId.get(id)!));
  for (const c of cartoes) {
    c.saldoCents = mapa.get(c.id) ?? 0;
    if (c.saldoCents > 0 && c.saldoCents < 100) c.nota = 'só centavos de diferença';
  }
  cartoes.sort((a, b) => (b.saldoCents ?? 0) - (a.saldoCents ?? 0));

  const quem = minimo ? `${plural(devendo.length, 'cliente deve', 'clientes devem')} ${brl(minimo)} ou mais` : plural(devendo.length, 'cliente deve', 'clientes devem');
  return {
    mensagem: `**${quem}** na ficha, somando **${brl(total)}**.${devendo.length > limite ? ` ${mostrandoOs(limite)}` : ''}`,
    blocos: [
      { tipo: 'metricas', itens: [{ rotulo: 'A receber na ficha', valor: brl(total), tom: 'atencao' }, { rotulo: 'Clientes devendo', valor: String(devendo.length) }] },
      { tipo: 'clientes', itens: cartoes },
    ],
    contexto: resumoContexto(cartoes.slice(0, 15)),
  };
}

export async function clientesCredito(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const limite = inteiro(args.limite, 15, 1, 40);
  const [mapa, todos] = await Promise.all([saldos(db), todosClientes(db)]);
  const comCredito = [...mapa.entries()].filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  if (comCredito.length === 0) return { mensagem: 'Ninguém tem crédito na ficha agora.', blocos: [] };
  const total = comCredito.reduce((soma, [, v]) => soma - v, 0);
  const porId = new Map(todos.map((c) => [c.id, c]));
  const recorte = comCredito.slice(0, limite).filter(([id]) => porId.has(id));
  const cartoes = await paraCartoes(db, recorte.map(([id]) => porId.get(id)!));
  for (const c of cartoes) c.saldoCents = mapa.get(c.id) ?? 0;
  cartoes.sort((a, b) => (a.saldoCents ?? 0) - (b.saldoCents ?? 0));
  return {
    mensagem: `**${plural(comCredito.length, 'cliente tem', 'clientes têm')} crédito** na ficha (pagou a mais), somando **${brl(total)}**.${comCredito.length > limite ? ` ${mostrandoOs(limite)}` : ''}`,
    blocos: [{ tipo: 'clientes', itens: cartoes }],
    contexto: resumoContexto(cartoes.slice(0, 15)),
  };
}

export async function clientesInativos(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const dias = inteiro(args.dias, 30, 1, 365);
  const limite = inteiro(args.limite, 15, 1, 40);
  const agora = new Date();
  const corte = new Date(agora.getTime() - dias * 86_400_000);
  const linhas = await db.$queryRaw<{ id: string; ultimo: Date | null; total: number }[]>`
    SELECT c.id, MAX(o."createdAt") AS ultimo, COUNT(*) OVER()::int AS total
    FROM "Customer" c
    LEFT JOIN "Order" o ON o."customerId" = c.id AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
    WHERE c.active = true
    GROUP BY c.id
    HAVING MAX(o."createdAt") IS NULL OR MAX(o."createdAt") < ${corte}
    ORDER BY MAX(o."createdAt") ASC NULLS FIRST, c.id
    LIMIT ${limite}`;
  if (linhas.length === 0) return { mensagem: `Todo cliente ativo comprou nos últimos ${dias} dias.`, blocos: [] };
  const total = linhas[0].total;
  const todos = await todosClientes(db);
  const porId = new Map(todos.map((c) => [c.id, c]));
  const base = linhas.map((l) => porId.get(l.id)).filter((c): c is ClienteBase => Boolean(c));
  const hoje = dateStringSP(agora);
  const notas = new Map<string, string>();
  for (const l of linhas) {
    if (!l.ultimo) notas.set(l.id, 'nunca comprou');
    else {
      const dia = dateStringSP(l.ultimo);
      notas.set(l.id, `última compra em ${dataBR(dia)} (há ${plural(diasEntre(dia, hoje), 'dia', 'dias')})`);
    }
  }
  const cartoes = await paraCartoes(db, base, notas);
  return {
    mensagem: `**${plural(total, 'cliente ativo', 'clientes ativos')}** sem comprar há mais de ${plural(dias, 'dia', 'dias')}.${total > linhas.length ? ` Mostrando ${linhas.length === 1 ? 'o que está' : `os ${linhas.length} que estão`} há mais tempo sem comprar.` : ''}`,
    blocos: [{ tipo: 'clientes', itens: cartoes }],
    contexto: resumoContexto(cartoes.slice(0, 15)),
  };
}

/* ------------------------------------------------------------------ vendas */

interface ResumoVendas {
  vendido: number;
  qtd: number;
  avista: number;
  fiado: number;
  pagamentosFicha: number;
  porForma: { pm: string; n: number; cents: number }[];
}

async function resumoVendas(db: Leitura, p: PeriodoResolvido, clienteId: string | null = null): Promise<ResumoVendas> {
  const linhas = await db.$queryRaw<{ pm: string | null; n: number; cents: number }[]>`
    SELECT "paymentMethod"::text AS pm, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS cents
    FROM "Order"
    WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled'
      AND (${clienteId}::text IS NULL OR "customerId" = ${clienteId}::text)
    GROUP BY 1`;
  let vendido = 0;
  let qtd = 0;
  let avista = 0;
  let fiado = 0;
  let pagamentosFicha = 0;
  for (const l of linhas) {
    if (l.pm === 'ficha_payment') {
      pagamentosFicha += l.cents;
      continue;
    }
    vendido += l.cents;
    qtd += l.n;
    if (l.pm === 'invoice') fiado += l.cents;
    else avista += l.cents;
  }
  return { vendido, qtd, avista, fiado, pagamentosFicha, porForma: linhas.map((l) => ({ pm: l.pm ?? 'outro', n: l.n, cents: l.cents })) };
}

const FORMAS: { chaves: string[]; pms: string[]; rotulo: string }[] = [
  { chaves: ['pix'], pms: ['pix'], rotulo: 'PIX' },
  { chaves: ['dinheiro', 'cash', 'especie'], pms: ['cash'], rotulo: 'dinheiro' },
  { chaves: ['debito', 'debit'], pms: ['debit'], rotulo: 'cartão de débito' },
  { chaves: ['credito', 'credit'], pms: ['credit'], rotulo: 'cartão de crédito' },
  { chaves: ['cartao', 'cartoes'], pms: ['debit', 'credit'], rotulo: 'cartão' },
  { chaves: ['fiado', 'ficha', 'invoice'], pms: ['invoice'], rotulo: 'fiado (ficha)' },
];

const formaDe = (v: unknown) => {
  const chave = normalizar(texto(v, 30));
  return chave ? (FORMAS.find((f) => f.chaves.includes(chave)) ?? null) : null;
};

export async function vendas(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = periodoDe(args, 'hoje');
  if (deuErro(p)) return p;
  const forma = formaDe(args.forma);

  let cliente: ClienteBase | null = null;
  let todos: ClienteBase[] = [];
  const idPedido = texto(args.cliente_id, 60);
  const nomePedido = texto(args.cliente);
  if (idPedido || nomePedido) {
    todos = await todosClientes(db);
    cliente = idPedido ? (todos.find((c) => c.id.toLowerCase() === idPedido.toLowerCase()) ?? null) : null;
    if (!cliente && nomePedido) cliente = resolverUnico(buscarClientes(todos, nomePedido, 6).achados)?.cliente ?? null;
    if (!cliente) {
      const escolha = await buscarCliente(db, { consulta: nomePedido });
      return { ...escolha, mensagem: `Para ver as compras, preciso saber de qual cliente se trata. ${escolha.mensagem}` };
    }
  }

  const r = await resumoVendas(db, p, cliente?.id ?? null);
  const quem = cliente ? `**${nomeParaConversa(cliente, todos)}**` : null;
  const contexto = cliente ? resumoContexto([{ id: cliente.id, nome: cliente.name }]) : undefined;
  if (r.qtd === 0 && r.pagamentosFicha === 0) {
    return { mensagem: quem ? `${quem} não comprou ${p.rotulo}.` : `Nenhuma venda registrada ${p.rotulo}.`, blocos: [], contexto };
  }
  const recebido = r.avista + r.pagamentosFicha;

  // só uma forma de pagamento ("quanto vendi no pix")
  if (forma) {
    const linhasForma = r.porForma.filter((f) => forma.pms.includes(f.pm));
    const cents = linhasForma.reduce((s, f) => s + f.cents, 0);
    const n = linhasForma.reduce((s, f) => s + f.n, 0);
    if (n === 0) return { mensagem: `${quem ? `${quem}: n` : 'N'}enhuma venda no ${forma.rotulo} ${p.rotulo}. O total vendido foi **${brl(r.vendido)}**.`, blocos: [], contexto };
    return {
      mensagem: `${quem ? `${quem}, ` : ''}${maiuscula(p.rotulo)}, no ${forma.rotulo}: **${brl(cents)}** em ${plural(n, 'venda', 'vendas')}. No total foram **${brl(r.vendido)}** em ${plural(r.qtd, 'venda', 'vendas')}.`,
      blocos: [
        {
          tipo: 'metricas',
          titulo: maiuscula(p.rotulo),
          itens: [
            { rotulo: `No ${forma.rotulo}`, valor: brl(cents), dica: plural(n, 'venda', 'vendas'), tom: 'ok' },
            { rotulo: 'Total vendido', valor: brl(r.vendido), dica: plural(r.qtd, 'venda', 'vendas') },
          ],
        },
      ],
      contexto,
    };
  }

  const blocos: RoBloco[] = [
    {
      tipo: 'metricas',
      titulo: maiuscula(p.rotulo),
      itens: [
        { rotulo: 'Vendido', valor: brl(r.vendido), dica: plural(r.qtd, 'venda', 'vendas'), tom: 'ok' },
        { rotulo: 'À vista', valor: brl(r.avista), dica: 'dinheiro, PIX, débito e crédito' },
        { rotulo: 'Na ficha (fiado)', valor: brl(r.fiado), dica: 'ainda a receber', tom: r.fiado > 0 ? 'atencao' : 'neutro' },
        { rotulo: 'Pagamentos de ficha', valor: brl(r.pagamentosFicha), dica: 'dinheiro que entrou de dívidas' },
        { rotulo: 'Entrou no caixa', valor: brl(recebido), dica: 'à vista + pagamentos de ficha' },
        { rotulo: 'Ticket médio', valor: r.qtd ? brl(Math.round(r.vendido / r.qtd)) : brl(0) },
      ],
    },
  ];

  const porForma = r.porForma.filter((f) => f.pm !== 'ficha_payment').sort((a, b) => b.cents - a.cents);
  if (porForma.length > 1) {
    blocos.push({
      tipo: 'tabela',
      titulo: 'Por forma de pagamento',
      colunas: [
        { key: 'forma', label: 'Forma' },
        { key: 'n', label: 'Vendas', align: 'right', formato: 'inteiro' },
        { key: 'valor', label: 'Valor', align: 'right', formato: 'dinheiro' },
      ],
      linhas: porForma.map((f) => ({ forma: ROTULO_PAGAMENTO[f.pm] ?? f.pm, n: f.n, valor: f.cents })),
    });
  }

  let melhor = '';
  if (p.dias > 1) {
    const mensal = p.dias > 62;
    const filtro = cliente?.id ?? null;
    const linhas = mensal
      ? await db.$queryRaw<{ ref: string; n: number; vendido: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'), 'MM/YYYY') AS ref, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS vendido
          FROM "Order" WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled' AND "paymentMethod" IS DISTINCT FROM 'ficha_payment'
            AND (${filtro}::text IS NULL OR "customerId" = ${filtro}::text)
          GROUP BY 1 ORDER BY MIN("createdAt")`
      : await db.$queryRaw<{ ref: string; n: number; vendido: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM') AS ref, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS vendido
          FROM "Order" WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled' AND "paymentMethod" IS DISTINCT FROM 'ficha_payment'
            AND (${filtro}::text IS NULL OR "customerId" = ${filtro}::text)
          GROUP BY 1 ORDER BY MIN("createdAt")`;
    if (linhas.length > 1) {
      blocos.push({
        tipo: 'tabela',
        titulo: mensal ? 'Por mês' : 'Por dia',
        colunas: [
          { key: 'ref', label: mensal ? 'Mês' : 'Dia' },
          { key: 'n', label: 'Vendas', align: 'right', formato: 'inteiro' },
          { key: 'vendido', label: 'Vendido', align: 'right', formato: 'dinheiro' },
        ],
        linhas: linhas as unknown as Record<string, unknown>[],
      });
      const topo = linhas.reduce((a, b) => (b.vendido > a.vendido ? b : a));
      melhor = ` ${mensal ? 'O melhor mês' : 'O melhor dia'} foi ${topo.ref}, com ${brl(topo.vendido)}.`;
    }
  }

  if (r.qtd === 0) {
    return { mensagem: `${quem ? `${quem}: n` : 'N'}ão houve venda ${p.rotulo}, mas entraram **${brl(r.pagamentosFicha)}** de pagamentos de ficha.`, blocos, contexto };
  }
  const abertura = quem ? `${quem} ${p.rotulo} fez ${plural(r.qtd, 'compra', 'compras')}, somando **${brl(r.vendido)}**: ` : `${maiuscula(p.rotulo)} foram **${brl(r.vendido)}** em ${plural(r.qtd, 'venda', 'vendas')}: `;
  return {
    mensagem: `${abertura}**${brl(r.avista)}** à vista e **${brl(r.fiado)}** na ficha. Entraram no caixa **${brl(recebido)}**.${melhor}`,
    blocos,
    contexto,
  };
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const DIA_NO_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];

const eTaxaDeEntrega = (nome: string) => /^tele\s*entrega/.test(normalizar(nome));

export async function produtosMaisVendidos(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = periodoDe({ ...args, periodo: texto(args.periodo) || (args.de || args.ate ? undefined : 'este_mes') }, 'este_mes');
  if (deuErro(p)) return p;
  const limite = inteiro(args.limite, 10, 1, 30);
  const produto = normalizar(texto(args.produto, 60));
  const diaNome = normalizar(texto(args.dia_da_semana, 20)).replace(/ feira$/, '').replace(/s$/, '');
  const dow = diaNome ? DIAS_DA_SEMANA.findIndex((d) => d === diaNome || d.startsWith(diaNome)) : -1;
  const diaFiltro = dow >= 0 ? dow : null;
  const todas = await db.$queryRaw<{ nome: string; qtd: number; receita: number }[]>`
    SELECT p.name AS nome, SUM(oi.quantity)::int AS qtd, COALESCE(SUM(oi.quantity * oi."priceCents"), 0)::int AS receita
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "Product" p ON p.id = oi."productId"
    WHERE o."createdAt" >= ${p.inicio} AND o."createdAt" <= ${p.fim} AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
      AND (${diaFiltro}::int IS NULL OR EXTRACT(DOW FROM (o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'))::int = ${diaFiltro}::int)
    GROUP BY p.id, p.name
    ORDER BY qtd DESC, receita DESC, p.name ASC
    LIMIT 500`;
  // a taxa de entrega é cadastrada como produto, mas não é item do cardápio
  const linhas = todas.filter((l) => !eTaxaDeEntrega(l.nome) && (!produto || normalizar(l.nome).includes(produto)));
  const recorte = linhas.slice(0, limite);
  const filtros = [produto ? `com **${texto(args.produto, 60)}**` : '', dow >= 0 ? `só ${DIA_NO_PLURAL[dow]}` : ''].filter(Boolean).join(', ');
  if (recorte.length === 0) return { mensagem: `Não houve venda de produtos${filtros ? ` ${filtros}` : ''} ${p.rotulo}.`, blocos: [] };
  const soma = produto ? linhas.reduce((s, l) => s + l.qtd, 0) : 0;
  return {
    mensagem: `Os mais vendidos ${p.rotulo}${filtros ? ` (${filtros})` : ''}: **${recorte[0].nome}** lidera com ${plural(recorte[0].qtd, 'unidade', 'unidades')}.${produto ? ` Somando os produtos com esse nome: ${plural(soma, 'unidade', 'unidades')}.` : ''}`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'pos', label: '#', formato: 'inteiro' },
          { key: 'nome', label: 'Produto' },
          { key: 'qtd', label: 'Qtd', align: 'right', formato: 'inteiro' },
          { key: 'receita', label: 'Receita (sem desconto)', align: 'right', formato: 'dinheiro' },
        ],
        linhas: recorte.map((l, i) => ({ pos: i + 1, ...l })) as unknown as Record<string, unknown>[],
      },
    ],
  };
}

export async function clientesTop(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = periodoDe({ ...args, periodo: texto(args.periodo) || (args.de || args.ate ? undefined : 'este_mes') }, 'este_mes');
  if (deuErro(p)) return p;
  const limite = inteiro(args.limite, 10, 1, 30);
  const linhas = await db.$queryRaw<{ id: string; nome: string; pedidos: number; gasto: number }[]>`
    SELECT c.id, c.name AS nome, COUNT(o.id)::int AS pedidos, COALESCE(SUM(o."totalCents"), 0)::int AS gasto
    FROM "Order" o JOIN "Customer" c ON c.id = o."customerId"
    WHERE o."createdAt" >= ${p.inicio} AND o."createdAt" <= ${p.fim} AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
    GROUP BY c.id, c.name ORDER BY gasto DESC, pedidos DESC, c.name ASC, c.id ASC LIMIT ${limite}`;
  if (linhas.length === 0) return { mensagem: `Nenhum cliente comprou ${p.rotulo}.`, blocos: [] };
  return {
    mensagem: `Quem mais comprou ${p.rotulo}: **${linhas[0].nome}**, com ${brl(linhas[0].gasto)} em ${plural(linhas[0].pedidos, 'compra', 'compras')}.`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'pos', label: '#', formato: 'inteiro' },
          { key: 'nome', label: 'Cliente' },
          { key: 'pedidos', label: 'Compras', align: 'right', formato: 'inteiro' },
          { key: 'gasto', label: 'Total', align: 'right', formato: 'dinheiro' },
        ],
        linhas: linhas.map((l, i) => ({ pos: i + 1, nome: l.nome, pedidos: l.pedidos, gasto: l.gasto })),
      },
    ],
    contexto: resumoContexto(linhas.slice(0, 15).map((l) => ({ id: l.id, nome: l.nome }))),
  };
}

/* ------------------------------------------------------------------ pedidos, despesas, lucro */

const SITUACAO: Record<string, string> = { pending: 'Aguardando', preparing: 'Em preparo', ready: 'Pronto para retirar', out_for_delivery: 'Saiu para entrega', in_transit: 'A caminho' };

export async function pedidosEmAberto(db: Leitura): Promise<FerramentaSaida> {
  const pedidos = await db.preOrder.findMany({
    where: { OR: [{ deliveryStatus: { in: ['pending', 'preparing', 'ready', 'out_for_delivery', 'in_transit'] } }, { source: 'online', approval: 'awaiting' }] },
    orderBy: { createdAt: 'asc' },
    take: 40,
    select: { createdAt: true, totalCents: true, deliveryStatus: true, source: true, approval: true, customer: { select: { name: true } } },
  });
  const validos = pedidos.filter((p) => p.deliveryStatus !== 'cancelled' && p.approval !== 'rejected');
  const aguardando = validos.filter((p) => p.source === 'online' && p.approval === 'awaiting').length;
  const aceite = aguardando === 0 ? 'Nenhum pedido online está esperando você aceitar.' : `${plural(aguardando, 'pedido online está esperando', 'pedidos online estão esperando')} você aceitar.`;
  if (validos.length === 0) return { mensagem: `Não há pré-pedido em aberto agora. ${aceite}`, blocos: [] };
  return {
    mensagem: `Tem **${plural(validos.length, 'pré-pedido em aberto', 'pré-pedidos em aberto')}**. ${aceite}`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'cliente', label: 'Cliente' },
          { key: 'situacao', label: 'Situação' },
          { key: 'valor', label: 'Valor', align: 'right', formato: 'dinheiro' },
          { key: 'quando', label: 'Feito', formato: 'dataHora' },
        ],
        linhas: validos.map((p) => ({
          cliente: p.customer?.name ?? 'Sem cliente',
          situacao: p.source === 'online' && p.approval === 'awaiting' ? 'Aguardando aceite (online)' : (SITUACAO[p.deliveryStatus] ?? p.deliveryStatus),
          valor: p.totalCents,
          quando: p.createdAt.toISOString(),
        })),
      },
    ],
  };
}

async function totalDespesas(db: Leitura, p: PeriodoResolvido) {
  // a data da despesa é um dia puro (00:00 UTC): compara por dia, não pelo instante de Brasília
  const { inicio, fim } = limitesDeDespesa(p);
  const [total, porTipo] = await Promise.all([
    db.expense.aggregate({ where: { date: { gte: inicio, lte: fim } }, _sum: { amountCents: true }, _count: true }),
    db.$queryRaw<{ tipo: string; n: number; cents: number }[]>`
      SELECT et.name AS tipo, COUNT(e.id)::int AS n, COALESCE(SUM(e."amountCents"), 0)::int AS cents
      FROM "Expense" e JOIN "ExpenseType" et ON et.id = e."typeId"
      WHERE e.date >= ${inicio} AND e.date <= ${fim}
      GROUP BY et.id, et.name ORDER BY cents DESC, et.name ASC LIMIT 10`,
  ]);
  return { cents: total._sum.amountCents ?? 0, n: total._count, porTipo };
}

export async function despesas(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = periodoDe(args, 'este_mes');
  if (deuErro(p)) return p;
  const d = await totalDespesas(db, p);
  if (d.n === 0) return { mensagem: `Nenhuma despesa lançada ${p.rotulo}.`, blocos: [] };
  const destaque = d.porTipo.length > 1 ? ` A maior parte foi **${d.porTipo[0].tipo}**.` : d.porTipo.length === 1 ? ` Tudo em **${d.porTipo[0].tipo}**.` : '';
  return {
    mensagem: `${maiuscula(p.rotulo)} as despesas somam **${brl(d.cents)}** (${plural(d.n, 'lançamento', 'lançamentos')}).${destaque}`,
    blocos: [
      {
        tipo: 'tabela',
        titulo: 'Por tipo de despesa',
        colunas: [
          { key: 'tipo', label: 'Tipo' },
          { key: 'n', label: 'Lançamentos', align: 'right', formato: 'inteiro' },
          { key: 'cents', label: 'Total', align: 'right', formato: 'dinheiro' },
        ],
        linhas: d.porTipo as unknown as Record<string, unknown>[],
      },
    ],
  };
}

export async function lucro(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = periodoDe(args, 'este_mes');
  if (deuErro(p)) return p;
  const [v, d] = await Promise.all([resumoVendas(db, p), totalDespesas(db, p)]);
  if (v.qtd === 0 && v.pagamentosFicha === 0 && d.n === 0) {
    return { mensagem: `Não há venda nem despesa lançada ${p.rotulo}, então não dá para calcular o lucro. Tente outro período.`, blocos: [] };
  }
  const recebido = v.avista + v.pagamentosFicha;
  const caixa = recebido - d.cents;
  const resultado = v.vendido - d.cents;
  const obs = v.pagamentosFicha > 0 ? '\n\n_Obs.: os pagamentos de ficha entram na conta assim que são lançados, mesmo antes de confirmados._' : '';
  return {
    mensagem: `${maiuscula(p.rotulo)}: entrou **${brl(recebido)}** no caixa e saíram **${brl(d.cents)}** em despesas, então o lucro de caixa é **${brl(caixa)}**. Contando também o fiado a receber, o resultado das vendas é **${brl(resultado)}**.${obs}`,
    blocos: [
      {
        tipo: 'metricas',
        titulo: maiuscula(p.rotulo),
        itens: [
          { rotulo: 'Vendido', valor: brl(v.vendido), dica: `${brl(v.avista)} à vista + ${brl(v.fiado)} na ficha` },
          { rotulo: 'Entrou no caixa', valor: brl(recebido), dica: 'à vista + pagamentos de ficha lançados' },
          { rotulo: 'Despesas', valor: brl(d.cents) },
          { rotulo: 'Lucro de caixa', valor: brl(caixa), tom: caixa >= 0 ? 'ok' : 'atencao', dica: 'caixa menos despesas' },
          { rotulo: 'Resultado das vendas', valor: brl(resultado), tom: resultado >= 0 ? 'ok' : 'atencao', dica: 'vendido (com fiado) menos despesas' },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ produtos, cardápio, WhatsApp */

export async function produtoBuscar(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const consulta = texto(args.consulta ?? args.nome);
  const digitadas = palavras(consulta);
  if (digitadas.length > 0 && digitadas.join('').length < 3) return { mensagem: 'Escreva pelo menos 3 letras do nome do produto.', blocos: [] };
  const produtos = await db.product.findMany({ select: { id: true, name: true, priceCents: true, pricePerKgCents: true, stockEnabled: true, stock: true, active: true }, orderBy: { name: 'asc' } });
  const achados = digitadas.length
    ? produtos.filter((pr) => {
        const nome = normalizar(pr.name);
        return digitadas.every((d) => nome.includes(d) || nome.split(' ').some((w) => w.startsWith(d.slice(0, Math.max(3, d.length - 1)))));
      })
    : produtos.slice(0, 15);
  // nada com todas as palavras juntas ("marmita de frango"): tenta com cada palavra, e diz isso
  const porPalavra =
    achados.length === 0 && digitadas.length > 1
      ? produtos.filter((pr) => {
          const nome = normalizar(pr.name);
          return digitadas.some((d) => d.length >= 3 && (nome.includes(d) || nome.split(' ').some((w) => w.startsWith(d.slice(0, Math.max(3, d.length - 1))))));
        })
      : [];
  if (achados.length === 0 && porPalavra.length === 0) return { mensagem: `Não achei produto com **${consulta}**.`, blocos: [] };
  const lista = achados.length > 0 ? achados : porPalavra;
  return {
    mensagem: achados.length === 0 ? `Não achei **${consulta}** junto, mas ${concorda(porPalavra.length, 'achei este produto', 'achei estes produtos')} com uma das palavras:` : digitadas.length ? `Achei ${plural(achados.length, 'produto', 'produtos')} com **${consulta}**.` : `Estes são os produtos cadastrados (${produtos.length} no total):`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'nome', label: 'Produto' },
          { key: 'preco', label: 'Preço', align: 'right', formato: 'dinheiro' },
          { key: 'estoque', label: 'Estoque', align: 'right' },
          { key: 'situacao', label: 'Situação' },
        ],
        linhas: lista.slice(0, 20).map((pr) => ({
          nome: pr.name,
          preco: pr.pricePerKgCents ?? pr.priceCents,
          estoque: pr.stockEnabled ? String(pr.stock ?? 0) : '—',
          situacao: pr.active ? 'Ativo' : 'Inativo',
        })),
      },
    ],
  };
}

export async function cardapio(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const hoje = dateStringSP();
  const pedido = texto(args.data, 10);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : normalizar(pedido) === 'amanha' ? dateStringSP(new Date(Date.now() + 86_400_000)) : hoje;
  let menu: { title: string | null; status: string; sections: { name: string; items: { name: string; featured: boolean; vegetarian: boolean }[] }[] } | null = null;
  try {
    menu = await db.dailyMenu.findUnique({
      where: { date: dia },
      select: { title: true, status: true, sections: { orderBy: { position: 'asc' }, select: { name: true, items: { orderBy: { position: 'asc' }, select: { name: true, featured: true, vegetarian: true } } } } },
    });
  } catch {
    return { mensagem: 'O cardápio do dia ainda não está disponível neste ambiente.', blocos: [] };
  }
  const quando = dia === hoje ? 'hoje' : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  if (!menu) return { mensagem: `Não há cardápio montado para ${quando}.`, blocos: [] };
  const linhas = menu.sections.flatMap((s) => [`**${s.name}**`, ...s.items.map((i) => `- ${i.name}${i.featured ? ' ⭐' : ''}${i.vegetarian ? ' (vegetariano)' : ''}`)]);
  const situacao = menu.status === 'published' ? '' : '\n\n_Este cardápio ainda é rascunho: o cliente não vê._';
  return { mensagem: `Cardápio de ${quando}${menu.title ? `: **${menu.title}**` : ''}\n\n${linhas.join('\n')}${situacao}`, blocos: [] };
}

export async function whatsappNaoLidas(db: Leitura): Promise<FerramentaSaida> {
  const grupos = await db.whatsAppMessage.groupBy({
    by: ['customerId'],
    where: { fromMe: false, readAt: null, customerId: { not: null } },
    _count: true,
    orderBy: { _count: { customerId: 'desc' } },
    take: 15,
  });
  if (grupos.length === 0) return { mensagem: 'Nenhuma conversa com mensagem nova no WhatsApp.', blocos: [] };
  const todos = await todosClientes(db);
  const porId = new Map(todos.map((c) => [c.id, c]));
  const notas = new Map(grupos.map((g) => [g.customerId as string, `${plural(g._count, 'mensagem nova', 'mensagens novas')}`]));
  const lista = grupos.map((g) => porId.get(g.customerId as string)).filter((c): c is ClienteBase => Boolean(c));
  const cartoes = await paraCartoes(db, lista, notas);
  const total = grupos.reduce((s, g) => s + g._count, 0);
  return {
    mensagem: `Tem **${plural(total, 'mensagem nova', 'mensagens novas')}** em ${plural(grupos.length, 'conversa', 'conversas')} do WhatsApp.`,
    blocos: [{ tipo: 'clientes', itens: cartoes }],
    contexto: resumoContexto(cartoes),
  };
}

/** Pergunta curta com opções para tocar. As opções podem ser texto ou { rotulo, pergunta }. Sem 2 opções boas, só pergunta. */
export function esclarecer(args: Argumentos): FerramentaSaida {
  const pergunta = texto(args.pergunta, 200) || 'Pode me dar mais um detalhe?';
  const bruto = Array.isArray(args.opcoes) ? args.opcoes : [];
  const vistos = new Set<string>();
  const itens: { rotulo: string; pergunta: string }[] = [];
  for (const o of bruto) {
    const objeto = typeof o === 'object' && o ? (o as Record<string, unknown>) : null;
    const rotulo = objeto ? texto(objeto.rotulo, 80) : texto(o, 80);
    const envio = objeto ? texto(objeto.pergunta, 200) || rotulo : rotulo;
    const chave = normalizar(rotulo);
    if (chave.length < 2 || chave === normalizar(pergunta) || vistos.has(chave)) continue;
    vistos.add(chave);
    itens.push({ rotulo, pergunta: envio });
  }
  const opcoes = itens.slice(0, 6);
  if (opcoes.length < 2) return { mensagem: `${pergunta} Escreva o nome (ou um pedaço dele) ou o telefone.`, blocos: [] };
  return { mensagem: pergunta, blocos: [{ tipo: 'opcoes', itens: opcoes }] };
}

export function ajuda(): FerramentaSaida {
  return {
    mensagem: [
      'Eu consulto os dados do sistema para você. Pode perguntar do jeito que falaria no balcão:',
      '- **Clientes**: "Maria", "telefone 5599…", "quem está devendo?", "quem sumiu há 30 dias?"',
      '- **Ficha**: "ficha da Ingrid", "quanto a Maria deve?"',
      '- **Vendas**: "vendas de hoje", "quanto vendi esta semana?", "quanto vendi no pix", "produtos mais vendidos do mês"',
      '- **Pedidos**: "pedidos em aberto", "tem pedido online esperando?"',
      '- **Dinheiro**: "despesas do mês", "lucro do mês"',
      '- **Outros**: "cardápio de hoje", "mensagens de WhatsApp não lidas", "preço da marmita"',
      'Se você não souber o nome inteiro, escreva o que lembrar: eu procuro por pedaço do nome, sem se importar com acento. Eu só consulto: não altero nada no sistema.',
    ].join('\n'),
    blocos: [],
  };
}

/* ------------------------------------------------------------------ catálogo e despacho */

export type NomeFerramenta =
  | 'buscar_cliente'
  | 'ficha_cliente'
  | 'clientes_devendo'
  | 'clientes_credito'
  | 'clientes_inativos'
  | 'clientes_top'
  | 'vendas'
  | 'produtos_mais_vendidos'
  | 'pedidos_em_aberto'
  | 'despesas'
  | 'lucro'
  | 'cardapio'
  | 'whatsapp_nao_lidas'
  | 'produto_buscar'
  | 'esclarecer'
  | 'ajuda';

const FALHA_AMIGAVEL = 'Não consegui consultar isso agora. Tente de novo em instantes; se continuar, avise quem cuida do sistema.';

export async function executarFerramenta(nome: string, argsBrutos: Argumentos): Promise<FerramentaSaida> {
  const args: Argumentos = argsBrutos && typeof argsBrutos === 'object' && !Array.isArray(argsBrutos) ? argsBrutos : {};
  if (nome === 'esclarecer') return esclarecer(args);
  if (nome === 'ajuda') return ajuda();
  try {
    // toda consulta ao banco passa por aqui: transação somente leitura (ver db.ts)
    return await lerSomente((db) => {
      switch (nome) {
        case 'buscar_cliente':
          return buscarCliente(db, args);
        case 'ficha_cliente':
          return fichaCliente(db, args);
        case 'clientes_devendo':
          return clientesDevendo(db, args);
        case 'clientes_credito':
          return clientesCredito(db, args);
        case 'clientes_inativos':
          return clientesInativos(db, args);
        case 'clientes_top':
          return clientesTop(db, args);
        case 'vendas':
          return vendas(db, args);
        case 'produtos_mais_vendidos':
          return produtosMaisVendidos(db, args);
        case 'pedidos_em_aberto':
          return pedidosEmAberto(db);
        case 'despesas':
          return despesas(db, args);
        case 'lucro':
          return lucro(db, args);
        case 'cardapio':
          return cardapio(db, args);
        case 'whatsapp_nao_lidas':
          return whatsappNaoLidas(db);
        case 'produto_buscar':
          return produtoBuscar(db, args);
        default:
          return Promise.resolve({ mensagem: 'Não sei fazer isso ainda. Pergunte "ajuda" para ver o que eu consigo consultar.', blocos: [] });
      }
    });
  } catch (error) {
    // vai para o log o tipo e a última linha da mensagem (o motivo do banco, ex.: "permission denied for table X"); o começo da mensagem repete a consulta e pode trazer o que a pessoa digitou
    const motivo = error instanceof Error ? error.message.trim().split('\n').pop()?.slice(0, 200) ?? '' : '';
    console.error('[RO][ferramenta]', nome, error instanceof Error ? error.name : 'erro', (error as { code?: string })?.code ?? '', motivo);
    return { mensagem: FALHA_AMIGAVEL, blocos: [] };
  }
}

export { PERIODOS };

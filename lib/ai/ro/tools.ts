// Ferramentas da RO: cada uma responde uma família de perguntas com consultas escritas aqui no código (nada de
// SQL vindo da IA). A IA só escolhe qual ferramenta usar e com quais argumentos; o texto e os cartões saem daqui.
//
// Regras de negócio (as mesmas das telas do admin):
// - Venda = pedido não cancelado que não é "pagamento de ficha". Inclui o fiado (paymentMethod "invoice").
// - À vista = dinheiro, PIX, débito e crédito. Fiado = lançado na ficha, ainda a receber.
// - Recebido = vendas à vista + pagamentos de ficha.
// - Saldo da ficha: compras pendentes (fora pagamento de ficha) menos pagamentos de ficha, como getCustomerBalance.
// - Dia = dia de Brasília.

import { lerSomente, type Leitura } from './db';
import { dateStringSP } from '@/lib/date-range';
import { buscarClientes, candidatoUnico, type Achado, type ClienteBase } from './customer-index';
import { resolverPeriodo, PERIODOS, type PeriodoResolvido } from './periods';
import { brl, formatarTelefone, normalizar, palavras, plural, primeiroNome } from './text';
import type { RoBloco, RoCliente } from './types';

export interface FerramentaSaida {
  mensagem: string;
  blocos: RoBloco[];
  /** Uma linha para a próxima pergunta se apoiar (nomes e ids que apareceram). */
  contexto?: string;
}

export type Argumentos = Record<string, unknown>;

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const texto = (v: unknown, max = 120): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const inteiro = (v: unknown, padrao: number, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
};

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

const resumoContexto = (clientes: { id: string; nome: string }[]) =>
  clientes.length ? `Clientes citados: ${clientes.map((c) => `${c.nome} (id ${c.id})`).join('; ')}.` : undefined;

/* ------------------------------------------------------------------ buscar_cliente / ficha */

function mensagemAchados(consulta: string, achados: Achado[], tipo: string): string {
  const parciais = achados.every((a) => a.forca === 'parcial');
  if (achados.length === 0) {
    return `Não achei ninguém com **${consulta}**. Tente só o primeiro nome, um pedaço do sobrenome ou o telefone (pode ser sem o DDD).`;
  }
  if (parciais) {
    return `Não achei ninguém que tenha tudo o que você escreveu, mas estes combinam com parte de **${consulta}**. É algum deles?`;
  }
  if (tipo === 'telefone') return `Achei ${plural(achados.length, 'cadastro', 'cadastros')} com esse telefone:`;
  return `Achei ${plural(achados.length, 'cadastro', 'cadastros')} que combinam com **${consulta}**. Toque no certo ou me diga mais um pedaço do nome.`;
}

export async function buscarCliente(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const consulta = texto(args.consulta ?? args.nome);
  if (!consulta) {
    return { mensagem: 'Me diga o nome (ou um pedaço), o telefone ou o e-mail do cliente que eu procuro.', blocos: [] };
  }
  const todos = await todosClientes(db);
  const { achados, tipo } = buscarClientes(todos, consulta, 8);
  const unico = candidatoUnico(achados);

  if (unico) {
    const [cartao] = await paraCartoes(db, [unico]);
    const sit = (cartao.saldoCents ?? 0) > 0 ? `Está com **${brl(cartao.saldoCents!)}** a pagar na ficha.` : (cartao.saldoCents ?? 0) < 0 ? `Tem **${brl(-cartao.saldoCents!)}** de crédito.` : 'A ficha está em dia.';
    return {
      mensagem: `Achei: **${cartao.nome}**${cartao.ativo ? '' : ' (cadastro inativo)'}. ${sit}`,
      blocos: [{ tipo: 'clientes', itens: [cartao] }],
      contexto: resumoContexto([cartao]),
    };
  }

  const cartoes = await paraCartoes(db, achados.map((a) => a.cliente));
  return {
    mensagem: mensagemAchados(consulta, achados, tipo),
    blocos: cartoes.length ? [{ tipo: 'clientes', itens: cartoes, dica: 'Toque em "Ver ficha" no cliente certo.' }] : [],
    contexto: resumoContexto(cartoes),
  };
}

const ROTULO_PAGAMENTO: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', debit: 'Débito', credit: 'Crédito', invoice: 'Ficha (fiado)', ficha_payment: 'Pagamento de ficha' };

export async function fichaCliente(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const id = texto(args.cliente_id, 60);
  const consulta = texto(args.consulta ?? args.nome);
  const todos = await todosClientes(db);

  let cliente: ClienteBase | null = id ? (todos.find((c) => c.id === id) ?? null) : null;
  if (!cliente) {
    if (!consulta) return { mensagem: 'De qual cliente você quer ver a ficha? Me diga o nome (ou um pedaço) ou o telefone.', blocos: [] };
    const { achados } = buscarClientes(todos, consulta, 6);
    cliente = candidatoUnico(achados);
    if (!cliente) {
      const cartoes = await paraCartoes(db, achados.map((a) => a.cliente));
      if (cartoes.length === 0) return { mensagem: `Não achei ninguém com **${consulta}**. Tente só o primeiro nome ou o telefone.`, blocos: [] };
      return {
        mensagem: `Tem ${plural(cartoes.length, 'cliente', 'clientes')} que combinam com **${consulta}**. Qual deles?`,
        blocos: [
          {
            tipo: 'opcoes',
            itens: cartoes.map((c) => ({ rotulo: c.nome, pergunta: `ficha do cliente ${c.nome}` })),
          },
        ],
        contexto: resumoContexto(cartoes),
      };
    }
  }

  const [saldo, compras, pagamentos] = await Promise.all([
    saldos(db, [cliente.id]),
    db.order.findMany({
      where: { customerId: cliente.id, status: { not: 'cancelled' }, paymentMethod: { not: 'ficha_payment' } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { createdAt: true, totalCents: true, status: true, paymentMethod: true, items: { take: 4, select: { quantity: true, product: { select: { name: true } } } } },
    }),
    db.order.findMany({ where: { customerId: cliente.id, paymentMethod: 'ficha_payment' }, orderBy: { createdAt: 'desc' }, take: 3, select: { createdAt: true, totalCents: true } }),
  ]);
  const [cartao] = await paraCartoes(db, [cliente]);
  cartao.saldoCents = saldo.get(cliente.id) ?? 0;

  const blocos: RoBloco[] = [{ tipo: 'clientes', itens: [cartao] }];
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
  const situacao = s > 0 ? `**${primeiroNome(cartao.nome)}** deve **${brl(s)}** na ficha.` : s < 0 ? `**${primeiroNome(cartao.nome)}** tem **${brl(-s)}** de crédito.` : `A ficha de **${primeiroNome(cartao.nome)}** está em dia.`;
  return { mensagem: situacao, blocos, contexto: resumoContexto([cartao]) };
}

export async function clientesDevendo(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const limite = inteiro(args.limite, 15, 1, 40);
  const [mapa, todos] = await Promise.all([saldos(db), todosClientes(db)]);
  const devendo = [...mapa.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = devendo.reduce((soma, [, v]) => soma + v, 0);
  if (devendo.length === 0) return { mensagem: 'Ninguém está devendo na ficha agora.', blocos: [] };

  const porId = new Map(todos.map((c) => [c.id, c]));
  const recorte = devendo.slice(0, limite).filter(([id]) => porId.has(id));
  const cartoes = await paraCartoes(db, recorte.map(([id]) => porId.get(id)!));
  for (const c of cartoes) c.saldoCents = mapa.get(c.id) ?? 0;
  cartoes.sort((a, b) => (b.saldoCents ?? 0) - (a.saldoCents ?? 0));

  return {
    mensagem: `**${plural(devendo.length, 'cliente deve', 'clientes devem')}** na ficha, somando **${brl(total)}**.${devendo.length > limite ? ` Mostrando os ${limite} maiores.` : ''}`,
    blocos: [
      { tipo: 'metricas', itens: [{ rotulo: 'A receber na ficha', valor: brl(total), tom: 'atencao' }, { rotulo: 'Clientes devendo', valor: String(devendo.length) }] },
      { tipo: 'clientes', itens: cartoes },
    ],
    contexto: resumoContexto(cartoes.slice(0, 8)),
  };
}

export async function clientesInativos(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const dias = inteiro(args.dias, 30, 7, 365);
  const limite = inteiro(args.limite, 15, 1, 40);
  const corte = new Date(Date.now() - dias * 86_400_000);
  const linhas = await db.$queryRaw<{ id: string; ultimo: Date | null }[]>`
    SELECT c.id, MAX(o."createdAt") AS ultimo
    FROM "Customer" c
    LEFT JOIN "Order" o ON o."customerId" = c.id AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
    WHERE c.active = true
    GROUP BY c.id
    HAVING MAX(o."createdAt") IS NULL OR MAX(o."createdAt") < ${corte}
    ORDER BY MAX(o."createdAt") ASC NULLS FIRST
    LIMIT ${limite}`;
  if (linhas.length === 0) return { mensagem: `Todo cliente ativo comprou nos últimos ${dias} dias.`, blocos: [] };
  const todos = await todosClientes(db);
  const porId = new Map(todos.map((c) => [c.id, c]));
  const base = linhas.map((l) => porId.get(l.id)).filter((c): c is ClienteBase => Boolean(c));
  const cartoes = await paraCartoes(db, base);
  return {
    mensagem: `**${plural(linhas.length, 'cliente ativo', 'clientes ativos')}** sem comprar há mais de ${dias} dias${linhas.length >= limite ? ` (os ${limite} há mais tempo)` : ''}.`,
    blocos: [{ tipo: 'clientes', itens: cartoes }],
    contexto: resumoContexto(cartoes.slice(0, 8)),
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

async function resumoVendas(db: Leitura, p: PeriodoResolvido): Promise<ResumoVendas> {
  const linhas = await db.$queryRaw<{ pm: string | null; n: number; cents: number }[]>`
    SELECT "paymentMethod"::text AS pm, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS cents
    FROM "Order"
    WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled'
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

export async function vendas(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = resolverPeriodo(texto(args.periodo), dateStringSP(), texto(args.de, 10), texto(args.ate, 10));
  const r = await resumoVendas(db, p);
  if (r.qtd === 0 && r.pagamentosFicha === 0) {
    return { mensagem: `Nenhuma venda registrada ${p.rotulo}.`, blocos: [] };
  }
  const recebido = r.avista + r.pagamentosFicha;
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

  if (p.dias > 1) {
    const mensal = p.dias > 62;
    const linhas = mensal
      ? await db.$queryRaw<{ ref: string; n: number; vendido: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'), 'MM/YYYY') AS ref, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS vendido
          FROM "Order" WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled' AND "paymentMethod" IS DISTINCT FROM 'ficha_payment'
          GROUP BY 1 ORDER BY MIN("createdAt")`
      : await db.$queryRaw<{ ref: string; n: number; vendido: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM') AS ref, COUNT(*)::int AS n, COALESCE(SUM("totalCents"), 0)::int AS vendido
          FROM "Order" WHERE "createdAt" >= ${p.inicio} AND "createdAt" <= ${p.fim} AND status <> 'cancelled' AND "paymentMethod" IS DISTINCT FROM 'ficha_payment'
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
    }
  }

  return {
    mensagem: `${maiuscula(p.rotulo)} foram **${brl(r.vendido)}** em ${plural(r.qtd, 'venda', 'vendas')}: **${brl(r.avista)}** à vista e **${brl(r.fiado)}** na ficha. Entraram no caixa **${brl(recebido)}**.`,
    blocos,
  };
}

export async function produtosMaisVendidos(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = resolverPeriodo(texto(args.periodo) || 'este_mes', dateStringSP(), texto(args.de, 10), texto(args.ate, 10));
  const limite = inteiro(args.limite, 10, 1, 30);
  const linhas = await db.$queryRaw<{ nome: string; qtd: number; receita: number }[]>`
    SELECT p.name AS nome, SUM(oi.quantity)::int AS qtd, COALESCE(SUM(oi.quantity * oi."priceCents"), 0)::int AS receita
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "Product" p ON p.id = oi."productId"
    WHERE o."createdAt" >= ${p.inicio} AND o."createdAt" <= ${p.fim} AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
    GROUP BY p.id, p.name
    ORDER BY qtd DESC, receita DESC
    LIMIT ${limite}`;
  if (linhas.length === 0) return { mensagem: `Não houve venda de produtos ${p.rotulo}.`, blocos: [] };
  return {
    mensagem: `Os mais vendidos ${p.rotulo}: **${linhas[0].nome}** lidera com ${linhas[0].qtd} unidades.`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'nome', label: 'Produto' },
          { key: 'qtd', label: 'Qtd', align: 'right', formato: 'inteiro' },
          { key: 'receita', label: 'Receita', align: 'right', formato: 'dinheiro' },
        ],
        linhas: linhas as unknown as Record<string, unknown>[],
      },
    ],
  };
}

export async function clientesTop(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = resolverPeriodo(texto(args.periodo) || 'este_mes', dateStringSP(), texto(args.de, 10), texto(args.ate, 10));
  const limite = inteiro(args.limite, 10, 1, 30);
  const linhas = await db.$queryRaw<{ id: string; nome: string; pedidos: number; gasto: number }[]>`
    SELECT c.id, c.name AS nome, COUNT(o.id)::int AS pedidos, COALESCE(SUM(o."totalCents"), 0)::int AS gasto
    FROM "Order" o JOIN "Customer" c ON c.id = o."customerId"
    WHERE o."createdAt" >= ${p.inicio} AND o."createdAt" <= ${p.fim} AND o.status <> 'cancelled' AND o."paymentMethod" IS DISTINCT FROM 'ficha_payment'
    GROUP BY c.id, c.name ORDER BY gasto DESC LIMIT ${limite}`;
  if (linhas.length === 0) return { mensagem: `Nenhum cliente comprou ${p.rotulo}.`, blocos: [] };
  return {
    mensagem: `Quem mais comprou ${p.rotulo}: **${linhas[0].nome}**, com ${brl(linhas[0].gasto)} em ${plural(linhas[0].pedidos, 'compra', 'compras')}.`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'nome', label: 'Cliente' },
          { key: 'pedidos', label: 'Compras', align: 'right', formato: 'inteiro' },
          { key: 'gasto', label: 'Total', align: 'right', formato: 'dinheiro' },
        ],
        linhas: linhas as unknown as Record<string, unknown>[],
      },
    ],
    contexto: resumoContexto(linhas.slice(0, 5).map((l) => ({ id: l.id, nome: l.nome }))),
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
  if (validos.length === 0) return { mensagem: 'Não há pré-pedido em aberto agora.', blocos: [] };
  const aguardando = validos.filter((p) => p.source === 'online' && p.approval === 'awaiting').length;
  return {
    mensagem: `Tem **${plural(validos.length, 'pré-pedido em aberto', 'pré-pedidos em aberto')}**${aguardando ? `, sendo ${plural(aguardando, 'pedido online esperando você aceitar', 'pedidos online esperando você aceitar')}` : ''}.`,
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
  const [total, porTipo] = await Promise.all([
    db.expense.aggregate({ where: { date: { gte: p.inicio, lte: p.fim } }, _sum: { amountCents: true }, _count: true }),
    db.$queryRaw<{ tipo: string; n: number; cents: number }[]>`
      SELECT et.name AS tipo, COUNT(e.id)::int AS n, COALESCE(SUM(e."amountCents"), 0)::int AS cents
      FROM "Expense" e JOIN "ExpenseType" et ON et.id = e."typeId"
      WHERE e.date >= ${p.inicio} AND e.date <= ${p.fim}
      GROUP BY et.id, et.name ORDER BY cents DESC LIMIT 10`,
  ]);
  return { cents: total._sum.amountCents ?? 0, n: total._count, porTipo };
}

export async function despesas(db: Leitura, args: Argumentos): Promise<FerramentaSaida> {
  const p = resolverPeriodo(texto(args.periodo) || 'este_mes', dateStringSP(), texto(args.de, 10), texto(args.ate, 10));
  const d = await totalDespesas(db, p);
  if (d.n === 0) return { mensagem: `Nenhuma despesa lançada ${p.rotulo}.`, blocos: [] };
  return {
    mensagem: `${maiuscula(p.rotulo)} as despesas somam **${brl(d.cents)}** (${plural(d.n, 'lançamento', 'lançamentos')}). A maior parte foi **${d.porTipo[0]?.tipo ?? '—'}**.`,
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
  const p = resolverPeriodo(texto(args.periodo) || 'este_mes', dateStringSP(), texto(args.de, 10), texto(args.ate, 10));
  const [v, d] = await Promise.all([resumoVendas(db, p), totalDespesas(db, p)]);
  const recebido = v.avista + v.pagamentosFicha;
  const caixa = recebido - d.cents;
  const resultado = v.vendido - d.cents;
  return {
    mensagem: `${maiuscula(p.rotulo)}: entrou **${brl(recebido)}** no caixa e saíram **${brl(d.cents)}** em despesas, então o lucro de caixa é **${brl(caixa)}**. Contando também o fiado a receber, o resultado das vendas é **${brl(resultado)}**.`,
    blocos: [
      {
        tipo: 'metricas',
        titulo: maiuscula(p.rotulo),
        itens: [
          { rotulo: 'Vendido', valor: brl(v.vendido), dica: `${brl(v.avista)} à vista + ${brl(v.fiado)} na ficha` },
          { rotulo: 'Entrou no caixa', valor: brl(recebido), dica: 'à vista + pagamentos de ficha' },
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
  const produtos = await db.product.findMany({ select: { id: true, name: true, priceCents: true, pricePerKgCents: true, stockEnabled: true, stock: true, active: true }, orderBy: { name: 'asc' } });
  const digitadas = palavras(consulta);
  const achados = digitadas.length
    ? produtos.filter((pr) => {
        const nome = normalizar(pr.name);
        return digitadas.every((d) => nome.includes(d) || nome.split(' ').some((w) => w.startsWith(d.slice(0, Math.max(3, d.length - 1)))));
      })
    : produtos.slice(0, 15);
  if (achados.length === 0) return { mensagem: `Não achei produto com **${consulta}**.`, blocos: [] };
  return {
    mensagem: digitadas.length ? `Achei ${plural(achados.length, 'produto', 'produtos')} com **${consulta}**.` : `Estes são os produtos cadastrados (${produtos.length} no total):`,
    blocos: [
      {
        tipo: 'tabela',
        colunas: [
          { key: 'nome', label: 'Produto' },
          { key: 'preco', label: 'Preço', align: 'right', formato: 'dinheiro' },
          { key: 'estoque', label: 'Estoque', align: 'right' },
          { key: 'situacao', label: 'Situação' },
        ],
        linhas: achados.slice(0, 20).map((pr) => ({
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
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(texto(args.data, 10)) ? texto(args.data, 10) : hoje;
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

export function esclarecer(args: Argumentos): FerramentaSaida {
  const pergunta = texto(args.pergunta, 200) || 'Pode me dar mais um detalhe?';
  const opcoes = (Array.isArray(args.opcoes) ? args.opcoes : []).map((o) => texto(o, 80)).filter(Boolean).slice(0, 6);
  return { mensagem: pergunta, blocos: opcoes.length ? [{ tipo: 'opcoes', itens: opcoes.map((o) => ({ rotulo: o, pergunta: o })) }] : [] };
}

export function ajuda(): FerramentaSaida {
  return {
    mensagem: [
      'Eu consulto os dados do sistema para você. Pode perguntar do jeito que falaria no balcão:',
      '- **Clientes**: "Maria", "telefone 5599…", "quem está devendo?", "quem sumiu há 30 dias?"',
      '- **Ficha**: "ficha da Ingrid", "quanto a Maria deve?"',
      '- **Vendas**: "vendas de hoje", "quanto vendi esta semana?", "produtos mais vendidos do mês"',
      '- **Pedidos**: "pedidos em aberto", "tem pedido online esperando?"',
      '- **Dinheiro**: "despesas do mês", "lucro do mês"',
      '- **Outros**: "cardápio de hoje", "mensagens de WhatsApp não lidas", "preço da marmita"',
      'Se você não souber o nome inteiro, escreva o que lembrar: eu procuro por pedaço do nome, sem se importar com acento.',
    ].join('\n'),
    blocos: [],
  };
}

/* ------------------------------------------------------------------ catálogo e despacho */

export type NomeFerramenta =
  | 'buscar_cliente'
  | 'ficha_cliente'
  | 'clientes_devendo'
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

export async function executarFerramenta(nome: string, args: Argumentos): Promise<FerramentaSaida> {
  if (nome === 'esclarecer') return esclarecer(args);
  if (nome === 'ajuda') return ajuda();
  // toda consulta ao banco passa por aqui: transação somente leitura (ver db.ts)
  return lerSomente((db) => {
    switch (nome) {
      case 'buscar_cliente':
        return buscarCliente(db, args);
      case 'ficha_cliente':
        return fichaCliente(db, args);
      case 'clientes_devendo':
        return clientesDevendo(db, args);
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
}

export { PERIODOS };

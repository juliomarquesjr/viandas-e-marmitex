/**
 * Verificação das regras de baixa da ficha.
 *
 * A parte sutil do ciclo mensal é que pagamento não carrega competência: quem
 * compra em junho e julho e fecha tudo em agosto quitou junho e julho, e quem
 * paga adiantado tem crédito esperando as próximas compras. Como isso decide
 * se a tela diz "paga" ou "em atraso" para um mês inteiro, os casos ficam aqui
 * como cenários executáveis.
 *
 * Rodar: npm run check:ficha
 */

import {
  buildCycles,
  buildLedger,
  creditBalanceOf,
  type CycleState,
} from "../app/admin/customers/[id]/lib/cycle";
import type { Order } from "../app/admin/customers/[id]/types";

let sequence = 0;

function compra(iso: string, cents: number): Order {
  return {
    id: `c${++sequence}`,
    status: "pending",
    subtotalCents: cents,
    discountCents: 0,
    totalCents: cents,
    paymentMethod: "invoice",
    createdAt: iso,
    items: [],
  };
}

function pagamento(iso: string, cents: number): Order {
  return {
    id: `p${++sequence}`,
    status: "confirmed",
    subtotalCents: cents,
    discountCents: 0,
    totalCents: cents,
    paymentMethod: "ficha_payment",
    createdAt: iso,
    items: [],
    type: "ficha_payment",
  };
}

type Expectativa = {
  key: string;
  emAberto: number;
  estado: CycleState;
  /** `null` quando o ciclo ainda não foi quitado. */
  quitadoEm: string | null;
};

let falhas = 0;

function cenario(
  titulo: string,
  orders: Order[],
  agora: string,
  esperado: { saldo: number; credito?: number; ciclos: Expectativa[] }
) {
  const ledger = buildLedger(orders);
  const cycles = buildCycles(ledger, new Date(agora));
  const saldo = ledger.length ? ledger[ledger.length - 1].balanceAfterCents : 0;
  const credito = creditBalanceOf(ledger);

  const erros: string[] = [];

  if (saldo !== esperado.saldo) {
    erros.push(`saldo: esperado ${esperado.saldo}, obtido ${saldo}`);
  }
  if (esperado.credito !== undefined && credito !== esperado.credito) {
    erros.push(`crédito: esperado ${esperado.credito}, obtido ${credito}`);
  }

  for (const alvo of esperado.ciclos) {
    const ciclo = cycles.find((item) => item.key === alvo.key);
    if (!ciclo) {
      erros.push(`ciclo ${alvo.key} não foi montado`);
      continue;
    }
    if (ciclo.openCents !== alvo.emAberto) {
      erros.push(
        `${alvo.key} em aberto: esperado ${alvo.emAberto}, obtido ${ciclo.openCents}`
      );
    }
    if (ciclo.state !== alvo.estado) {
      erros.push(`${alvo.key} estado: esperado ${alvo.estado}, obtido ${ciclo.state}`);
    }
    const quitado = ciclo.settledAt ? ciclo.settledAt.slice(0, 10) : null;
    if (quitado !== alvo.quitadoEm) {
      erros.push(
        `${alvo.key} quitado em: esperado ${alvo.quitadoEm ?? "—"}, obtido ${quitado ?? "—"}`
      );
    }
  }

  if (erros.length) {
    falhas += erros.length;
    console.error(`✗ ${titulo}`);
    for (const erro of erros) console.error(`    ${erro}`);
  } else {
    console.log(`✓ ${titulo}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

cenario(
  "comprou em junho e julho, pagou tudo em agosto: os dois meses ficam quitados",
  [
    compra("2026-06-10T12:00:00.000Z", 60_000),
    compra("2026-06-20T12:00:00.000Z", 30_000),
    compra("2026-07-08T12:00:00.000Z", 70_000),
    compra("2026-08-05T12:00:00.000Z", 50_000),
    pagamento("2026-08-20T12:00:00.000Z", 210_000),
  ],
  "2026-08-28T12:00:00.000Z",
  {
    saldo: 0,
    credito: 0,
    ciclos: [
      { key: "2026-06", emAberto: 0, estado: "paga", quitadoEm: "2026-08-20" },
      { key: "2026-07", emAberto: 0, estado: "paga", quitadoEm: "2026-08-20" },
      { key: "2026-08", emAberto: 0, estado: "aberta", quitadoEm: "2026-08-20" },
    ],
  }
);

cenario(
  "voltou a comprar depois de pagar: só o consumo posterior fica em aberto",
  [
    compra("2026-06-10T12:00:00.000Z", 60_000),
    compra("2026-07-08T12:00:00.000Z", 70_000),
    compra("2026-08-05T12:00:00.000Z", 50_000),
    pagamento("2026-08-20T12:00:00.000Z", 180_000),
    compra("2026-08-25T12:00:00.000Z", 20_000),
  ],
  "2026-08-28T12:00:00.000Z",
  {
    saldo: 20_000,
    credito: 0,
    ciclos: [
      { key: "2026-06", emAberto: 0, estado: "paga", quitadoEm: "2026-08-20" },
      { key: "2026-07", emAberto: 0, estado: "paga", quitadoEm: "2026-08-20" },
      { key: "2026-08", emAberto: 20_000, estado: "aberta", quitadoEm: null },
    ],
  }
);

cenario(
  "pagou adiantado: o crédito cobre as compras seguintes, nada fica a cobrar",
  [
    pagamento("2026-08-05T12:00:00.000Z", 50_000),
    compra("2026-08-10T12:00:00.000Z", 10_000),
    compra("2026-08-12T12:00:00.000Z", 10_000),
  ],
  "2026-08-28T12:00:00.000Z",
  {
    saldo: -30_000,
    credito: 30_000,
    ciclos: [{ key: "2026-08", emAberto: 0, estado: "aberta", quitadoEm: "2026-08-05" }],
  }
);

cenario(
  "quitou junho em agosto, mas agosto segue em aberto",
  [
    compra("2026-06-10T12:00:00.000Z", 60_000),
    compra("2026-08-05T12:00:00.000Z", 50_000),
    pagamento("2026-08-20T12:00:00.000Z", 60_000),
  ],
  "2026-08-28T12:00:00.000Z",
  {
    saldo: 50_000,
    credito: 0,
    ciclos: [
      { key: "2026-06", emAberto: 0, estado: "paga", quitadoEm: "2026-08-20" },
      { key: "2026-08", emAberto: 50_000, estado: "aberta", quitadoEm: null },
    ],
  }
);

cenario(
  "mês antigo sem pagamento nenhum passa da tolerância e vira atraso",
  [compra("2026-06-10T12:00:00.000Z", 60_000)],
  "2026-08-28T12:00:00.000Z",
  {
    saldo: 60_000,
    credito: 0,
    ciclos: [{ key: "2026-06", emAberto: 60_000, estado: "em-atraso", quitadoEm: null }],
  }
);

cenario(
  "pagamento parcial deixa o mês a cobrar, dentro da tolerância",
  [
    compra("2026-07-10T12:00:00.000Z", 60_000),
    pagamento("2026-08-02T12:00:00.000Z", 20_000),
  ],
  "2026-08-05T12:00:00.000Z",
  {
    saldo: 40_000,
    credito: 0,
    ciclos: [{ key: "2026-07", emAberto: 40_000, estado: "a-cobrar", quitadoEm: null }],
  }
);

cenario(
  "o mesmo pagamento parcial, passada a tolerância, vira atraso",
  [
    compra("2026-07-10T12:00:00.000Z", 60_000),
    pagamento("2026-08-02T12:00:00.000Z", 20_000),
  ],
  "2026-08-20T12:00:00.000Z",
  {
    saldo: 40_000,
    credito: 0,
    ciclos: [{ key: "2026-07", emAberto: 40_000, estado: "em-atraso", quitadoEm: null }],
  }
);

// ─────────────────────────────────────────────────────────────────────────────

if (falhas > 0) {
  console.error(`\n${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\nTodos os cenários da ficha passaram.");

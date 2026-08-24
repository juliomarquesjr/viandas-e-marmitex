import { Order } from "../types";

/**
 * O ciclo mensal da ficha.
 *
 * A ficha é uma caderneta: consumo entra como débito, pagamento entra como
 * crédito e o que importa é o saldo corrente. Este módulo transforma a lista
 * plana de pedidos e pagamentos em competências mensais com estado próprio.
 *
 * Duas decisões de domínio ficam explícitas aqui:
 *
 * 1. **O que é dívida.** Segue o mesmo critério de `/api/ficha-payments`: pedido
 *    com `status: "pending"` está na ficha; pedido já liquidado no ato entra no
 *    consumo do mês mas não mexe no saldo. Mudar isso aqui desalinharia a tela
 *    do relatório de fechamento e do PDV.
 *
 * 2. **Quem paga o quê.** Pagamento não carrega competência, então a baixa é
 *    FIFO: o dinheiro que entra liquida sempre o débito mais antigo em aberto.
 *    É o que a caderneta de papel faz, e é o que permite dizer se a conta de
 *    julho está paga sem precisar de um vínculo no banco.
 */

// =============================================================================
// TIPOS
// =============================================================================

export type EntryKind = "consumo" | "consumo_avista" | "pagamento";

export type LedgerEntry = {
  id: string;
  kind: EntryKind;
  createdAt: string;
  /** Dia do mês (1-31) da competência a que o lançamento pertence. */
  day: number;
  cycleKey: string;
  label: string;
  detail: string | null;
  /** Valor absoluto, sempre positivo. */
  amountCents: number;
  /** Positivo debita, negativo credita, zero não move o saldo. */
  signedCents: number;
  paymentMethod: string | null;
  /** Saldo da ficha logo depois deste lançamento. */
  balanceAfterCents: number;
  /** Quanto deste débito ainda não foi coberto por pagamento (FIFO). */
  openCents: number;
  order: Order;
};

export type CycleState = "aberta" | "a-cobrar" | "em-atraso" | "paga" | "sem-movimento";

export type Cycle = {
  key: string;
  year: number;
  /** 0-11, como em `Date`. */
  month: number;
  label: string;
  shortLabel: string;
  entries: LedgerEntry[];
  /** Tudo que o cliente consumiu no mês, na ficha ou à vista. */
  consumptionCents: number;
  /** Só o que entrou na ficha — é isso que a fatura cobra. */
  fichaCents: number;
  paymentsCents: number;
  /** Quanto do consumo do mês ainda está em aberto depois da baixa FIFO. */
  openCents: number;
  state: CycleState;
  daysWithConsumption: number;
  /** Dias úteis do mês já decorridos. */
  businessDays: number;
  /** Dias úteis decorridos sem nenhum lançamento de consumo. */
  missingDays: number[];
  /** Só confia na lista acima quando o cliente é de consumo diário. */
  tracksDailyPattern: boolean;
  byDay: Record<number, number>;
  paymentDays: number[];
  topDay: { day: number; cents: number } | null;
  averagePerDayCents: number;
  daysInMonth: number;
  /** Dia da semana do dia 1 (0 = domingo), para montar a grade. */
  firstWeekday: number;
  isCurrent: boolean;
};

/** A partir daqui o cliente é considerado de consumo diário. */
const DAILY_PATTERN_THRESHOLD = 0.6;

/** Dias de tolerância depois do fim do mês antes de a conta virar atraso. */
export const GRACE_DAYS = 10;

// =============================================================================
// HELPERS
// =============================================================================

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function cycleKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function cycleLabel(year: number, month: number) {
  return `${MONTH_NAMES[month]} de ${year}`;
}

export function cycleShortLabel(year: number, month: number) {
  return `${MONTH_SHORT[month]} ${year}`;
}

export function isFichaPayment(order: Order) {
  return order.type === "ficha_payment" || order.paymentMethod === "ficha_payment";
}

function isBusinessDay(date: Date) {
  const d = date.getDay();
  return d >= 1 && d <= 5;
}

function describeItems(order: Order): { label: string; detail: string | null } {
  if (!order.items?.length) return { label: "Venda sem itens", detail: null };

  const part = (item: Order["items"][number]) => {
    const weight = item.weightKg ? Number(item.weightKg) : 0;
    return weight > 0
      ? `${weight.toFixed(3).replace(".", ",")} kg × ${item.product.name}`
      : `${item.quantity}× ${item.product.name}`;
  };

  const [first, ...rest] = order.items;
  return {
    label: part(first),
    detail: rest.length ? rest.map(part).join(" · ") : null,
  };
}

// =============================================================================
// EXTRATO
// =============================================================================

/**
 * Normaliza pedidos e pagamentos num extrato ordenado do mais antigo para o
 * mais recente, com saldo corrente e baixa FIFO já aplicados.
 */
export function buildLedger(orders: Order[]): LedgerEntry[] {
  const chronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const entries: LedgerEntry[] = [];
  let balance = 0;

  for (const order of chronological) {
    const date = new Date(order.createdAt);
    const payment = isFichaPayment(order);
    const onFicha = !payment && order.status === "pending";

    let kind: EntryKind;
    let signed: number;
    let label: string;
    let detail: string | null;

    if (payment) {
      kind = "pagamento";
      signed = -order.totalCents;
      label = "Pagamento recebido";
      detail = null;
    } else {
      const described = describeItems(order);
      label = described.label;
      detail = described.detail;
      kind = onFicha ? "consumo" : "consumo_avista";
      signed = onFicha ? order.totalCents : 0;
    }

    balance += signed;

    entries.push({
      id: order.id,
      kind,
      createdAt: order.createdAt,
      day: date.getDate(),
      cycleKey: cycleKeyOf(date),
      label,
      detail,
      amountCents: order.totalCents,
      signedCents: signed,
      paymentMethod: order.paymentMethod,
      balanceAfterCents: balance,
      openCents: kind === "consumo" ? order.totalCents : 0,
      order,
    });
  }

  applyFifoSettlement(entries);
  return entries;
}

/**
 * Baixa FIFO: cada pagamento consome os débitos mais antigos ainda abertos.
 * Sobra vira crédito e simplesmente não é alocada — aparece no saldo negativo.
 */
function applyFifoSettlement(entries: LedgerEntry[]) {
  const open: LedgerEntry[] = [];

  for (const entry of entries) {
    if (entry.kind === "consumo") {
      open.push(entry);
      continue;
    }
    if (entry.kind !== "pagamento") continue;

    let remaining = entry.amountCents;
    while (remaining > 0 && open.length) {
      const oldest = open[0];
      const taken = Math.min(remaining, oldest.openCents);
      oldest.openCents -= taken;
      remaining -= taken;
      if (oldest.openCents === 0) open.shift();
    }
  }
}

// =============================================================================
// COMPETÊNCIAS
// =============================================================================

/**
 * Agrupa o extrato em competências mensais, da mais recente para a mais antiga.
 * O mês corrente entra sempre, mesmo sem nenhum lançamento — é o ciclo aberto.
 */
export function buildCycles(entries: LedgerEntry[], now = new Date()): Cycle[] {
  const currentKey = cycleKeyOf(now);
  const grouped = new Map<string, LedgerEntry[]>();

  for (const entry of entries) {
    const list = grouped.get(entry.cycleKey);
    if (list) list.push(entry);
    else grouped.set(entry.cycleKey, [entry]);
  }
  if (!grouped.has(currentKey)) grouped.set(currentKey, []);

  const cycles = [...grouped.entries()].map(([key, list]) =>
    buildCycle(key, list, now, currentKey)
  );

  return cycles.sort((a, b) => (a.key < b.key ? 1 : -1));
}

function buildCycle(
  key: string,
  list: LedgerEntry[],
  now: Date,
  currentKey: string
): Cycle {
  const [year, monthNumber] = key.split("-").map(Number);
  const month = monthNumber - 1;
  const isCurrent = key === currentKey;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDayConsidered = isCurrent ? now.getDate() : daysInMonth;

  const byDay: Record<number, number> = {};
  const paymentDays = new Set<number>();
  let consumptionCents = 0;
  let fichaCents = 0;
  let paymentsCents = 0;
  let openCents = 0;

  for (const entry of list) {
    if (entry.kind === "pagamento") {
      paymentsCents += entry.amountCents;
      paymentDays.add(entry.day);
      continue;
    }
    consumptionCents += entry.amountCents;
    byDay[entry.day] = (byDay[entry.day] ?? 0) + entry.amountCents;
    if (entry.kind === "consumo") {
      fichaCents += entry.amountCents;
      openCents += entry.openCents;
    }
  }

  const consumedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const daysWithConsumption = consumedDays.length;

  const businessDaysList: number[] = [];
  for (let day = 1; day <= lastDayConsidered; day++) {
    if (isBusinessDay(new Date(year, month, day))) businessDaysList.push(day);
  }
  const businessDays = businessDaysList.length;

  // "Faltou no dia 12" só é informação dentro da janela em que o cliente estava
  // comprando. Marcar de vermelho todos os dias depois da última compra do mês
  // pinta metade do calendário de alarme para dizer apenas que o mês acabou.
  const windowStart = consumedDays[0] ?? 0;
  const windowEnd = consumedDays[consumedDays.length - 1] ?? -1;
  const windowBusinessDays = businessDaysList.filter(
    (day) => day >= windowStart && day <= windowEnd
  );
  const missingDays = windowBusinessDays.filter((day) => !byDay[day]);

  // E só faz sentido apontar buracos para quem come quase todo dia útil.
  const tracksDailyPattern =
    windowBusinessDays.length >= 5 &&
    (windowBusinessDays.length - missingDays.length) / windowBusinessDays.length >=
      DAILY_PATTERN_THRESHOLD;

  const topDay = Object.entries(byDay).reduce<{ day: number; cents: number } | null>(
    (best, [day, cents]) =>
      !best || cents > best.cents ? { day: Number(day), cents } : best,
    null
  );

  return {
    key,
    year,
    month,
    label: cycleLabel(year, month),
    shortLabel: cycleShortLabel(year, month),
    entries: [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    consumptionCents,
    fichaCents,
    paymentsCents,
    openCents,
    state: deriveState({ key, currentKey, year, month, list, openCents, now }),
    daysWithConsumption,
    businessDays,
    missingDays,
    tracksDailyPattern,
    byDay,
    paymentDays: [...paymentDays].sort((a, b) => a - b),
    topDay,
    averagePerDayCents: daysWithConsumption
      ? Math.round(consumptionCents / daysWithConsumption)
      : 0,
    daysInMonth,
    firstWeekday,
    isCurrent,
  };
}

function deriveState(input: {
  key: string;
  currentKey: string;
  year: number;
  month: number;
  list: LedgerEntry[];
  openCents: number;
  now: Date;
}): CycleState {
  const { key, currentKey, year, month, list, openCents, now } = input;

  if (key === currentKey) return "aberta";
  if (!list.length) return "sem-movimento";
  if (openCents <= 0) return "paga";

  const dueDate = new Date(year, month + 1, 0);
  dueDate.setDate(dueDate.getDate() + GRACE_DAYS);
  return now > dueDate ? "em-atraso" : "a-cobrar";
}

// =============================================================================
// APRESENTAÇÃO DO ESTADO
// =============================================================================

export const CYCLE_STATE_META: Record<
  CycleState,
  { label: string; token: string; description: string }
> = {
  aberta: {
    label: "Aberta",
    token: "aberta",
    description: "O mês ainda está recebendo lançamentos.",
  },
  "a-cobrar": {
    label: "A cobrar",
    token: "cobrar",
    description: "O mês fechou com saldo em aberto.",
  },
  "em-atraso": {
    label: "Em atraso",
    token: "atraso",
    description: `Passou de ${GRACE_DAYS} dias do fim do mês e ainda há saldo.`,
  },
  paga: {
    label: "Paga",
    token: "paga",
    description: "Todo o consumo do mês foi liquidado.",
  },
  "sem-movimento": {
    label: "Sem movimento",
    token: "vazio",
    description: "Nenhum lançamento neste mês.",
  },
};

/** Os três passos reais do ciclo. "Em atraso" é a variação vermelha do segundo. */
export const CYCLE_STEPS = [
  { key: "aberta", label: "Aberta" },
  { key: "a-cobrar", label: "A cobrar" },
  { key: "paga", label: "Paga" },
] as const;

export function stepIndexOf(state: CycleState) {
  if (state === "aberta" || state === "sem-movimento") return 0;
  if (state === "paga") return 2;
  return 1;
}

// =============================================================================
// INTENSIDADE DO CALENDÁRIO
// =============================================================================

/** 0 = sem consumo, 1..3 = intensidade crescente dentro do próprio mês. */
export function consumptionLevel(cents: number, maxCents: number): 0 | 1 | 2 | 3 {
  if (!cents) return 0;
  if (!maxCents) return 1;
  const ratio = cents / maxCents;
  if (ratio > 0.75) return 3;
  if (ratio > 0.45) return 2;
  return 1;
}

// =============================================================================
// SALDO GLOBAL
// =============================================================================

export type BalanceSummary = {
  /** Positivo: cliente deve. Negativo: cliente tem crédito. Zero: em dia. */
  cents: number;
  tone: "devedor" | "em-dia" | "credito";
  label: string;
};

export function summarizeBalance(cents: number): BalanceSummary {
  if (cents > 0) return { cents, tone: "devedor", label: "Saldo devedor" };
  if (cents < 0) return { cents, tone: "credito", label: "Crédito a favor" };
  return { cents: 0, tone: "em-dia", label: "Ficha em dia" };
}

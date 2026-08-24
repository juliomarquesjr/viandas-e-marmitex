/**
 * As regras de dinheiro do fechamento.
 *
 * Tudo aqui é em centavos e sem React: o Terminal desenha a partir destas
 * funções e a rota de conversão revalida com elas antes de gravar. Cliente e
 * servidor lendo da mesma fonte é o que impede a tela dizer "conta fechada"
 * enquanto o banco discorda.
 *
 * Uma comanda é paga por uma forma só — é o que a venda guarda em
 * `Order.paymentMethod`, e o valor recebido nunca é menor que o total.
 */

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Espelha o enum `PaymentMethod` do Prisma, menos `ficha_payment` — aquele é o
 * pagamento *da* ficha (abate dívida) e não fecha pré-pedido. Aqui `invoice` é
 * "lançar na ficha", que é como a dívida nasce.
 */
export type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "invoice";

export const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  /** Sem cliente não há ficha para lançar. */
  needsCustomer: boolean;
  /** Só o dinheiro passa pela gaveta, e só ele devolve troco. */
  cash: boolean;
}> = [
  { value: "pix", label: "Pix", needsCustomer: false, cash: false },
  { value: "cash", label: "Dinheiro", needsCustomer: false, cash: true },
  { value: "debit", label: "Débito", needsCustomer: false, cash: false },
  { value: "credit", label: "Crédito", needsCustomer: false, cash: false },
  { value: "invoice", label: "Ficha", needsCustomer: true, cash: false },
];

export function methodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((item) => item.value === value);
}

export function isCashMethod(method: PaymentMethod): boolean {
  return method === "cash";
}

/** O recebimento como ele vai para a venda. */
export type Payment = {
  method: PaymentMethod;
  /** Entregue pelo cliente. Igual ao total fora do dinheiro. */
  receivedCents: number;
  changeCents: number;
};

export type Settlement = {
  /** A conta fecha e pode ser gravada. */
  ok: boolean;
  /**
   * O impedimento, quando existe um. Faltar dinheiro não é impedimento: é
   * `remainingCents` positivo, e a tela mostra isso sem chamar de erro.
   */
  error: string | null;
  /** Quanto ainda falta entregar. Zero quando a conta fechou. */
  remainingCents: number;
  changeCents: number;
  payment: Payment | null;
};

// =============================================================================
// FECHAMENTO
// =============================================================================

/**
 * Confere o que foi digitado contra o total.
 *
 * Fora do dinheiro o valor é o próprio total: cartão e pix passam o valor exato
 * e a ficha leva a conta inteira. Só a gaveta admite receber a mais, e a
 * diferença vira troco.
 */
export function settle(
  method: PaymentMethod | null,
  receivedCents: number,
  totalCents: number,
): Settlement {
  const empty: Settlement = {
    ok: false,
    error: null,
    remainingCents: totalCents,
    changeCents: 0,
    payment: null,
  };

  if (!method) return empty;

  if (!isPaymentMethod(method)) {
    return { ...empty, error: "Forma de pagamento desconhecida." };
  }

  if (!isCashMethod(method)) {
    return {
      ok: true,
      error: null,
      remainingCents: 0,
      changeCents: 0,
      payment: { method, receivedCents: totalCents, changeCents: 0 },
    };
  }

  if (!Number.isSafeInteger(receivedCents) || receivedCents < 0) {
    return { ...empty, error: "Valor recebido inválido." };
  }

  if (receivedCents < totalCents) {
    return { ...empty, remainingCents: totalCents - receivedCents };
  }

  const changeCents = receivedCents - totalCents;
  return {
    ok: true,
    error: null,
    remainingCents: 0,
    changeCents,
    payment: { method, receivedCents, changeCents },
  };
}

// =============================================================================
// TECLADO
// =============================================================================

/** O buffer do teclado é uma fita de dígitos: "6140" são R$ 61,40. */
export function keypadPush(buffer: string, key: string): string {
  const next = (buffer + key).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  // Teto de R$ 99.999,99: acima disso é dedo escorregando, não venda.
  return next.length > 7 ? buffer : next;
}

export function keypadPop(buffer: string): string {
  return buffer.slice(0, -1);
}

export function keypadCents(buffer: string): number {
  return buffer ? parseInt(buffer, 10) : 0;
}

export function centsToKeypad(cents: number): string {
  return cents > 0 ? String(cents) : "";
}

// =============================================================================
// TROCO EM CÉDULAS
// =============================================================================

/** As cédulas do real que a gaveta usa para devolver troco. */
const NOTES = [10000, 5000, 2000, 1000, 500, 200] as const;

/** Os valores que o operador mais recebe na mão, para preencher sem digitar. */
export const QUICK_CASH = [1000, 2000, 5000, 10000] as const;

export type ChangeSlice = { valueCents: number; count: number };

export type ChangeBreakdown = {
  notes: ChangeSlice[];
  /** O que não fecha em cédula sai em moeda. */
  coinsCents: number;
};

export function breakChange(changeCents: number): ChangeBreakdown {
  const notes: ChangeSlice[] = [];
  let rest = Math.max(0, changeCents);

  for (const value of NOTES) {
    const count = Math.floor(rest / value);
    if (count > 0) {
      notes.push({ valueCents: value, count });
      rest -= count * value;
    }
  }

  return { notes, coinsCents: rest };
}

const amount = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1× R$ 20,00 · 1× R$ 10,00 · R$ 1,60 em moedas" */
export function describeChange(changeCents: number): string {
  const { notes, coinsCents } = breakChange(changeCents);
  const parts = notes.map((slice) => `${slice.count}× R$ ${amount.format(slice.valueCents / 100)}`);
  if (coinsCents > 0) parts.push(`R$ ${amount.format(coinsCents / 100)} em moedas`);
  return parts.join(" · ");
}

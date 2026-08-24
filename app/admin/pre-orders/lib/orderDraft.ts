import { isWeightBasedProduct, roundWeightKg, weightPriceCents } from "@/lib/weight";

/**
 * O rascunho de pré-pedido enquanto ele está sendo escrito na Mesa de Pedido.
 *
 * Separado de `preOrderView.ts` de propósito: aquele descreve um pedido que já
 * existe no banco (tem id, etapa, trilha); aqui nada existe ainda — os itens
 * não têm id, o total é recalculado a cada tecla e o cliente pode ser trocado.
 */

// =============================================================================
// TIPOS
// =============================================================================

export type CatalogProduct = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number | string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  active: boolean;
  stockEnabled?: boolean;
  stock?: number | null;
  category?: { id: string; name: string } | null;
};

export type DeskCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  imageUrl?: string | null;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
};

/** O que `/api/customers/[id]/summary` devolve para o dossiê. */
export type CustomerSummary = {
  orderCount: number;
  lastOrderAt: string | null;
  debtBalanceCents: number;
};

export type CustomerPreset = {
  productId: string;
  quantity: number;
  product: { id: string; name: string; imageUrl?: string | null };
};

export type DraftItem = {
  /** Só existe quando a linha veio de um pré-pedido salvo. */
  id?: string;
  productId: string;
  quantity: number;
  priceCents: number;
  /** Preenchido apenas em produtos vendidos por quilo. */
  weightKg: number | null;
  /**
   * O que o operador digitou no campo de peso, antes de virar número.
   * Guardar o texto cru evita que "0," seja reformatado como "0,000" no meio
   * da digitação — o valor de verdade continua sendo `weightKg`.
   */
  weightDraft?: string;
};

export type Draft = {
  id?: string;
  customerId: string | null;
  notes: string;
  discountCents: number;
  items: DraftItem[];
};

export function emptyDraft(): Draft {
  return { customerId: null, notes: "", discountCents: 0, items: [] };
}

// =============================================================================
// DINHEIRO
// =============================================================================

export function lineTotal(item: DraftItem): number {
  return item.priceCents * item.quantity;
}

export function subtotalOf(items: DraftItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function totalOf(draft: Draft): number {
  return Math.max(0, subtotalOf(draft.items) - draft.discountCents);
}

/** Lê "12,34" ou "1234" como 1234 centavos, do jeito que o operador digita. */
export function parseCentsInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function formatCentsInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =============================================================================
// ESTOQUE
// =============================================================================

/** A partir daqui o produto ganha aviso âmbar de estoque acabando, igual ao PDV. */
export const LOW_STOCK_THRESHOLD = 3;

export type StockRead = {
  controlled: boolean;
  stock: number | null;
  /** Unidades do produto já lançadas no rascunho. */
  units: number;
  unknown: boolean;
  out: boolean;
  low: boolean;
  exceeds: boolean;
};

/**
 * Unidades já lançadas. Linha por quilo conta 1, que é como a baixa acontece
 * na conversão em venda — somar `quantity` daria "1" para 0,840 kg.
 */
export function unitsInDraft(items: DraftItem[], productId: string): number {
  return items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

/** Quilos já lançados de um produto vendido a peso. */
export function kgInDraft(items: DraftItem[], productId: string): number {
  return items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + (item.weightKg ?? 0), 0);
}

/**
 * Leitura de estoque para exibição. O pré-pedido é pedido futuro: aqui só
 * avisamos — quem bloqueia de fato é a conversão em venda.
 */
export function readStock(
  product: CatalogProduct | undefined,
  items: DraftItem[]
): StockRead {
  const controlled = !!product?.stockEnabled;
  const stock = product?.stock ?? null;
  const units = product ? unitsInDraft(items, product.id) : 0;

  return {
    controlled,
    stock,
    units,
    unknown: controlled && stock === null,
    out: controlled && stock === 0,
    low: controlled && stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD,
    exceeds: controlled && stock !== null && units > stock,
  };
}

/** Os produtos do rascunho cujo total pedido passou do saldo. */
export function productsOverStock(
  items: DraftItem[],
  products: CatalogProduct[]
): CatalogProduct[] {
  const ids = Array.from(new Set(items.map((item) => item.productId)));
  return ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is CatalogProduct => {
      return !!product && readStock(product, items).exceeds;
    });
}

// =============================================================================
// MONTAGEM DO RASCUNHO
// =============================================================================

/** O peso inicial de uma linha nova a quilo, antes de o operador ajustar. */
export const DEFAULT_WEIGHT_KG = 0.5;

/**
 * Acrescenta uma unidade. Produto por quilo entra sempre como linha nova, com
 * peso próprio — duas porções de 0,4 kg não são "2 × 0,4 kg", são duas linhas.
 */
export function addProduct(items: DraftItem[], product: CatalogProduct): DraftItem[] {
  if (isWeightBasedProduct(product)) {
    return [...items, weighedLine(product, DEFAULT_WEIGHT_KG)];
  }

  const existing = items.find(
    (item) => item.productId === product.id && item.weightKg === null
  );
  if (existing) {
    return items.map((item) =>
      item === existing ? { ...item, quantity: item.quantity + 1 } : item
    );
  }

  return [
    ...items,
    { productId: product.id, quantity: 1, priceCents: product.priceCents, weightKg: null },
  ];
}

export function weighedLine(product: CatalogProduct, weightKg: number): DraftItem {
  const rounded = roundWeightKg(weightKg);
  return {
    productId: product.id,
    quantity: 1,
    priceCents: weightPriceCents(product.pricePerKgCents ?? 0, rounded),
    weightKg: rounded,
  };
}

export function setQuantity(items: DraftItem[], index: number, quantity: number): DraftItem[] {
  if (quantity <= 0) return removeItem(items, index);
  return items.map((item, i) => (i === index ? { ...item, quantity } : item));
}

export function removeItem(items: DraftItem[], index: number): DraftItem[] {
  return items.filter((_, i) => i !== index);
}

/**
 * Repreçifica a linha a peso enquanto o operador digita. Guarda o texto cru
 * junto para o campo não brigar com quem está digitando.
 */
export function setWeight(
  items: DraftItem[],
  index: number,
  weightKg: number | null,
  raw: string,
  product: CatalogProduct | undefined
): DraftItem[] {
  return items.map((item, i) => {
    if (i !== index) return item;
    const rounded = weightKg === null ? null : roundWeightKg(weightKg);
    return {
      ...item,
      weightKg: rounded,
      weightDraft: raw,
      priceCents:
        rounded === null
          ? 0
          : weightPriceCents(product?.pricePerKgCents ?? 0, rounded),
    };
  });
}

/**
 * Aplica o preset do cliente ("o de sempre"). Soma ao que já está na comanda em
 * vez de substituir: quem já lançou dois refrigerantes não quer perdê-los.
 * Produto a peso não entra — o preset guarda quantidade, e quantidade não diz
 * quantos quilos o cliente leva.
 */
export function applyPreset(
  items: DraftItem[],
  presets: CustomerPreset[],
  products: CatalogProduct[]
): { items: DraftItem[]; added: number; skipped: number } {
  let next = items;
  let added = 0;
  let skipped = 0;

  for (const preset of presets) {
    const product = products.find((candidate) => candidate.id === preset.productId);
    if (!product || !product.active || isWeightBasedProduct(product)) {
      skipped += 1;
      continue;
    }

    const existing = next.find(
      (item) => item.productId === product.id && item.weightKg === null
    );
    if (existing) {
      next = next.map((item) =>
        item === existing ? { ...item, quantity: item.quantity + preset.quantity } : item
      );
    } else {
      next = [
        ...next,
        {
          productId: product.id,
          quantity: preset.quantity,
          priceCents: product.priceCents,
          weightKg: null,
        },
      ];
    }
    added += 1;
  }

  return { items: next, added, skipped };
}

/** Quanto o preset soma, para o botão dizer antes de o operador clicar. */
export function presetTotal(
  presets: CustomerPreset[],
  products: CatalogProduct[]
): { units: number; cents: number } {
  return presets.reduce(
    (acc, preset) => {
      const product = products.find((candidate) => candidate.id === preset.productId);
      if (!product || isWeightBasedProduct(product)) return acc;
      return {
        units: acc.units + preset.quantity,
        cents: acc.cents + product.priceCents * preset.quantity,
      };
    },
    { units: 0, cents: 0 }
  );
}

// =============================================================================
// CATÁLOGO
// =============================================================================

/** Produto que a Mesa pode oferecer: ativo e com algum preço definido. */
export function isSellable(product: CatalogProduct): boolean {
  if (!product.active) return false;
  // Produto por quilo não tem valor unitário: vale o preço por quilo.
  if (isWeightBasedProduct(product)) return true;
  return product.priceCents > 0;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesQuery(product: CatalogProduct, query: string): boolean {
  const term = normalize(query.trim());
  if (!term) return true;
  return (
    normalize(product.name).includes(term) ||
    normalize(product.category?.name ?? "").includes(term) ||
    (product.barcode ?? "").includes(query.trim())
  );
}

export function addressLineOf(customer: DeskCustomer | null | undefined): string | null {
  const address = customer?.address;
  if (!address || typeof address !== "object") return null;
  const line = [address.street, address.number, address.neighborhood]
    .filter(Boolean)
    .join(", ");
  return line || null;
}

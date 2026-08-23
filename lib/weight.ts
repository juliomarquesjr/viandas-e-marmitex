/**
 * Regras de negócio compartilhadas para produtos vendidos por quilo.
 *
 * Fonte única usada pelo PDV (venda), pela tela de pré-pedido e pela validação
 * do servidor, para que o peso informado siga sempre os mesmos limites e o
 * mesmo cálculo de preço.
 */

export const MIN_WEIGHT_KG = 0.001;
export const MAX_WEIGHT_KG = 999.999;
export const WEIGHT_DECIMALS = 3;

export const WEIGHT_RANGE_HINT =
  "Peso mínimo: 0,001 kg (1 grama) | Máximo: 999,999 kg";

export const WEIGHT_REQUIRED_MESSAGE = "Por favor, insira o peso";
export const WEIGHT_MIN_MESSAGE = "Peso mínimo: 0,001 kg (1 grama)";
export const WEIGHT_MAX_MESSAGE = "Peso máximo: 999,999 kg";

/** Atalhos oferecidos no seletor de peso, em quilos. */
export const WEIGHT_PRESETS_KG = [0.25, 0.5, 0.75, 1, 1.5, 2];

type WeightPricedProduct = {
  priceCents?: number | null;
  pricePerKgCents?: number | string | null;
};

/** Produto é vendido por quilo quando tem preço por quilo positivo. */
export function isWeightBasedProduct(
  product: WeightPricedProduct | null | undefined
): boolean {
  if (!product) return false;
  const perKg = Number(product.pricePerKgCents ?? 0);
  return Number.isFinite(perKg) && perKg > 0;
}

/** Mantém apenas dígitos e um separador decimal, normalizando vírgula em ponto. */
export function sanitizeWeightInput(raw: string): string {
  return raw.replace(/[^0-9,.]/g, "").replace(",", ".");
}

/** Converte a digitação do operador em número; devolve null quando não há valor. */
export function parseWeightInput(raw: string): number | null {
  const normalized = sanitizeWeightInput(raw);
  if (normalized === "" || normalized === ".") return null;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Arredonda para a precisão de balança (3 casas = 1 grama). */
export function roundWeightKg(weightKg: number): number {
  const factor = 10 ** WEIGHT_DECIMALS;
  return Math.round(weightKg * factor) / factor;
}

/** Devolve a mensagem de erro, ou null quando o peso é aceitável. */
export function validateWeightKg(
  weightKg: number | null | undefined
): string | null {
  if (weightKg === null || weightKg === undefined || !Number.isFinite(weightKg)) {
    return WEIGHT_REQUIRED_MESSAGE;
  }
  if (weightKg < MIN_WEIGHT_KG) return WEIGHT_MIN_MESSAGE;
  if (weightKg > MAX_WEIGHT_KG) return WEIGHT_MAX_MESSAGE;
  return null;
}

/** Preço total da linha: preço por quilo × peso, arredondado em centavos. */
export function weightPriceCents(
  pricePerKgCents: number | string,
  weightKg: number
): number {
  return Math.round(Number(pricePerKgCents) * weightKg);
}

/** Formata o peso em pt-BR com 3 casas ("0,500"), sem a unidade. */
export function formatWeightKg(weightKg: number): string {
  return weightKg.toLocaleString("pt-BR", {
    minimumFractionDigits: WEIGHT_DECIMALS,
    maximumFractionDigits: WEIGHT_DECIMALS,
  });
}

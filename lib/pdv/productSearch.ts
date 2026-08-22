import type { Product } from "@/app/pdv/types";

/** Remove acentos e caixa para comparação — "Feijão" casa com "feijao". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Código de barras completo: 13 dígitos (produtos 5-7, clientes 1-3). */
export function isCompleteBarcode(value: string): boolean {
  return /^\d{13}$/.test(value.trim());
}

/**
 * Casa o código digitado com o do produto. Até 3 dígitos exige prefixo (senão
 * "5" casaria com quase todo barcode); a partir de 4 aceita trecho no meio.
 */
function matchesBarcode(barcode: string | undefined, digits: string): boolean {
  if (!barcode || !digits) return false;
  return digits.length >= 4
    ? barcode.includes(digits)
    : barcode.startsWith(digits);
}

/**
 * Busca por nome, categoria ou código de barras. Cada termo separado por espaço
 * precisa casar ("mar fran" acha "Marmitex de Frango"); busca só com dígitos
 * também tenta o código de barras.
 */
export function filterProducts(products: Product[], query: string): Product[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return products;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  return products.filter((product) => {
    if (isNumericQuery && matchesBarcode(product.barcode, normalizedQuery)) {
      return true;
    }

    const haystack = normalizeText(
      `${product.name} ${product.category?.name ?? ""}`
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Ordem alfabética do catálogo do PDV. Usa localeCompare pt-BR para acento e
 * caixa não furarem a ordem ("Açaí" entre "Abacaxi" e "Alho", não no fim).
 */
export function sortProductsByName(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

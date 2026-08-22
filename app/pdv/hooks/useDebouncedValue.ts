import { useEffect, useState } from "react";

/**
 * Atrasa a propagação do valor até ele ficar parado por `delayMs`.
 *
 * No PDV isso evita que a grade re-filtre a cada dígito de uma leitura: o
 * leitor dispara os 13 caracteres em poucos milissegundos e o campo é limpo
 * logo depois, então a grade nunca chega a piscar em estados intermediários.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

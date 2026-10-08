/**
 * Máscaras leves do perfil: formatam enquanto o cliente digita, sem travar o
 * que ele já tinha salvo num formato diferente.
 */

const digitsOf = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/** "(55) 99999-9999" ou "(55) 3222-1234", montando aos poucos. */
export function maskPhone(value: string): string {
  const d = digitsOf(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** CPF (000.000.000-00) até 11 dígitos; CNPJ (00.000.000/0000-00) depois disso. */
export function maskDoc(value: string): string {
  const d = digitsOf(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** "97000-000" */
export function maskCep(value: string): string {
  const d = digitsOf(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Estado: duas letras maiúsculas. */
export function maskUf(value: string): string {
  return value
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Para mostrar um valor salvo: aplica a máscara só quando o número de dígitos
 * fecha com o formato; senão mostra como está.
 */
export function displayPhone(value: string | null | undefined): string {
  const d = digitsOf(value);
  return d.length === 10 || d.length === 11 ? maskPhone(d) : (value ?? "").trim();
}

export function displayDoc(value: string | null | undefined): string {
  const d = digitsOf(value);
  return d.length === 11 || d.length === 14 ? maskDoc(d) : (value ?? "").trim();
}

export function displayCep(value: string | null | undefined): string {
  const d = digitsOf(value);
  return d.length === 8 ? maskCep(d) : (value ?? "").trim();
}

export function sameDigits(a: string | null | undefined, b: string | null | undefined): boolean {
  return digitsOf(a) === digitsOf(b);
}

export { digitsOf };

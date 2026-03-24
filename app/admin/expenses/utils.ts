export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return localDate.toLocaleDateString("pt-BR");
};

export const formatCurrencyInput = (value: string): string => {
  let clean = value.replace(/\D/g, "");
  if (clean.length > 10) clean = clean.substring(0, 10);
  const num = parseInt(clean) || 0;
  const formatted = (num / 100).toFixed(2);
  return `R$ ${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(".", ",")}`;
};

export const convertToCents = (formattedValue: string): number => {
  const clean = formattedValue
    .replace("R$ ", "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.round(parseFloat(clean) * 100);
};

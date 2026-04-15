export interface PreOrderThermalPrintItem {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: {
    id: string;
    name: string;
  };
}

export interface PreOrderThermalPrintCustomer {
  id: string;
  name: string;
  phone?: string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
}

export interface PreOrderThermalPrintData {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents?: number;
  totalCents: number;
  notes?: string | null;
  createdAt: string;
  items: PreOrderThermalPrintItem[];
  customer?: PreOrderThermalPrintCustomer | null;
}

export interface PublicConfigEntry {
  category: string;
  key: string;
  value: string | null;
}

const THERMAL_LINE_WIDTH = 32;

function normalizeAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function toAsciiBytes(value: string): number[] {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0);
    return code <= 0x7f ? code : 0x3f;
  });
}

function centerLine(value: string): string {
  const safe = normalizeAscii(value).slice(0, THERMAL_LINE_WIDTH);
  const totalPadding = Math.max(0, THERMAL_LINE_WIDTH - safe.length);
  const leftPadding = Math.floor(totalPadding / 2);
  return `${" ".repeat(leftPadding)}${safe}`;
}

function divider(char = "-"): string {
  return char.repeat(THERMAL_LINE_WIDTH);
}

function wrapText(value: string, width = THERMAL_LINE_WIDTH): string[] {
  const safe = normalizeAscii(value);
  if (!safe) return [];

  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length >= width) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function keyValueLine(label: string, value: string): string {
  const safeLabel = normalizeAscii(label);
  const safeValue = normalizeAscii(value);
  const available = Math.max(1, THERMAL_LINE_WIDTH - safeLabel.length - 1);
  const displayValue = safeValue.length > available ? safeValue.slice(0, available) : safeValue;
  const spaces = Math.max(1, THERMAL_LINE_WIDTH - safeLabel.length - displayValue.length);
  return `${safeLabel}${" ".repeat(spaces)}${displayValue}`;
}

function formatCustomerAddress(address?: PreOrderThermalPrintCustomer["address"]): string[] {
  if (!address) return [];

  const line1Parts = [
    address.street?.trim(),
    address.number?.trim(),
  ].filter(Boolean);

  const line2Parts = [
    address.complement?.trim(),
    address.neighborhood?.trim(),
    address.city?.trim(),
    address.state?.trim(),
    address.zip?.trim(),
  ].filter(Boolean);

  return [...wrapText(line1Parts.join(", ")), ...wrapText(line2Parts.join(", "))];
}

function getConfigValue(configs: PublicConfigEntry[], key: string): string {
  return configs.find((entry) => entry.key === key)?.value?.trim() ?? "";
}

function buildContactLines(configs: PublicConfigEntry[]): string[] {
  const address = [
    getConfigValue(configs, "contact_address_street"),
    getConfigValue(configs, "contact_address_number"),
    getConfigValue(configs, "contact_address_neighborhood"),
    getConfigValue(configs, "contact_address_city"),
    getConfigValue(configs, "contact_address_state"),
    getConfigValue(configs, "contact_address_zipcode"),
    getConfigValue(configs, "contact_address_complement"),
  ].filter(Boolean).join(", ");

  const mobile = getConfigValue(configs, "contact_phone_mobile");
  const landline = getConfigValue(configs, "contact_phone_landline");

  return [
    ...wrapText(address),
    ...wrapText([mobile, landline].filter(Boolean).join(" / ")),
  ];
}

export function buildPreOrderThermalPrintBytes(
  preOrder: PreOrderThermalPrintData,
  configs: PublicConfigEntry[],
): number[] {
  const title = getConfigValue(configs, "branding_system_title") || "VIANDAS E MARMITEX";
  const pixKey = getConfigValue(configs, "payment_pix_key");
  const lines: string[] = [];

  lines.push(centerLine(title.toUpperCase()));
  lines.push(centerLine("PRE-PEDIDO"));
  lines.push(centerLine(`#${preOrder.id.slice(-8).toUpperCase()}`));
  lines.push(centerLine(formatDateTime(preOrder.createdAt)));
  lines.push(divider("="));

  if (preOrder.customer) {
    lines.push("CLIENTE");
    lines.push(...wrapText(preOrder.customer.name));
    if (preOrder.customer.phone) {
      lines.push(...wrapText(`TEL: ${preOrder.customer.phone}`));
    }
    lines.push(...formatCustomerAddress(preOrder.customer.address));
    lines.push(divider());
  }

  lines.push("ITENS");
  for (const item of preOrder.items) {
    lines.push(...wrapText(item.product.name));

    const quantityLabel =
      item.weightKg && Number(item.weightKg) > 0
        ? `${Number(item.weightKg).toFixed(3)}kg x ${formatCurrency(item.priceCents)}`
        : `${item.quantity}x ${formatCurrency(item.priceCents)}`;

    const totalCents =
      item.weightKg && Number(item.weightKg) > 0
        ? item.priceCents
        : item.quantity * item.priceCents;

    lines.push(keyValueLine(quantityLabel, formatCurrency(totalCents)));
    lines.push(divider());
  }

  lines.push(keyValueLine("Subtotal", formatCurrency(preOrder.subtotalCents)));
  if (preOrder.discountCents > 0) {
    lines.push(keyValueLine("Desconto", `-${formatCurrency(preOrder.discountCents)}`));
  }
  if ((preOrder.deliveryFeeCents ?? 0) > 0) {
    lines.push(keyValueLine("Entrega", formatCurrency(preOrder.deliveryFeeCents ?? 0)));
  }
  lines.push(keyValueLine("TOTAL", formatCurrency(preOrder.totalCents)));

  if (preOrder.notes?.trim()) {
    lines.push(divider("="));
    lines.push("OBSERVACOES");
    lines.push(...wrapText(preOrder.notes));
  }

  if (pixKey) {
    lines.push(divider("="));
    lines.push("PIX");
    lines.push(...wrapText(`Chave: ${pixKey}`));
    lines.push(...wrapText(`Valor: ${formatCurrency(preOrder.totalCents)}`));
  }

  const contactLines = buildContactLines(configs);
  if (contactLines.length > 0) {
    lines.push(divider("="));
    lines.push("CONTATO");
    lines.push(...contactLines);
  }

  const payload = `${lines.filter(Boolean).join("\n")}\n\n\n`;

  return [
    0x1b, 0x40,
    ...toAsciiBytes(payload),
    0x1d, 0x56, 0x00,
  ];
}

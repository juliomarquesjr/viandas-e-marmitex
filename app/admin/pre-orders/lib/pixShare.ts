import { describeItem, formatCurrency, weightOf, type PreOrder } from "./preOrderView";

/**
 * O que vai para o cliente quando o pagamento é por PIX.
 *
 * O WhatsApp aberto por link (`wa.me`) só carrega texto — imagem não viaja por
 * ali. Por isso a mensagem leva o "copia e cola", que é exatamente o mesmo
 * conteúdo do QR code: o cliente cola no app do banco e paga. O QR na tela
 * continua servindo para quem está no balcão, e a imagem só é enviada quando o
 * aparelho oferece compartilhamento de arquivo.
 */

/** Chave PIX e identificação do recebedor, lidas das configurações. */
export type PixSettings = {
  key: string;
  merchantName: string;
  city: string;
};

const CEP = /^\d{5}-?\d{3}$/;

/**
 * Lê a chave PIX das configurações públicas, com o mesmo critério da comanda
 * térmica: chave configurada e, na falta dela, o celular do estabelecimento.
 * Divergir daqui faria o QR do balcão apontar para outro lugar que o do papel.
 */
export function readPixSettings(
  configs: Array<{ key: string; value: string | null }>,
): PixSettings | null {
  const value = (key: string) => configs.find((config) => config.key === key)?.value?.trim() ?? "";

  const configured = value("payment_pix_key");
  const mobile = value("contact_phone_mobile");
  const key = configured || mobile.replace(/\D/g, "");
  if (!key) return null;

  const city = value("contact_address_city");

  return {
    key,
    merchantName: (value("branding_system_title") || "PIX").replace(/\s+/g, " ").slice(0, 25),
    // A cidade tem 15 caracteres no padrão do BR Code, e CEP no lugar da
    // cidade quebra a leitura em alguns bancos.
    city: city && !CEP.test(city) ? city.replace(/\s+/g, " ").slice(0, 15) : "BR",
  };
}

/**
 * Telefone no formato que o `wa.me` entende: só dígitos, com o país na frente.
 * Sem número, o link abre a lista de contatos — é assim que o operador escolhe
 * para quem mandar.
 */
export function waPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

/** A mensagem do pagamento: o pedido, o valor e o código para colar no banco. */
export function buildPixMessage(preOrder: PreOrder, payload: string, settings: PixSettings): string {
  const saudacao = preOrder.customer?.name
    ? `Olá, ${preOrder.customer.name.split(" ")[0]}!`
    : "Olá!";

  const itens = preOrder.items.map((item) => {
    const valor = item.priceCents * (weightOf(item) !== null ? 1 : item.quantity);
    return `• ${describeItem(item)} — ${formatCurrency(valor)}`;
  });

  const linhas = [
    `${saudacao} Segue o pagamento do seu pedido em *${settings.merchantName}*.`,
    "",
    `*Pedido #${preOrder.id.slice(-4).toUpperCase()}*`,
    ...itens,
  ];

  if (preOrder.discountCents > 0) {
    linhas.push(`Desconto: -${formatCurrency(preOrder.discountCents)}`);
  }

  linhas.push(
    `*Total: ${formatCurrency(preOrder.totalCents)}*`,
    "",
    `*Pagamento por PIX*`,
    `Chave: ${settings.key}`,
    "",
    "PIX copia e cola:",
    payload,
    "",
    "É só copiar o código acima e colar no app do seu banco. Obrigado!",
  );

  return linhas.join("\n");
}

import { readPixSettings, type PixSettings } from "@/lib/pix-qr";
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

/**
 * A chave vem de `lib/pix-qr`: é a mesma que a comanda térmica e o fechamento
 * imprimem. Reexportada aqui porque o Terminal lê o PIX por este módulo.
 */
export { readPixSettings, type PixSettings };

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

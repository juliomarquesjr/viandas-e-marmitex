/** O resultado do aviso ao cliente pelo WhatsApp que as rotas de pedido devolvem junto da resposta. */
export type CustomerNoticeResult = { status: "sent" | "skipped" } | { status: "failed"; reason: string } | null | undefined;

type Toast = (message: string, type: "success" | "warning" | "error" | "info", title?: string) => void;

/**
 * Mostra ao operador o que aconteceu com o aviso. Só fala quando houve tentativa: sem o switch ligado
 * (ou com o modelo desligado) não há o que dizer. Falha não desfaz nada, só é avisada.
 */
export function toastCustomerNotice(notice: CustomerNoticeResult, showToast: Toast, saved = "A mudança foi feita") {
  if (notice?.status === "sent") showToast("Cliente avisado pelo WhatsApp.", "success");
  if (notice?.status === "failed") showToast(`${saved}, mas o cliente não foi avisado: ${notice.reason}`, "warning", "Aviso não enviado");
}

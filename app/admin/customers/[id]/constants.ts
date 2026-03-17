import {
  Banknote,
  CreditCard,
  IdCard,
  QrCode,
  Wallet,
} from "lucide-react";

export const statusMap = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", color: "bg-indigo-100 text-indigo-800" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregue", color: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export const paymentMethodMap = {
  cash: { label: "Dinheiro", icon: Banknote },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  debit: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
  invoice: { label: "Ficha do Cliente", icon: IdCard },
  ficha_payment: { label: "Pagamento de Ficha", icon: Wallet },
  dinheiro: { label: "Dinheiro", icon: Banknote },
  "ficha do cliente": { label: "Ficha do Cliente", icon: IdCard },
  fichadocliente: { label: "Ficha do Cliente", icon: IdCard },
  "cartão débito": { label: "Cartão de Débito", icon: CreditCard },
  "cartão crédito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartao debito": { label: "Cartão de Débito", icon: CreditCard },
  "cartao credito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartãocrédito": { label: "Cartão de Crédito", icon: CreditCard },
};

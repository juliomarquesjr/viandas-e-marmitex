"use client";

import { Share2, Truck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import { openWhatsApp, shareTrackingLink } from "@/lib/whatsapp";
import { formatBRL, formatDayMonth, formatKg, formatTime } from "../../lib/format";
import { cancelOrder } from "../../lib/order-api";
import { canTrack, fulfillmentOf, headline, isAwaitingStore, isFinished, isOnline, onlineState, toneOf } from "../../lib/order-status";
import type { PreOrder, PreOrderItem } from "../../lib/types";
import { Sheet, SheetHeader, StatusArt, Stepper, cx } from "../kit";
import { ProductThumb } from "./ProductThumb";
import { uniqueProducts } from "./ThumbStack";

/** Atraso da entrada em cena de cada bloco (c-rise). */
const rise = (i: number) => ({ ["--c-i" as string]: i }) as CSSProperties;

/** Peso em kg do item vendido por quilo; 0 quando é por unidade. Decimal chega como texto. */
function weightOf(item: PreOrderItem): number {
  if (item.weightKg === null || item.weightKg === undefined || item.weightKg === "") return 0;
  const kg = Number(item.weightKg);
  return Number.isFinite(kg) && kg > 0 ? kg : 0;
}

/** Linha de retirada/entrega do comprovante; null quando não há o que afirmar. */
function shippingLine(order: PreOrder): { label: string; fee: number } | null {
  const fee = order.deliveryFeeCents;
  switch (fulfillmentOf(order)) {
    case "pickup":
      return { label: "Retirada no balcão", fee };
    case "delivery":
      return { label: "Entrega", fee };
    default:
      return fee > 0 ? { label: "Entrega", fee } : null;
  }
}

/** A faixa de fotos só ajuda em pedidos grandes; com poucos produtos a lista logo abaixo já mostra as fotos grandes. */
const STRIP_MIN_PRODUCTS = 4;

export function OrderDetail({
  order,
  onNotice,
  onChanged,
}: {
  order: PreOrder;
  onNotice: (message: string) => void;
  /** Busca os pedidos de novo (depois de cancelar, ou se a loja respondeu antes). */
  onChanged?: () => void;
}) {
  const tone = toneOf(order);
  const { title, text } = headline(order);
  const rejected = onlineState(order) === "rejected";
  const canCancel = isAwaitingStore(order);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const cancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    const result = await cancelOrder(order.id);
    setCancelling(false);
    if (result.ok) {
      setConfirmOpen(false);
      onNotice("Pedido cancelado.");
      onChanged?.();
    } else if (result.kind === "auth") {
      window.location.href = "/login";
    } else {
      setCancelError(result.message);
      // A loja pode ter respondido no meio do caminho: a lista mostra o estado de agora
      if (result.kind === "conflict") onChanged?.();
    }
  };
  const shipping = shippingLine(order);
  const products = uniqueProducts(order.items);
  const trackable = canTrack(order);
  let block = 0;

  const share = () => {
    const trackingUrl = `${window.location.origin}/tracking/${order.id}`;
    openWhatsApp(shareTrackingLink(trackingUrl));
    onNotice("Abrindo o WhatsApp para compartilhar…");
  };

  return (
    <>
      <section className={cx("c-status c-rise", tone === "go" && "is-go")} style={rise(block++)} aria-label="Andamento do pedido">
        <div className="c-status-top">
          <StatusArt order={order} size={84} />
          <div aria-live="polite">
            <h2>{title}</h2>
            {rejected ? <p className="c-reject">{text}</p> : <p>{text}</p>}
          </div>
        </div>
        {order.deliveryStatus !== "cancelled" && <Stepper order={order} />}
      </section>

      <article className="c-receipt c-rise" style={rise(block++)} aria-label="Itens e valores do pedido">
        <div>
          <p className="c-eyebrow">
            Pedido de {formatDayMonth(order.createdAt)} às {formatTime(order.createdAt)}
          </p>
        </div>
        {products.length >= STRIP_MIN_PRODUCTS && (
          <div className="c-strip" aria-hidden="true">
            <p className="c-eyebrow">Neste pedido</p>
            <ul className="c-strip-list">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductThumb product={product} size="md" />
                  <span className="c-strip-name">{product.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {order.items.length > 0 && (
          <ul className="c-items has-thumbs">
            {order.items.map((item) => {
              const kg = weightOf(item);
              return (
                <li key={item.id}>
                  <span className="c-li-media">
                    <ProductThumb product={item.product} size="lg" />
                    {kg === 0 && item.quantity > 1 && <span className="c-li-qty">{item.quantity}×</span>}
                  </span>
                  <span className="c-li-body">
                    <span className="c-li-name">{item.product.name}</span>
                    <span className="c-li-sub c-num">
                      {kg > 0 ? formatKg(kg) : `${item.quantity} × ${formatBRL(item.priceCents)}`}
                    </span>
                  </span>
                  <span className="c-p">{formatBRL(item.priceCents * item.quantity)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <hr className="c-dash" />
        <div className="c-sum">
          <span>Subtotal</span>
          <span className="c-num">{formatBRL(order.subtotalCents)}</span>
        </div>
        {order.discountCents > 0 && (
          <div className="c-sum">
            <span>Desconto</span>
            <span className="is-neg c-num">− {formatBRL(order.discountCents)}</span>
          </div>
        )}
        {shipping && (
          <div className="c-sum">
            <span>{shipping.label}</span>
            {shipping.fee > 0 ? (
              <span className="c-num">{formatBRL(shipping.fee)}</span>
            ) : (
              <span className="is-neg">Grátis</span>
            )}
          </div>
        )}
        <div className="c-sum is-total">
          <span>Total</span>
          <span className="c-num">{formatBRL(order.totalCents)}</span>
        </div>
        {isOnline(order) && !isFinished(order) && <p className="c-foot">Você paga na retirada.</p>}
      </article>

      {order.notes?.trim() && (
        <p className="c-note c-rise" style={rise(block++)}>
          <b>Observação:</b> {order.notes.trim()}
        </p>
      )}

      {canCancel && (
        <div className="c-actions c-rise" style={rise(block++)}>
          <button
            type="button"
            className="c-btn is-ghost"
            onClick={() => {
              setCancelError(null);
              setConfirmOpen(true);
            }}
          >
            <X size={18} aria-hidden="true" />
            Cancelar pedido
          </button>
        </div>
      )}

      {trackable && (
        <div className="c-actions c-rise" style={rise(block++)}>
          <Link href={`/pre-orders/${order.id}/tracking`} className="c-btn is-primary">
            <Truck size={18} aria-hidden="true" />
            Acompanhar entrega
          </Link>
          <button type="button" className="c-btn is-ghost" onClick={share}>
            <Share2 size={18} aria-hidden="true" />
            Compartilhar
          </button>
        </div>
      )}

      <Sheet open={confirmOpen} onClose={closeConfirm} label="Cancelar pedido">
        <SheetHeader title="Cancelar este pedido?" onClose={closeConfirm} focusTitle />
        <p className="c-confirm-text">
          {onlineState(order) === "expired"
            ? "A loja não respondeu a tempo. Ao cancelar, você libera espaço para fazer um novo pedido."
            : "A loja ainda não respondeu. Se você cancelar, ela não vai preparar este pedido."}
        </p>
        {cancelError && (
          <p className="c-alert" role="alert">
            {cancelError}
          </p>
        )}
        <div className="c-actions">
          <button type="button" className="c-btn is-ghost" onClick={closeConfirm} disabled={cancelling}>
            {cancelError ? "Fechar" : "Não, manter"}
          </button>
          {!(cancelError && !canCancel) && (
            <button
              type="button"
              className="c-btn is-primary"
              onClick={cancel}
              aria-disabled={cancelling || undefined}
              aria-busy={cancelling || undefined}
            >
              {cancelling ? (
                <>
                  <span className="c-spin" aria-hidden="true" />
                  Cancelando…
                </>
              ) : (
                "Sim, cancelar"
              )}
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}

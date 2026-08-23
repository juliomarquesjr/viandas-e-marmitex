"use client";

import {
  formatAmount,
  formatCurrency,
  formatDateTime,
  fulfillmentOf,
  weightOf,
  type PreOrder,
} from "../lib/preOrderView";

/**
 * O cupom como ele sai da impressora térmica — serrilha, monoespaçado, peso
 * por extenso. É a prévia de impressão de verdade e substitui os antigos
 * modais de resumo e de detalhes.
 *
 * O papel não segue o tema do admin: papel não tem modo escuro. Por isso as
 * cores aqui são literais e o bloco pinta fundo e texto explicitamente.
 */
export function ThermalTicket({ preOrder }: { preOrder: PreOrder }) {
  const fulfillment = fulfillmentOf(preOrder);
  const address = preOrder.customer?.address;
  const addressLine =
    address && typeof address === "object"
      ? [address.street, address.number, address.neighborhood].filter(Boolean).join(", ")
      : null;

  return (
    <div className="relative w-[326px] max-w-full bg-[#fffdf6] px-[22px] pb-4 pt-5 font-mono text-[12px] leading-[1.55] text-[#1c1917] shadow-[0_1px_0_rgba(0,0,0,0.06),0_18px_34px_-22px_rgba(28,25,23,0.75)] print:shadow-none">
      <Serrilha position="top" />
      <Serrilha position="bottom" />

      <div className="text-center">
        <p className="text-[12.5px] font-bold tracking-[0.22em]">VIANDAS &amp; MARMITEX</p>
        <p className="text-[10.5px] text-[#78716c]">Pré-pedido</p>
      </div>

      <Divider />

      <Line label="PRÉ-PEDIDO" value={`#${preOrder.id.slice(-4).toUpperCase()}`} />
      <Line label="ANOTADO" value={formatDateTime(preOrder.createdAt)} />
      <Line label="CLIENTE" value={preOrder.customer?.name ?? "Venda avulsa"} />
      {fulfillment !== "unknown" && (
        <p className="mt-1 text-center text-[11px] font-bold tracking-[0.14em]">
          {fulfillment === "pickup" ? "RETIRA NO BALCÃO" : "ENTREGA"}
        </p>
      )}

      <Divider />

      <ul className="flex flex-col gap-1.5">
        {preOrder.items.map((item) => {
          const weight = weightOf(item);
          const pricePerKg = item.product.pricePerKgCents;

          return (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="w-[52px] flex-none font-bold">
                  {weight !== null ? `${weight.toFixed(3).replace(".", ",")}kg` : `${item.quantity} un`}
                </span>
                <span className="min-w-0 flex-1 uppercase">{item.product.name}</span>
                <span className="flex-none tabular-nums">
                  {formatAmount(item.priceCents * (weight !== null ? 1 : item.quantity))}
                </span>
              </div>
              <p className="pl-[52px] text-[10.5px] text-[#78716c]">
                {weight !== null && pricePerKg
                  ? `${formatCurrency(pricePerKg)}/kg`
                  : `${formatCurrency(item.priceCents)} cada`}
              </p>
            </li>
          );
        })}
      </ul>

      <Divider />

      <Line label="Subtotal" value={formatAmount(preOrder.subtotalCents)} />
      {preOrder.discountCents > 0 && (
        <Line label="Desconto" value={`-${formatAmount(preOrder.discountCents)}`} />
      )}
      {preOrder.deliveryFeeCents > 0 && (
        <Line label="Entrega" value={formatAmount(preOrder.deliveryFeeCents)} />
      )}

      <Divider />

      <div className="flex items-baseline justify-between text-[16px] font-bold tracking-tight">
        <span>TOTAL</span>
        <span className="tabular-nums">{formatCurrency(preOrder.totalCents)}</span>
      </div>

      {(addressLine || preOrder.notes) && <Divider />}
      {addressLine && fulfillment !== "pickup" && (
        <p className="text-center text-[10.5px] text-[#78716c]">Entrega: {addressLine}</p>
      )}
      {preOrder.notes && (
        <p className="mt-1 text-[11px] break-words">OBS: {preOrder.notes}</p>
      )}

      <p className="mt-3 text-center text-[10px] tracking-[0.13em] text-[#78716c]">
        NÃO É DOCUMENTO FISCAL
      </p>
    </div>
  );
}

/**
 * A borda serrilhada do papel. Em SVG e não em gradiente CSS: dois
 * `linear-gradient` empilhados se sobrepõem e resultam numa borda reta —
 * o pattern desenha o dente de forma previsível.
 */
function Serrilha({ position }: { position: "top" | "bottom" }) {
  const id = `serrilha-${position}`;

  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 h-[9px] w-full ${
        position === "top" ? "-top-[9px]" : "-bottom-[9px] -scale-y-100"
      }`}
    >
      <defs>
        <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse">
          <polygon points="0,9 4.5,0 9,9" fill="#fffdf6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function Divider() {
  return <hr className="my-[11px] border-0 border-t border-dashed border-[#d6d3d1]" />;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span>{label}</span>
      <span className="truncate tabular-nums">{value}</span>
    </div>
  );
}

"use client";

import { remainingStock, resolveLastAdded } from "@/lib/pdv/lastAdded";
import { Check, ScanBarcode } from "lucide-react";
import { useMemo } from "react";
import { Kbd } from "../../components/ui/kbd";
import type { CartItem, Product } from "../types";
import { ProductThumb } from "./ProductThumb";

interface LastItemPanelProps {
  cart: CartItem[];
  products: Product[];
  lastAddedId: string | null;
}

/**
 * Conferência visual do item que acabou de entrar na venda. Fica no topo do
 * catálogo — dentro da coluna do carrinho custaria altura da lista de itens.
 */
export function LastItemPanel({ cart, products, lastAddedId }: LastItemPanelProps) {
  const last = useMemo(
    () => resolveLastAdded(cart, products, lastAddedId),
    [cart, products, lastAddedId]
  );

  if (!last) return <EmptyPanel />;

  const { line, product } = last;
  const rest = remainingStock(product, cart);
  const lineTotal = line.price * line.qty;

  const unitLabel =
    line.isWeightBased && line.weightKg
      ? `${line.weightKg.toFixed(3)} kg × R$ ${(line.price / line.weightKg).toFixed(2)}/kg`
      : `${line.qty} × R$ ${line.price.toFixed(2)}`;

  return (
    <div className="flex min-h-[11.5rem] overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(37,99,235,0.1)]">
      {/* A foto fica fora do fluxo: solta, a altura natural da imagem entrava no
          cálculo da altura do painel e o quadro mudava de tamanho a cada produto. */}
      <div className="relative w-[210px] flex-shrink-0 self-stretch">
        <div className="absolute inset-0">
          <ProductThumb
            src={product?.imageUrl}
            alt={line.name}
            className="h-full w-full"
            iconClassName="h-12 w-12 text-slate-300"
          />
        </div>
        <span className="absolute top-2.5 left-2.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white shadow-md">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 bg-gradient-to-r from-blue-50/60 to-white px-4 py-3">
        <span className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
          Último item adicionado
        </span>

        <p className="text-[17px] font-bold leading-tight tracking-tight text-slate-900 line-clamp-2">
          {line.name}
        </p>

        <p className="text-[11.5px] tabular-nums text-slate-600">{unitLabel}</p>

        <p className="text-2xl font-extrabold leading-none tracking-tight text-primary tabular-nums">
          R$ {lineTotal.toFixed(2)}
        </p>

        {rest !== null && (
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
              rest === 0
                ? "bg-red-100 text-red-700"
                : rest <= 3
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {rest === 0 ? "Última unidade do estoque" : `Restam ${rest} em estoque`}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="flex min-h-[11.5rem] overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
      <div className="grid w-[210px] flex-shrink-0 place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="grid h-[124px] w-[148px] place-content-center justify-items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
          <ScanBarcode className="h-7 w-7" strokeWidth={1.7} />
          <span className="text-[8px] font-medium uppercase tracking-[0.18em] text-slate-400">
            foto do produto
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
        <span className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-400">
          <ScanBarcode className="h-2.5 w-2.5" strokeWidth={2.6} />
          Aguardando o primeiro item
        </span>
        <p className="text-[17px] font-bold leading-tight tracking-tight text-slate-600">
          Nenhum produto na venda
        </p>
        <p className="line-clamp-3 max-w-[34ch] text-[11.5px] leading-relaxed text-muted-foreground">
          Bipe o código de barras ou toque num card do catálogo para conferir o
          item aqui.
        </p>
        <span className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-400">
          <Kbd className="h-5 min-w-5 text-[9px]">Ctrl+K</Kbd> busca
          <Kbd className="h-5 min-w-5 text-[9px]">F3</Kbd> cliente
        </span>
      </div>
    </div>
  );
}

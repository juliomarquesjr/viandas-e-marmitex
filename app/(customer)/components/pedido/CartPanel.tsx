"use client";

import { Store, Trash2, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { countItems, totalOf, type CartLine, type ResolvedLine } from "../../lib/cart";
import { formatBRL } from "../../lib/format";
import type { StoreKind } from "../../lib/store-status";
import type { OrderingMenu } from "../../lib/types";
import { ErrorState, Money, SheetHeader, cx } from "../kit";
import { ProductThumb } from "../pedidos/ProductThumb";
import "./pedido.css";
import { QuantityControl } from "./QuantityControl";

/** Algo que o envio informou e que o cliente precisa ler (não é erro de rede). */
export interface SendProblem {
  text: string;
  /** Mostra o atalho para Pedidos (quando já há pedidos esperando a loja). */
  linkToOrders?: boolean;
}

/** O total conta de zero até o valor uma vez, quando aparece; depois acompanha as mudanças sem demora. */
function AnimatedTotal({ cents }: { cents: number }) {
  const [animate, setAnimate] = React.useState(true);
  React.useEffect(() => {
    const t = window.setTimeout(() => setAnimate(false), 1300);
    return () => window.clearTimeout(t);
  }, []);
  return <Money cents={cents} countUp={animate} />;
}

export interface CartPanelProps {
  variant: "sheet" | "aside";
  resolved: ResolvedLine[];
  menu: OrderingMenu | null;
  storeKind: StoreKind | null;
  notes: string;
  onNotes: (value: string) => void;
  onQuantity: (line: CartLine, quantity: number) => void;
  onRemoveFlagged: () => void;
  onSend: () => void;
  sending: boolean;
  problem: SendProblem | null;
  /** A internet caiu no envio: troca o conteúdo por "Sem conexão" com "Tentar de novo". */
  networkFailed: boolean;
  onDismissNetwork: () => void;
  onLimit: () => void;
  onClose?: () => void;
}

/**
 * Carrinho + envio. Serve à folha do celular e ao painel lateral do computador: mesmo conteúdo,
 * cabeçalho e rodapé fixos e só a lista rola.
 */
export function CartPanel({
  variant,
  resolved,
  menu,
  storeKind,
  notes,
  onNotes,
  onQuantity,
  onRemoveFlagged,
  onSend,
  sending,
  problem,
  networkFailed,
  onDismissNetwork,
  onLimit,
  onClose,
}: CartPanelProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const noteId = React.useId();
  const limits = menu?.limits;
  const items = countItems(resolved.map((r) => r.line));
  const total = totalOf(resolved);
  const flagged = resolved.filter((r) => r.issue);
  const valid = resolved.length - flagged.length;
  const storeOpen = storeKind === "open" || storeKind === "closing";
  const tooManyPending = Boolean(menu && limits && menu.awaitingCount >= limits.maxPending);
  const blocked = !menu || !storeOpen || tooManyPending || flagged.length > 0 || valid === 0;
  const notesMax = limits?.notesMax ?? 200;

  const title = "Seu pedido";
  const subtitle = items > 0 ? `${items} ${items === 1 ? "item" : "itens"}` : undefined;

  // Tirar o último item de uma linha tira o botão de baixo do foco: ele vai para o título
  const change = (line: CartLine, quantity: number) => {
    onQuantity(line, quantity);
    if (quantity <= 0) root.current?.querySelector<HTMLElement>("[data-sheet-focus]")?.focus();
  };

  return (
    <div ref={root} className={cx("c-cart", variant === "aside" && "is-aside")}>
      {variant === "sheet" && onClose ? (
        <div className="c-cart-h">
          <SheetHeader title={title} subtitle={subtitle} onClose={onClose} focusTitle />
        </div>
      ) : (
        <div className="c-cart-h">
          <div className="c-sheet-h">
            <div>
              <h2 tabIndex={-1} data-sheet-focus="">
                {title}
              </h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      {networkFailed ? (
        <div className="c-cart-body">
          <ErrorState
            title="Sem conexão"
            message="Não conseguimos confirmar o envio. Seu carrinho está guardado: toque em tentar de novo, o pedido não será duplicado."
            onRetry={onSend}
          />
          <button type="button" className="c-btn is-quiet" onClick={onDismissNetwork}>
            Voltar ao carrinho
          </button>
        </div>
      ) : resolved.length === 0 ? (
        <div className="c-cart-body">
          <p className="c-cart-empty">Seu carrinho está vazio. Toque no + de um produto para começar.</p>
        </div>
      ) : (
        <>
          <div className="c-cart-body">
            <ul className="c-cl-list" aria-label="Itens do pedido">
              {resolved.map(({ line, unitCents, issue }) => (
                <li key={line.productId} className={cx("c-cl", issue && "has-issue")}>
                  <ProductThumb product={{ id: line.productId, name: line.name, imageUrl: line.imageUrl }} size="md" />
                  <div className="c-cl-main">
                    <div className="c-cl-top">
                      <span className="c-cl-name">{line.name}</span>
                      {!issue && <span className="c-cl-sum c-num">{formatBRL(unitCents * line.quantity)}</span>}
                    </div>
                    <span className="c-cl-unit c-num">
                      {line.quantity > 1 ? `${line.quantity} × ` : ""}
                      {formatBRL(unitCents)}
                    </span>
                    {issue && (
                      <p className="c-cl-issue">
                        <TriangleAlert size={16} aria-hidden="true" />
                        <span>{issue.text}</span>
                      </p>
                    )}
                    <div className="c-cl-act">
                      {!issue && limits && (
                        <QuantityControl
                          name={line.name}
                          quantity={line.quantity}
                          max={limits.maxQuantity}
                          onChange={(n) => change(line, n)}
                          onLimit={onLimit}
                        />
                      )}
                      <button
                        type="button"
                        className="c-cl-rm"
                        aria-label={`Remover ${line.name} do carrinho`}
                        onClick={() => change(line, 0)}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                        {issue && <span>Remover</span>}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {flagged.length > 0 && (
              <button type="button" className="c-btn is-ghost c-cart-fix" onClick={onRemoveFlagged}>
                Remover e continuar
              </button>
            )}

            <div className="c-ped-info">
              <div>
                <span className="c-oic" aria-hidden="true">
                  <Store size={20} />
                </span>
                <p>
                  <strong>Retirar na loja</strong>
                  <small>Avisamos quando ficar pronto.</small>
                </p>
              </div>
              <div>
                <span className="c-oic" aria-hidden="true">
                  <Wallet size={20} />
                </span>
                <p>
                  <strong>Você paga na retirada</strong>
                  <small>Nada é cobrado agora.</small>
                </p>
              </div>
            </div>

            <div className="c-ped-notes">
              <label htmlFor={noteId}>Observação (opcional)</label>
              <textarea
                id={noteId}
                value={notes}
                maxLength={notesMax}
                rows={3}
                placeholder="Ex.: sem cebola"
                onChange={(e) => onNotes(e.target.value)}
                aria-describedby={`${noteId}-count`}
              />
              <small id={`${noteId}-count`} className="c-num">
                {notes.length}/{notesMax}
              </small>
            </div>
          </div>

          <div className="c-cart-foot">
            {!storeOpen && menu && (
              <p className="c-alert" role="status">
                A loja não está recebendo pedidos agora. Seu carrinho fica guardado até ela abrir.
              </p>
            )}
            {storeOpen && tooManyPending && menu && (
              <p className="c-alert" role="status">
                Você já tem {menu.awaitingCount} {menu.awaitingCount === 1 ? "pedido esperando" : "pedidos esperando"} a loja confirmar.
                Aguarde a resposta para enviar outro.{" "}
                <Link href="/pre-orders" className="c-alert-link">
                  Ver pedidos
                </Link>
              </p>
            )}
            {problem && (
              <p className="c-alert" role="alert">
                {problem.text}{" "}
                {problem.linkToOrders && (
                  <Link href="/pre-orders" className="c-alert-link">
                    Ver pedidos
                  </Link>
                )}
              </p>
            )}
            <div className="c-ped-total">
              <span>Total</span>
              <AnimatedTotal cents={total} />
            </div>
            <button
              type="button"
              className="c-btn is-primary c-cart-send"
              disabled={blocked && !sending}
              aria-disabled={sending || undefined}
              aria-busy={sending || undefined}
              onClick={() => {
                if (!sending) onSend();
              }}
            >
              {sending ? (
                <>
                  <span className="c-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                `Enviar pedido · ${formatBRL(total)}`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

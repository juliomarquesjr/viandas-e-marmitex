"use client";

import { Bell, BellRing, ChevronRight, CircleCheck, CircleX, CookingPot, HandCoins, PackageCheck, ReceiptText } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import * as React from "react";
import { formatRelative } from "../../lib/format";
import { markNoticesSeen, useNotices, type Notice } from "../../lib/notifications-store";
import { cx, EmptyState, Sheet, SheetHeader } from "../kit";
import "./avisos.css";

function NoticeIcon({ notice }: { notice: Notice }) {
  const props = { size: 22, strokeWidth: 1.8 };
  if (notice.kind === "pay") return <HandCoins {...props} />;
  if (notice.kind === "buy") return <ReceiptText {...props} />;
  if (notice.tone === "go") return <PackageCheck {...props} />;
  if (notice.tone === "done") return <CircleCheck {...props} />;
  if (notice.tone === "off") return <CircleX {...props} />;
  return <CookingPot {...props} />;
}

/**
 * Sino de avisos: no cabeçalho (celular) e no menu lateral (computador).
 * Abre uma folha com os avisos; os novos aparecem marcados e, ao fechar, tudo vira "visto".
 */
export function NotificationBell({ variant = "icon" }: { variant?: "icon" | "rail" }) {
  const { data: session } = useSession();
  const customerId = (session?.user as { customerId?: string } | undefined)?.customerId;
  const { items, loaded, seenAt, unread } = useNotices(customerId);

  const [open, setOpen] = React.useState(false);
  // O que era novo quando a folha abriu: continua marcado enquanto ela está aberta
  const [seenOnOpen, setSeenOnOpen] = React.useState("");
  // Tempo de referência da folha, fixo enquanto ela está aberta
  const [now, setNow] = React.useState(() => new Date());

  const openSheet = () => {
    setSeenOnOpen(seenAt);
    setNow(new Date());
    setOpen(true);
  };
  const close = React.useCallback(() => {
    setOpen(false);
    markNoticesSeen();
  }, []);

  const label = unread > 0 ? `Avisos, ${unread} ${unread === 1 ? "novo" : "novos"}` : "Avisos";
  const badge = unread > 9 ? "9+" : String(unread);
  const Icon = unread > 0 ? BellRing : Bell;

  return (
    <>
      {variant === "rail" ? (
        <button type="button" className="c-nav" onClick={openSheet} aria-label={label}>
          <span className={cx("c-nav-ic c-bell", unread > 0 && "has-new")}>
            <Icon size={22} strokeWidth={1.8} />
            {unread > 0 && <b className="c-bell-badge c-num">{badge}</b>}
          </span>
          Avisos
        </button>
      ) : (
        <button type="button" className={cx("c-iconbtn c-bell", unread > 0 && "has-new")} onClick={openSheet} aria-label={label}>
          <Icon size={22} />
          {unread > 0 && <b className="c-bell-badge c-num">{badge}</b>}
        </button>
      )}

      <Sheet open={open} onClose={close} label="Avisos">
        <SheetHeader
          title="Avisos"
          subtitle={unread > 0 ? `${unread} ${unread === 1 ? "novo" : "novos"}` : "Seus pedidos e pagamentos recentes"}
          onClose={close}
        />
        {!loaded ? (
          <div className="c-notices" aria-busy="true" aria-label="Carregando avisos">
            {[0, 1, 2].map((i) => (
              <div key={i} className="c-notice">
                <span className="c-skel c-notice-ic" />
                <span className="c-notice-main" style={{ gap: 8 }}>
                  <span className="c-skel" style={{ height: 16, width: "55%" }} />
                  <span className="c-skel" style={{ height: 12, width: "80%" }} />
                </span>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Nenhum aviso por enquanto" text="Quando seu pedido mudar de etapa ou um pagamento for registrado, você vê aqui." />
        ) : (
          <ul className="c-notices">
            {items.map((notice) => {
              const isNew = notice.at > seenOnOpen;
              return (
                <li key={notice.id}>
                  <Link href={notice.href} className={cx("c-notice", isNew && "is-new")} onClick={close}>
                    <span className={cx("c-notice-ic", `is-${notice.tone}`)} aria-hidden="true">
                      <NoticeIcon notice={notice} />
                    </span>
                    <span className="c-notice-main">
                      <strong>
                        {isNew && <span className="c-sr">Novo: </span>}
                        {notice.title}
                      </strong>
                      <small>{notice.text}</small>
                      <time className="c-num" dateTime={notice.at}>
                        {formatRelative(notice.at, now)}
                      </time>
                    </span>
                    <span className="c-chev" aria-hidden="true">
                      <ChevronRight size={18} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
}

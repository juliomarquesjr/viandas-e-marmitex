"use client";

import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  CircleX,
  CookingPot,
  HandCoins,
  PackageCheck,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import * as React from "react";
import { formatRelative } from "../../lib/format";
import {
  dismissAllNotices,
  dismissNotice,
  markAllNoticesRead,
  markNoticeRead,
  undoClearNotices,
  useNotices,
  type Notice,
} from "../../lib/notifications-store";
import { cx, Sheet } from "../kit";
import "./avisos.css";

/** Quanto o aviso leva para sumir da lista depois de limpo (combina com a animação em avisos.css). */
const LEAVE_MS = 240;
/** Quanto tempo o "Desfazer" fica na tela. */
const UNDO_MS = 6000;

function NoticeIcon({ notice }: { notice: Notice }) {
  const props = { size: 22, strokeWidth: 1.8 };
  if (notice.kind === "pay") return <HandCoins {...props} />;
  if (notice.kind === "buy") return <ReceiptText {...props} />;
  if (notice.tone === "go") return <PackageCheck {...props} />;
  if (notice.tone === "done") return <CircleCheck {...props} />;
  if (notice.tone === "off") return <CircleX {...props} />;
  return <CookingPot {...props} />;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoje", "Ontem", "Esta semana" ou "Mais antigos": os avisos chegam do mais novo para o mais antigo. */
function groupOf(iso: string, now: Date): string {
  const date = new Date(iso);
  if (sameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Ontem";
  return now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000 ? "Esta semana" : "Mais antigos";
}

/** Sino com um tique: "tudo em dia". */
function AllClearArt() {
  return (
    <span className="c-av-art" aria-hidden="true">
      <svg viewBox="0 0 72 72" width="88" height="88">
        <circle className="c-ring" cx="36" cy="36" r="24" />
        <circle className="c-ring r2" cx="36" cy="36" r="24" />
        <g className="c-av-bellart">
          <path
            d="M36 17c-8 0-13 6-13 14v7l-4 6h34l-4-6v-7c0-8-5-14-13-14z"
            fill="currentColor"
          />
          <path d="M31 48a5 5 0 0 0 10 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path
            className="c-tick"
            d="m30 33 4.5 4.5L43 28.5"
            fill="none"
            stroke="var(--c-surface)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  );
}

type Filter = "all" | "unread";

/**
 * Sino de avisos: no cabeçalho (celular) e no menu lateral (computador).
 *
 * O selo conta os avisos ainda não vistos. Tocar num aviso, marcá-lo como visto ou limpá-lo
 * diminui a contagem. "Limpar tudo" tem desfazer, então não precisa de confirmação.
 */
export function NotificationBell({ variant = "icon" }: { variant?: "icon" | "rail" }) {
  const { data: session } = useSession();
  const customerId = (session?.user as { customerId?: string } | undefined)?.customerId;
  const { items, loaded, unread, canUndo, clearedCount, isUnread } = useNotices(customerId);

  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [now, setNow] = React.useState(() => new Date());
  // avisos em animação de saída: somem da lista quando o tempo acaba
  const [leaving, setLeaving] = React.useState<ReadonlySet<string>>(new Set());
  const [undoOpen, setUndoOpen] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);
  const openSheet = () => {
    setNow(new Date());
    setFilter("all");
    setUndoOpen(false);
    setOpen(true);
  };

  // O "Desfazer" some sozinho
  React.useEffect(() => {
    if (!undoOpen) return;
    const t = window.setTimeout(() => setUndoOpen(false), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undoOpen, clearedCount]);

  const clearOne = (id: string) => {
    setLeaving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      dismissNotice(id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setUndoOpen(true);
    }, LEAVE_MS);
  };
  const clearAll = () => {
    setLeaving(new Set(items.map((notice) => notice.id)));
    window.setTimeout(() => {
      dismissAllNotices();
      setLeaving(new Set());
      setUndoOpen(true);
    }, LEAVE_MS);
  };
  const undo = () => {
    undoClearNotices();
    setUndoOpen(false);
  };

  const label = unread > 0 ? `Avisos, ${unread} ${unread === 1 ? "novo" : "novos"}` : "Avisos";
  const badge = unread > 9 ? "9+" : String(unread);
  const Icon = unread > 0 ? BellRing : Bell;

  const shown = filter === "unread" ? items.filter(isUnread) : items;
  const groups: Array<{ name: string; list: Notice[] }> = [];
  for (const notice of shown) {
    const name = groupOf(notice.at, now);
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.list.push(notice);
    else groups.push({ name, list: [notice] });
  }

  return (
    <>
      {variant === "rail" ? (
        <button type="button" className="c-nav" onClick={openSheet} aria-label={label}>
          <span className={cx("c-nav-ic c-bell", unread > 0 && "has-new")}>
            <Icon size={22} strokeWidth={1.8} />
            {unread > 0 && (
              <b key={badge} className="c-bell-badge c-num">
                {badge}
              </b>
            )}
          </span>
          Avisos
        </button>
      ) : (
        <button type="button" className={cx("c-iconbtn c-bell", unread > 0 && "has-new")} onClick={openSheet} aria-label={label}>
          <Icon size={22} />
          {unread > 0 && (
            <b key={badge} className="c-bell-badge c-num">
              {badge}
            </b>
          )}
        </button>
      )}

      <Sheet open={open} onClose={close} label="Avisos" className="is-avisos">
        <div className="c-av-head">
          <div>
            <h2>Avisos</h2>
            <p aria-live="polite">
              {unread > 0 ? (
                <>
                  <b className="c-num">{unread}</b> {unread === 1 ? "novo" : "novos"}
                </>
              ) : (
                "Você está em dia"
              )}
            </p>
          </div>
          <button type="button" className="c-x" onClick={close} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="c-av-tools">
            <div className="c-av-seg" role="group" aria-label="Filtrar avisos">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                Todos <span className="c-num">{items.length}</span>
              </button>
              <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>
                Novos <span className="c-num">{unread}</span>
              </button>
            </div>
            <div className="c-av-bulk">
              <button type="button" onClick={markAllNoticesRead} disabled={unread === 0}>
                <CheckCheck size={16} aria-hidden="true" />
                Marcar como vistos
              </button>
              <button type="button" className="is-danger" onClick={clearAll}>
                <Trash2 size={16} aria-hidden="true" />
                Limpar tudo
              </button>
            </div>
          </div>
        )}

        <div className="c-av-scroll">
          {!loaded ? (
            <div className="c-av-list" aria-busy="true" aria-label="Carregando avisos">
              {[0, 1, 2].map((i) => (
                <div key={i} className="c-av-item">
                  <span className="c-skel c-av-ic" />
                  <span className="c-av-body" style={{ gap: 8 }}>
                    <span className="c-skel" style={{ height: 16, width: "55%" }} />
                    <span className="c-skel" style={{ height: 12, width: "80%" }} />
                  </span>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="c-av-empty">
              <AllClearArt />
              <h3>{items.length === 0 ? "Nenhum aviso por aqui" : "Nenhum aviso novo"}</h3>
              <p>
                {items.length === 0
                  ? "Quando um pedido mudar de etapa ou um pagamento for registrado, você vê aqui."
                  : "Você viu tudo o que chegou."}
              </p>
              {items.length > 0 && (
                <button type="button" className="c-btn is-ghost" onClick={() => setFilter("all")}>
                  Ver todos os avisos
                </button>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.name} className="c-av-group" aria-label={group.name}>
                <h3>{group.name}</h3>
                <ul className="c-av-list">
                  {group.list.map((notice, i) => {
                    const fresh = isUnread(notice);
                    return (
                      <li
                        key={notice.id}
                        className={cx("c-av-item", fresh && "is-new", leaving.has(notice.id) && "is-leaving")}
                        style={{ ["--c-i" as string]: Math.min(i, 8) } as React.CSSProperties}
                      >
                        <Link
                          href={notice.href}
                          className="c-av-link"
                          onClick={() => {
                            markNoticeRead(notice.id);
                            close();
                          }}
                        >
                          <span className={cx("c-av-ic", `is-${notice.tone}`)} aria-hidden="true">
                            <NoticeIcon notice={notice} />
                            {fresh && <i className="c-av-dot" />}
                          </span>
                          <span className="c-av-body">
                            <strong>
                              {fresh && <span className="c-sr">Novo: </span>}
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
                        <span className="c-av-acts">
                          {fresh && (
                            <button type="button" onClick={() => markNoticeRead(notice.id)} aria-label={`Marcar como visto: ${notice.title}`} title="Marcar como visto">
                              <Check size={18} />
                            </button>
                          )}
                          <button type="button" onClick={() => clearOne(notice.id)} aria-label={`Limpar aviso: ${notice.title}`} title="Limpar este aviso">
                            <X size={18} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {undoOpen && canUndo && (
          <div className="c-av-undo" role="status">
            <span>{clearedCount === 1 ? "Aviso limpo" : `${clearedCount} avisos limpos`}</span>
            <button type="button" onClick={undo}>
              Desfazer
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

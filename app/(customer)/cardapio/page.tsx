"use client";

import { weekGroupLabel } from "@/lib/daily-menu";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { MenuView } from "../components/cardapio/MenuView";
import "../components/cardapio/cardapio.css";
import { EmptyState, ErrorState, LoadingRows } from "../components/kit";
import {
  addDays,
  dayNumber,
  menuUrl,
  MENUS_URL,
  relativeDay,
  weekdayShort,
  type MenuResponse,
  type MenuSummary,
  type MenusResponse,
} from "../lib/menu-api";
import { useCustomerData } from "../lib/useCustomerData";

const PAGE_SIZE = 30;
const STRIP_DAYS = 5;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function CardapioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="c-page">
          <LoadingRows rows={5} />
        </div>
      }
    >
      <CardapioScreen />
    </React.Suspense>
  );
}

function CardapioScreen() {
  const router = useRouter();
  const pathname = usePathname() ?? "/cardapio";
  const searchParams = useSearchParams();
  const dateInput = React.useRef<HTMLInputElement>(null);

  const list = useCustomerData<MenusResponse>(`${MENUS_URL}?limit=${PAGE_SIZE}`);
  const today = list.data?.today ?? null;

  // "Ver mais antigos": o que já veio fica, o resto entra por cima
  const [older, setOlder] = React.useState<MenuSummary[]>([]);
  const [noMore, setNoMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const menus = React.useMemo(() => {
    const byDay = new Map<string, MenuSummary>();
    for (const m of [...(list.data?.menus ?? []), ...older]) byDay.set(m.date, m);
    return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [list.data, older]);

  const asked = searchParams.get("dia");
  const day = today ? (asked && DAY_RE.test(asked) ? asked : today) : null;
  const detail = useCustomerData<MenuResponse>(day ? menuUrl(day) : null);

  // a faixa de dias abre com o dia escolhido à vista
  const stripRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const chip = stripRef.current?.querySelector<HTMLElement>('[aria-current="date"]');
    chip?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [day, menus.length]);

  const select = React.useCallback(
    (target: string) => {
      router.replace(target === today ? pathname : `${pathname}?dia=${target}`, { scroll: false });
    },
    [router, pathname, today]
  );

  const loadMore = async () => {
    const oldest = menus[menus.length - 1]?.date;
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`${MENUS_URL}?before=${oldest}&limit=${PAGE_SIZE}`, { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as MenusResponse | null;
      if (response.ok && body) {
        setOlder((prev) => [...prev, ...body.menus]);
        if (body.menus.length < PAGE_SIZE) setNoMore(true);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  if (list.error && !list.data) {
    return (
      <div className="c-page">
        <h1 className="c-page-title">Cardápio</h1>
        <ErrorState message={list.error} onRetry={list.reload} />
      </div>
    );
  }
  if (!today || !day) {
    return (
      <div className="c-page">
        <h1 className="c-page-title">Cardápio</h1>
        <LoadingRows rows={5} />
      </div>
    );
  }

  const tomorrow = addDays(today, 1);
  const publishedDays = new Set(menus.map((m) => m.date));
  // faixa: os últimos dias publicados antes de hoje, hoje (sempre) e amanhã se já estiver publicado
  const past = menus.filter((m) => m.date < today).slice(0, STRIP_DAYS).map((m) => m.date).reverse();
  const strip = [...past, today, ...(publishedDays.has(tomorrow) ? [tomorrow] : [])];
  if (!strip.includes(day)) strip.unshift(day);

  const previous = menus.filter((m) => m.date < today);
  const rows = menus.filter((m) => m.date >= today || previous.includes(m));
  const groups = new Map<string, MenuSummary[]>();
  for (const m of rows) {
    const label = m.date >= today ? "Hoje e amanhã" : weekGroupLabel(m.date, today);
    groups.set(label, [...(groups.get(label) ?? []), m]);
  }

  const menu = detail.data?.menu ?? null;
  const latestPast = previous[0] ?? null;

  const openPicker = () => {
    const input = dateInput.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <div className="c-page c-mn-page">
      <div className="c-mn-top">
        <h1 className="c-page-title">Cardápio</h1>
        <button type="button" className="c-link" onClick={openPicker}>
          <Calendar size={18} aria-hidden="true" />
          Escolher data
        </button>
        <input
          ref={dateInput}
          type="date"
          className="c-mn-date-input"
          tabIndex={-1}
          aria-label="Escolher a data do cardápio"
          max={tomorrow}
          value={day}
          onChange={(e) => e.target.value && select(e.target.value)}
        />
      </div>

      <div ref={stripRef} className="c-mn-strip" role="group" aria-label="Dias com cardápio">
        {!noMore && menus.length >= PAGE_SIZE && (
          <button type="button" className="c-mn-chip is-more" onClick={() => void loadMore()} disabled={loadingMore}>
            Mais
            <br />
            antigos
          </button>
        )}
        {strip.map((d) => (
          <button key={d} type="button" className="c-mn-chip" aria-current={d === day ? "date" : undefined} onClick={() => select(d)}>
            {relativeDay(d, today) === weekdayShort(d) ? weekdayShort(d) : relativeDay(d, today)}
            <b>{dayNumber(d)}</b>
          </button>
        ))}
      </div>

      <div className="c-mn-detail">
        {detail.error && !menu ? (
          <ErrorState message={detail.error} onRetry={detail.reload} />
        ) : detail.loading && !menu ? (
          <LoadingRows rows={6} />
        ) : menu && menu.date === day ? (
          <MenuView menu={menu} today={today} />
        ) : day === today ? (
          <EmptyState title="O cardápio de hoje ainda não foi publicado" text="Assim que o estabelecimento publicar, ele aparece aqui.">
            {latestPast && (
              <button type="button" className="c-btn is-ghost" onClick={() => select(latestPast.date)}>
                Ver o último cardápio
              </button>
            )}
          </EmptyState>
        ) : (
          <EmptyState title="Não há cardápio publicado neste dia" text="Escolha outro dia na lista.">
            <button type="button" className="c-btn is-ghost" onClick={() => select(today)}>
              Ver hoje
            </button>
          </EmptyState>
        )}
      </div>

      <section className="c-mn-list" aria-labelledby="mn-ant">
        <h2 id="mn-ant" className="c-sr">
          Cardápios publicados
        </h2>
        {rows.length === 0 ? (
          <p className="c-mn-group">Nenhum cardápio publicado ainda.</p>
        ) : (
          [...groups.entries()].map(([label, items]) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <p className="c-mn-group">{label}</p>
              <div className="c-card c-mn-rows">
                {items.map((m) => (
                  <Link
                    key={m.date}
                    href={m.date === today ? pathname : `${pathname}?dia=${m.date}`}
                    scroll={false}
                    className="c-mn-row"
                    aria-current={m.date === day ? "date" : undefined}
                  >
                    <span className="c-mn-row-d">
                      <small>{relativeDay(m.date, today)}</small>
                      <b>{dayNumber(m.date)}</b>
                    </span>
                    <span className="c-mn-row-t">
                      <strong>{m.mains.length > 0 ? m.mains.slice(0, 2).join(", ") : m.title ?? "Cardápio"}</strong>
                      <span>
                        {m.title && m.mains.length > 0 ? `${m.title} · ` : ""}
                        {m.itemCount} {m.itemCount === 1 ? "item" : "itens"}
                      </span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
        {!noMore && menus.length >= PAGE_SIZE && (
          <button type="button" className="c-btn is-ghost c-mn-more" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "Buscando…" : "Ver mais antigos"}
          </button>
        )}
      </section>
    </div>
  );
}

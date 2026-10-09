"use client";

import Link from "next/link";
import * as React from "react";
import { addDays, longDay, shortDate, weekdayLong, type MenuResponse } from "../../lib/menu-api";
import { useOrderStatus } from "../pedido/OrderCta";
import "./cardapio.css";

type Menu = NonNullable<MenuResponse["menu"]>;

/** O cardápio de um dia: título, seções, observação e (no dia de hoje) o botão de pedido. */
export function MenuView({ menu, today }: { menu: Menu; today: string }) {
  const order = useOrderStatus();
  const isToday = menu.date === today;
  const isTomorrow = menu.date === addDays(today, 1);
  const past = menu.date < today;
  const heading = isToday ? "Cardápio de hoje" : isTomorrow ? "Cardápio de amanhã" : `Cardápio de ${weekdayLong(menu.date)}`;

  return (
    <article className="c-card c-mn-card" aria-labelledby="mn-title">
      <header className="c-mn-head">
        <p className="c-mn-eyebrow">{heading}</p>
        <h2 id="mn-title" className="c-mn-title">
          {menu.title ?? longDay(menu.date).split(",")[0]}
        </h2>
        <p className="c-mn-date">{longDay(menu.date)}</p>
        {past && <p className="c-mn-past">Cardápio de {shortDate(menu.date)}: só para consulta.</p>}
      </header>

      {menu.sections.map((section) => (
        <section key={section.id} className="c-mn-sec" aria-label={section.name}>
          <h3>{section.name}</h3>
          <ul>
            {section.items.map((item) => (
              <li key={item.id} className={item.featured ? "is-featured" : undefined}>
                <strong>
                  {item.featured && <span aria-label="Destaque do dia">★ </span>}
                  {item.name}
                  {item.vegetarian && <span className="c-mn-veg">Vegetariano</span>}
                </strong>
                {item.description && <small>{item.description}</small>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {menu.note && <p className="c-mn-note">{menu.note}</p>}

      {isToday && menu.showOrderButton && order.enabled && (
        <footer className="c-mn-order">
          <Link href="/pre-orders/novo" className="c-btn is-primary">
            Fazer pedido
          </Link>
          <span className={order.open ? "is-open" : undefined}>
            {order.open ? "● " : ""}
            {order.text}
          </span>
        </footer>
      )}
    </article>
  );
}

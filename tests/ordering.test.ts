// Rodar com: npm test   (tsx --test; use TZ=UTC para simular a Vercel)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { weekdayAndMinuteSP } from '../lib/date-range';
import {
  describeOpening,
  isOrderExpired,
  isWindowOpen,
  nextOpening,
  orderingStatus,
  productsOpenNow,
  validateWindowInput,
  type WindowDef,
} from '../lib/ordering';

// Datas de referência (Brasília = UTC-3): 04/10/2026 domingo, 05 segunda, 08 quinta, 10 sábado
const at = (iso: string) => new Date(`${iso}-03:00`);

const lunch: WindowDef = { id: 'w1', name: 'Almoço', weekdays: [1, 2, 3, 4, 5], startMinute: 600, endMinute: 780, active: true, productIds: ['a', 'b'] };
const night: WindowDef = { id: 'w2', name: 'Noite', weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 21 * 60, endMinute: 24 * 60, active: true, productIds: ['c'] };
const settings = { enabled: true, pausedUntil: null };

describe('dia da semana e minuto em Brasília', () => {
  it('domingo 21h em Brasília é segunda 00:00 em UTC, mas continua domingo', () => {
    const d = at('2026-10-04T21:00:00');
    assert.equal(d.toISOString(), '2026-10-05T00:00:00.000Z');
    assert.deepEqual(weekdayAndMinuteSP(d), { weekday: 0, minute: 21 * 60 });
  });
  it('meia-noite de Brasília é 00:00 (e não 24:00) do dia seguinte', () => {
    assert.deepEqual(weekdayAndMinuteSP(at('2026-10-05T00:00:00')), { weekday: 1, minute: 0 });
  });
  it('23:59 de Brasília é 02:59 UTC do dia seguinte, e o dia é o de Brasília', () => {
    assert.deepEqual(weekdayAndMinuteSP(at('2026-10-08T23:59:00')), { weekday: 4, minute: 23 * 60 + 59 });
  });
});

describe('janela aberta', () => {
  it('abre no início e fecha no fim (fim exclusivo)', () => {
    assert.equal(isWindowOpen(lunch, at('2026-10-08T09:59:59')), false);
    assert.equal(isWindowOpen(lunch, at('2026-10-08T10:00:00')), true);
    assert.equal(isWindowOpen(lunch, at('2026-10-08T12:59:59')), true);
    assert.equal(isWindowOpen(lunch, at('2026-10-08T13:00:00')), false);
  });
  it('não abre no fim de semana', () => {
    assert.equal(isWindowOpen(lunch, at('2026-10-10T11:00:00')), false);
    assert.equal(isWindowOpen(lunch, at('2026-10-04T11:00:00')), false);
  });
  it('tolerância de 3 minutos depois do fim', () => {
    assert.equal(isWindowOpen(lunch, at('2026-10-08T13:02:59'), 3), true);
    assert.equal(isWindowOpen(lunch, at('2026-10-08T13:03:00'), 3), false);
  });
  it('janela da noite 21:00–24:00: 20:59 fecha, 21:00 abre, 23:59:30 abre, meia-noite fecha', () => {
    assert.equal(isWindowOpen(night, at('2026-10-08T20:59:59')), false);
    assert.equal(isWindowOpen(night, at('2026-10-08T21:00:00')), true);
    assert.equal(isWindowOpen(night, at('2026-10-08T23:59:30')), true);
    assert.equal(isWindowOpen(night, at('2026-10-09T00:00:00')), false);
  });
  it('janela inativa nunca abre', () => {
    assert.equal(isWindowOpen({ ...lunch, active: false }, at('2026-10-08T11:00:00')), false);
  });
});

describe('produtos liberados agora', () => {
  it('só os das janelas abertas', () => {
    assert.deepEqual([...productsOpenNow([lunch, night], at('2026-10-08T11:00:00'))].sort(), ['a', 'b']);
    assert.deepEqual([...productsOpenNow([lunch, night], at('2026-10-08T22:00:00'))], ['c']);
    assert.deepEqual([...productsOpenNow([lunch, night], at('2026-10-08T15:00:00'))], []);
  });
});

describe('próxima abertura', () => {
  it('hoje, se ainda vai abrir', () => {
    const next = nextOpening([lunch], at('2026-10-08T08:00:00'));
    assert.equal(next?.dayOffset, 0);
    assert.equal(describeOpening(next!), 'hoje às 10:00');
  });
  it('amanhã, depois do fechamento', () => {
    assert.equal(describeOpening(nextOpening([lunch], at('2026-10-08T14:00:00'))!), 'amanhã às 10:00');
  });
  it('sexta à tarde: volta segunda', () => {
    assert.equal(describeOpening(nextOpening([lunch], at('2026-10-09T14:00:00'))!), 'segunda às 10:00');
  });
  it('sem janela, null', () => {
    assert.equal(nextOpening([], at('2026-10-08T14:00:00')), null);
  });
});

describe('estado da loja', () => {
  it('desligada', () => {
    assert.equal(orderingStatus([lunch], { enabled: false, pausedUntil: null }, at('2026-10-08T11:00:00')).reason, 'disabled');
  });
  it('aberta, com minutos até fechar', () => {
    const s = orderingStatus([lunch], settings, at('2026-10-08T12:30:00'));
    assert.equal(s.open, true);
    assert.equal(s.minutesToClose, 30);
  });
  it('fechada, com a próxima abertura', () => {
    const s = orderingStatus([lunch], settings, at('2026-10-08T14:00:00'));
    assert.equal(s.open, false);
    assert.equal(s.reason, 'closed');
    assert.equal(describeOpening(s.nextOpening!), 'amanhã às 10:00');
  });
  it('pausada até amanhã: fechada mesmo dentro da janela', () => {
    const s = orderingStatus([lunch], { enabled: true, pausedUntil: at('2026-10-09T00:00:00') }, at('2026-10-08T11:00:00'));
    assert.equal(s.reason, 'paused');
  });
  it('a pausa acaba e a loja volta a abrir', () => {
    const s = orderingStatus([lunch], { enabled: true, pausedUntil: at('2026-10-08T09:00:00') }, at('2026-10-08T11:00:00'));
    assert.equal(s.open, true);
  });
  it('pausa até amanhã: a próxima abertura diz "amanhã", não "hoje" (bug achado pelo refutador)', () => {
    const s = orderingStatus([lunch], { enabled: true, pausedUntil: at('2026-10-09T00:00:00') }, at('2026-10-08T11:00:00'));
    assert.equal(describeOpening(s.nextOpening!), 'amanhã às 10:00');
  });
  it('pausa até amanhã e uma janela que abre à meia-noite: abre amanhã às 00:00', () => {
    const midnight: WindowDef = { ...lunch, startMinute: 0, endMinute: 120 };
    const s = orderingStatus([midnight], { enabled: true, pausedUntil: at('2026-10-09T00:00:00') }, at('2026-10-08T01:00:00'));
    assert.equal(describeOpening(s.nextOpening!), 'amanhã às 00:00');
  });
  it('pausa até amanhã numa quinta, janela só de segunda a sexta: sexta é "amanhã"; sexta à tarde pausada, volta "segunda"', () => {
    const s1 = orderingStatus([lunch], { enabled: true, pausedUntil: at('2026-10-09T00:00:00') }, at('2026-10-08T14:00:00'));
    assert.equal(describeOpening(s1.nextOpening!), 'amanhã às 10:00');
    const s2 = orderingStatus([lunch], { enabled: true, pausedUntil: at('2026-10-10T00:00:00') }, at('2026-10-09T14:00:00'));
    assert.equal(describeOpening(s2.nextOpening!), 'segunda às 10:00');
  });
  it('janelas contíguas (10–13 e 13–15): às 12:30 fecha às 15:00, não às 13:00', () => {
    const afternoon: WindowDef = { ...lunch, id: 'w3', startMinute: 780, endMinute: 900 };
    const s = orderingStatus([lunch, afternoon], settings, at('2026-10-08T12:30:00'));
    assert.equal(s.open, true);
    assert.equal(s.minutesToClose, 150);
  });
  it('janela sem produto não conta', () => {
    assert.equal(orderingStatus([{ ...lunch, productIds: [] }], settings, at('2026-10-08T11:00:00')).reason, 'no_windows');
  });
});

describe('expiração do pedido sem resposta', () => {
  it('vale 20 minutos', () => {
    assert.equal(isOrderExpired(at('2026-10-08T12:00:00'), at('2026-10-08T12:19:00')), false);
    assert.equal(isOrderExpired(at('2026-10-08T12:00:00'), at('2026-10-08T12:21:00')), true);
  });
  it('nunca atravessa o dia (23:50 → 00:05 já expirou)', () => {
    assert.equal(isOrderExpired(at('2026-10-08T23:50:00'), at('2026-10-09T00:05:00')), true);
  });
});

describe('validação da janela vinda do admin', () => {
  const ok = { name: 'Almoço', weekdays: [1, 2], startMinute: 600, endMinute: 780, productIds: ['a'] };
  it('aceita uma janela válida', () => assert.equal(validateWindowInput(ok), null));
  it('rejeita início depois do fim', () => assert.match(validateWindowInput({ ...ok, startMinute: 780, endMinute: 600 })!, /hora final/));
  it('rejeita sem dias, sem nome, sem produtos e dias repetidos', () => {
    assert.ok(validateWindowInput({ ...ok, weekdays: [] }));
    assert.ok(validateWindowInput({ ...ok, name: ' ' }));
    assert.ok(validateWindowInput({ ...ok, productIds: [] }));
    assert.ok(validateWindowInput({ ...ok, weekdays: [1, 1] }));
    assert.ok(validateWindowInput({ ...ok, weekdays: [7] }));
  });
  it('rejeita produtos repetidos e entrada nula', () => {
    assert.match(validateWindowInput({ ...ok, productIds: ['a', 'a'] })!, /repetidos/);
    assert.ok(validateWindowInput(null as never));
  });
  it('aceita 24:00 como fim', () => assert.equal(validateWindowInput({ ...ok, startMinute: 1260, endMinute: 1440 }), null));
});

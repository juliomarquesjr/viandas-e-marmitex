import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeBalance, formatBRL, formatOrdersMessage, type DayOrders } from '../lib/messages/ficha-text';
import { parseDays } from '../lib/messages/ficha-send';
import { getMessageType } from '../lib/messages/registry';
import { renderTemplate } from '../lib/messages/render';

const day = (d: string, orders: DayOrders['orders']): DayOrders => ({ day: d, orders });
const order = (time: string, totalCents: number, items: [number, string][], open = false) => ({
  time,
  totalCents,
  open,
  items: items.map(([quantity, name]) => ({ quantity, name })),
});

describe('formatBRL', () => {
  it('formata reais com milhar e centavos', () => {
    assert.equal(formatBRL(12770), 'R$ 127,70');
    assert.equal(formatBRL(123456789), 'R$ 1.234.567,89');
    assert.equal(formatBRL(5), 'R$ 0,05');
    assert.equal(formatBRL(-2000), '-R$ 20,00');
  });
});

describe('describeBalance', () => {
  it('saldo positivo é valor em aberto', () => {
    const b = describeBalance(12770);
    assert.equal(b.kind, 'owes');
    assert.match(b.sentence, /R\$ 127,70\* em aberto/);
  });
  it('saldo negativo é crédito, sem sinal', () => {
    const b = describeBalance(-2000);
    assert.equal(b.kind, 'credit');
    assert.equal(b.value, 'R$ 20,00');
    assert.match(b.sentence, /crédito/);
  });
  it('saldo zero é ficha em dia', () => {
    assert.equal(describeBalance(0).kind, 'even');
  });
});

describe('formatOrdersMessage', () => {
  it('um dia, uma compra: itens e total', () => {
    const text = formatOrdersMessage([day('2026-10-09', [order('11:42', 3700, [[1, 'Feijoada completa'], [2, 'Suco']])])]);
    assert.equal(text, '🧾 *Sexta-feira, 09/10*\n• 1× Feijoada completa\n• 2× Suco\n💰 Total: *R$ 37,00*');
  });

  it('vários dias saem do mais antigo para o mais novo', () => {
    const text = formatOrdersMessage([
      day('2026-10-09', [order('11:00', 2500, [[1, 'Prato A']])]),
      day('2026-10-07', [order('12:00', 1800, [[1, 'Prato B']])]),
    ]);
    assert.ok(text.indexOf('07/10') < text.indexOf('09/10'));
  });

  it('mais de uma compra no dia mostra horários e o total do dia', () => {
    const text = formatOrdersMessage([day('2026-10-09', [order('11:00', 2500, [[1, 'A']]), order('18:30', 1000, [[1, 'B']], true)])]);
    assert.match(text, /🕐 11:00/);
    assert.match(text, /🕐 18:30/);
    assert.match(text, /R\$ 10,00 _\(na ficha\)_/);
    assert.match(text, /Total do dia: \*R\$ 35,00\*/);
  });

  it('compra anotada na ficha é sinalizada', () => {
    assert.match(formatOrdersMessage([day('2026-10-09', [order('11:00', 2500, [[1, 'A']], true)])]), /_\(na ficha\)_/);
  });

  it('texto grande vira uma linha por dia', () => {
    const items: [number, string][] = Array.from({ length: 30 }, (_, i) => [1, `Prato muito comprido número ${i + 1}`]);
    const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((d) => day(d, [order('11:00', 5000, items)]));
    const text = formatOrdersMessage(days);
    assert.ok(text.length < 3000);
    assert.equal(text.split('\n').length, 5);
    assert.match(text, /30 itens/);
  });
});

describe('parseDays', () => {
  it('aceita de 1 a 5 dias, sem repetir', () => {
    assert.deepEqual(parseDays(['2026-10-09', '2026-10-09', '2026-10-08']), ['2026-10-09', '2026-10-08']);
  });
  it('recusa vazio, mais de 5 e formato inválido', () => {
    assert.equal(parseDays([]), null);
    assert.equal(parseDays(['x']), null);
    assert.equal(parseDays(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']), null);
    assert.equal(parseDays('2026-10-09'), null);
  });
});

describe('tipos de mensagem da ficha', () => {
  it('os textos padrão usam as variáveis obrigatórias', () => {
    for (const key of ['customer_orders', 'customer_balance']) {
      const type = getMessageType(key)!;
      const body = type.defaults.whatsapp!.body;
      for (const v of type.required) assert.ok(body.includes(`{${v}}`), `${key} sem {${v}}`);
      const sample = Object.fromEntries(type.variables.map((v) => [v.key, v.sample]));
      assert.doesNotMatch(renderTemplate(body, sample), /\{[a-z_]+\}/);
    }
  });
});

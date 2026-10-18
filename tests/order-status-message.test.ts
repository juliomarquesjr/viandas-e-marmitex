import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMessageType, MESSAGE_TYPES } from '../lib/messages/registry';
import { renderTemplate, tidyBlankLines } from '../lib/messages/render';
import {
  eventOfStatus,
  formatOrderItems,
  ORDER_EVENT_TYPE,
  orderCode,
  orderNoticeValues,
  previsionLine,
  reasonLine,
  type OrderEvent,
} from '../lib/messages/order-status-text';

describe('etapa do pedido → acontecimento', () => {
  it('cada etapa que o operador escolhe avisa, menos "na fila"', () => {
    assert.equal(eventOfStatus('pending'), null);
    assert.equal(eventOfStatus('preparing'), 'preparing');
    assert.equal(eventOfStatus('ready'), 'ready');
    assert.equal(eventOfStatus('delivered'), 'delivered');
    assert.equal(eventOfStatus('cancelled'), 'cancelled');
  });
  it('saiu para entrega e em trânsito são o mesmo aviso (não manda duas vezes)', () => {
    assert.equal(eventOfStatus('out_for_delivery'), 'out_for_delivery');
    assert.equal(eventOfStatus('in_transit'), 'out_for_delivery');
  });
  it('status desconhecido não avisa', () => {
    assert.equal(eventOfStatus('qualquer'), null);
  });
});

describe('modelos de pedido no gerenciador', () => {
  it('todo acontecimento tem um modelo só de WhatsApp, no grupo Pedidos, que exige {pedido}', () => {
    for (const [event, key] of Object.entries(ORDER_EVENT_TYPE) as [OrderEvent, string][]) {
      const type = getMessageType(key);
      assert.ok(type, `${event}: modelo ${key} não existe`);
      assert.equal(type.group, 'Pedidos');
      assert.deepEqual(Object.keys(type.defaults), ['whatsapp']);
      assert.deepEqual(type.required, ['pedido']);
      assert.ok(type.defaults.whatsapp!.body.includes('{pedido}'));
    }
  });
  it('as chaves não se repetem', () => {
    assert.equal(new Set(MESSAGE_TYPES.map((t) => t.key)).size, MESSAGE_TYPES.length);
  });
  it('o texto padrão se completa com os valores do pedido, sem sobrar {variável}', () => {
    const values = {
      nome: 'Maria',
      loja: 'Sabores de Casa',
      link_app: 'https://x.com',
      ...orderNoticeValues({
        id: 'abc-123-def9',
        totalCents: 3700,
        estimatedDeliveryTime: new Date('2026-10-18T21:30:00Z'),
        rejectReason: 'Produto esgotado',
        items: [{ quantity: 1, name: 'Feijoada' }],
      }),
    };
    for (const key of Object.values(ORDER_EVENT_TYPE)) {
      const text = tidyBlankLines(renderTemplate(getMessageType(key)!.defaults.whatsapp!.body, values));
      assert.doesNotMatch(text, /\{[a-z_]+\}/, key);
      assert.match(text, /#DEF9/);
    }
  });
});

describe('valores do aviso', () => {
  it('número do pedido: 4 últimos caracteres, como na comanda', () => {
    assert.equal(orderCode('6f2a-91bc-c3d4'), '#C3D4');
  });
  it('itens: quantidade ou peso, um por linha', () => {
    assert.equal(
      formatOrderItems([
        { quantity: 2, name: 'Suco de laranja' },
        { quantity: 1, weightKg: '0.450', name: 'Feijoada' },
      ]),
      '• 2× Suco de laranja\n• Feijoada (0,450 kg)'
    );
  });
  it('itens demais viram "…e mais N"', () => {
    const many = Array.from({ length: 23 }, (_, i) => ({ quantity: 1, name: `P${i}` }));
    assert.match(formatOrderItems(many), /…e mais 3 itens$/);
  });
  it('previsão: horário de Brasília, ou vazio sem previsão', () => {
    assert.equal(previsionLine(new Date('2026-10-18T21:30:00Z')), '🕐 Previsão: *18:30*');
    assert.equal(previsionLine(null), '');
  });
  it('motivo da recusa: só quando foi escrito', () => {
    assert.equal(reasonLine('  Sem  estoque '), 'Motivo: _Sem estoque_');
    assert.equal(reasonLine(null), '');
    assert.equal(reasonLine('   '), '');
  });
  it('previsão e motivo vazios não deixam linhas em branco sobrando', () => {
    const body = getMessageType('order_rejected')!.defaults.whatsapp!.body;
    const text = tidyBlankLines(renderTemplate(body, { pedido: '#C3D4', motivo: '' }));
    assert.doesNotMatch(text, /\n\n\n/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formattingToHtml, parseFormatting, stripFormatting, toggleWrap } from '../lib/messages/format';
import { countMenuItems, formatMenuMessage, menuDayLabel, type MenuForMessage } from '../lib/messages/menu-text';
import { emailBodyToHtml, renderTemplate } from '../lib/messages/render';
import { getMessageType, MESSAGE_TYPES } from '../lib/messages/registry';

const menu: MenuForMessage = {
  date: '2026-10-09',
  title: 'Dia de feijoada',
  note: 'Pedidos até as 11h.',
  sections: [
    { name: 'Pratos principais', items: [
      { name: 'Feijoada completa', description: null, featured: true, vegetarian: false },
      { name: 'Lasanha de berinjela', description: 'com molho branco', featured: false, vegetarian: true },
    ] },
    { name: 'Acompanhamentos', items: [{ name: 'Arroz branco', description: null, featured: false, vegetarian: false }] },
  ],
};

describe('formatação estilo WhatsApp', () => {
  it('reconhece negrito, itálico, tachado e monoespaçado, também aninhados', () => {
    const nodes = parseFormatting('Oi *Maria _tudo_* bem ~não~ ```x```');
    assert.equal(stripFormatting('Oi *Maria _tudo_* bem ~não~ ```x```'), 'Oi Maria tudo bem não x');
    assert.deepEqual(nodes.map((n) => n.type), ['text', 'bold', 'text', 'strike', 'text', 'mono']);
  });
  it('não formata marcador solto, colado em espaço ou no meio de palavra', () => {
    assert.equal(stripFormatting('2 * 3 * 4'), '2 * 3 * 4');
    assert.equal(stripFormatting('maria_souza_x@email.com'), 'maria_souza_x@email.com');
    assert.equal(stripFormatting('* não *'), '* não *');
  });
  it('vira HTML escapado', () => {
    assert.equal(formattingToHtml(parseFormatting('*<b>*')), '<strong>&#60;b&#62;</strong>');
    const html = emailBodyToHtml('Senha: *abc*\n\nhttps://x.com/a_b_c', 'Loja');
    assert.ok(html.includes('<strong>abc</strong>'));
    assert.ok(html.includes('<a href="https://x.com/a_b_c"'));
  });
  it('toggleWrap marca, desmarca e não cola espaço por dentro', () => {
    assert.deepEqual(toggleWrap('ola mundo', 4, 9, 'bold'), { text: 'ola *mundo*', start: 5, end: 10 });
    assert.deepEqual(toggleWrap('ola *mundo*', 5, 10, 'bold'), { text: 'ola mundo', start: 4, end: 9 });
    assert.equal(toggleWrap('a  b', 0, 4, 'italic').text, '_a  b_');
    const empty = toggleWrap('oi ', 3, 3, 'italic');
    assert.deepEqual(empty, { text: 'oi __', start: 4, end: 4 });
  });
});

describe('texto do cardápio', () => {
  it('rotula o dia e organiza por seção', () => {
    assert.equal(menuDayLabel('2026-10-09'), 'Sexta-feira, 09/10');
    const text = formatMenuMessage(menu);
    assert.ok(text.startsWith('📅 *Sexta-feira, 09/10*\n_Dia de feijoada_'));
    assert.ok(text.includes('*Pratos principais*\n• Feijoada completa ⭐\n• Lasanha de berinjela (vegetariano) – com molho branco'));
    assert.ok(text.endsWith('_Pedidos até as 11h._'));
    assert.equal(countMenuItems(menu), 3);
  });
  it('corta o cardápio grande e avisa quantos itens ficaram de fora', () => {
    const big: MenuForMessage = { date: '2026-10-09', title: null, note: null, sections: [{ name: 'Tudo', items: Array.from({ length: 200 }, (_, i) => ({ name: `Prato número ${i + 1} com nome comprido`, description: null, featured: false, vegetarian: false })) }] };
    const text = formatMenuMessage(big, 600);
    assert.ok(text.length <= 600);
    assert.match(text, /…e mais \d+ itens/);
  });
});

describe('modelos padrão', () => {
  it('o cardápio do dia existe, é só WhatsApp e exige {cardapio}', () => {
    const type = getMessageType('daily_menu')!;
    assert.deepEqual(Object.keys(type.defaults), ['whatsapp']);
    assert.deepEqual(type.required, ['cardapio']);
  });
  it('todo texto padrão tem as variáveis obrigatórias e só variáveis conhecidas', () => {
    for (const type of MESSAGE_TYPES) {
      const known = new Set(type.variables.map((v) => v.key));
      for (const [, def] of Object.entries(type.defaults)) {
        for (const required of type.required) assert.ok(def!.body.includes(`{${required}}`), `${type.key} sem {${required}}`);
        for (const m of def!.body.matchAll(/\{([a-z_]+)\}/g)) assert.ok(known.has(m[1]), `${type.key}: {${m[1]}} desconhecida`);
        assert.ok(renderTemplate(def!.body, {}).length > 0);
      }
    }
  });
});

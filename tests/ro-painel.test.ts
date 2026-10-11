import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseInline, parseMarkdown } from '../app/admin/components/ro/markdown';
import { formatarCelula } from '../app/admin/components/ro/blocos';

describe('texto da RO na tela', () => {
  it('negrito e itálico', () => {
    assert.deepEqual(parseInline('Achei **Maria** agora'), [{ texto: 'Achei ' }, { texto: 'Maria', negrito: true }, { texto: ' agora' }]);
    assert.deepEqual(parseInline('_rascunho_ só'), [{ texto: 'rascunho', italico: true }, { texto: ' só' }]);
    assert.deepEqual(parseInline('nome_com_underline fica'), [{ texto: 'nome_com_underline fica' }]);
  });
  it('parágrafos e listas', () => {
    const b = parseMarkdown('Olha:\n\n- um **item**\n- outro\n\nFim');
    assert.equal(b.length, 3);
    assert.equal(b[0].tipo, 'p');
    assert.equal(b[1].tipo, 'ul');
    assert.equal(b[1].tipo === 'ul' && b[1].itens.length, 2);
    assert.equal(b[2].tipo, 'p');
  });
  it('lista logo depois de uma frase, sem linha em branco', () => {
    const b = parseMarkdown('Cardápio:\n**Pratos**\n- arroz\n- feijão');
    assert.deepEqual(b.map((x) => x.tipo), ['p', 'ul']);
  });
  it('formata as células das tabelas', () => {
    assert.ok(formatarCelula(12345, 'dinheiro').includes('123,45'));
    assert.equal(formatarCelula(null, 'texto'), '—');
    assert.equal(formatarCelula(1234, 'inteiro'), '1.234');
    assert.equal(formatarCelula('2026-10-11T02:30:00.000Z', 'data'), '10/10');
  });
});

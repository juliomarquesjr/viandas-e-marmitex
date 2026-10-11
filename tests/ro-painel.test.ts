import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseInline, parseMarkdown } from '../app/admin/components/ro/markdown';
import { formatarCelula, perguntaDaFicha, textoDosBlocos } from '../app/admin/components/ro/blocos';
import { semId, tempoCurto, textoSimples } from '../app/admin/components/ro/texto';
import type { RoBloco } from '../lib/ai/ro/types';

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
    assert.equal(formatarCelula('2026-10-11T02:30:00.000Z', 'data', new Date('2026-10-11T12:00:00Z')), '10/10');
  });
  it('mostra o ano quando a data é de outro ano', () => {
    const agora = new Date('2026-10-11T12:00:00Z');
    assert.equal(formatarCelula('2025-12-23T21:40:00.000Z', 'dataHora', agora), '23/12/2025, 18:40');
    assert.equal(formatarCelula('2025-12-23T21:40:00.000Z', 'data', agora), '23/12/2025');
    assert.match(formatarCelula('2026-10-05T15:00:00.000Z', 'dataHora', agora), /^05\/10, 12:00$/);
  });
  it('não quebra com resposta sem texto ou com data estranha', () => {
    assert.deepEqual(parseMarkdown(undefined), []);
    assert.deepEqual(parseMarkdown(null), []);
    assert.equal(formatarCelula('não é data', 'dataHora'), 'não é data');
  });
});

describe('botões e textos da tela da RO', () => {
  const blocos: RoBloco[] = [
    { tipo: 'metricas', titulo: 'Hoje (11/10)', itens: [{ rotulo: 'Vendido', valor: 'R$ 100,00', dica: '3 vendas' }] },
    { tipo: 'clientes', itens: [{ id: 'a', nome: 'Norma Elisabete', telefone: '(55) 99111-2222', email: null, ativo: true, saldoCents: 129350, whatsapp: true, nota: 'última compra em 01/09/2026 (há 40 dias)' }] },
    { tipo: 'tabela', titulo: 'Por dia', colunas: [{ key: 'ref', label: 'Dia' }, { key: 'v', label: 'Vendido', formato: 'dinheiro' }], linhas: [{ ref: '10/10', v: 5000 }] },
    { tipo: 'opcoes', itens: [{ rotulo: 'x', pergunta: 'y' }] },
  ];
  it('"Copiar" leva clientes, números e tabelas, não só a frase', () => {
    const t = textoDosBlocos(blocos);
    assert.match(t, /Vendido: R\$\s?100,00 \(3 vendas\)/);
    assert.match(t, /Norma Elisabete — \(55\) 99111-2222 — Deve R\$\s?1\.293,50 — última compra em 01\/09\/2026/);
    assert.match(t, /Dia\tVendido\n10\/10\tR\$\s?50,00/);
    assert.doesNotMatch(t, /opcoes|x\sy/);
    assert.equal(textoDosBlocos(undefined), '');
  });
  it('o botão "Ver ficha" leva o id, e o id não aparece na conversa', () => {
    const id = '242f98ea-b6df-49dd-8d9d-b9843e704bfe';
    const p = perguntaDaFicha({ id, nome: 'Ingrid Oliveira' });
    assert.equal(p, `ficha do cliente Ingrid Oliveira [id:${id}]`);
    assert.equal(semId(p), 'ficha do cliente Ingrid Oliveira');
    assert.equal(semId('Maria'), 'Maria');
  });
  it('tira as marcas de negrito e itálico ao copiar', () => {
    assert.equal(textoSimples('**18 clientes** devem _bastante_'), '18 clientes devem bastante');
  });
  it('tempo de espera em palavras', () => {
    assert.equal(tempoCurto(20), '20 segundos');
    assert.equal(tempoCurto(60), '1 minuto');
    assert.equal(tempoCurto(150), '3 minutos');
  });
});


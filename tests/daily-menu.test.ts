import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidDay, isVisibleToCustomer, summarizeMenu, validateMenuInput, weekGroupLabel } from '../lib/daily-menu';

const menu = (over: Record<string, unknown> = {}) => ({
  status: 'published',
  title: 'Sexta da feijoada',
  note: '  Sujeito a alteração  ',
  sections: [
    { name: 'Pratos', items: [{ name: ' Feijoada   completa ', featured: true }, { name: 'Frango', featured: true, vegetarian: true }] },
    { name: 'Vazia', items: [{ name: '   ' }] },
  ],
  ...over,
});

describe('validação do cardápio', () => {
  it('limpa espaços, descarta seções e itens vazios e deixa um só destaque', () => {
    const r = validateMenuInput(menu());
    assert.ok(r.ok);
    assert.equal(r.value.note, 'Sujeito a alteração');
    assert.equal(r.value.sections.length, 1);
    assert.equal(r.value.sections[0].items[0].name, 'Feijoada completa');
    assert.deepEqual(r.value.sections[0].items.map((i) => i.featured), [true, false]);
  });
  it('não publica sem itens, mas aceita rascunho vazio', () => {
    assert.equal(validateMenuInput(menu({ sections: [] })).ok, false);
    assert.equal(validateMenuInput(menu({ sections: [], status: 'draft' })).ok, true);
  });
  it('só avisa o cliente quando publicado', () => {
    const draft = validateMenuInput(menu({ status: 'draft', notifyCustomers: true }));
    const pub = validateMenuInput(menu({ notifyCustomers: true }));
    assert.ok(draft.ok && pub.ok);
    assert.equal(draft.value.notifyCustomers, false);
    assert.equal(pub.value.notifyCustomers, true);
  });
  it('rejeita situação desconhecida e excesso de seções/itens', () => {
    assert.equal(validateMenuInput(menu({ status: 'x' })).ok, false);
    assert.equal(validateMenuInput(menu({ sections: Array.from({ length: 13 }, () => ({ name: 'a', items: [{ name: 'b' }] })) })).ok, false);
    assert.equal(validateMenuInput(menu({ sections: [{ name: 'a', items: Array.from({ length: 41 }, () => ({ name: 'b' })) }] })).ok, false);
  });
  it('dia precisa existir no calendário', () => {
    assert.equal(isValidDay('2026-10-09'), true);
    assert.equal(isValidDay('2026-02-30'), false);
    assert.equal(isValidDay('09/10/2026'), false);
  });
});

describe('resumo e visibilidade', () => {
  it('resume com destaque e prato principal', () => {
    const s = summarizeMenu({ date: '2026-10-09', title: null, status: 'published', sections: [{ items: [{ name: 'A', featured: false }, { name: 'B', featured: true }] }, { items: [{ name: 'C', featured: false }] }] });
    assert.equal(s.itemCount, 3);
    assert.equal(s.highlight, 'B');
    assert.deepEqual(s.mains, ['A', 'B']);
  });
  it('cliente vê publicado até amanhã, nunca rascunho', () => {
    assert.equal(isVisibleToCustomer({ date: '2026-10-10', status: 'published' }, '2026-10-09'), true);
    assert.equal(isVisibleToCustomer({ date: '2026-10-11', status: 'published' }, '2026-10-09'), false);
    assert.equal(isVisibleToCustomer({ date: '2026-10-08', status: 'draft' }, '2026-10-09'), false);
  });
  it('agrupa por semana (segunda a domingo)', () => {
    assert.equal(weekGroupLabel('2026-10-05', '2026-10-09'), 'Esta semana');
    assert.equal(weekGroupLabel('2026-10-04', '2026-10-09'), 'Semana passada');
    assert.equal(weekGroupLabel('2026-09-21', '2026-10-09'), 'Há 2 semanas');
  });
});

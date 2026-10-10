import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyQuickReply, filterQuickReplies, normalizeShortcut, slashQuery, validateQuickReply } from '../lib/whatsapp-quick-replies';

const list = [
  { id: '1', title: 'Pedido em separação', text: 'Já vamos separar', shortcut: 'pedido' },
  { id: '2', title: 'Fora do horário', text: 'Estamos fechados', shortcut: 'fechado' },
  { id: '3', title: 'Chave Pix', text: 'Nossa chave é 123', shortcut: null },
];

describe('respostas rápidas', () => {
  it('normaliza o atalho', () => {
    assert.equal(normalizeShortcut(' /Pedído '), 'pedido');
    assert.equal(normalizeShortcut('///'), null);
    assert.equal(normalizeShortcut(5), null);
  });
  it('valida nome, texto, atalho e variáveis', () => {
    assert.equal(validateQuickReply({ title: '', text: 'x' }).ok, false);
    assert.equal(validateQuickReply({ title: 'a', text: '' }).ok, false);
    assert.equal(validateQuickReply({ title: 'a', text: 'x', shortcut: 'com espaço' }).ok, false);
    assert.equal(validateQuickReply({ title: 'a', text: 'Oi {foo}' }).ok, false);
    const ok = validateQuickReply({ title: ' Oi ', text: 'Olá {nome}', shortcut: '/Oi' });
    assert.ok(ok.ok && ok.value.shortcut === 'oi' && ok.value.title === 'Oi');
  });
  it('troca {nome} pelo primeiro nome', () => {
    assert.equal(applyQuickReply('Oi, {nome}!', 'Maria Souza'), 'Oi, Maria!');
  });
  it('busca por atalho, nome ou texto, com o atalho primeiro', () => {
    assert.deepEqual(filterQuickReplies(list, '/ped').map((r) => r.id), ['1']);
    assert.deepEqual(filterQuickReplies(list, 'pix').map((r) => r.id), ['3']);
    assert.deepEqual(filterQuickReplies(list, 'fechados').map((r) => r.id), ['2']);
    assert.equal(filterQuickReplies(list, '').length, 3);
  });
  it('detecta o "/" que abre a lista', () => {
    assert.deepEqual(slashQuery('/ped'), { query: 'ped', start: 0 });
    assert.deepEqual(slashQuery('Olá /'), { query: '', start: 4 });
    assert.equal(slashQuery('http://x.com/abc'), null);
    assert.equal(slashQuery('texto sem barra'), null);
  });
});

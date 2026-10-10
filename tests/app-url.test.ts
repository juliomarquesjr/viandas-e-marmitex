import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAppUrl } from '../lib/messages/app-url';

describe('parseAppUrl', () => {
  it('completa https:// e tira a barra do fim', () => {
    assert.equal(parseAppUrl('meusite.com.br'), 'https://meusite.com.br');
    assert.equal(parseAppUrl('  https://meusite.com.br/  '), 'https://meusite.com.br');
    assert.equal(parseAppUrl('https://meusite.com.br/app/'), 'https://meusite.com.br/app');
  });
  it('mantém http e localhost, descarta parâmetros', () => {
    assert.equal(parseAppUrl('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(parseAppUrl('https://meusite.com.br/?utm=1#x'), 'https://meusite.com.br');
  });
  it('recusa o que não é endereço', () => {
    assert.equal(parseAppUrl(''), null);
    assert.equal(parseAppUrl('meu site'), null);
    assert.equal(parseAppUrl('semponto'), null);
    assert.equal(parseAppUrl('javascript:alert(1)'), null);
    assert.equal(parseAppUrl('ftp://meusite.com.br'), null);
    assert.equal(parseAppUrl('https://user:senha@meusite.com.br'), null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { maskLoginPhone, parseLoginIdentifier, storedPhoneMatches } from '../lib/customer-login-id';

describe('parseLoginIdentifier', () => {
  it('e-mail: ignora maiúsculas e espaços nas pontas', () => {
    assert.deepEqual(parseLoginIdentifier('  Maria.Silva@Email.COM '), { kind: 'email', email: 'maria.silva@email.com' });
  });
  it('telefone: aceita com máscara, só dígitos, +55 e zero na frente', () => {
    const want = { kind: 'phone', ddd: '55', tail: '88887777' };
    for (const v of ['(55) 98888-7777', '55988887777', '5598888-7777', '+55 55 98888-7777', '055 98888-7777', '5555988887777']) {
      assert.deepEqual(parseLoginIdentifier(v), want, v);
    }
  });
  it('fixo de 10 dígitos', () => {
    assert.deepEqual(parseLoginIdentifier('(11) 3222-1234'), { kind: 'phone', ddd: '11', tail: '32221234' });
  });
  it('recusa o que não é nem e-mail nem telefone completo', () => {
    assert.equal(parseLoginIdentifier(''), null);
    assert.equal(parseLoginIdentifier('   '), null);
    assert.equal(parseLoginIdentifier('98888-7777'), null); // sem DDD
    assert.equal(parseLoginIdentifier('abc'), null);
  });
});

describe('storedPhoneMatches', () => {
  const login = { ddd: '55', tail: '88887777' };
  it('casa com o telefone guardado em qualquer formato', () => {
    for (const stored of ['(55) 98888-7777', '55988887777', '5598888-7777', '+55 (55) 98888-7777', '5555988887777']) {
      assert.equal(storedPhoneMatches(stored, login), true, stored);
    }
  });
  it('não casa com outro número, outro DDD nem vazio', () => {
    assert.equal(storedPhoneMatches('(55) 98888-7778', login), false);
    assert.equal(storedPhoneMatches('(11) 98888-7777', login), false);
    assert.equal(storedPhoneMatches(null, login), false);
    assert.equal(storedPhoneMatches('7777', login), false);
  });
  it('ignora o nono dígito', () => {
    assert.equal(storedPhoneMatches('(55) 8888-7777', login), true);
  });
});

describe('maskLoginPhone', () => {
  it('monta a máscara enquanto digita', () => {
    assert.equal(maskLoginPhone(''), '');
    assert.equal(maskLoginPhone('5'), '(5');
    assert.equal(maskLoginPhone('559'), '(55) 9');
    assert.equal(maskLoginPhone('5598888'), '(55) 98888');
    assert.equal(maskLoginPhone('55988887777'), '(55) 98888-7777');
    assert.equal(maskLoginPhone('5532221234'), '(55) 3222-1234');
  });
  it('limita a 11 dígitos e descarta letras', () => {
    assert.equal(maskLoginPhone('55 98888-7777 99'), '(55) 98888-7777');
    assert.equal(maskLoginPhone('ab12'), '(12');
  });
});

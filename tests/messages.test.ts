import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generatePassword } from '../lib/messages/password';
import { emailBodyToHtml, maskEmail, maskPhone, renderTemplate, usedVariables, validateTemplate } from '../lib/messages/render';
import { getMessageType } from '../lib/messages/registry';

const type = getMessageType('customer_password')!;

describe('texto da mensagem', () => {
  it('troca as variáveis e deixa as desconhecidas como estão', () => {
    assert.equal(renderTemplate('Oi {nome}, {senha} {x}', { nome: 'Ana', senha: 'abc' }), 'Oi Ana, abc {x}');
    assert.deepEqual(usedVariables('{nome} {nome} {senha}'), ['nome', 'senha']);
  });
  it('valida: vazio, variável desconhecida, sem a senha e e-mail sem assunto', () => {
    assert.equal(validateTemplate(type, 'whatsapp', { body: '  ' }).ok, false);
    const unknown = validateTemplate(type, 'whatsapp', { body: 'Oi {nome} {senha} {foo}' });
    assert.ok(!unknown.ok && unknown.error.includes('{foo}'));
    const noPassword = validateTemplate(type, 'whatsapp', { body: 'Oi {nome}' });
    assert.ok(!noPassword.ok && noPassword.error.includes('{senha}'));
    assert.equal(validateTemplate(type, 'email', { body: 'Senha: {senha}', subject: '' }).ok, false);
    const ok = validateTemplate(type, 'email', { body: 'Senha: {senha}', subject: ' Seu   acesso ', enabled: false });
    assert.ok(ok.ok && ok.value.subject === 'Seu acesso' && ok.value.enabled === false);
  });
  it('respeita o limite de tamanho do WhatsApp', () => {
    assert.equal(validateTemplate(type, 'whatsapp', { body: `{senha}${'a'.repeat(1000)}` }).ok, false);
  });
});

describe('máscaras e e-mail', () => {
  it('mascara telefone e e-mail', () => {
    assert.equal(maskPhone('5562999998888'), '+55 (62) 9••••-8888');
    assert.equal(maskEmail('maria.souza@email.com'), 'm•••@email.com');
  });
  it('o HTML do e-mail escapa o texto e cria links', () => {
    const html = emailBodyToHtml('Oi <b>x</b>\nlink: https://exemplo.com/a?b=1', 'Loja & Cia');
    assert.ok(!html.includes('<b>x</b>'));
    assert.ok(html.includes('<a href="https://exemplo.com/a?b=1"'));
    assert.ok(html.includes('Loja &#38; Cia'));
  });
});

describe('senha gerada', () => {
  it('é fácil: 8 letras minúsculas e números, sem símbolo nem caractere ambíguo, e muda a cada vez', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const p = generatePassword();
      assert.match(p, /^[a-z2-9]{8}$/);
      assert.ok(!/[0o1li]/.test(p));
      assert.ok(/[0-9]/.test(p) && /[a-z]/.test(p));
      seen.add(p);
    }
    assert.ok(seen.size > 295);
  });
});

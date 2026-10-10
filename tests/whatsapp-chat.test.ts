import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chatStatusFrom, messageLabel, numberFromChatJid, parseWebhookMessage, sameBrazilNumber } from '../lib/whatsapp-chat';

const base = { key: { remoteJid: '5562999998888@s.whatsapp.net', fromMe: false, id: 'ABC1' }, messageTimestamp: 1760000000 };

describe('webhook de mensagens', () => {
  it('lê texto simples e estendido', () => {
    const a = parseWebhookMessage({ ...base, messageType: 'conversation', message: { conversation: 'Oi!' } })!;
    assert.deepEqual([a.externalId, a.number, a.fromMe, a.type, a.body], ['ABC1', '5562999998888', false, 'text', 'Oi!']);
    assert.equal(a.at.getTime(), 1760000000 * 1000);
    const b = parseWebhookMessage({ ...base, messageType: 'extendedTextMessage', message: { extendedTextMessage: { text: 'Veja https://x.com' } } })!;
    assert.equal(b.body, 'Veja https://x.com');
  });
  it('mídia vira tipo com legenda opcional', () => {
    const m = parseWebhookMessage({ ...base, messageType: 'imageMessage', message: { imageMessage: { caption: 'Pix' } } })!;
    assert.deepEqual([m.type, m.body], ['image', 'Pix']);
    assert.equal(parseWebhookMessage({ ...base, messageType: 'audioMessage', message: { audioMessage: {} } })!.type, 'audio');
  });
  it('ignora grupo, status, reação e mensagem vazia', () => {
    assert.equal(parseWebhookMessage({ ...base, key: { ...base.key, remoteJid: '1203@g.us' }, messageType: 'conversation', message: { conversation: 'x' } }), null);
    assert.equal(parseWebhookMessage({ ...base, key: { ...base.key, remoteJid: 'status@broadcast' }, messageType: 'conversation', message: { conversation: 'x' } }), null);
    assert.equal(parseWebhookMessage({ ...base, messageType: 'reactionMessage', message: { reactionMessage: {} } }), null);
    assert.equal(parseWebhookMessage({ ...base, messageType: 'conversation', message: { conversation: '  ' } }), null);
  });
  it('@lid usa o telefone alternativo', () => {
    const m = parseWebhookMessage({ key: { remoteJid: '1234@lid', remoteJidAlt: '5562999998888@s.whatsapp.net', fromMe: true, id: 'Z' }, messageType: 'conversation', message: { conversation: 'ok' } })!;
    assert.equal(m.number, '5562999998888');
    assert.equal(m.fromMe, true);
    assert.equal(numberFromChatJid('1234@lid'), null);
  });
});

describe('números e rótulos', () => {
  it('compara telefones sem 55, formatação e nono dígito', () => {
    assert.ok(sameBrazilNumber('5562999998888', '(62) 99999-8888'));
    assert.ok(sameBrazilNumber('556299998888', '62999998888'));
    assert.ok(!sameBrazilNumber('5562999998888', '(11) 99999-8888'));
    assert.ok(!sameBrazilNumber('5562999998888', '(62) 99999-7777'));
  });
  it('situação e rótulos', () => {
    assert.equal(chatStatusFrom('DELIVERY_ACK'), 'delivered');
    assert.equal(chatStatusFrom('read'), 'read');
    assert.equal(chatStatusFrom('???'), null);
    assert.equal(messageLabel('text', 'Oi'), 'Oi');
    assert.equal(messageLabel('image', 'Pix'), 'Foto: Pix');
    assert.equal(messageLabel('audio', null), 'Áudio');
  });
});

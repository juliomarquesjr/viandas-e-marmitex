import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPhoneBR,
  isStale,
  mapEvolutionState,
  normalizeBrazilNumber,
  numberFromJid,
  publicWebhookUrl,
  shouldAlertDisconnect,
} from '../lib/whatsapp-rules';

describe('estado da Evolution', () => {
  it('mapeia os estados conhecidos e trata o resto como desconhecido', () => {
    assert.equal(mapEvolutionState('open'), 'open');
    assert.equal(mapEvolutionState('CONNECTING'), 'connecting');
    assert.equal(mapEvolutionState('close'), 'close');
    assert.equal(mapEvolutionState(undefined), 'unknown');
    assert.equal(mapEvolutionState('algo'), 'unknown');
  });
  it('alerta só quando estava conectado e caiu', () => {
    assert.equal(shouldAlertDisconnect('open', 'close', true), true);
    assert.equal(shouldAlertDisconnect('open', 'connecting', true), true);
    assert.equal(shouldAlertDisconnect('open', 'close', false), false); // o admin desconectou de propósito
    assert.equal(shouldAlertDisconnect('close', 'close', true), false); // já estava caído
    assert.equal(shouldAlertDisconnect('open', 'unknown', true), false); // não deu para saber: não alarma
  });
});

describe('telefone', () => {
  it('normaliza números brasileiros', () => {
    assert.equal(normalizeBrazilNumber('(62) 99999-8888'), '5562999998888');
    assert.equal(normalizeBrazilNumber('062 99999-8888'), '5562999998888');
    assert.equal(normalizeBrazilNumber('+55 62 3333-4444'), '556233334444');
    assert.equal(normalizeBrazilNumber('5562999998888'), '5562999998888');
  });
  it('recusa o que não é telefone', () => {
    assert.equal(normalizeBrazilNumber('123'), null);
    assert.equal(normalizeBrazilNumber('abc'), null);
    assert.equal(normalizeBrazilNumber('(00) 99999-8888'), null);
    assert.equal(normalizeBrazilNumber(null), null);
  });
  it('lê o número do jid e formata para a tela', () => {
    assert.equal(numberFromJid('5562999998888@s.whatsapp.net'), '5562999998888');
    assert.equal(numberFromJid('5562999998888:12@s.whatsapp.net'), '5562999998888');
    assert.equal(numberFromJid('x'), null);
    assert.equal(formatPhoneBR('5562999998888'), '+55 (62) 99999-8888');
    assert.equal(formatPhoneBR('556233334444'), '+55 (62) 3333-4444');
  });
});

describe('checagem e webhook', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  it('checagem antiga ou inexistente conta como vencida', () => {
    assert.equal(isStale(null, now, 300_000), true);
    assert.equal(isStale('2026-10-09T11:59:00Z', now, 300_000), false);
    assert.equal(isStale('2026-10-09T11:50:00Z', now, 300_000), true);
  });
  it('webhook só com endereço público em https', () => {
    assert.equal(publicWebhookUrl('https://viandas-e-marmitex.vercel.app'), 'https://viandas-e-marmitex.vercel.app/api/webhooks/evolution');
    assert.equal(publicWebhookUrl('http://localhost:3000'), null);
    assert.equal(publicWebhookUrl('https://localhost:3000'), null);
    assert.equal(publicWebhookUrl('http://meusite.com'), null);
    assert.equal(publicWebhookUrl(undefined), null);
  });
});

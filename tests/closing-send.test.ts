import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { closingFileName, paymentBlock, parsePeriod, PDF_MAX_BYTES, periodLabel, validatePdfBase64 } from '../lib/messages/closing-send';
import { getMessageType, MESSAGE_LIMITS, MESSAGE_TYPES } from '../lib/messages/registry';
import { renderTemplate, tidyBlankLines, usedVariables, validateTemplate } from '../lib/messages/render';

const pdf = (extra = '') => Buffer.from(`%PDF-1.4\n${extra}`).toString('base64');

describe('período do fechamento', () => {
  it('aceita datas que existem, em ordem', () => {
    assert.deepEqual(parsePeriod('2026-09-01', '2026-09-30'), { startDate: '2026-09-01', endDate: '2026-09-30' });
    assert.deepEqual(parsePeriod('2026-09-30', '2026-09-30'), { startDate: '2026-09-30', endDate: '2026-09-30' });
  });
  it('recusa data inventada, fora de ordem, fora do formato ou longa demais', () => {
    assert.equal(parsePeriod('2026-02-30', '2026-03-05'), null);
    assert.equal(parsePeriod('2026-10-01', '2026-09-01'), null);
    assert.equal(parsePeriod('01/09/2026', '30/09/2026'), null);
    assert.equal(parsePeriod('2020-01-01', '2026-12-31'), null);
    assert.equal(parsePeriod(undefined, '2026-09-30'), null);
    assert.equal(parsePeriod(20260901, 20260930), null);
  });
  it('escreve o período como o cliente lê', () => {
    assert.equal(periodLabel({ startDate: '2026-09-01', endDate: '2026-09-30' }), '01/09/2026 a 30/09/2026');
  });
});

describe('PDF que chega ao servidor', () => {
  it('aceita um PDF de verdade', () => {
    const ok = validatePdfBase64(pdf('conteudo'));
    assert.equal(ok.ok, true);
  });
  it('recusa o que não é PDF, o que está vazio e o que veio com defeito', () => {
    assert.equal(validatePdfBase64(Buffer.from('<html>oi</html>').toString('base64')).ok, false);
    assert.equal(validatePdfBase64('').ok, false);
    assert.equal(validatePdfBase64(undefined).ok, false);
    assert.equal(validatePdfBase64('isto não é base64!!').ok, false);
    assert.equal(validatePdfBase64(12345).ok, false);
  });
  it('recusa PDF grande demais, com a mensagem certa', () => {
    const big = validatePdfBase64(pdf('x'.repeat(PDF_MAX_BYTES)));
    assert.ok(!big.ok && big.status === 413 && /período menor/.test(big.error));
  });
});

describe('nome do arquivo', () => {
  it('sem acento nem símbolo, com o período', () => {
    assert.equal(closingFileName('Norma Elisabete Corrêa Vasconcelos', { startDate: '2026-09-01', endDate: '2026-09-30' }), 'fechamento-norma-elisabete-correa-vasconcelos-2026-09-01-2026-09-30.pdf');
    assert.equal(closingFileName('???', { startDate: '2026-09-01', endDate: '2026-09-30' }), 'fechamento-cliente-2026-09-01-2026-09-30.pdf');
    assert.ok(closingFileName('a'.repeat(200), { startDate: '2026-09-01', endDate: '2026-09-30' }).length < 90);
  });
});

describe('textos do fechamento e do link de pagamento', () => {
  const samples = (key: string) => Object.fromEntries(getMessageType(key)!.variables.map((v) => [v.key, v.sample]));

  it('os dois tipos existem e têm WhatsApp e e-mail', () => {
    for (const key of ['customer_closing', 'customer_payment_link']) {
      const type = getMessageType(key);
      assert.ok(type, key);
      assert.ok(type!.defaults.whatsapp && type!.defaults.email?.subject, key);
    }
    assert.equal(new Set(MESSAGE_TYPES.map((t) => t.key)).size, MESSAGE_TYPES.length);
  });

  it('o texto padrão passa na própria validação e cabe no limite do WhatsApp com os valores de exemplo', () => {
    for (const key of ['customer_closing', 'customer_payment_link']) {
      const type = getMessageType(key)!;
      for (const channel of ['whatsapp', 'email'] as const) {
        const d = type.defaults[channel]!;
        const check = validateTemplate(type, channel, { body: d.body, subject: d.subject ?? '' });
        assert.ok(check.ok, `${key}/${channel}: ${check.ok ? '' : check.error}`);
      }
      const rendered = renderTemplate(type.defaults.whatsapp!.body, samples(key));
      assert.ok(rendered.length < MESSAGE_LIMITS.BODY_WHATSAPP, `${key}: ${rendered.length}`);
      assert.ok(!/\{[a-z_]+\}/.test(rendered), `${key} ficou com variável sem valor`);
    }
  });

  it('o link de pagamento é sensível: nunca vai para o histórico', () => {
    assert.ok(getMessageType('customer_closing')!.variables.find((v) => v.key === 'pagamento')?.sensitive);
    assert.ok(getMessageType('customer_payment_link')!.variables.find((v) => v.key === 'link_pagamento')?.sensitive);
  });

  it('sem link, o bloco de pagamento some e não sobra linha em branco', () => {
    const body = getMessageType('customer_closing')!.defaults.whatsapp!.body;
    const text = tidyBlankLines(renderTemplate(body, { ...samples('customer_closing'), pagamento: '' }));
    assert.ok(!/\n{3,}/.test(text));
    assert.ok(!text.includes('{pagamento}'));
    assert.ok(text.trimEnd().endsWith('🙏'));
    const withLink = tidyBlankLines(renderTemplate(body, { ...samples('customer_closing'), pagamento: paymentBlock('https://loja.exemplo.com.br/pagar/abc') }));
    assert.ok(withLink.includes('https://loja.exemplo.com.br/pagar/abc'));
  });

  it('as variáveis usadas existem no tipo', () => {
    for (const key of ['customer_closing', 'customer_payment_link']) {
      const type = getMessageType(key)!;
      const known = new Set(type.variables.map((v) => v.key));
      for (const channel of ['whatsapp', 'email'] as const) {
        const d = type.defaults[channel]!;
        for (const v of usedVariables(`${d.subject ?? ''}\n${d.body}`)) assert.ok(known.has(v), `${key}: {${v}}`);
      }
    }
  });
});

describe('arrumação de linhas em branco', () => {
  it('no máximo uma linha em branco e sem espaço no fim das linhas', () => {
    assert.equal(tidyBlankLines('a  \n\n\n\nb \t\n\nc\n\n'), 'a\n\nb\n\nc');
  });
});

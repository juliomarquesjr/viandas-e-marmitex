import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { PAYMENT_LINK_TTL_DAYS, paymentLinkFor, signPaymentToken, verifyPaymentToken } from '../lib/payment-link';

const ID = '3f2b8c1e-9a47-4d6b-b1c2-0e5f7a8d9c10';
const OUTRO = '7a1d4e22-5b3c-4f60-8e19-2c4d6f8a0b31';

describe('código do link de pagamento', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'segredo-de-teste-para-assinar';
    delete process.env.PAYMENT_LINK_SECRET;
    process.env.APP_PUBLIC_URL = 'https://loja.exemplo.com.br/';
  });

  it('o código leva ao mesmo cliente e é curto', () => {
    const token = signPaymentToken(ID);
    assert.ok(token.length <= 60, `muito longo: ${token.length}`);
    const result = verifyPaymentToken(token);
    assert.equal(result.ok && result.customerId, ID);
  });

  it('vale pelo prazo combinado e depois vence', () => {
    const agora = new Date('2026-10-01T12:00:00Z');
    const token = signPaymentToken(ID, agora);
    const quase = new Date(agora.getTime() + (PAYMENT_LINK_TTL_DAYS - 1) * 86_400_000);
    const depois = new Date(agora.getTime() + (PAYMENT_LINK_TTL_DAYS + 1) * 86_400_000);
    assert.equal(verifyPaymentToken(token, quase).ok, true);
    assert.deepEqual(verifyPaymentToken(token, depois), { ok: false, reason: 'expired' });
  });

  it('adulterar o cliente, a validade ou a assinatura invalida o código', () => {
    const [id, validade, assinatura] = signPaymentToken(ID).split('.');
    const [idOutro] = signPaymentToken(OUTRO).split('.');
    assert.deepEqual(verifyPaymentToken(`${idOutro}.${validade}.${assinatura}`), { ok: false, reason: 'invalid' });
    assert.deepEqual(verifyPaymentToken(`${id}.${(parseInt(validade, 36) + 99999).toString(36)}.${assinatura}`), { ok: false, reason: 'invalid' });
    assert.deepEqual(verifyPaymentToken(`${id}.${validade}.${'A'.repeat(22)}`), { ok: false, reason: 'invalid' });
  });

  it('lixo e texto fora do formato nunca passam', () => {
    for (const lixo of ['', 'abc', 'a.b', 'a.b.c.d', '../etc/passwd', ID, 'x'.repeat(500), '..']) {
      assert.deepEqual(verifyPaymentToken(lixo), { ok: false, reason: 'invalid' }, lixo);
    }
    assert.deepEqual(verifyPaymentToken(undefined as unknown as string), { ok: false, reason: 'invalid' });
  });

  it('uma chave diferente não reconhece o código', () => {
    const token = signPaymentToken(ID);
    process.env.PAYMENT_LINK_SECRET = 'outra-chave';
    assert.deepEqual(verifyPaymentToken(token), { ok: false, reason: 'invalid' });
  });

  it('só aceita identificador de cliente no formato certo', () => {
    assert.throws(() => signPaymentToken('nao-e-um-uuid'));
  });

  it('o link é o endereço da loja mais /pagar/código', () => {
    const link = paymentLinkFor(ID);
    assert.match(link, /^https:\/\/loja\.exemplo\.com\.br\/pagar\/[A-Za-z0-9_-]{22}\.[0-9a-z]+\.[A-Za-z0-9_-]{22}$/);
    const token = link.split('/pagar/')[1];
    assert.equal(verifyPaymentToken(token).ok, true);
  });
});

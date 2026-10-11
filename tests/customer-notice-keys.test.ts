import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanDismissKeys, DISMISS_KEY_MAX_LENGTH } from '../lib/customer-dismissals-keys';
import { seenIdsFromKeys, seenKey } from '../lib/customer-notice-keys';

describe('chaves de aviso visto', () => {
  it('prefixa e desfaz o prefixo', () => {
    assert.equal(seenKey('pay:abc'), 'seen:pay:abc');
    assert.deepEqual(seenIdsFromKeys(['seen:pay:abc', 'pay:abc', 'seen:menu:2026-10-10']), ['pay:abc', 'menu:2026-10-10']);
  });
  it('a chave de um aviso real cabe no limite do servidor', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const key = seenKey(`po:${uuid}:ready`);
    assert.ok(key.length <= DISMISS_KEY_MAX_LENGTH);
    assert.deepEqual(cleanDismissKeys([key, key, 5, '']), [key]);
  });
});

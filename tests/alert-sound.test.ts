import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALERT_REPEAT_MS, isAlertDue } from '../app/admin/components/notifications/alertSound';

describe('isAlertDue', () => {
  it('repete a cada 5 minutos', () => {
    assert.equal(ALERT_REPEAT_MS, 300_000);
    const last = 1_000_000;
    assert.equal(isAlertDue(last + 299_999, last), false);
    assert.equal(isAlertDue(last + 300_000, last), true);
  });
  it('nunca tocou (0) está vencido', () => {
    assert.equal(isAlertDue(Date.now(), 0), true);
  });
});

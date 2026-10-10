import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { audienceCounts, audienceMembers, estimateMinutes, minutesLabel, type BroadcastRecipient } from '../lib/whatsapp-broadcast';

const list: BroadcastRecipient[] = [
  { id: 'a', name: 'Ana', debtCents: 4850, orderedToday: false },
  { id: 'b', name: 'Beto', debtCents: 0, orderedToday: true },
  { id: 'c', name: 'Cida', debtCents: -1000, orderedToday: false },
];

describe('envio em massa', () => {
  it('separa os públicos', () => {
    assert.deepEqual(audienceMembers(list, 'all').map((r) => r.id), ['a', 'b', 'c']);
    assert.deepEqual(audienceMembers(list, 'debt').map((r) => r.id), ['a']);
    assert.deepEqual(audienceMembers(list, 'idle').map((r) => r.id), ['a', 'c']);
    assert.deepEqual(audienceMembers(list, 'pick', new Set(['b', 'c'])).map((r) => r.id), ['b', 'c']);
    assert.deepEqual(audienceMembers(list, 'pick').map((r) => r.id), []);
  });
  it('conta cada público', () => {
    assert.deepEqual(audienceCounts(list), { all: 3, debt: 1, idle: 2 });
  });
  it('estima o tempo pelo ritmo médio de 9 segundos', () => {
    assert.equal(estimateMinutes(1), 1);
    assert.equal(estimateMinutes(48), 7);
    assert.equal(minutesLabel(1), '1 minuto');
    assert.equal(minutesLabel(48), '7 minutos');
  });
});

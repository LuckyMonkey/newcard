import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyRegistry, normalizeNamespace, normalizeObservation,
  registerCard, resolveCard, validatePublicUrl
} from '../src/core.js';

function sample(overrides = {}) {
  return {
    namespace: 'demo.restaurant', technology: 'iso14443a', uid: '04:A2:7F:91',
    title: 'Example menu', kind: 'restaurant', url: 'https://example.com/menu',
    apps: { 'com.example.ordering': 'https://example.com/order' }, ...overrides
  };
}

test('normalizes observables without inventing identifiers', () => {
  assert.deepEqual(normalizeObservation({ technology: 'ISO14443A', uid: '04:a2-7f 91' }), { technology: 'iso14443a', uid: '04A27F91' });
  assert.throws(() => normalizeObservation({ technology: 'iso14443a', uid: 'ABC' }), /hexadecimal/);
  assert.throws(() => normalizeObservation({ technology: 'unsupported', uid: 'AA' }), /unsupported/);
  assert.throws(() => normalizeObservation({ technology: 'iso14443a', uid: '' }), /hexadecimal/);
  assert.equal(normalizeNamespace('Demo.Restaurant'), 'demo.restaurant');
});

test('rejects malformed and unsafe destinations', () => {
  assert.throws(() => validatePublicUrl('javascript:alert(1)'), /https/);
  assert.throws(() => validatePublicUrl('http://example.com/'), /https/);
  assert.throws(() => validatePublicUrl('https://example.com@evil.test/'), /credentials/);
  assert.equal(validatePublicUrl('https://example.com/menu'), 'https://example.com/menu');
});

test('resolves app-specific actions with a fallback to default', () => {
  const db = emptyRegistry();
  const { object } = registerCard(db, sample());
  assert.match(object.id, /^nc_[a-f0-9]{32}$/);
  assert.equal(db.bindings[0].assurance, 'unverified');
  const result = resolveCard(db, { technology: 'iso14443a', uid: '04a27f91', namespace: 'demo.restaurant', appId: 'com.example.ordering' });
  assert.equal(result.status, 'resolved');
  assert.equal(result.object.id, object.id);
  assert.equal(result.action.url, 'https://example.com/order');
  assert.equal(result.action.appId, 'com.example.ordering');
  assert.equal(JSON.stringify(result).includes('04A27F91'), false, 'must not expose the raw card UID');
  const fallback = resolveCard(db, { technology: 'iso14443a', uid: '04A27F91', appId: 'com.other.app' });
  assert.equal(fallback.action.url, 'https://example.com/menu');
  assert.equal(fallback.action.appId, 'default');
});

test('separates namespaces and explicitly reports collisions', () => {
  const db = emptyRegistry();
  registerCard(db, sample());
  registerCard(db, sample({ namespace: 'demo.hotel', title: 'Example hotel', url: 'https://example.com/hotel' }));
  assert.equal(resolveCard(db, { technology: 'iso14443a', uid: '04:A2:7F:91' }).status, 'ambiguous');
  assert.equal(resolveCard(db, { technology: 'iso14443a', uid: '04:A2:7F:91', namespace: 'demo.hotel' }).object.title, 'Example hotel');
  assert.equal(resolveCard(db, { technology: 'iso14443a', uid: 'AABBCCDD' }).status, 'not_found');
  assert.throws(() => registerCard(db, sample()), /already registered/);
});

test('rejects invalid app IDs and raw observation values in outgoing objects', () => {
  const db = emptyRegistry();
  assert.throws(() => registerCard(db, sample({ apps: { ' ': 'https://example.com' } })), /appId/);
  registerCard(db, sample());
  assert.throws(() => resolveCard(db, { technology: 'iso14443a', uid: '04A27F91', appId: '???' }), /appId/);
});

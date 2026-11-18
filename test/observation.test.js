import test from 'node:test';
import assert from 'node:assert/strict';
import { assessObservation, canonicalUid } from '../src/observation.js';
import { emptyRegistry, normalizeObservation, registerCard, resolveCard } from '../src/core.js';

const assess = (technology, uid) => assessObservation(normalizeObservation({ technology, uid }));

test('rejects ISO 14443-A random IDs and cascade-tag fragments', () => {
  const random = assess('iso14443a', '08:12:34:56');
  assert.equal(random.uidClass, 'random');
  assert.equal(random.registrable, false);
  assert.equal(random.stable, false);
  assert.equal(assess('iso14443a', '88123456').registrable, false);
});

test('classifies 4-byte UIDs as non-unique and 7-byte UIDs by manufacturer', () => {
  assert.equal(assess('iso14443a', '3F112233').uidClass, 'fnuid');
  const legacy = assess('iso14443a', 'A27F9104');
  assert.equal(legacy.uidClass, 'single_size');
  assert.equal(legacy.uniqueness, 'not_guaranteed');
  const nxp = assess('iso14443a', '04:A2:7F:91:22:33:80');
  assert.equal(nxp.uidClass, 'double_size');
  assert.deepEqual(nxp.manufacturer, { code: '04', name: 'NXP Semiconductors' });
  assert.equal(nxp.uniqueness, 'manufacturer_scoped');
});

test('flags 7-byte UIDs with a disallowed manufacturer byte as anomalous', () => {
  const odd = assess('iso14443a', 'F1A27F91223380');
  assert.equal(odd.anomalous, true);
  assert.equal(odd.manufacturer, null);
  assert.equal(odd.registrable, true);
});

test('canonicalises ISO 15693 byte order so every reader gives the same key', () => {
  assert.equal(canonicalUid('iso15693', '12CDAB23500104E0'), 'E004015023ABCD12');
  assert.equal(canonicalUid('iso15693', 'E004015023ABCD12'), 'E004015023ABCD12');
  assert.equal(normalizeObservation({ technology: 'iso15693', uid: '12:CD:AB:23:50:01:04:E0' }).uid, 'E004015023ABCD12');
  const v = assess('iso15693', 'E004015023ABCD12');
  assert.equal(v.uidClass, 'vicinity');
  assert.equal(v.manufacturer.name, 'NXP Semiconductors');
  assert.equal(canonicalUid('iso14443a', '04A27F91223380'), '04A27F91223380');
});

test('reversed ISO 15693 scan resolves the binding made in canonical order', () => {
  const registry = emptyRegistry();
  registerCard(registry, { namespace: 'demo.inventory', technology: 'iso15693', uid: 'E004015023ABCD12', title: 'Bin', url: 'https://example.com/bin' });
  const result = resolveCard(registry, { technology: 'iso15693', uid: '12CDAB23500104E0' });
  assert.equal(result.status, 'resolved');
  assert.equal(registry.bindings[0].uidClass, 'vicinity');
});

test('registration refuses random IDs', () => {
  assert.throws(() => registerCard(emptyRegistry(), {
    namespace: 'demo.mine', technology: 'iso14443a', uid: '08AABBCC', title: 'x', url: 'https://example.com'
  }), /cannot be registered/);
});

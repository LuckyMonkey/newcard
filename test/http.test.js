import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { emptyRegistry, registerCard } from '../src/core.js';
import { createServer } from '../src/server.js';
import { createNcNfcClient } from '../sdk/js/index.js';

async function useServer(t) {
  const registry = emptyRegistry();
  const { object } = registerCard(registry, {
    namespace: 'demo.a', technology: 'iso14443a', uid: 'AABBCCDD',
    title: '<Test & Card>', description: 'Click <safe> & discover',
    url: 'https://example.com/a', kind: 'link', apps: { 'com.example.app': 'https://example.com/b' }
  });
  registerCard(registry, {
    namespace: 'demo.b', technology: 'iso14443a', uid: 'AABBCCDD',
    title: 'Colliding card', url: 'https://example.com/c'
  });
  const server = createServer(registry);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, object };
}

test('serves capabilities, resolves scoped observations, and returns ambiguity', async t => {
  const { baseUrl } = await useServer(t);
  const capabilities = await (await fetch(`${baseUrl}/.well-known/ncnfc`)).json();
  assert.equal(capabilities.protocol, 'ncNFC/0.1');
  const client = createNcNfcClient({ baseUrl });
  const result = await client.resolve({ technology: 'iso14443a', uid: 'AA:BB:CC:DD', namespace: 'demo.a', appId: 'com.example.app' });
  assert.equal(result.action.url, 'https://example.com/b');
  assert.equal(result.object.title, '<Test & Card>');
  const ambiguous = await client.resolve({ technology: 'iso14443a', uid: 'AABBCCDD' });
  assert.equal(ambiguous.status, 'ambiguous');
  assert.equal('object' in ambiguous, false);
  const missing = await client.resolve({ technology: 'iso14443a', uid: '11223344' });
  assert.equal(missing.status, 'not_found');
});

test('serves public object and escapes OG HTML without leaking UID', async t => {
  const { baseUrl, object } = await useServer(t);
  const client = createNcNfcClient({ baseUrl });
  const fetched = await client.object(object.id);
  assert.equal(fetched.object.title, object.title);
  assert.equal(JSON.stringify(fetched).includes('AABBCCDD'), false);
  const response = await fetch(`${baseUrl}/o/${object.id}`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /&lt;Test &amp; Card&gt;/);
  assert.doesNotMatch(html, /<Test & Card>/);
  assert.match(html, /property="og:title"/);
  assert.doesNotMatch(html, /AABBCCDD/);
});

test('does not offer public registration and validates requests', async t => {
  const { baseUrl } = await useServer(t);
  const missingContentType = await fetch(`${baseUrl}/v1/resolve`, { method: 'POST', body: '{}' });
  assert.equal(missingContentType.status, 415);
  const unknownRoute = await fetch(`${baseUrl}/v1/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(unknownRoute.status, 404);
  const badInput = await fetch(`${baseUrl}/v1/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"uid":"BAD"}' });
  assert.equal(badInput.status, 400);
});

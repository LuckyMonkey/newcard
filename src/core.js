import { randomUUID } from 'node:crypto';
import { assessObservation, canonicalUid } from './observation.js';

export const PROTOCOL = 'ncNFC/0.1';

const VALID_TECHNOLOGIES = new Set(['iso14443a', 'iso14443b', 'iso15693', 'felica']);
const PUBLIC_ID = /^nc_[a-f0-9]{32}$/;

export function normalizeObservation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('observation must be an object');
  }
  if (typeof input.technology !== 'string') throw new TypeError('technology is required');
  const technology = input.technology.trim().toLowerCase();
  if (!VALID_TECHNOLOGIES.has(technology)) {
    throw new RangeError('unsupported technology');
  }
  if (typeof input.uid !== 'string') throw new TypeError('uid must be a string');
  const uid = input.uid.replace(/[:\- ]/g, '').toUpperCase();
  if (!/^(?:[0-9A-F]{2}){1,32}$/.test(uid)) {
    throw new RangeError('uid must contain 1–32 bytes of hexadecimal digits');
  }
  return { technology, uid: canonicalUid(technology, uid) };
}

export function normalizeNamespace(namespace) {
  if (typeof namespace !== 'string') throw new TypeError('namespace must be a string');
  const value = namespace.trim().toLowerCase();
  if (value.length < 3 || value.length > 128 || !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(value) || value.includes('..')) {
    throw new RangeError('invalid namespace');
  }
  return value;
}

export function validatePublicUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new TypeError('url must be a string under 2049 characters');
  let parsed;
  try { parsed = new URL(value); } catch { throw new RangeError('invalid url'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new RangeError('url must be https and must not contain embedded credentials');
  }
  return parsed.href;
}

export function emptyRegistry() {
  return { version: 1, objects: [], bindings: [] };
}

export function isPublicObjectId(id) {
  return typeof id === 'string' && PUBLIC_ID.test(id);
}

export function registerCard(registry, input) {
  if (!registry || !Array.isArray(registry.objects) || !Array.isArray(registry.bindings)) {
    throw new TypeError('invalid registry');
  }
  const { technology, uid } = normalizeObservation(input);
  const quality = assessObservation({ technology, uid });
  if (!quality.registrable) throw new RangeError(`observation cannot be registered: ${quality.notes[0]}`);
  const namespace = normalizeNamespace(input.namespace);
  const title = String(input.title || '').trim();
  if (!title || title.length > 120) throw new RangeError('title must be 1–120 characters');
  const kind = String(input.kind || 'link');
  if (!/^[a-z][a-z0-9._-]{0,63}$/.test(kind)) throw new RangeError('invalid kind');
  const description = input.description === undefined ? null : String(input.description).trim();
  if (description !== null && description.length > 500) throw new RangeError('description too long');
  const url = validatePublicUrl(input.url);
  const image = input.image ? validatePublicUrl(input.image) : null;
  const apps = {};
  for (const [appId, appUrl] of Object.entries(input.apps || {})) {
    if (!/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(appId)) throw new RangeError('invalid appId');
    apps[appId] = validatePublicUrl(appUrl);
  }
  const exists = registry.bindings.some(binding => binding.namespace === namespace && binding.technology === technology && binding.uid === uid);
  if (exists) throw new Error('binding already registered in namespace');
  const id = `nc_${randomUUID().replaceAll('-', '')}`;
  const object = { id, kind, title, description, url, image, apps };
  const binding = { objectId: id, namespace, technology, uid, uidClass: quality.uidClass, assurance: 'unverified', createdAt: new Date().toISOString() };
  registry.objects.push(object);
  registry.bindings.push(binding);
  return { object, binding };
}

export function publicObject(object) {
  return {
    id: object.id,
    kind: object.kind,
    title: object.title,
    description: object.description,
    url: object.url,
    image: object.image
  };
}

export function resolveCard(registry, request) {
  const { technology, uid } = normalizeObservation(request);
  const namespace = request.namespace === undefined || request.namespace === null || request.namespace === ''
    ? null : normalizeNamespace(request.namespace);
  const appId = request.appId === undefined || request.appId === null ? null : String(request.appId);
  if (appId !== null && !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(appId)) throw new RangeError('invalid appId');

  const candidates = registry.bindings.filter(binding =>
    binding.technology === technology && binding.uid === uid &&
    (namespace === null || binding.namespace === namespace));

  if (candidates.length === 0) return { protocol: PROTOCOL, status: 'not_found' };
  if (candidates.length > 1) return {
    protocol: PROTOCOL, status: 'ambiguous',
    message: 'Multiple bindings match; choose a known namespace or use a stronger observation.'
  };

  const binding = candidates[0];
  const object = registry.objects.find(o => o.id === binding.objectId);
  if (!object) throw new Error('registry integrity error: missing object');
  const usedApp = appId && Object.hasOwn(object.apps || {}, appId);
  const action = { appId: usedApp ? appId : 'default', url: usedApp ? object.apps[appId] : object.url };
  return {
    protocol: PROTOCOL,
    status: 'resolved',
    object: publicObject(object),
    action,
    binding: { namespace: binding.namespace, assurance: binding.assurance }
  };
}

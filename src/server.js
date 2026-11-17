import http from 'node:http';
import { PROTOCOL, isPublicObjectId, publicObject, resolveCard } from './core.js';

function json(res, status, body) {
  const encoded = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(encoded)
  });
  res.end(encoded);
}

function htmlEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

async function readJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const error = new Error('Content-Type must be application/json');
    error.httpStatus = 415;
    throw error;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) {
      const error = new Error('request too large');
      error.httpStatus = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch {
    const error = new Error('malformed JSON');
    error.httpStatus = 400;
    throw error;
  }
}

export function createServer(registry) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/.well-known/ncnfc') {
        return json(res, 200, { protocol: PROTOCOL, name: 'ncNFC reference resolver', version: '0.1', status: 'experimental' });
      }
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
      if (req.method === 'POST' && url.pathname === '/v1/resolve') {
        const result = resolveCard(registry, await readJson(req));
        const status = result.status === 'resolved' ? 200 : result.status === 'ambiguous' ? 409 : 404;
        return json(res, status, result);
      }
      const objectMatch = url.pathname.match(/^\/v1\/objects\/(nc_[a-f0-9]{32})$/);
      if (req.method === 'GET' && objectMatch) {
        const object = registry.objects.find(o => o.id === objectMatch[1]);
        return object ? json(res, 200, { protocol: PROTOCOL, object: publicObject(object) }) : json(res, 404, { error: 'not_found' });
      }
      const landingMatch = url.pathname.match(/^\/o\/(nc_[a-f0-9]{32})$/);
      if (req.method === 'GET' && landingMatch) {
        const object = registry.objects.find(o => o.id === landingMatch[1]);
        if (!object) return json(res, 404, { error: 'not_found' });
        const title = htmlEsc(object.title);
        const description = htmlEsc(object.description || 'NewCard digital object');
        const target = htmlEsc(object.url);
        const image = object.image ? `<meta property="og:image" content="${htmlEsc(object.image)}">` : '';
        const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — NewCard</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${target}">${image}</head><body><main><h1>${title}</h1><p>${description}</p><p><a rel="noopener noreferrer" href="${target}">Open destination</a></p><small>ncNFC ${htmlEsc(object.id)} · Identifier recognition does not verify ownership.</small></main></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(page);
      }
      if (req.method === 'GET' && url.pathname === '/') {
        return json(res, 200, { name: 'NewCard', protocol: PROTOCOL, docs: '/.well-known/ncnfc', message: 'Send POST /v1/resolve to resolve permitted card observations.' });
      }
      return json(res, 404, { error: 'not_found' });
    } catch (error) {
      const status = error.httpStatus || ((error instanceof TypeError || error instanceof RangeError) ? 400 : 500);
      return json(res, status, { error: status === 500 ? 'internal_error' : 'invalid_request', message: status === 500 ? 'Resolver failed' : error.message });
    }
  });
}

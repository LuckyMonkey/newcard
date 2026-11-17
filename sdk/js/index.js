/** ncNFC/0.1 HTTP client. NFC hardware access requires a separate native app/bridge. */
export function createNcNfcClient({ baseUrl, fetchImpl = globalThis.fetch }) {
  if (typeof baseUrl !== 'string' || !baseUrl) throw new TypeError('baseUrl is required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new TypeError('baseUrl must use http(s)');
  return {
    async resolve({ technology, uid, namespace, appId } = {}) {
      const response = await fetchImpl(new URL('/v1/resolve', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ technology, uid, ...(namespace ? { namespace } : {}), ...(appId ? { appId } : {}) })
      });
      const result = await response.json();
      if (![200, 404, 409].includes(response.status)) {
        throw new Error(`ncNFC resolver HTTP ${response.status}: ${result.message || result.error || 'error'}`);
      }
      return result;
    },
    async object(id) {
      if (!/^nc_[a-f0-9]{32}$/.test(id)) throw new TypeError('invalid object id');
      const response = await fetchImpl(new URL(`/v1/objects/${id}`, base));
      if (!response.ok) throw new Error(`ncNFC object lookup HTTP ${response.status}`);
      return response.json();
    }
  };
}

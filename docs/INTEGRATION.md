# ncNFC integration guide — JS SDK v0.1

```js
import { createNcNfcClient } from './sdk/js/index.js';

const nc = createNcNfcClient({ baseUrl: 'http://127.0.0.1:8787' });
const result = await nc.resolve({
  technology: 'iso14443a',
  uid: '04:A2:7F:91',
  namespace: 'demo.restaurant',
  appId: 'com.example.ordering'
});
if (result.status === 'resolved') {
  console.log(result.object.title, result.action.url);
}
```

The SDK performs **HTTP resolution only**, it does not access NFC hardware from a browser. A future NewCard app will perform native scans; a separate Android/iOS bridge must pass observed `{technology, uid}` into the SDK. In the planned strict NewCard-first integration, another app invokes NewCard's scanner, receives a validated result through an app-link callback, then uses its own UX. App-to-app handoff details have *not* been specified or implemented yet.

For a production integration use HTTPS, authenticate any privileged action, verify the callback origin/state, and handle `ambiguous` and `not_found` instead of assuming a UID resolves uniquely.

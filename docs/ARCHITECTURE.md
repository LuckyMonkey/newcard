# Reference architecture

```text
Existing physical card
         |
         | NFC radio observation (device-dependent)
         v
NewCard native scanner (planned)
         |
         | technology + observed UID, permission and optional context
         v
  ncNFC v0.1 resolver ----------- app-specific context
         |                                     |
         | namespace-aware lookup              |
         v                                     |
{namespace, technology, UID}                   |
         |                                     |
         v                                     |
  binding registry                              |
         |                                     |
         v                                     v
    stable nc_... object ----------------> chosen action
         |                                     |
         v                                     v
  public Open Graph page                app-owned URL / UX
```

## Two stages of adoption

**Initially:** Native NewCard handles scanning; integrated third-party apps ask NewCard to scan (handoff not yet implemented). The ncNFC protocol supplies predictable lookup and metadata. **Later:** Compatible native apps and platforms can implement the scanner/reader themselves and still use ncNFC resolution. The protocol must never demand a particular vendor's app.

## Data separation

- **Observation:** tech + raw bytes read from chip. Not secret, not globally unique.
- **Binding:** normalized observation scoped to a namespace. Private registry internal state.
- **Object ID:** opaque public ID; can outlive a physical card assignment.
- **Public description:** title/type/default URL/optional image, with Open Graph output.
- **Action:** optional app-specific URL; mapping does not change card bytes.

## Ambiguity examples

- Same tech + UID, registered to `demo.restaurant` and `demo.hotel`: unscoped lookup returns `409 ambiguous`, scoped lookup resolves.
- Same tech + UID in `demo.restaurant` twice: duplicate binding rejected, because the service cannot separate two indistinguishable cards.
- Card changes UID on each scan: does not qualify for UID-only registration. Do not attempt to reconstruct a hidden UID from protected card content.

## Production considerations

A production resolver will need account ownership verification, server TLS, explicit namespace authorization, rate limiting, abuse review, durable storage with concurrency control, privacy-oriented keyed indexing, audit minimization, user deletion/transfer flows, and card provenance policy. The demo's unverified binding is not an attestation.

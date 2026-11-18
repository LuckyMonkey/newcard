# Roadmap

## Phase 0 — reference resolver (implemented)

- [x] ncNFC 0.1 draft and public object format
- [x] Namespace-aware UID translation with explicit collisions
- [x] Reference HTTP resolver and readable Open Graph profile pages
- [x] Zero-dependency JS client SDK
- [x] Synthetic demo data, CLI, automated tests and CI
- [x] Observation quality classifier (random/NUID/manufacturer), ISO 15693 canonical byte order, `inspect` CLI
- [x] Landscape research and Web NFC probe page (`tools/webnfc-probe.html`)

## Phase 1 — actual hardware observation

- [ ] Collect Web NFC probe reports: do DESFire / Classic transit cards reach `reading` on Android Chrome?
- [ ] NewCard Android scanner (reader mode + `TECH_DISCOVERED` tap-to-launch) with repeat-read stability test
- [ ] ATQA/SAK fingerprint capture; NXP originality-signature check (NTAG21x, Ultralight EV1)
- [ ] Real-device compatibility matrix for permitted transit/decommissioned cards
- [ ] Scan handoff contract and app-link return flow, with signed state/nonces
- [ ] iOS scanning feasibility investigation per tag family

## Phase 2 — safe registration and ownership

- [ ] Account sign-in, ownership policy and revocation / transfer
- [ ] Credentialed application registry, scoped namespaces, anti-abuse controls
- [ ] Encrypted/hardened storage, keyed lookup tokens, data deletion policy
- [ ] Documentation for card issuers / terms-of-use / decommissioned cards

## Phase 2.5 — ncNFC 0.2 (see HOW-IT-WORKS §5)

- [ ] `technology: "unknown"` at resolve time (Web NFC)
- [ ] Optional private fingerprint fields; `uidClass` in responses
- [ ] Assurance tiers: unverified → observed → signed → cryptographic
- [ ] `newcard://scan` handoff with state nonce

## Phase 3 — developer interoperability

- [ ] Kotlin / Swift integrations (and platform-specific SDKs)
- [ ] Formal protocol test vectors and compatibility conformance suite
- [ ] Hosted federation/discovery design and offline caching strategy
- [ ] Open Graph / JSON-LD extensions and structured action registries

## Phase 4 — ecosystem adoption

- [ ] Third-party demo integration (e.g., menu app)
- [ ] Open-source integration examples and extension points
- [ ] Explore OEM/OS integration only after evidence of working adoption

**Explicit non-goals:** cloning access cards, copying fares, bypassing locks, surveillance, and pretending UIDs are cryptographically secure.

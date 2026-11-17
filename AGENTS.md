# Agent / maintainer notes

This is **NewCard**, a standalone project owned by Charlie (LuckyMonkey), **not** a Fridge module, app, deployment, or subproject. Do not introduce any `fridge.run` dependencies, namespaces, branding, routes, or deployment assumptions.

## Mission

Implement ncNFC, an open translation protocol for existing *readable* NFC card identifiers into independently useful web objects, without requiring new NFC chips or writes to cards. NewCard is the official user-facing scan / claim / management application. Other apps integrate through a standard SDK and protocol.

## Non-negotiables

- NFC UID is **not** necessarily unique and is **never** an authentication factor.
- Honor explicit namespaces, disclose ambiguity, never silently select an arbitrary binding.
- Never claim stock iOS/Android can automatically resolve arbitrary transit cards; hardware compatibility and an app are required.
- The demo HTTP server is read-only and listens on loopback; account-backed public registration is future work.
- Never parse protected card data, clone transit media, bypass fare systems, or collect personal travel histories.
- No hidden vendor lock-in in the protocol. Keep the reference implementation independent.
- No real customer/tag information in fixtures, examples, or git history.

## Environment

Node 20+ ESM, no runtime dependencies. `npm test` runs all tests. `npm run demo` seeds synthetic cards and runs an example read-only resolver. `npm run register -- ...` adds local unverified bindings.

## Near-term development order

1. Android device feasibility: scan only permitted, out-of-service cards, verify UID stability and tech compatibility.
2. Define secure app-to-app handoff for NewCard scanner with request binding and callbacks.
3. Build explicit claim/transfer ownership policies before allowing public writes.
4. Add database, HMAC keyed observations, rate limiting, identity, and integration conformance tests.
5. iOS investigation per tag family; do not assert MIFARE Classic support without physical tests.

## Release discipline

Update spec and tests together for changes in collision semantics. Version format is `ncNFC/0.x` until interoperability stabilizes. Keep the project publicly reusable and attribution to Charlie / LuckyMonkey.

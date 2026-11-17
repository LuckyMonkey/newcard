# Security and privacy model (draft)

**The UID is a routing hint. It is NOT an authentication credential.**

## Threats

1. **Cloned / duplicated UID:** a different physical card may share the same observations. Do not connect ncNFC resolution to access control, payments, transit benefits, or personal identity.
2. **Claim squatting:** a person can submit another card's UID. Production claim flows need authenticated accounts, rate limits, dispute/transfer workflows, and potentially higher-assurance tags where available. Repeated reading alone is not robust proof.
3. **Passive tracking:** card UIDs can identify objects across physical spaces. Avoid analytics keyed to UIDs, store the minimum necessary, don't put UIDs in URLs/logs, and provide deletion and retention controls. An ordinary hash of a short UID is not anonymization; production registries may use keyed HMAC for internal lookup while carefully managing keys.
4. **Open redirects / URL abuse:** only allow validated HTTPS destinations, defend against malicious metadata, and display the destination before sensitive actions. A resolution is not an endorsement of a link.
5. **Namespace spoofing:** client-supplied namespaces/app IDs are not authenticated. App-specific routing is for convenience until there is an app registration/authentication system.
6. **Enumeration:** throttle observation lookups and do not expose bulk UID search or ownership information.
7. **Operational constraints:** don't scan cards without permission, modify active transit/access cards, or try to read protected sectors.

## Current proof-of-concept boundaries

- HTTP server is read-only; writes happen in the CLI.
- Defaults to `127.0.0.1` only. It is intentionally **not production-hardened**.
- JSON registry contains sample/plaintext identifiers on local disk. Do not upload an actual UID database to a public repository.
- No user accounts, cryptographic claims, secure transfers, anti-spam controls, or network TLS termination implemented.
- Do not deploy registration or lookup to the public internet until authentication, rate limiting, privacy posture, audit, and collision handling have been reviewed.

# ncNFC Protocol — Draft 0.1

**Status:** Experimental. Not an NFC Forum standard, not an IETF RFC, and not currently supported by Android or iOS as an operating-system feature.

## 1. Scope

ncNFC maps a *readable, observable card identifier* to a stable logical object, optionally using contextual app actions. This protocol does not write to NFC hardware, clone transit credentials, perform payments, attest physical possession, or replace NFC radio protocols. NewCard is intended as the reference scanner and management app; other applications may integrate without using the NewCard UI when a supported native scanning bridge exists.

Terms **MUST**, **SHOULD**, **MAY** have RFC 2119 meanings for this draft.

## 2. Vocabulary

- **Observation**: `{technology, uid}` returned by a compatible NFC reader. The UID is *untrusted* input.
- **Namespace**: a registered resolver scope such as `demo.restaurant`; a routing hint, **not** cryptographic proof.
- **Binding**: `(namespace, technology, uid) -> objectId`. Bindings must not assume global physical uniqueness.
- **Object**: stable public `nc_` ID and application-agnostic metadata.
- **Action**: a context-specific destination selected by a caller's `appId`; falls back to default URL.
- **Collision**: two or more physical cards with indistinguishable observations or several registered bindings matching a lookup.
- **Claim**: an ownership declaration. Claims require separate identity and consent verification in any production registry.

## 3. Input normalization

A scanner MUST identify the radio technology and transport the **byte ordering it actually received**. The initial registry recognizes technology labels `iso14443a`, `iso14443b`, `iso15693`, and `felica`. UIDs MUST be hexadecimal byte strings (even number of digits). Colon, hyphen, and ASCII spaces MAY be ignored for display convenience. Registry normalization uppercases the result. A UID MUST NOT be presumed stable or globally unique simply because it exists.

**Canonical order.** For `iso15693`, an 8-byte UID with `E0` at exactly one end MUST be reordered so `E0` is first, because readers disagree on ISO 15693 byte order. Other technologies are kept as received.

**Observation quality.** Before binding, a registry MUST classify the observation (reference: `src/observation.js`, following NXP AN10927) and MUST refuse:

- ISO 14443-A 4-byte UIDs beginning `08` (random ID, regenerated at every power-up);
- 4-byte values beginning `88` (cascade tag, i.e. an incomplete UID).

It SHOULD record the class (`single_size`, `fnuid`, `double_size`, `vicinity`, `idm`, `pupi`, …) so clients can warn when an identifier is known to be shared. 7-byte ISO 14443-A UIDs whose first byte is in the range `81`–`FE` violate the manufacturer-code rule and SHOULD be flagged as anomalous (likely UID-writable or emulated).

Initial v0.1 reference implementation accepts a 1–32 byte identifier. Real-world families can impose more specific constraints; reader implementations MUST NOT manufacture values they cannot observe.

## 4. Addressing and translation

For a basic binding, the lookup key is:

```text
(namespace, technology, normalized_uid) -> stable_object_id
```

`namespace` is optional at lookup time only. With no namespace, if exactly one binding matches across visible scopes, the reference resolver returns it. With multiple matches it returns `ambiguous`, **without** choosing an arbitrary result. Within a single namespace, an exact duplicate registration MUST be rejected. This does *not* mean another physically distinct card with the same identifier can be safely bound in that namespace.

The stable logical ID is an opaque random identifier such as `nc_2d9...`; it MUST NOT encode a card UID. An object MAY have multiple application actions. `appId` influences only which action is returned, **not** which physical card was observed. The resolver MUST distinguish untrusted observations from authenticated accounts, assets, or payments.

**CGNAT analogy, with limits:** scoped translation resembles translating shared addresses to globally meaningful references. In actual CGNAT, ports and connection state disambiguate flows; an NFC scan does not inherently contain similar entropy. No namespace algorithm can infer unseen differences between otherwise identical physical cards.

## 5. Resolution API (reference profile)

`POST /v1/resolve` over HTTPS, JSON request:

```json
{
  "technology": "iso14443a",
  "uid": "04:A2:7F:91",
  "namespace": "demo.restaurant",
  "appId": "com.example.ordering"
}
```

Successful response `200`:

```json
{
  "protocol": "ncNFC/0.1",
  "status": "resolved",
  "object": {
    "id": "nc_opaque_id",
    "kind": "restaurant",
    "title": "Sample Menu",
    "description": "A sample restaurant",
    "url": "https://example.com/menu",
    "image": null
  },
  "action": {
    "appId": "com.example.ordering",
    "url": "https://example.com/order"
  },
  "binding": { "namespace": "demo.restaurant", "assurance": "unverified" }
}
```

`404` with `status: "not_found"` denotes no binding. `409` with `status: "ambiguous"` denotes multiple matches; the caller SHOULD provide the namespace or ask the user to select a known context. `400` means malformed input. A server MUST NOT publicly reveal raw UIDs, ownership secrets, or lists of candidate objects in error responses.

The reference resolver uses `Cache-Control: no-store` for observations and resolutions. An implementation MAY authenticate clients and rate-limit requests. Production services SHOULD avoid retaining raw UID logs and MUST publish a privacy and abuse policy.

`GET /v1/objects/{id}` returns safe public object metadata without the UID. `GET /o/{id}` displays an HTML landing page with Open Graph metadata. `GET /.well-known/ncnfc` publishes basic version information. Object URLs are not authentication mechanisms.

## 6. Application contexts

An object may define `actions` keyed by registered application ID:

```json
{
  "default": "https://example.com/menu",
  "apps": {
    "com.example.ordering": "https://example.com/order"
  }
}
```

If no matching app ID exists, return the default. Production implementations SHOULD authenticate or otherwise verify clients when an action carries privileged meaning; app names supplied by a client are not proof of app identity. Link presentation and local deep linking MUST require ordinary URL safety checks and user consent when leaving the current app.

## 7. Claims and transfers (future, not in v0.1 MVP)

The registry needs account authentication, a clear claim/transfer/revoke policy, dispute resolution, permitted card-use guidelines, and user-visible privacy controls. A scanned UID alone MUST NOT qualify as secure proof of possession or ownership. Cryptographically attested tags, when available, may support stronger claims, but not all legacy cards do.

## 8. Unsupported cases

- Cards not exposed to an app by a reader/device stack.
- Readers with incompatible technology or restricted iOS/Android NFC functionality.
- Cards using a randomized or absent ID unless another permitted stable observable is available.
- Two indistinguishable physical cards in the same namespace (cannot be separately routed).
- Tap-to-open on stock OSes from a bare transit-card UID without compatible software.
- Payment, transit fare, door access, and identity authentication use cases.

## 9. Versioning

0.x versions are experimental. Each message carries `protocol: "ncNFC/0.1"`. Future major versions should negotiate compatibility instead of silently altering identity semantics.

## 10. Inspiration and technical references

- Android `Tag.getId()`: https://developer.android.com/reference/android/nfc/Tag
- Apple Core NFC background-reading requirements: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
- NXP AN10927 (UID types, nonunique and random UIDs): https://www.nxp.com/docs/en/application-note/AN10927.pdf
- Open Graph Protocol: https://ogp.me/
- W3C Web NFC (serialNumber, `readingerror` for non-NDEF tags): https://w3c-cg.github.io/web-nfc/
- RFC 6598 (shared address space; analogy only): https://www.rfc-editor.org/rfc/rfc6598

# How NewCard works, end to end

This expands `ARCHITECTURE.md` with what the platforms actually allow (see `LANDSCAPE.md`). Anything marked *proposed* is not implemented and not yet in the spec.

## 1. The life of a card

```text
 ┌──────────── register (once) ────────────┐        ┌────────────── tap (every time) ──────────────┐
 │ owner taps card in NewCard              │        │ anyone with a scanner taps the card          │
 │  → observation {tech, uid}              │        │  → observation {tech, uid}                   │
 │  → canonicalise + assess quality        │        │  → canonicalise                              │
 │      random / invalid → refuse          │        │  → POST /v1/resolve {tech, uid, ns?, appId?} │
 │  → repeat-read check (proposed)         │        │  → resolved | ambiguous | not_found          │
 │  → bind (namespace, tech, uid) → nc_id  │        │  → app action URL, or default URL            │
 │  → object: title, kind, url, apps{}     │        │  → user confirms before leaving the app      │
 └─────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

The object ID (`nc_…`) is the durable thing. If the card is lost, re-bind a new card to the same object and every link, app action and printed QR that points at `/o/nc_…` keeps working.

## 2. Scanning paths, best to worst

### A. Android native app (primary target)

- **Foreground:** `NfcAdapter.enableReaderMode()` with flags for NfcA/B/F/V. Gives `Tag.getId()` and `getTechList()` for every family, including MIFARE Classic UIDs on non-NXP phones.
- **Tap-to-open with the app closed:** declare an `ACTION_TECH_DISCOVERED` intent filter with tech lists (`NfcA`, `NfcV`, `NfcF`, `IsoDep`). Tapping a bare transit card then launches NewCard directly. **This is the only platform where "tap an old card and something happens" works with no button press.** Caveat: an app that claims `NDEF_DISCOVERED` for the tag's content takes priority.
- **Extra fingerprint, free on Android:** `NfcA.getAtqa()` and `getSak()`. They separate card families (Classic 1K vs Ultralight vs DESFire) that share a UID. See §4.

### B. Android Chrome, no install (Web NFC)

- `new NDEFReader().scan()` after a user gesture, HTTPS only, page in the foreground.
- Tags that are NDEF or NDEF-formattable produce `reading` with `serialNumber` (the UID). Everything else produces `readingerror` with nothing.
- Web NFC **does not report the technology**. ncNFC has to infer it from length and prefix (`tools/webnfc-probe.html` does this). That's a gap in the 0.1 spec; see §5.
- Hypothesis to test: DESFire transit cards and (on NXP-controller phones) MIFARE Classic cards report `NdefFormatable`, so they *should* reach `reading`. If that holds, a NewCard **web page** covers a large share of transit cards on Android with no install.

### C. iPhone app (Core NFC)

- `NFCTagReaderSession` with `.iso14443 | .iso15693 | .iso18092`. The user presses a button and the system scan sheet appears. There is no background mode for non-NDEF cards.
- Each tag type exposes an `identifier`. FeliCa needs every system code listed in Info.plist. ISO 7816 cards need every AID listed. DESFire and Ultralight are detected as `NFCMiFareTag`.
- MIFARE Classic is reported as unreliable or undetected in tag sessions. Plan for "iPhone can't use this card" on Classic-based transit cards until device tests prove otherwise.
- UX consequence: on iPhone, NewCard is "open app → Scan", or a widget / Action Button / Control Center control that starts a scan.

### D. Fixed readers (PC/SC USB, ESP32 + PN532/PN7150)

- Registration desks, kiosks, jukeboxes, inventory stations. They talk to the resolver over the same HTTP API.
- These usually report UIDs in transmission order. Canonicalisation (§3) keeps them consistent with phones.

## 3. Canonical observation (implemented)

The same card has to produce the same key no matter which reader saw it. Home Assistant shows what happens otherwise: one tag, two IDs, depending on whether a phone or an ESPHome reader scanned it.

- Hex digits only, uppercase, separators dropped.
- **ISO 15693:** reorder so `E0` comes first when exactly one end of the 8 bytes is `E0`. Readers disagree on byte order; this rule doesn't care which order arrived.
- Other families: kept as received. There's no safe way to detect a reversal.

## 4. Observation quality (implemented) and assurance tiers (proposed)

`assessObservation()` classifies every observation before it can be bound:

| uidClass | Example | Registrable | Meaning |
| --- | --- | --- | --- |
| `random` | `08 xx xx xx` | **no** | New value every power-up |
| `invalid` | `88 …` (4 bytes) | **no** | Cascade-tag fragment: the reader gave a partial UID |
| `single_size` / `fnuid` / `reserved` | `A2 7F 91 04`, `3F …` | yes | Stable, but shared with other cards. Needs a namespace |
| `double_size` / `triple_size` | `04 A2 …` (7 bytes) | yes | Manufacturer-scoped unique. Flagged `anomalous` if the manufacturer byte is in the "not allowed" range (magic cards) |
| `vicinity` | `E0 04 …` | yes | ISO 15693 with manufacturer |
| `idm` | 8-byte FeliCa | yes | Physical card IDm |
| `pupi` | ISO 14443-B | yes, with caution | Often random per session. Requires the repeat-read check |

Proposed assurance ladder for `binding.assurance` (today it is always `unverified`):

| Tier | How it's earned | What it proves |
| --- | --- | --- |
| `unverified` | Typed or imported UID | Nothing |
| `observed` | Registered from a live scan by a signed-in owner, with ≥2 reads across a field reset | Someone held a card presenting this UID |
| `signed` | Native app read the NXP originality signature and it verified against NXP's public key for this UID | Real NXP silicon with this UID, or a replay of its signature. Catches crude spoofing |
| `cryptographic` | Tag does per-tap SUN/CMAC (NTAG 424 DNA) | Actual possession of that physical tag. Needs new hardware, so outside the "old card" core, but the protocol should have room for it |

## 5. Protocol gaps found (proposed for ncNFC 0.2)

1. **Technology may be unknown.** Web NFC gives no tech label. Proposal: allow `technology: "unknown"` at resolve time only, matched against all techs. If more than one binding matches, the result is `ambiguous`, as usual. Registration still requires a known tech.
2. **Optional fingerprint.** `{atqa, sak}` for ISO 14443-A, `{pmm}` for FeliCa, `{dsfid, icRef}` for 15693. Stored with the binding, compared on resolve to split collisions between card families, and never shown publicly.
3. **Observation quality in responses.** Return `binding.uidClass` (not the UID) so a client can warn "this card shares its ID with others".
4. **Assurance tiers** as in §4, and an `assurance` filter on resolve ("only answer if ≥ observed").
5. **Handoff.** `newcard://scan?state=<nonce>&return=<https url>&ns=<namespace>`. NewCard scans, resolves, then redirects to `return#state=…&object=nc_…`. The caller checks `state`. The raw UID never crosses the app boundary.

## 6. Collisions, with numbers

4-byte UIDs give about 4.29 billion values, and NXP re-issues them. Birthday math: inside one namespace, a 1% chance that two cards share a UID arrives at about 9,300 cards. A 50% chance arrives at about 77,000. A busy public namespace of old Classic cards *will* collide. That's why:

- Duplicate binding inside a namespace is refused (implemented).
- Unscoped lookup returns `ambiguous` rather than guessing (implemented).
- The proposed fingerprint can split collisions between card families. It can't split two cards of the same family with the same UID, and nothing can.

7-byte UIDs give about 2.8×10^14 values per manufacturer (AN10927). Collisions there mean cloning, not chance.

## 7. Example uses that fit the honest constraints

| Use | Why it fits |
| --- | --- |
| Restaurant table card → menu / order page (namespace per restaurant) | Low stakes. The owner registers their own stack of old cards |
| Storage bin / tool / library-of-things label | Inventory scope. A 15693 or 7-byte UID is plenty |
| Kid's music or story cards (jukebox) | Private namespace, fixed reader, no security need |
| Personal "tap for my profile" card | A web object with an action per app (contact, portfolio, payment *link* only) |
| Event check-in for low-stakes events | pretix does the same. Accept the cloning risk openly |

Things that never fit: door access, payments, fares, identity, age checks, anything where a cloned UID causes harm.

## 8. Next concrete steps

1. Host `tools/webnfc-probe.html` over HTTPS (GitHub Pages works) and collect probe reports from real Android phones and cards. That settles the Web NFC hypothesis in §2B.
2. Minimal Android app: reader mode, `TECH_DISCOVERED` launch, ATQA/SAK capture, originality-signature check on NTAG/Ultralight.
3. Spec 0.2 PR for §5 items 1–3, with tests.
4. iOS spike: one Core NFC session app, a table of which families report an `identifier`.

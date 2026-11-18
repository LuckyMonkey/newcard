# Landscape: cards, phones, and prior art

Research snapshot, November 2026. Each claim is marked **[doc]** (vendor or standards documentation), **[field]** (developer reports, forums, community reverse-engineering) or **[test]** (we still need to confirm it on real hardware). Sources are listed at the end.

## 1. What a card gives away without keys

Every contactless card has to say *something* during anti-collision, before any authentication happens. That anti-collision identifier is the only thing ncNFC uses. Its shape depends on the radio family.

| Family | Identifier | Length | What the first byte means | Reuse value |
| --- | --- | --- | --- | --- |
| ISO 14443-A (MIFARE, NTAG, most transit and hotel cards) | UID | 4, 7 or 10 bytes | 4-byte: `08` = random per power-up; `xF` = fixed but shared; `88` = cascade tag (partial read); others = legacy/re-used range. 7/10-byte: UID0 = manufacturer (`04` = NXP; `81`–`FE` not allowed) **[doc AN10927]** | 7-byte: good. 4-byte: usable but collides. `08…`: useless |
| ISO 14443-B (some IDs, passports, bank cards, Calypso) | PUPI | 4 bytes | No structure; often random per session **[field]** | Test each card type |
| ISO 15693 / NFC-V (ICODE SLIX, library books, ski passes, Tonies) | UID | 8 bytes | `E0`, then manufacturer code, then 6-byte serial **[doc]** | Good, but some tags have a privacy mode that hides them **[field]** |
| FeliCa / NFC-F (Suica, PASMO, Octopus, Edy) | IDm | 8 bytes | Includes manufacturer code | Good for physical cards; wallet-hosted FeliCa has a different IDm per phone **[field]** |

NXP's own guidance: 4-byte UIDs "ended" because the space (~3.7 billion) ran out, and the same values are being re-issued. New systems should use 7-byte UIDs **[doc AN10927]**. So a 4-byte UID can only be a routing hint inside a namespace, never a global key.

`src/observation.js` encodes these rules, and `npm run inspect` runs them on a single observation.

## 2. Real-world card types and how they behave

| Card type | Typical chip | Expected identifier | Notes |
| --- | --- | --- | --- |
| Older transit cards (many US/AU/NZ systems; Cubic "Nextfare MFC") | MIFARE Classic | 4-byte or 7-byte UID | UID readable on every phone. Sector contents need keys and an NXP controller. ncNFC never touches sectors **[field]** |
| Newer transit cards (Oyster, Compass, many 2015+ systems) | MIFARE DESFire EV1/EV2/EV3 | 7-byte UID | DESFire can be personalised with **Random ID**. If the issuer enabled it, the card is unusable for ncNFC **[doc NXP]** |
| Japanese/HK IC cards | FeliCa | 8-byte IDm | iOS needs each system code declared up front **[doc Apple]** |
| Single-ride / paper tickets (Ventra/Compass "MFU") | MIFARE Ultralight | 7-byte UID | Cheap and plentiful, and often thrown away after one use. Good for reuse **[field]** |
| Hotel key cards | MIFARE Classic or Ultralight (varies) | 4 or 7 byte | Common reuse target. Check with repeat reads **[test]** |
| Event wristbands, gift cards, loyalty | NTAG21x / Ultralight | 7-byte UID | Often NDEF-formatted already, so also visible to Web NFC |
| Office badges (13.56 MHz: iCLASS, DESFire, SEOS) | varies | varies | Many are random-ID or proprietary. **125 kHz prox badges are invisible to phones** |
| Contactless bank cards (EMV) | ISO 14443-A/B | Usually random per power-up **[field]** | Out of scope anyway: never bind payment cards |
| Passports / EU ID cards (eMRTD) | ISO 14443-A/B | Random UID by design (ICAO privacy) **[field]** | Unusable, and out of scope |
| Library books, Tonies figurines | ICODE SLIX (15693) | 8-byte `E0 04 …` | Toniebox uses the UID to pick the story **[field]** |

The phrase "stable UID" in a datasheet is not enough. The issuer configures each card at personalisation, so every card type needs a **repeat-read test**: tap, lift away, tap again, on two different phones. That is what `tools/webnfc-probe.html` does.

## 3. What each platform lets software read

| Surface | Can it get the identifier? | Constraints |
| --- | --- | --- |
| **Android native app** | Yes: `Tag.getId()` for NfcA/B/F/V **[doc]** | MIFARE Classic *sector* access needs an NXP controller. **UID alone works on Broadcom/Samsung controllers too** **[field]** |
| **Android, tap with app closed** | Yes: an `ACTION_TECH_DISCOVERED` filter in the manifest launches the app when a matching tag is tapped **[doc]** | Only fires when no NDEF app claims the tag first. Screen must be on and unlocked |
| **Android Chrome (Web NFC)** | **Partly.** `NDEFReadingEvent.serialNumber` carries the UID **[doc]** | Fires only for tags that are NDEF or *NDEF-formattable*. Other tags get `readingerror` with no serial **[doc W3C]**. Many DESFire and (on NXP phones) Classic cards report `NdefFormatable` on Android, so they may work **[field → test]**. No technology label is reported |
| **iPhone app (Core NFC tag session)** | Yes for ISO 7816, ISO 15693, FeliCa and MIFARE (Ultralight, DESFire, Plus) **[doc]** | Foreground only, behind a system scan sheet. FeliCa system codes and ISO 7816 AIDs must be listed in Info.plist. **MIFARE Classic is unreliable or undetected** in tag sessions **[field]** |
| **iPhone, tap with app closed** | No. Background reading only handles NDEF URL records **[doc]** | A bare transit card can never open anything on iOS without the user opening an app first |
| **iOS Shortcuts NFC automation** | Internally, yes. Shortcuts matches tags by their identifier and ignores unregistered tags **[field]** | The user has to register each tag by hand, and the identifier is not passed to the shortcut. Proof that per-tag UID triggers are fine with Apple, but not an integration path |
| **Desktop USB reader (PC/SC, e.g. ACR122U)** | Yes, via `GET DATA` (`FF CA 00 00 00`) | Good for registration desks and kiosks |
| **ESP32 + PN532/PN7150** | Yes | Good for fixed readers (doors, jukeboxes, inventory stations) |

## 4. Prior art: who already does UID-to-action

| Project | What it does | Lesson for ncNFC |
| --- | --- | --- |
| **Home Assistant tags** | Phone app writes an NDEF URL with a tag ID. ESPHome readers fall back to the **raw UID** if there is no NDEF record **[doc]** | The same physical tag gets two different IDs depending on the reader. ncNFC must define one canonical key |
| **iOS Shortcuts automations** | Per-tag automation keyed on identifier | Users already accept "register this tag once, then tap" |
| **pretix (event ticketing)** | UID-only check-in mode. Rejects UIDs starting `08`. Docs call it "very low security" **[doc]** | Same random-ID rule we adopted. Same honesty about cloning |
| **Toniebox** | ISO 15693 UID selects audio content **[field]** | A consumer product built on UID → content, at scale |
| **RFID jukeboxes (Phoniebox etc.)** | Any RFID card UID → playlist | The hobbyist version of exactly this idea |
| **Metrodroid / FareBot** | Read transit card *contents* (balances, trips), sometimes with keys | The opposite of ncNFC. We deliberately never read sectors or trips |
| **NTAG 424 DNA "SUN"** | A new tag writes a per-tap AES-CMAC into its URL, verified server-side **[doc]** | What "real" proof of possession looks like. Requires new hardware, so it's a future high-assurance tier |
| **NXP originality signature** | NTAG21x and Ultralight EV1 hold an ECC signature over the UID, read with `READ_SIG` **[doc]** | Lets a native app prove "real NXP chip with this UID", which catches crude UID spoofing. The signature is static, so emulators can replay it **[field]** |

## 5. Where ncNFC fits

The gap is **open, cross-app, namespace-aware UID resolution**:

- Home Assistant, Shortcuts and jukeboxes each keep a private UID table locked inside one product.
- SUN tags need new hardware.
- Transit readers go the opposite way: they read contents, not just identity.

Nobody publishes a neutral protocol that says what a UID can mean, in which scope, with explicit collisions and quality classes. That is NewCard's position.

## 6. Legal and privacy

- **Card ownership.** Many transit cards stay the property of the operator under their terms of use. ncNFC only reads what every reader sees during anti-collision and changes nothing, but registration should still state "cards you own or are allowed to reuse" (it already does). For each system, check its terms before recommending it publicly **[test]**.
- **Personal data.** EU guidance treats RFID identifiers as personal data once they are linked to a person, and calls for privacy impact assessments (2009 RFID Recommendation, applied today through GDPR and ePrivacy). ncNFC's rules already match this: no UID in URLs or logs, keyed HMAC for indexes, deletion.
- **Cloning.** Writable-UID "magic" cards and Flipper/Proxmark emulators can present any UID **[field]**. ncNFC never treats a UID as authentication. That stays non-negotiable.

## Sources

- NXP AN10927, *MIFARE product and handling of UIDs*: https://www.nxp.com/docs/en/application-note/AN10927.pdf
- NXP MIFARE DESFire EV3 product page (Random ID option): https://www.nxp.com/products/MF3DHx3
- MIFARE forum, DESFire random UID only readable after authentication: https://www.mifare.net/support/forum/topic/desfire-ev1-uid-unique-and-always-returned/
- NXP NTAG213/215/216 datasheet (originality signature): https://nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf
- NXP MIFARE Ultralight EV1 datasheet: https://www.nxp.com/docs/en/data-sheet/MF0ULX1.pdf
- NXP community, copying READ_SIG: https://community.nxp.com/thread/479059
- NTAG 424 DNA datasheet (SUN): https://docs.ampnuts.ru/nxp.com.datasheet/NT4H2421Gx.pdf
- Android `Tag`: https://developer.android.com/reference/android/nfc/Tag
- Android advanced NFC / tech dispatch: https://developer.android.com/develop/connectivity/nfc/advanced-nfc
- Android NdefFormatable on DESFire (field report): https://www.b4x.com/android/forum/threads/cannot-read-and-write-to-nfc-card.84363/post-534676
- MIFARE Classic UID on Broadcom controllers: https://community.nxp.com/t5/NFC/Read-MIFARE-Classic-UID-with-Samsung-J5Pro/m-p/767752
- Web NFC spec (reading algorithm, `readingerror`, formattable tags): https://w3c-cg.github.io/web-nfc/
- Chrome Web NFC guide: https://developer.chrome.com/docs/capabilities/nfc
- MDN `NDEFReadingEvent.serialNumber`: https://developer.mozilla.org/docs/Web/API/NDEFReadingEvent/serialNumber
- Apple `NFCTagReaderSession`: https://developer.apple.com/documentation/corenfc/nfctagreadersession
- Apple background tag reading: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
- Apple forums, MIFARE Classic in tag sessions: https://developer.apple.com/forums/thread/123137
- Home Assistant companion tags: https://companion.home-assistant.io/en/integrations/universal-links
- ESPHome PN7150 (UID fallback): https://esphome.io/components/pn7150/
- pretix UID mode: https://docs.pretix.eu/dev/development/nfc/uid.html
- TeddyCloud / Tonies tag requirements: https://tonies-wiki.revvox.de/docs/tools/teddycloud/usage/custom-tags/
- Metrodroid wiki: https://github.com/metrodroid/metrodroid/wiki
- Shortcuts NFC automations: https://macmost.com/using-nfc-tags-and-tap-automations-to-trigger-shortcuts.html
- EU RFID Recommendation 2009/387/EC: https://eur-lex.europa.eu/eli/reco/2009/387/oj
- Flipper magic cards: https://docs.flipper.net/nfc/magic-cards

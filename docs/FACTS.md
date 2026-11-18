# Fact ledger

Every technical claim NewCard's docs rely on, with how sure we are and where it comes from. When a claim changes status, update it here first, then the docs that use it.

**Status key**

| Status | Meaning |
| --- | --- |
| **Verified: doc** | Stated in a standard, vendor datasheet, or official platform documentation |
| **Verified: source** | Read directly in the implementation's source code |
| **Field reports** | Several developer or community reports agree; no primary source found |
| **Unverified** | Widely repeated, but we have not found a primary source |
| **Device test** | Only a test on real hardware can settle it (Phase 1) |

Last full review: 2026-11-17.

## Card identifiers

| # | Claim | Status | Source |
| --- | --- | --- | --- |
| C1 | A 4-byte ISO 14443-A UID starting `08` is a Random ID, regenerated at each power-on reset. Deselect keeps it; a field reset changes it | Verified: doc | NXP AN10927 §2.1.1 |
| C2 | 4-byte UIDs starting `xF` are fixed but non-unique (FNUID). Old 4-byte ranges are being re-used (ONUID) | Verified: doc | AN10927 §2.1.2–2.1.3 |
| C3 | Unique 4-byte UIDs "ended" (~3.7 billion); NXP recommends 7-byte UIDs for new systems | Verified: doc | AN10927 §2.1 note |
| C4 | `88` as the first of 4 bytes is the cascade tag, so the reader saw only part of a longer UID | Verified: doc | AN10927 §2 |
| C5 | In 7- and 10-byte UIDs the first byte is the manufacturer code (`04` = NXP); `81`–`FE` are not allowed | Verified: doc | AN10927 Table 2 |
| C6 | A 7-byte UID space is about 2.8×10^14 per manufacturer | Verified: doc | AN10927 §2.2 |
| C7 | An ISO 15693 UID is 8 bytes: `E0`, manufacturer code, 6-byte serial | Verified: doc | ISO/IEC 15693-3 (via vendor docs, Tonies community wiki) |
| C8 | Readers report ISO 15693 UIDs in different byte orders | Field reports | Stack Overflow comment on ICODE; handled by canonical ordering whatever the truth |
| C9 | DESFire EV1/EV2/EV3 can be personalised with a Random ID; the real UID is then only readable after authentication | Verified: doc | NXP DESFire EV3 product page; MIFARE forum |
| C10 | Contactless bank cards (EMV) usually present random UIDs | Unverified | Widely repeated; no EMVCo text found. Out of scope anyway |
| C11 | Passports and EU ID cards present random UIDs | Unverified | Widely repeated (ICAO 9303 privacy); out of scope anyway |
| C12 | 125 kHz proximity badges cannot be read by phones | Verified: doc | Phone NFC is 13.56 MHz only (ISO 14443/15693/18092) |
| C13 | FeliCa IDm is 8 bytes and starts with a manufacturer code | Verified: doc | Sony FeliCa documentation (via Apple Core NFC FeliCa types) |

## Platforms

| # | Claim | Status | Source |
| --- | --- | --- | --- |
| P1 | Android `Tag.getId()` returns the low-level ID for every supported tech | Verified: doc | developer.android.com `Tag` |
| P2 | Non-NXP Android controllers (Broadcom, some Samsung) read MIFARE Classic UIDs but not sectors | Field reports | NXP community, MIFARE forum (2013–2018); recheck on current phones |
| P3 | An `ACTION_TECH_DISCOVERED` filter starts an app when a non-NDEF tag of a matching tech is tapped | Verified: doc | Android "NFC basics", tag dispatch |
| P4 | Android scans for tags usually only while the screen is unlocked | Verified: doc | Android "NFC basics" |
| P5 | Android 16: the user is told the first time an app is launched by a tag and can switch off "Launch via NFC"; apps check `NfcAdapter.isTagIntentAllowed()` | Verified: doc | Android "NFC basics", app allowlist section |
| P6 | Android 17 (API 37): NFC-dispatched activities must require `DISPATCH_NFC_MESSAGE`; stopped apps (never launched or force-stopped) get no NFC intents; `ACTION_TAG_DISCOVERED` is deprecated | Verified: doc | Android "NFC basics" |
| P7 | Android 16+: tags with http(s) links open via `ACTION_VIEW`; Android 17 shows an "open link" notification first | Verified: doc | Android "NFC basics" |
| P8 | Chrome Web NFC reports a tag only if Android lists it as `Ndef` or `NdefFormatable`; anything else yields no `reading` event | Verified: source | Chromium `NfcTagHandler.create()` (main, Nov 2026) |
| P9 | For an `NdefFormatable` tag, Chrome fires `reading` with an empty message and `serialNumber` = `tag.getId()` as lowercase colon-hex | Verified: source | Chromium `NfcTagHandler`, `NfcImpl.processPendingWatchOperations()` |
| P10 | Chrome blocks YubiKeys from Web NFC (by ATS historical bytes) | Verified: source | Chromium `NfcBlocklist.java` |
| P11 | Web NFC gives no technology label, needs HTTPS, a top-level frame and a user gesture | Verified: doc | W3C Web NFC; Chrome docs |
| P12 | DESFire transit cards are listed as `NdefFormatable` on Android | Field reports → Device test | One DESFire 4K report (IsoDep, NfcA, NdefFormatable) |
| P13 | MIFARE Classic cards are listed as `NdefFormatable` on NXP-controller phones | Device test | Not found stated anywhere |
| P14 | iOS `NFCTagReaderSession` detects ISO 7816, ISO 15693, FeliCa and MIFARE tags | Verified: doc | Apple Core NFC |
| P15 | iOS needs FeliCa system codes and ISO 7816 AIDs declared in Info.plist | Verified: doc | Apple Core NFC configuration docs |
| P16 | `NFCMiFareFamily` covers Ultralight, Plus, DESFire and unknown; no Classic case | Field reports | Apple docs page did not render; developer reports agree |
| P17 | MIFARE Classic is unreliable or undetected in iOS tag sessions | Field reports | Apple Developer Forums #123137, GitHub issue reports |
| P18 | iOS background tag reading only handles NDEF URL-type records | Verified: doc | Apple "Adding support for background tag reading" |
| P19 | iOS Shortcuts NFC automations match a tag by its identifier and pass no tag data to the shortcut | Field reports | MacMost, TechRepublic, Home Assistant forums |

## Real cards and systems

| # | Claim | Status | Source |
| --- | --- | --- | --- |
| R1 | Classic (pre-2026) CharlieCards use NXP MIFARE Classic 1K | Field reports | SecureIDNews; G+D vendor page (MBTA monthly Classic 1K deliveries) |
| R2 | The new CharlieCard (2025 volunteer pilot) uses a different chip | Unverified | Streetsblog Mass, Dec 2025, names no chip |
| R3 | Oyster moved from MIFARE Classic to DESFire | Field reports | NFC Times |
| R4 | Oyster cards remain TfL property and must not be "damaged, altered or tampered with" | Verified: doc | TfL Conditions of Carriage |
| R5 | Suica, PASMO, Octopus use FeliCa | Verified: doc | Operator / Sony history; Wikipedia |
| R6 | Toniebox selects content from an ICODE SLIX-L UID (`E0 04 03…`) | Field reports | TeddyCloud wiki, community teardowns |

## Security features

| # | Claim | Status | Source |
| --- | --- | --- | --- |
| S1 | NTAG21x and Ultralight EV1 hold an ECC originality signature over the UID, read with `READ_SIG` | Verified: doc | NXP NTAG213/215/216 and MF0ULX1 datasheets; AN11350 |
| S2 | The originality signature is static, so emulators can replay it | Field reports | NXP community thread; Flipper docs |
| S3 | NTAG 424 DNA produces a per-tap AES-CMAC (SUN) verified by a server | Verified: doc | NXP NT4H2421Gx datasheet |
| S4 | "Magic" cards with writable UIDs exist for 4- and 7-byte formats | Verified: doc | Flipper Zero docs, Lab401 |

## Prior art

| # | Claim | Status | Source |
| --- | --- | --- | --- |
| A1 | pretix has a UID-only mode, rejects UIDs starting `08`, and calls it very low security | Verified: doc | docs.pretix.eu |
| A2 | Phoniebox links card IDs to folders, streams or actions, with 125 kHz or RC522 13.56 MHz readers | Verified: doc | MiczFlor/RPi-Jukebox-RFID wiki |
| A3 | ESPHome PN7150 sends the raw UID when a tag has no Home Assistant NDEF ID; the phone app reads the NDEF ID, so the IDs differ | Verified: doc | esphome.io; HA community thread |
| A4 | EU 2009 RFID Recommendation treats RFID data linked to people as personal data; it is non-binding | Verified: doc | Recommendation 2009/387/EC; Hunton analysis |

## Derived numbers

| # | Claim | How |
| --- | --- | --- |
| D1 | 1% chance of a 4-byte UID collision inside one namespace at ~9,300 cards; 50% at ~77,000 | Birthday bound, N = 2^32: n ≈ √(2N·ln(1/(1−p))) |

## Open questions for Phase 1

1. P12 / P13: which real transit, hotel and event cards does Android list as `NdefFormatable`? That decides how far a no-install web page can go.
2. P2 on 2024+ phones: do Samsung, Pixel and other recent controllers all return Classic UIDs?
3. P16 / P17: does any iPhone model detect MIFARE Classic in a tag session?
4. C8: which byte order does each platform return for ISO 15693? (The canonical form makes this harmless, but the data is worth recording.)
5. R2: what chip does the new CharlieCard use, and is its UID random?

## Sources

- NXP AN10927: https://www.nxp.com/docs/en/application-note/AN10927.pdf
- NXP DESFire EV3: https://www.nxp.com/products/MF3DHx3
- MIFARE forum, DESFire random ID: https://www.mifare.net/support/forum/topic/desfire-ev1-uid-unique-and-always-returned/
- Android NFC basics (dispatch, Android 16/17 changes): https://developer.android.com/develop/connectivity/nfc/nfc
- Android advanced NFC: https://developer.android.com/develop/connectivity/nfc/advanced-nfc
- Android `Tag`: https://developer.android.com/reference/android/nfc/Tag
- Chromium Web NFC Android sources: https://chromium.googlesource.com/chromium/src/+/main/services/device/nfc/android/java/src/org/chromium/device/nfc/
- W3C Web NFC: https://w3c-cg.github.io/web-nfc/
- Chrome Web NFC: https://developer.chrome.com/docs/capabilities/nfc
- DESFire NdefFormatable report: https://www.b4x.com/android/forum/threads/cannot-read-and-write-to-nfc-card.84363/post-534676
- Classic UID on non-NXP phones: https://community.nxp.com/t5/NFC/Read-MIFARE-Classic-UID-with-Samsung-J5Pro/m-p/767752
- Apple NFCTagReaderSession: https://developer.apple.com/documentation/corenfc/nfctagreadersession
- Apple background reading: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
- Apple forums, Classic: https://developer.apple.com/forums/thread/123137
- Shortcuts NFC: https://macmost.com/using-nfc-tags-and-tap-automations-to-trigger-shortcuts.html
- SecureIDNews, CharlieCard: https://www.secureidnews.com/news-item/bostons-new-contactless-charliecard-makes-commuting-easier-for-a-million-daily-riders/
- G+D transit: https://www.gi-de.com/us/mobile-security/industries/transit/
- Streetsblog Mass, new CharlieCard: https://mass.streetsblog.org/2025/12/15/we-tried-the-new-charliecard-heres-what-to-know
- NFC Times, Oyster to DESFire: https://nfctimes.com/news/transport-london-discard-mifare-classic-seeks-desfire-sims
- TfL Conditions of Carriage: https://foi.tfl.gov.uk/FOI-2242-1920/tfl-conditions-of-carriage.pdf
- NTAG213/215/216 datasheet: https://nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf
- Ultralight EV1 datasheet: https://www.nxp.com/docs/en/data-sheet/MF0ULX1.pdf
- NXP community, READ_SIG copying: https://community.nxp.com/thread/479059
- NTAG 424 DNA datasheet: https://docs.ampnuts.ru/nxp.com.datasheet/NT4H2421Gx.pdf
- Flipper magic cards: https://docs.flipper.net/nfc/magic-cards
- pretix UID mode: https://docs.pretix.eu/dev/development/nfc/uid.html
- Phoniebox: https://github.com/MiczFlor/RPi-Jukebox-RFID
- ESPHome PN7150: https://esphome.io/components/pn7150/
- HA tag ID mismatch: https://community.home-assistant.io/t/nfc-tag-id-is-different-if-used-on-phone-and-on-external-scanner/228576
- TeddyCloud tags: https://tonies-wiki.revvox.de/docs/tools/teddycloud/usage/custom-tags/
- EU RFID Recommendation: https://eur-lex.europa.eu/eli/reco/2009/387/oj

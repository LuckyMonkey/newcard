# Compatibility and reality check

**Recognition happens in compatible software, not magically inside a legacy card.**

| Surface | Prototype position |
| --- | --- |
| Android native app with compatible NFC hardware | Reader can often obtain `Tag.getId()`; tech support varies by device |
| Android Chrome (Web NFC) | `serialNumber` is reported for NDEF and NDEF-formattable tags; other tags raise `readingerror`. No technology label. Use `tools/webnfc-probe.html` to test cards |
| Android, app closed | A `TECH_DISCOVERED` manifest filter can launch a native app when a bare card is tapped |
| iPhone Core NFC app | ISO 7816, ISO 15693, FeliCa (system codes must be declared), MIFARE Ultralight/DESFire/Plus. MIFARE Classic is reported unreliable or undetected |
| iPhone background scan | Generally needs a supported NDEF message containing a URL; bare UID is not sufficient |
| Ordinary card without ncNFC-aware software | No ncNFC operation |
| Existing card with random or absent UID | Not usable by UID-only registry |
| Printed QR fallback | Possible, but adds a sticker/modification and is not the core idea |

## Test matrix to collect

For each *authorized* decommissioned card: record technology, NFC device model/OS, whether a stable identifier appears after multiple re-presentations and across devices, whether the UID byte order is consistent, and whether the identifier is restricted or randomized. Avoid storing other card data or information about the cardholder.

See [`LANDSCAPE.md`](LANDSCAPE.md) for per-card-type detail and sources, and [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) for scanning paths.

## Reference material

- https://developer.android.com/reference/android/nfc/Tag
- https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
- https://www.nxp.com/docs/en/application-note/AN10927.pdf

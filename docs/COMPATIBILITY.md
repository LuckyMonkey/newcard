# Compatibility and reality check

**Recognition happens in compatible software, not magically inside a legacy card.**

| Surface | Prototype position |
| --- | --- |
| Android native app with compatible NFC hardware | Reader can often obtain `Tag.getId()`; tech support varies by device |
| Android browser | No general browser API to obtain arbitrary transit-card UIDs |
| iPhone Core NFC app | Can scan supported tag families; support is not universal, especially for older transit cards |
| iPhone background scan | Generally needs a supported NDEF message containing a URL; bare UID is not sufficient |
| Ordinary card without ncNFC-aware software | No ncNFC operation |
| Existing card with random or absent UID | Not usable by UID-only registry |
| Printed QR fallback | Possible, but adds a sticker/modification and is not the core idea |

## Test matrix to collect

For each *authorized* decommissioned card: record technology, NFC device model/OS, whether a stable identifier appears after multiple re-presentations and across devices, whether the UID byte order is consistent, and whether the identifier is restricted or randomized. Avoid storing other card data or information about the cardholder.

## Reference material

- https://developer.android.com/reference/android/nfc/Tag
- https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
- https://www.nxp.com/docs/en/application-note/AN10927.pdf

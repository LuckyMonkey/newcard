// Observation quality assessment for ncNFC.
// Browser-safe (no Node imports) so tools/webnfc-probe.html can reuse it.
//
// Sources for the rules below:
//  - NXP AN10927 "MIFARE product and handling of UIDs" (Rev 4.1), Table 1 and 2
//  - ISO/IEC 15693-3 UID layout: E0 | manufacturer code | 6 bytes serial
//  - ISO/IEC 7816-6 IC manufacturer registry (partial; only well-known codes)

export const MANUFACTURERS = Object.freeze({
  0x02: 'STMicroelectronics',
  0x04: 'NXP Semiconductors',
  0x05: 'Infineon Technologies',
  0x07: 'Texas Instruments',
  0x16: 'EM Microelectronic-Marin'
});

function manufacturer(code) {
  return { code: code.toString(16).toUpperCase().padStart(2, '0'), name: MANUFACTURERS[code] || null };
}

function bytesOf(hex) {
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

/**
 * Canonical byte order for an observed UID. Readers disagree about ISO 15693
 * byte order (the UID travels LSB-first on air; datasheets print it E0-first).
 * When exactly one end of an 8-byte ISO 15693 UID is E0, reorder it E0-first so
 * the same card produces the same key on every reader. Other technologies are
 * returned unchanged: there is no safe way to detect reversal for them.
 */
export function canonicalUid(technology, uid) {
  if (technology === 'iso15693' && uid.length === 16) {
    const first = uid.slice(0, 2);
    const last = uid.slice(-2);
    if (last === 'E0' && first !== 'E0') {
      return uid.match(/../g).reverse().join('');
    }
  }
  return uid;
}

/**
 * Classify a normalized observation ({technology, uid} with uppercase hex uid).
 *
 * uidClass     what kind of identifier this is
 * stable       whether the same card should give the same value on every read
 * uniqueness   'manufacturer_scoped' | 'not_guaranteed' | 'none'
 * registrable  whether ncNFC may bind it (random / invalid IDs may not)
 */
export function assessObservation({ technology, uid }) {
  const bytes = bytesOf(uid);
  const length = bytes.length;
  const result = { technology, length, uidClass: 'unknown', manufacturer: null, stable: true, uniqueness: 'not_guaranteed', registrable: true, notes: [] };
  const reject = (uidClass, note) => Object.assign(result, { uidClass, stable: false, uniqueness: 'none', registrable: false, notes: [...result.notes, note] });

  if (technology === 'iso14443a') {
    const b0 = bytes[0];
    if (length === 4) {
      if (b0 === 0x08) return reject('random', 'Random ID (UID0 = 08): regenerated on every power-up, so the card cannot be recognised again.');
      if (b0 === 0x88) return reject('invalid', 'UID0 = 88 is the ISO 14443 cascade tag, not a complete UID; the reader reported a partial value.');
      if (b0 === 0xF8) {
        result.uidClass = 'reserved';
        result.notes.push('UID0 = F8 is reserved (RFU); treat as non-unique.');
        return result;
      }
      if ((b0 & 0x0F) === 0x0F) {
        result.uidClass = 'fnuid';
        result.notes.push('Fixed non-unique 4-byte ID (UID0 = xF): stable, but other cards share it.');
        return result;
      }
      result.uidClass = 'single_size';
      result.notes.push('Legacy 4-byte UID: no manufacturer code, and NXP re-uses this range (ONUID). Expect collisions.');
      return result;
    }
    if (length === 7 || length === 10) {
      result.uidClass = length === 7 ? 'double_size' : 'triple_size';
      if (b0 >= 0x81 && b0 <= 0xFE) {
        result.notes.push('Manufacturer byte is in the "not allowed" range (81–FE): likely an emulator or UID-writable "magic" card.');
        result.uniqueness = 'not_guaranteed';
        result.anomalous = true;
      } else {
        result.manufacturer = manufacturer(b0);
        result.uniqueness = 'manufacturer_scoped';
      }
      return result;
    }
    result.uidClass = 'nonstandard_length';
    result.notes.push('ISO 14443-A UIDs are 4, 7 or 10 bytes; this length suggests a reader or emulation quirk.');
    return result;
  }

  if (technology === 'iso15693') {
    if (length !== 8 || bytes[0] !== 0xE0) {
      result.uidClass = 'nonstandard';
      result.notes.push('ISO 15693 UIDs are 8 bytes starting E0 (after canonical ordering).');
      return result;
    }
    result.uidClass = 'vicinity';
    result.manufacturer = manufacturer(bytes[1]);
    result.uniqueness = 'manufacturer_scoped';
    result.notes.push('Some ISO 15693 tags (e.g. ICODE SLIX privacy mode) hide from readers until unlocked.');
    return result;
  }

  if (technology === 'iso14443b') {
    result.uidClass = 'pupi';
    result.notes.push('ISO 14443-B PUPI: many cards (passports, national IDs, bank cards) randomise it per session. Confirm with repeat reads across field resets before trusting it.');
    return result;
  }

  if (technology === 'felica') {
    if (length !== 8) {
      result.uidClass = 'nonstandard';
      result.notes.push('FeliCa IDm is 8 bytes.');
      return result;
    }
    result.uidClass = 'idm';
    result.uniqueness = 'manufacturer_scoped';
    result.notes.push('FeliCa IDm of a physical card is fixed; phone-hosted FeliCa (wallet Suica etc.) presents a different IDm per device.');
    return result;
  }

  return result;
}

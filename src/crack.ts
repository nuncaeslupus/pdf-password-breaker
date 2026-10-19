import { PDFDocument } from "@cantoo/pdf-lib";

/**
 * True when `pw` decrypts the PDF. @cantoo/pdf-lib verifies the password against the
 * file's /U and /O entries while loading and throws a "password"-ish error on a miss.
 * Any other error (corrupt file) is re-thrown.
 */
export async function tryPassword(bytes: Uint8Array, pw: string): Promise<boolean> {
  try {
    await PDFDocument.load(bytes, { password: pw, ignoreEncryption: true });
    return true;
  } catch (e) {
    if (/password/i.test((e as Error).message)) return false;
    throw e;
  }
}

export interface Hints {
  words: string[]; // tried verbatim: names, known words, the password if you half-remember it
  ids: string[]; // DNI/NIE/account/phone — digits and letter variants are derived
  dates: string[]; // free-form dates ("1990-05-23", "23/05/1990"); formats are derived
  numericDigits: number; // also sweep every number of exactly this many digits (0 = off)
}

/** Formats that invoice/bank providers commonly use when the password is a date. */
export function dateVariants(raw: string): string[] {
  const m = raw.match(/(\d{1,4})\D+(\d{1,2})\D+(\d{1,4})/);
  if (!m) return [];
  const [, p1, p2, p3] = m;
  let d: string, mo: string, y: string;
  if (p1.length === 4) [y, mo, d] = [p1, p2, p3];
  else [d, mo, y] = [p1, p2, p3];
  const yyyy = y.length === 4 ? y : Number(y) > 30 ? "19" + y.padStart(2, "0") : "20" + y.padStart(2, "0");
  const yy = yyyy.slice(2);
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  return [...new Set([dd + mm + yyyy, dd + mm + yy, yyyy + mm + dd, yy + mm + dd])];
}

/** Digit-only and letter-case variants of an id (DNI "12345678Z" → "12345678", "12345678z", …). */
export function idVariants(raw: string): string[] {
  const s = raw.trim();
  const out = new Set([s, s.toUpperCase(), s.toLowerCase()]);
  const digits = s.replace(/\D/g, "");
  if (digits) {
    out.add(digits);
    out.add(digits.replace(/^0+/, ""));
  }
  return [...out].filter(Boolean);
}

/** Ordered, de-duplicated candidates, most-likely first; numeric sweep last. */
export function* candidates(h: Hints): Generator<string> {
  const seen = new Set<string>();
  const fresh = (v: string) => (v && !seen.has(v) ? (seen.add(v), true) : false);

  for (const w of h.words) if (fresh(w.trim())) yield w.trim();
  for (const id of h.ids) for (const v of idVariants(id)) if (fresh(v)) yield v;
  for (const dt of h.dates) for (const v of dateVariants(dt)) if (fresh(v)) yield v;

  // ponytail: numeric sweep is the capped, dumb option; hints above cover the real cases.
  // Each try re-parses the PDF (~ms), so large spaces are slow — the UI caps digits.
  const n = h.numericDigits;
  if (n > 0) {
    const max = 10 ** n;
    for (let i = 0; i < max; i++) {
      const v = String(i).padStart(n, "0");
      if (fresh(v)) yield v;
    }
  }
}

/** Upper bound on how many candidates `candidates(h)` will yield, for a progress bar. */
export function countCandidates(h: Hints): number {
  let n = 0;
  for (const _ of candidates({ ...h, numericDigits: 0 })) n++;
  return n + (h.numericDigits > 0 ? 10 ** h.numericDigits : 0);
}

/** Re-saves the PDF without encryption once the password is known. Drops outlines/forms. */
export async function unlock(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { password, ignoreEncryption: true });
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  return out.save();
}

import { PDFArray, PDFBool, PDFDict, PDFDocument, PDFName, PDFNumber, type PDFObject } from "@cantoo/pdf-lib";

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

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

/** Spanish DNI/NIE check letter, or null if `raw` isn't an 8-digit DNI / NIE number. */
export function dniLetter(raw: string): string | null {
  let s = raw.trim().toUpperCase();
  const nie = s.match(/^([XYZ])(\d{7})$/);
  if (nie) s = String("XYZ".indexOf(nie[1])) + nie[2];
  if (!/^\d{8}$/.test(s)) return null;
  return DNI_LETTERS[Number(s) % 23];
}

/**
 * Variants of an id: case-folded, digits-only, without leading zeros, and — for an
 * 8-digit DNI or an X/Y/Z NIE number — with its computed check letter appended.
 */
export function idVariants(raw: string): string[] {
  const s = raw.trim();
  const out = new Set([s, s.toUpperCase(), s.toLowerCase()]);
  const digits = s.replace(/\D/g, "");
  if (digits) {
    out.add(digits);
    out.add(digits.replace(/^0+/, ""));
  }
  const letter = dniLetter(s);
  if (letter) {
    const base = /^[XYZxyz]/.test(s) ? s.toUpperCase() : digits;
    out.add(base + letter);
    out.add(base + letter.toLowerCase());
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

const toHex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Bytes of a /O /U /ID string entry, whether stored as a hex or a literal PDF string. */
function strBytes(o: PDFObject | undefined): Uint8Array {
  const anyO = o as { asBytes?: () => Uint8Array } | undefined;
  return anyO?.asBytes ? anyO.asBytes() : new Uint8Array();
}

export interface PdfHash {
  hash: string; // the $pdf$... line for hashcat/John
  v: number;
  r: number;
  mode: number; // hashcat -m value
  modeLabel: string; // human description of the encryption
}

/**
 * The PDF's encryption parameters as a pdf2john `$pdf$` hash, for cracking on a GPU with
 * hashcat/John. Format: $pdf$V*R*length*P*encMeta*idLen*id*uLen*U*oLen*O (P as signed 32-bit).
 * Returns null if the file isn't encrypted with the Standard security handler.
 */
export async function extractHash(bytes: Uint8Array): Promise<PdfHash | null> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const enc = ctx.lookup(ctx.trailerInfo.Encrypt);
  if (!(enc instanceof PDFDict)) return null;

  const num = (k: string, def = 0) => {
    const v = enc.get(PDFName.of(k));
    return v instanceof PDFNumber ? v.asNumber() : def;
  };
  const v = num("V", 1);
  const r = num("R", 2);
  const length = num("Length", 40);
  const p = num("P") | 0; // force signed 32-bit, as pdf2john prints it
  const metaObj = enc.get(PDFName.of("EncryptMetadata"));
  const encMeta = metaObj instanceof PDFBool ? (metaObj.asBoolean() ? 1 : 0) : 1;

  const o = strBytes(enc.get(PDFName.of("O")));
  const u = strBytes(enc.get(PDFName.of("U")));
  const idArr = ctx.trailerInfo.ID;
  const id = idArr instanceof PDFArray ? strBytes(idArr.get(0)) : new Uint8Array();

  const hash = `$pdf$${v}*${r}*${length}*${p}*${encMeta}*${id.length}*${toHex(id)}*${u.length}*${toHex(u)}*${o.length}*${toHex(o)}`;

  // hashcat mode by revision: R2 RC4-40, R3/4 RC4/AES-128, R5/6 AES-256.
  const { mode, modeLabel } =
    r <= 2
      ? { mode: 10400, modeLabel: "PDF 1.1–1.3 (RC4 40 bits)" }
      : r <= 4
        ? { mode: 10500, modeLabel: "PDF 1.4–1.6 (RC4/AES, Acrobat 5–8)" }
        : r === 5
          ? { mode: 10600, modeLabel: "PDF 1.7 nivel 3 (AES-256, Acrobat 9)" }
          : { mode: 10700, modeLabel: "PDF 1.7 nivel 8 (AES-256, Acrobat 10–11)" };

  return { hash, v, r, mode, modeLabel };
}

/** Re-saves the PDF without encryption once the password is known. Drops outlines/forms. */
export async function unlock(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { password, ignoreEncryption: true });
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  return out.save();
}

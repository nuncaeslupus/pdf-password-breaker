import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { candidates, caseVariants, countCandidates, dateVariants, dniLetter, extractHash, idVariants, tryPassword, unlock } from "../src/crack";

async function encrypted(userPassword: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  doc.encrypt({ userPassword, ownerPassword: `${userPassword}-owner` });
  return doc.save();
}

describe("candidate generation", () => {
  it("derives date formats and drops duplicates", () => {
    expect(dateVariants("23/05/1990")).toEqual(["23051990", "230590", "19900523", "900523"]);
    expect(dateVariants("1990-05-23")).toEqual(["23051990", "230590", "19900523", "900523"]);
  });

  it("derives id variants without letter and without zeros", () => {
    expect(idVariants("01234567Z")).toContain("01234567Z");
    expect(idVariants("01234567Z")).toContain("01234567");
    expect(idVariants("01234567Z")).toContain("1234567");
  });

  it("computes the DNI/NIE check letter and appends it to a bare number", () => {
    expect(dniLetter("12345678")).toBe("Z");
    expect(dniLetter("X1234567")).toBe(dniLetter("01234567"));
    expect(dniLetter("123")).toBeNull();
    expect(idVariants("12345678")).toContain("12345678Z");
    expect(idVariants("12345678")).toContain("12345678z");
  });

  it("derives case variants of a word", () => {
    expect(caseVariants("miClave")).toEqual(["miClave", "miclave", "MICLAVE", "Miclave"]);
    expect(caseVariants("1234")).toEqual(["1234"]); // nothing to case-fold
  });

  it("yields words (with case variants), then ids, then dates, then a numeric sweep, de-duplicated", () => {
    const list = [...candidates({ words: ["abc", "abc"], ids: [], dates: [], numericDigits: 2 })];
    expect(list[0]).toBe("abc");
    expect(list.filter((x) => x === "abc")).toHaveLength(1);
    expect(list).toContain("ABC");
    expect(list).toContain("00");
    expect(list).toContain("99");
  });

  it("counts an upper bound that matches the numeric space", () => {
    // "ab" → ab, AB, Ab (lowercase dup dropped) = 3 variants, plus the 1000 numbers.
    expect(countCandidates({ words: ["ab"], ids: [], dates: [], numericDigits: 3 })).toBe(3 + 1000);
  });
});

describe("tryPassword against a real encrypted PDF", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    const bytes = await encrypted("verano24");
    expect(await tryPassword(bytes, "verano24")).toBe(true);
    expect(await tryPassword(bytes, "invierno")).toBe(false);
  });

  it("finds the password through the candidate loop and unlocks the file", async () => {
    const bytes = await encrypted("230590");
    let found: string | undefined;
    for (const pw of candidates({ words: [], ids: [], dates: ["23/05/1990"], numericDigits: 0 })) {
      if (await tryPassword(bytes, pw)) {
        found = pw;
        break;
      }
    }
    expect(found).toBe("230590");
    const plain = await unlock(bytes, found!);
    expect((await PDFDocument.load(plain)).isEncrypted).toBe(false);
  });
});

describe("extractHash", () => {
  it("builds a pdf2john $pdf$ line with the file's real parameters", async () => {
    const bytes = await encrypted("verano24");
    const h = await extractHash(bytes);
    expect(h).not.toBeNull();
    // pdf-lib encrypts as AES-256 R6 → hashcat mode 10700.
    expect(h!.v).toBe(5);
    expect(h!.r).toBe(6);
    expect(h!.mode).toBe(10700);
    // $pdf$V*R*length*P*encMeta*idLen*id*uLen*U*oLen*O — 12 fields after the tag.
    const parts = h!.hash.replace(/^\$pdf\$/, "").split("*");
    expect(parts.slice(0, 5)).toEqual(["5", "6", "256", expect.any(String), "1"]);
    expect(Number(parts[5])).toBe(16); // file ID is 16 bytes
    expect(parts[6]).toMatch(/^[0-9a-f]{32}$/);
    expect(Number(parts[7])).toBe(48); // R6 /U is 48 bytes
    expect(parts[8]).toMatch(/^[0-9a-f]{96}$/);
    expect(Number(parts[9])).toBe(48); // R6 /O is 48 bytes
    expect(Number(parts[3]) | 0).toBe(Number(parts[3])); // P is a signed 32-bit int
  });

  it("returns null for a PDF that isn't encrypted", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    expect(await extractHash(await doc.save())).toBeNull();
  });
});

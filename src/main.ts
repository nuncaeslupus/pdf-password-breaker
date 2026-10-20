import { countCandidates, extractHash, tryPassword, unlock, type Hints, type PdfHash } from "./crack";
import { HTML_KEYS, helpHtml, t, type Lang } from "./i18n";
import type { OutMsg, StartMsg } from "./worker";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("file");
const drop = $<HTMLElement>("drop");
const fileInfo = $<HTMLParagraphElement>("fileInfo");
const known = $<HTMLInputElement>("known");
const knownBox = $<HTMLFieldSetElement>("knownBox");
const knownLegend = $<HTMLElement>("knownLegend");
const knownHint = $<HTMLElement>("knownHint");
const recover = $<HTMLDetailsElement>("recover");
const gpu = $<HTMLDetailsElement>("gpu");
const runActions = $<HTMLElement>("runActions");
const chooser = $<HTMLFieldSetElement>("chooser");
const chooseKnow = $<HTMLButtonElement>("chooseKnow");
const chooseRecover = $<HTMLButtonElement>("chooseRecover");
const chooserNote = $<HTMLElement>("chooserNote");
const remember = $<HTMLFieldSetElement>("remember");
const brute = $<HTMLFieldSetElement>("brute");
const bruteChars = $<HTMLSelectElement>("bruteChars");
const bruteLen = $<HTMLSelectElement>("bruteLen");
const bruteCount = $<HTMLParagraphElement>("bruteCount");
const runBtn = $<HTMLButtonElement>("run");
const cancelBtn = $<HTMLButtonElement>("cancel");
const statusBox = $<HTMLElement>("status");
const statusText = $<HTMLParagraphElement>("statusText");
const barFill = $<HTMLElement>("barFill");
const eta = $<HTMLElement>("eta");
const result = $<HTMLElement>("result");
const hashOut = $<HTMLTextAreaElement>("hashOut");
const copyHash = $<HTMLButtonElement>("copyHash");
const copyMsg = $<HTMLElement>("copyMsg");
const hashcatHelp = $<HTMLElement>("hashcatHelp");

// ── language ───────────────────────────────────────────────────────────────
let lang: Lang = ((): Lang => {
  const saved = localStorage.getItem("lang");
  if (saved === "es" || saved === "en") return saved;
  return navigator.language.startsWith("en") ? "en" : "es";
})();

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t(lang, "title");
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    if (HTML_KEYS.has(key)) el.innerHTML = t(lang, key);
    else el.textContent = t(lang, key);
  });
  document.querySelectorAll<HTMLButtonElement>(".langs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  renderFileInfo();
  renderStatus();
  renderResult();
  renderGpu();
  renderBruteCount();
  renderMode();
}

// Nothing shows until a password-protected file is loaded. Then the chooser asks
// remove-vs-recover. Recovery searches one file, so with several files only the
// remove option is offered (recover disabled, with a note). Removal → the known
// box; recovery → the hints step + hashcat.
function renderMode() {
  const multi = docs.length > 1;
  const locked = docs.some((d) => d.locked);

  chooseRecover.disabled = multi;
  chooserNote.hidden = !(locked && multi);
  if (multi && locked) intent = "remove"; // only option with several files; preselect it

  chooser.hidden = !locked;
  chooseKnow.classList.toggle("active", intent === "remove");
  chooseRecover.classList.toggle("active", intent === "recover");

  const showRemove = locked && intent === "remove";
  const showRecover = locked && !multi && intent === "recover";
  knownBox.hidden = !showRemove;
  recover.hidden = !showRecover;
  gpu.hidden = !showRecover;
  runActions.hidden = !(showRemove || showRecover);

  knownLegend.textContent = t(lang, multi ? "batchLegend" : "removeLegend");
  knownHint.textContent = t(lang, multi ? "batchHint" : "removeHint");
  runBtn.textContent = t(lang, multi ? "batchRun" : showRecover ? "run" : "removeRun");
}

function renderBruteCount() {
  const n = bruteChars.value ? bruteChars.value.length ** Number(bruteLen.value) : 0;
  bruteCount.textContent = n ? t(lang, "bruteCount", { n: n.toLocaleString(lang) }) : "";
}

bruteChars.addEventListener("change", renderBruteCount);
bruteLen.addEventListener("change", renderBruteCount);

function renderGpu() {
  if (currentHash) {
    hashOut.value = currentHash.hash;
    copyHash.disabled = false;
    hashcatHelp.innerHTML = helpHtml(lang, currentHash);
  } else {
    hashOut.value = "";
    hashOut.placeholder = t(lang, "hashPlaceholder");
    copyHash.disabled = true;
    hashcatHelp.innerHTML = `<p class="hint"></p>`;
    hashcatHelp.querySelector("p")!.textContent = t(lang, "gpuNoFile");
  }
}

function setLang(next: Lang) {
  lang = next;
  localStorage.setItem("lang", next);
  applyLang();
}

document.querySelectorAll<HTMLButtonElement>(".langs button").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.lang as Lang)),
);

// ── render state (so a language switch re-translates what's on screen) ───────
let fileState: { name: string; locked: boolean; count?: number; lockedCount?: number } | null = null;
let statusState: { key: string; vars: Record<string, string | number>; tone: string } | null = null;
let resultState: { password: string; blobUrl: string | null } | null = null;
let currentHash: PdfHash | null = null;
let intent: "remove" | "recover" | null = null; // single-file: chosen in the chooser

chooseKnow.addEventListener("click", () => {
  intent = "remove";
  renderMode();
});
chooseRecover.addEventListener("click", () => {
  intent = "recover";
  renderMode();
});

function renderFileInfo() {
  if (!fileState) return;
  if (fileState.count && fileState.count > 1) {
    fileInfo.textContent = t(lang, "fileBatch", { n: fileState.count, locked: fileState.lockedCount! });
  } else {
    fileInfo.textContent = t(lang, fileState.locked ? "fileLocked" : "fileOpen", { name: fileState.name });
  }
  fileInfo.classList.toggle("locked", fileState.locked);
  fileInfo.classList.toggle("ok", !fileState.locked);
}

function setStatus(key: string, vars: Record<string, string | number>, tone: "info" | "ok" | "bad") {
  statusState = { key, vars, tone };
  renderStatus();
}

function renderStatus() {
  if (!statusState) return;
  statusText.textContent = t(lang, statusState.key, statusState.vars);
  statusText.classList.toggle("ok", statusState.tone === "ok");
  statusText.classList.toggle("bad", statusState.tone === "bad");
}

function renderResult() {
  if (!resultState) return;
  result.innerHTML = `<p class="found"><span class="found-label"></span> <code></code></p>`;
  result.querySelector(".found-label")!.textContent = t(lang, "passwordLabel");
  (result.querySelector("code") as HTMLElement).textContent = resultState.password;
  if (resultState.blobUrl) {
    const a = document.createElement("a");
    a.href = resultState.blobUrl;
    a.download = fileName.replace(/\.pdf$/i, "") + "-" + (lang === "en" ? "unlocked" : "sin-contrasena") + ".pdf";
    a.className = "primary download";
    a.textContent = t(lang, "download");
    result.appendChild(a);
  } else {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = t(lang, "unlockFail");
    result.appendChild(p);
  }
}

// ── ETA ──────────────────────────────────────────────────────────────────────
let startedAt = 0;

function fmtEta(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "";
  if (sec < 1) return "<1 s";
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// ── file handling ─────────────────────────────────────────────────────────────
let docs: { name: string; bytes: Uint8Array; locked: boolean }[] = [];
let pdfBytes: Uint8Array | null = null; // the single active doc, for the recovery path
let fileName = "documento.pdf";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

const lines = (id: string) =>
  $<HTMLTextAreaElement>(id)
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

async function loadFiles(files: FileList | File[]) {
  reset();
  intent = null;
  docs = [];
  for (const file of Array.from(files)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    docs.push({ name: file.name, bytes, locked: !(await tryPassword(bytes, "")) });
  }
  if (!docs.length) return;
  const lockedCount = docs.filter((d) => d.locked).length;
  const multi = docs.length > 1;
  pdfBytes = multi ? null : docs[0].bytes;
  fileName = docs[0].name;
  fileState = { name: docs[0].name, locked: lockedCount > 0, count: docs.length, lockedCount };
  fileInfo.hidden = false;
  renderFileInfo();

  knownBox.disabled = lockedCount === 0;
  remember.disabled = multi || lockedCount === 0; // hint search works on one file only
  brute.disabled = multi || lockedCount === 0;
  runBtn.disabled = lockedCount === 0;
  renderMode();

  if (!multi && docs[0].locked) void showHash(docs[0].bytes);
  else {
    currentHash = null;
    renderGpu();
  }
}

function reset() {
  statusBox.hidden = true;
  statusState = null;
  result.hidden = true;
  result.innerHTML = "";
  resultState = null;
}

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) void loadFiles(fileInput.files);
});
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  const f = e.dataTransfer?.files;
  if (f?.length) void loadFiles(f);
});

// ── search ────────────────────────────────────────────────────────────────────
runBtn.addEventListener("click", () => {
  // "I know the password" → remove it directly (no candidate search, no "found!").
  // Works for one file or several sharing a password.
  if (intent === "remove") {
    void bulkRemove();
    return;
  }
  if (!pdfBytes) return;
  const hints: Hints = {
    words: [known.value.trim(), ...lines("words")].filter(Boolean),
    ids: lines("ids"),
    dates: lines("dates"),
    sweepChars: bruteChars.value,
    sweepLen: Number(bruteLen.value),
  };
  const total = countCandidates(hints);
  reset();
  statusBox.hidden = false;
  if (total === 0) {
    barFill.style.width = "0%";
    setStatus("noCandidates", {}, "bad");
    return;
  }
  runBtn.hidden = true;
  cancelBtn.hidden = false;
  eta.textContent = "";
  barFill.style.width = "0%";
  startedAt = performance.now();
  setStatus("probing", { n: total.toLocaleString(lang) }, "info");
  worker.postMessage({ bytes: pdfBytes.slice(), hints } satisfies StartMsg);
  (worker as Worker & { _total?: number })._total = total;
});

known.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !runBtn.disabled) {
    e.preventDefault();
    runBtn.click();
  }
});

cancelBtn.addEventListener("click", () => {
  worker.postMessage("cancel");
  finish();
  setStatus("cancelled", {}, "info");
});

function finish() {
  runBtn.hidden = false;
  cancelBtn.hidden = true;
  eta.textContent = "";
}

worker.addEventListener("message", (e: MessageEvent<OutMsg>) => {
  const m = e.data;
  const total = (worker as Worker & { _total?: number })._total ?? 1;
  if (m.type === "progress") {
    barFill.style.width = `${Math.min(100, (m.tried / total) * 100)}%`;
    const elapsed = (performance.now() - startedAt) / 1000;
    const left = fmtEta(((total - m.tried) * elapsed) / m.tried);
    eta.textContent = left ? `~${left}` : "";
    setStatus("tried", { tried: m.tried.toLocaleString(lang), total: total.toLocaleString(lang), cur: m.current }, "info");
  } else if (m.type === "found") {
    barFill.style.width = "100%";
    finish();
    setStatus("found", { n: m.tried.toLocaleString(lang) }, "ok");
    void showFound(m.password);
  } else if (m.type === "exhausted") {
    barFill.style.width = "100%";
    finish();
    setStatus("exhausted", { n: m.tried.toLocaleString(lang) }, "bad");
  } else if (m.type === "error") {
    finish();
    setStatus("error", { msg: m.message }, "bad");
  }
});

async function showFound(password: string) {
  result.hidden = false;
  let blobUrl: string | null = null;
  if (pdfBytes) {
    try {
      const out = await unlock(pdfBytes, password);
      blobUrl = URL.createObjectURL(new Blob([out as BlobPart], { type: "application/pdf" }));
    } catch {
      blobUrl = null;
    }
  }
  resultState = { password, blobUrl };
  renderResult();
}

// Bulk: one shared known password across every loaded file. No search, just
// tryPassword + unlock per file. ponytail: results aren't re-translated on a
// language switch (one-shot action list), unlike the single-file renderResult.
const badSpan = (text: string) => {
  const s = document.createElement("span");
  s.className = "bad";
  s.textContent = text;
  return s;
};

async function bulkRemove() {
  const pw = known.value.trim();
  reset();
  statusBox.hidden = false;
  barFill.style.width = "0%";
  eta.textContent = "";
  if (!pw) {
    setStatus("bulkNeedPassword", {}, "bad");
    return;
  }
  result.hidden = false;
  result.innerHTML = "";
  const list = document.createElement("div");
  result.appendChild(list);
  let ok = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const row = document.createElement("p");
    row.className = "bulk-row";
    if (!d.locked) {
      row.textContent = `${d.name} — ${t(lang, "bulkAlreadyOpen")}`;
    } else if (await tryPassword(d.bytes, pw)) {
      try {
        const out = await unlock(d.bytes, pw);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([out as BlobPart], { type: "application/pdf" }));
        a.download = d.name.replace(/\.pdf$/i, "") + "-" + (lang === "en" ? "unlocked" : "sin-contrasena") + ".pdf";
        a.className = "primary download";
        a.textContent = t(lang, "download");
        row.textContent = `${d.name} — `;
        row.appendChild(a);
        ok++;
      } catch {
        row.append(`${d.name} — `, badSpan(t(lang, "bulkUnlockFail")));
      }
    } else {
      row.append(`${d.name} — `, badSpan(t(lang, "bulkWrong")));
    }
    list.appendChild(row);
    barFill.style.width = `${((i + 1) / docs.length) * 100}%`;
  }
  setStatus("bulkDone", { ok, n: docs.length }, ok ? "ok" : "bad");
}

// ── hashcat hash export ─────────────────────────────────────────────────────
async function showHash(bytes: Uint8Array) {
  copyMsg.textContent = "";
  currentHash = null;
  try {
    currentHash = await extractHash(bytes);
  } catch {
    // Non-standard encryption we can't read — the hint search above still works.
    currentHash = null;
  }
  renderGpu();
}

copyHash.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(hashOut.value);
    copyMsg.textContent = t(lang, "copied");
  } catch {
    hashOut.select();
    copyMsg.textContent = t(lang, "copyManual");
  }
});

applyLang();

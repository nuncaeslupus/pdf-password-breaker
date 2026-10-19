import { countCandidates, extractHash, tryPassword, unlock, type Hints, type PdfHash } from "./crack";
import { HTML_KEYS, helpHtml, t, type Lang } from "./i18n";
import type { OutMsg, StartMsg } from "./worker";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("file");
const drop = $<HTMLElement>("drop");
const fileInfo = $<HTMLParagraphElement>("fileInfo");
const known = $<HTMLInputElement>("known");
const knownBox = $<HTMLFieldSetElement>("knownBox");
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
let fileState: { name: string; locked: boolean } | null = null;
let statusState: { key: string; vars: Record<string, string | number>; tone: string } | null = null;
let resultState: { password: string; blobUrl: string | null } | null = null;
let currentHash: PdfHash | null = null;

function renderFileInfo() {
  if (!fileState) return;
  fileInfo.textContent = t(lang, fileState.locked ? "fileLocked" : "fileOpen", { name: fileState.name });
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
let pdfBytes: Uint8Array | null = null;
let fileName = "documento.pdf";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

const lines = (id: string) =>
  $<HTMLTextAreaElement>(id)
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

async function loadFile(file: File) {
  fileName = file.name;
  pdfBytes = new Uint8Array(await file.arrayBuffer());
  reset();
  const locked = !(await tryPassword(pdfBytes, ""));
  fileState = { name: file.name, locked };
  fileInfo.hidden = false;
  renderFileInfo();
  knownBox.disabled = !locked;
  remember.disabled = !locked;
  brute.disabled = !locked;
  runBtn.disabled = !locked;
  if (locked) void showHash(pdfBytes);
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
  if (fileInput.files?.[0]) void loadFile(fileInput.files[0]);
});
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  const f = e.dataTransfer?.files?.[0];
  if (f) void loadFile(f);
});

// ── search ────────────────────────────────────────────────────────────────────
runBtn.addEventListener("click", () => {
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

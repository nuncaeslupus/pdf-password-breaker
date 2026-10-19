import { countCandidates, extractHash, tryPassword, unlock, type Hints, type PdfHash } from "./crack";
import type { OutMsg, StartMsg } from "./worker";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("file");
const drop = $<HTMLElement>("drop");
const fileInfo = $<HTMLParagraphElement>("fileInfo");
const runBtn = $<HTMLButtonElement>("run");
const cancelBtn = $<HTMLButtonElement>("cancel");
const statusBox = $<HTMLElement>("status");
const statusText = $<HTMLParagraphElement>("statusText");
const barFill = $<HTMLElement>("barFill");
const eta = $<HTMLElement>("eta");
const result = $<HTMLElement>("result");
const gpu = $<HTMLElement>("gpu");
const hashOut = $<HTMLTextAreaElement>("hashOut");
const copyHash = $<HTMLButtonElement>("copyHash");
const copyMsg = $<HTMLElement>("copyMsg");
const hashcatHelp = $<HTMLElement>("hashcatHelp");

let startedAt = 0;

/** "45 s" / "3 min" / "1 h 12 min", or "" when it can't be estimated yet. */
function fmtEta(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "";
  if (sec < 1) return "<1 s";
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

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
  // A PDF that opens with an empty password isn't user-locked — nothing to recover.
  const locked = !(await tryPassword(pdfBytes, ""));
  fileInfo.hidden = false;
  if (locked) {
    fileInfo.textContent = `${file.name} · protegido con contraseña`;
    fileInfo.classList.remove("ok");
    runBtn.disabled = false;
    void showHash(pdfBytes);
  } else {
    fileInfo.textContent = `${file.name} · este PDF no pide contraseña para abrirse`;
    fileInfo.classList.add("ok");
    runBtn.disabled = true;
    gpu.hidden = true;
  }
}

/** The exact hashcat command lines for this file's encryption. */
function helpFor(h: PdfHash): string {
  const slow = h.mode >= 10600; // AES-256 is slow even on a GPU
  const speed = slow
    ? "Es cifrado AES-256: lento incluso en GPU, así que céntrate en máscaras cortas (fechas, PIN)."
    : "Es cifrado RC4/antiguo: muy rápido en GPU, millones de contraseñas por segundo.";
  const cmd = (a: string) => `<code>hashcat -m ${h.mode} hash.txt ${a}</code>`;
  return `
    <p>Tu PDF usa <strong>${h.modeLabel}</strong> → modo <code>-m ${h.mode}</code> de hashcat. ${speed}</p>
    <ol>
      <li>Pulsa <strong>Copiar hash</strong> y pégalo en un archivo de texto llamado <code>hash.txt</code>.</li>
      <li>Instala hashcat desde <a href="https://hashcat.net/hashcat/" target="_blank" rel="noopener">hashcat.net</a> (Windows, macOS o Linux).</li>
      <li>En una terminal, en la carpeta del <code>hash.txt</code>, prueba una de estas:</li>
    </ol>
    <ul>
      <li>Solo dígitos, 6 cifras (tipo PIN o fecha corta): ${cmd("-a 3 ?d?d?d?d?d?d")}</li>
      <li>Fecha completa ddmmaaaa (8 cifras): ${cmd("-a 3 ?d?d?d?d?d?d?d?d")}</li>
      <li>DNI de 8 cifras + letra: ${cmd("-a 3 ?d?d?d?d?d?d?d?d?u")}</li>
      <li>Con una lista de palabras (diccionario.txt): ${cmd("diccionario.txt")}</li>
    </ul>
    <p>Cuando termine, vuelve a verla con <code>hashcat -m ${h.mode} hash.txt --show</code>. En <code>-a 3</code>, <code>?d</code> = un dígito y <code>?u</code> = una mayúscula.</p>
  `;
}

async function showHash(bytes: Uint8Array) {
  gpu.hidden = true;
  copyMsg.textContent = "";
  try {
    const h = await extractHash(bytes);
    if (!h) return;
    hashOut.value = h.hash;
    hashcatHelp.innerHTML = helpFor(h);
    gpu.hidden = false;
  } catch {
    // Non-standard encryption we can't read — the hint-based search above still works.
  }
}

copyHash.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(hashOut.value);
    copyMsg.textContent = "Copiado.";
  } catch {
    hashOut.select();
    copyMsg.textContent = "Selecciónalo y copia con Ctrl+C.";
  }
});

function reset() {
  statusBox.hidden = true;
  result.hidden = true;
  result.innerHTML = "";
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

runBtn.addEventListener("click", () => {
  if (!pdfBytes) return;
  const hints: Hints = {
    words: lines("words"),
    ids: lines("ids"),
    dates: lines("dates"),
    numericDigits: Number($<HTMLSelectElement>("digits").value),
  };
  const total = countCandidates(hints);
  if (total === 0) {
    statusBox.hidden = false;
    barFill.style.width = "0%";
    statusText.textContent = "No hay candidatos: añade alguna pista o activa el barrido numérico.";
    return;
  }
  reset();
  statusBox.hidden = false;
  runBtn.hidden = true;
  cancelBtn.hidden = false;
  eta.textContent = "";
  startedAt = performance.now();
  statusText.textContent = `Probando ${total.toLocaleString("es")} candidato(s)…`;
  // Copy the bytes for the worker so the originals stay here for unlocking.
  worker.postMessage({ bytes: pdfBytes.slice(), hints } satisfies StartMsg);
  (worker as Worker & { _total?: number })._total = total;
});

cancelBtn.addEventListener("click", () => {
  worker.postMessage("cancel");
  finish("Búsqueda cancelada.");
});

function finish(msg: string) {
  runBtn.hidden = false;
  cancelBtn.hidden = true;
  eta.textContent = "";
  if (msg) statusText.textContent = msg;
}

worker.addEventListener("message", (e: MessageEvent<OutMsg>) => {
  const m = e.data;
  const total = (worker as Worker & { _total?: number })._total ?? 1;
  if (m.type === "progress") {
    barFill.style.width = `${Math.min(100, (m.tried / total) * 100)}%`;
    const elapsed = (performance.now() - startedAt) / 1000;
    const remaining = ((total - m.tried) * elapsed) / m.tried;
    const left = fmtEta(remaining);
    eta.textContent = left ? `~${left}` : "";
    statusText.textContent = `Probados ${m.tried.toLocaleString("es")} de ${total.toLocaleString("es")} · último: ${m.current}`;
  } else if (m.type === "found") {
    barFill.style.width = "100%";
    eta.textContent = "";
    finish(`Contraseña encontrada tras ${m.tried.toLocaleString("es")} intento(s).`);
    void showFound(m.password);
  } else if (m.type === "exhausted") {
    eta.textContent = "";
    barFill.style.width = "100%";
    finish(`Sin suerte: ninguno de los ${m.tried.toLocaleString("es")} candidatos abrió el PDF.`);
  } else if (m.type === "error") {
    finish(`Error: ${m.message}`);
  }
});

async function showFound(password: string) {
  result.hidden = false;
  result.innerHTML = `<p class="found">Contraseña: <code></code></p>`;
  (result.querySelector("code") as HTMLElement).textContent = password;
  if (!pdfBytes) return;
  try {
    const out = await unlock(pdfBytes, password);
    const url = URL.createObjectURL(new Blob([out as BlobPart], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, "") + "-sin-contrasena.pdf";
    a.className = "primary download";
    a.textContent = "Descargar PDF sin contraseña";
    result.appendChild(a);
  } catch {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No se pudo generar una copia sin contraseña, pero la contraseña de arriba es válida.";
    result.appendChild(p);
  }
}

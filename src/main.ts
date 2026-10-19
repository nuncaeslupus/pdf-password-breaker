import { countCandidates, tryPassword, unlock, type Hints } from "./crack";
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
const result = $<HTMLElement>("result");

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
  } else {
    fileInfo.textContent = `${file.name} · este PDF no pide contraseña para abrirse`;
    fileInfo.classList.add("ok");
    runBtn.disabled = true;
  }
}

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
  if (msg) statusText.textContent = msg;
}

worker.addEventListener("message", (e: MessageEvent<OutMsg>) => {
  const m = e.data;
  const total = (worker as Worker & { _total?: number })._total ?? 1;
  if (m.type === "progress") {
    barFill.style.width = `${Math.min(100, (m.tried / total) * 100)}%`;
    statusText.textContent = `Probados ${m.tried.toLocaleString("es")} de ${total.toLocaleString("es")} · último: ${m.current}`;
  } else if (m.type === "found") {
    barFill.style.width = "100%";
    finish(`Contraseña encontrada tras ${m.tried.toLocaleString("es")} intento(s).`);
    void showFound(m.password);
  } else if (m.type === "exhausted") {
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

import type { PdfHash } from "./crack";

export type Lang = "es" | "en";

type Dict = Record<string, string>;

/** Keys whose value is HTML (set via innerHTML); everything else is plain text. */
export const HTML_KEYS = new Set(["lede", "gpuIntro"]);

export const STRINGS: Record<Lang, Dict> = {
  es: {
    title: "Recuperar contraseña de un PDF",
    lede: "Prueba contraseñas sobre <strong>un PDF tuyo</strong> a partir de lo que ya conoces. Todo ocurre en tu navegador: el archivo <strong>no se sube a ningún sitio</strong>.",
    legend1: "1. El PDF",
    drop: "Arrastra el PDF aquí o haz clic para elegirlo",
    legend2: "2. Lo que recuerdas",
    wordsLabel: "Palabras probables",
    wordsHint: "Una por línea. Tal cual y en may./min./Capital.",
    idsLabel: "Números (DNI, cuenta, tel.)",
    idsHint: "Uno por línea. Con y sin letra de control y sin ceros.",
    datesLabel: "Fechas",
    datesHint: "Una por línea. En varios formatos.",
    sweepLabel: "Barrido numérico: probar todos los números de",
    sweepOff: "— (desactivado)",
    sweep3: "3 cifras",
    sweep4: "4 cifras (PIN)",
    sweep5: "5 cifras",
    sweep6: "6 cifras",
    sweepHint: "El barrido es lento: cada intento abre el PDF. Hasta 6 cifras es razonable; más allá, usa hashcat (paso 3).",
    run: "Buscar contraseña",
    cancel: "Cancelar",
    gpuSummary: "3. ¿Contraseña difícil? Úsala en tu GPU con hashcat",
    gpuIntro:
      "Si las pistas no bastan, tu tarjeta gráfica prueba millones de contraseñas por segundo con <strong>hashcat</strong> (un programa aparte, gratuito). Copia el «hash» de tu PDF y sigue los pasos. El PDF nunca sale de tu equipo.",
    hashLabel: "Hash de tu PDF",
    hashPlaceholder: "— carga un PDF para ver su hash —",
    gpuNoFile: "Carga un PDF arriba y aquí aparecerán su «hash» y los comandos exactos para su cifrado.",
    copyHash: "Copiar hash",
    footer: "Solo para documentos propios. Gratis, de código abierto y sin servidor.",
    source: "Código fuente",
    fileLocked: "{name} · protegido con contraseña",
    fileOpen: "{name} · este PDF no pide contraseña para abrirse",
    probing: "Probando {n} candidato(s)…",
    noCandidates: "No hay candidatos: añade alguna pista o activa el barrido numérico.",
    tried: "Probados {tried} de {total} · último: {cur}",
    found: "¡Contraseña encontrada tras {n} intento(s)!",
    exhausted: "Sin suerte: ninguno de los {n} candidatos abrió el PDF.",
    cancelled: "Búsqueda cancelada.",
    error: "Error: {msg}",
    passwordLabel: "Contraseña:",
    download: "Descargar PDF sin contraseña",
    unlockFail: "No se pudo generar una copia sin contraseña, pero la contraseña de arriba es válida.",
    copied: "Copiado.",
    copyManual: "Selecciónalo y copia con Ctrl+C.",
  },
  en: {
    title: "Recover a PDF password",
    lede: "Try passwords against <strong>a PDF of yours</strong> using what you already know. Everything runs in your browser: the file <strong>is never uploaded anywhere</strong>.",
    legend1: "1. The PDF",
    drop: "Drag your PDF here or click to choose it",
    legend2: "2. What you remember",
    wordsLabel: "Likely words",
    wordsHint: "One per line. As-is and in UPPER/lower/Capital.",
    idsLabel: "Numbers (ID, account, phone)",
    idsHint: "One per line. With and without check letter and zeros.",
    datesLabel: "Dates",
    datesHint: "One per line. In several formats.",
    sweepLabel: "Numeric sweep: try every number of",
    sweepOff: "— (off)",
    sweep3: "3 digits",
    sweep4: "4 digits (PIN)",
    sweep5: "5 digits",
    sweep6: "6 digits",
    sweepHint: "The sweep is slow: each try opens the PDF. Up to 6 digits is reasonable; beyond that, use hashcat (step 3).",
    run: "Find password",
    cancel: "Cancel",
    gpuSummary: "3. Hard password? Crack it on your GPU with hashcat",
    gpuIntro:
      "When hints aren't enough, your graphics card tries millions of passwords per second with <strong>hashcat</strong> (a separate, free program). Copy your PDF's hash and follow the steps. The PDF never leaves your machine.",
    hashLabel: "Your PDF's hash",
    hashPlaceholder: "— load a PDF to see its hash —",
    gpuNoFile: "Load a PDF above and its hash plus the exact commands for its encryption will appear here.",
    copyHash: "Copy hash",
    footer: "Only for your own documents. Free, open source, serverless.",
    source: "Source",
    fileLocked: "{name} · password-protected",
    fileOpen: "{name} · this PDF opens without a password",
    probing: "Trying {n} candidate(s)…",
    noCandidates: "No candidates: add a hint or turn on the numeric sweep.",
    tried: "Tried {tried} of {total} · last: {cur}",
    found: "Password found after {n} attempt(s)!",
    exhausted: "No luck: none of the {n} candidates opened the PDF.",
    cancelled: "Search cancelled.",
    error: "Error: {msg}",
    passwordLabel: "Password:",
    download: "Download unlocked PDF",
    unlockFail: "Couldn't build an unlocked copy, but the password above is valid.",
    copied: "Copied.",
    copyManual: "Select it and copy with Ctrl+C.",
  },
};

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** The step-by-step hashcat how-to for this file's encryption, in the chosen language. */
export function helpHtml(lang: Lang, h: PdfHash): string {
  const slow = h.mode >= 10600;
  const cmd = (a: string) => `<code>hashcat -m ${h.mode} hash.txt ${a}</code>`;
  if (lang === "en") {
    const speed = slow
      ? "It's AES-256: slow even on a GPU, so focus on short masks (dates, PIN)."
      : "It's RC4/legacy: very fast on a GPU, millions of passwords per second.";
    return `
      <p>Your PDF uses <strong>${h.modeLabel}</strong> → hashcat mode <code>-m ${h.mode}</code>. ${speed}</p>
      <ol>
        <li>Click <strong>Copy hash</strong> and paste it into a text file named <code>hash.txt</code>.</li>
        <li>Install hashcat from <a href="https://hashcat.net/hashcat/" target="_blank" rel="noopener">hashcat.net</a> (Windows, macOS or Linux).</li>
        <li>In a terminal, in the folder with <code>hash.txt</code>, try one of these:</li>
      </ol>
      <ul>
        <li>Digits only, 6 of them (PIN or short date): ${cmd("-a 3 ?d?d?d?d?d?d")}</li>
        <li>Full date ddmmyyyy (8 digits): ${cmd("-a 3 ?d?d?d?d?d?d?d?d")}</li>
        <li>Spanish ID: 8 digits + letter: ${cmd("-a 3 ?d?d?d?d?d?d?d?d?u")}</li>
        <li>With a wordlist (wordlist.txt): ${cmd("wordlist.txt")}</li>
      </ul>
      <p>When it finishes, read it back with <code>hashcat -m ${h.mode} hash.txt --show</code>. In <code>-a 3</code>, <code>?d</code> = a digit and <code>?u</code> = an uppercase letter.</p>
    `;
  }
  const speed = slow
    ? "Es cifrado AES-256: lento incluso en GPU, así que céntrate en máscaras cortas (fechas, PIN)."
    : "Es cifrado RC4/antiguo: muy rápido en GPU, millones de contraseñas por segundo.";
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
      <li>DNI: 8 cifras + letra: ${cmd("-a 3 ?d?d?d?d?d?d?d?d?u")}</li>
      <li>Con una lista de palabras (diccionario.txt): ${cmd("diccionario.txt")}</li>
    </ul>
    <p>Cuando termine, vuelve a verla con <code>hashcat -m ${h.mode} hash.txt --show</code>. En <code>-a 3</code>, <code>?d</code> = un dígito y <code>?u</code> = una mayúscula.</p>
  `;
}

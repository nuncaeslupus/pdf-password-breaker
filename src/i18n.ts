import type { PdfHash } from "./crack";

export type Lang = "es" | "en";

type Dict = Record<string, string>;

/** Keys whose value is HTML (set via innerHTML); everything else is plain text. */
export const HTML_KEYS = new Set(["lede", "gpuIntro"]);

export const STRINGS: Record<Lang, Dict> = {
  es: {
    title: "Recuperar y quitar contraseñas de PDF",
    lede: "Sube tus PDF. Con <strong>uno</strong>, recupera su contraseña con pistas o quítala si la conoces. Con <strong>varios que comparten contraseña</strong>, quítala de todos a la vez. Todo en tu navegador: <strong>nada se sube a ningún sitio</strong>.",
    legend1: "El PDF",
    drop: "Arrastra tus PDF aquí o haz clic para elegirlos",
    chooserLegend: "¿Qué quieres hacer?",
    chooseKnow: "Sé la contraseña y quiero quitarla",
    chooseRecover: "No sé la contraseña y quiero recuperarla",
    chooserMultiNote: "Con varios archivos solo se puede quitar una contraseña conocida; recuperarla es sólo para un archivo.",
    knownLabel: "Contraseña",
    removeLegend: "Quitar la contraseña",
    removeHint: "Escríbela y pulsa Quitar para descargar el PDF sin ella.",
    removeRun: "Quitar contraseña",
    batchLegend: "Quitar las contraseñas",
    batchHint: "Escribe la contraseña de uno y se probará en todos. Si quedan archivos, escribe otra y repite.",
    batchRun: "Quitar",
    recoverSummary: "Pistas para probar",
    rememberSub: "Lo que recuerdas",
    bruteSub: "Fuerza bruta",
    wordsLabel: "Palabras probables",
    wordsHint: "Una por línea. Se probará tal cual y en may./min./Capital.",
    idsLabel: "Números (DNI, cuenta, tel.)",
    idsHint: "Uno por línea. Se probará con y sin letra de control y sin ceros.",
    datesLabel: "Fechas",
    datesHint: "Una por línea. Se probará en varios formatos.",
    bruteIntro:
      "Prueba todas las combinaciones de un conjunto de caracteres y una longitud exacta. Práctico para un PIN o una clave muy corta.",
    bruteCharsLabel: "Caracteres",
    bruteOff: "— (desactivado)",
    bruteDigits: "dígitos (0-9)",
    bruteLower: "minúsculas (a-z)",
    bruteLowerDigits: "minúsculas + dígitos",
    bruteLetters: "may. + min. (a-z, A-Z)",
    bruteAll: "letras + dígitos",
    bruteLenLabel: "Longitud exacta",
    bruteCount: "≈ {n} combinaciones a probar.",
    bruteWarn:
      "Cada intento abre el PDF, así que el espacio crece muy rápido: con letras, 5 o más caracteres puede tardar horas. Para eso, usa hashcat (abajo).",
    run: "Buscar contraseña",
    cancel: "Cancelar",
    gpuSummary: "¿Contraseña difícil? Úsala en tu GPU con hashcat",
    gpuIntro:
      "Si las pistas no bastan, tu tarjeta gráfica prueba millones de contraseñas por segundo con <strong>hashcat</strong> (un programa aparte, gratuito). Copia el «hash» de tu PDF y sigue los pasos. El PDF nunca sale de tu equipo.",
    hashLabel: "Hash de tu PDF",
    hashPlaceholder: "— carga un PDF para ver su hash —",
    gpuNoFile: "Carga un PDF arriba y aquí aparecerán su «hash» y los comandos exactos para su cifrado.",
    copyHash: "Copiar hash",
    footer: "Solo para documentos propios. Gratis, de código abierto y sin servidor.",
    source: "Código fuente",
    fileLocked: "protegido con contraseña",
    fileOpen: "no pide contraseña para abrirse",
    fileBatch: "{n} PDF · {locked} protegido(s)",
    bulkNeedPassword: "Escribe arriba una contraseña.",
    bulkDone: "Listo: {ok} de {n} desbloqueados.",
    bulkRemaining: "Faltan {n}: escribe otra contraseña y pulsa Quitar.",
    bulkPending: "falta la contraseña",
    bulkAlreadyOpen: "ya se abre sin contraseña",
    probing: "Probando {n} candidato(s)…",
    noCandidates: "No hay candidatos: añade alguna pista o activa la fuerza bruta.",
    tried: "Probados {tried} de {total} · último: {cur}",
    found: "¡Contraseña encontrada tras {n} intento(s)!",
    exhausted: "Sin suerte: ninguno de los {n} candidatos abrió el PDF.",
    cancelled: "Búsqueda cancelada.",
    error: "Error: {msg}",
    passwordLabel: "Contraseña:",
    resultTitleOne: "Tu PDF descifrado",
    resultTitle: "Tus PDF descifrados",
    download: "Descargar PDF sin contraseña",
    unlockFail: "No se pudo generar una copia sin contraseña, pero la contraseña de arriba es válida.",
    copied: "Copiado.",
    copyManual: "Selecciónalo y copia con Ctrl+C.",
  },
  en: {
    title: "Recover and remove PDF passwords",
    lede: "Upload your PDFs. With <strong>one</strong>, recover its password with hints or remove it if you know it. With <strong>several that share a password</strong>, remove it from all at once. Everything in your browser: <strong>nothing is uploaded anywhere</strong>.",
    legend1: "The PDF",
    drop: "Drag your PDFs here or click to choose them",
    chooserLegend: "What do you want to do?",
    chooseKnow: "I know the password and want to remove it",
    chooseRecover: "I don't know the password and want to recover it",
    chooserMultiNote: "With several files you can only remove a known password; recovery is one file at a time.",
    knownLabel: "Password",
    removeLegend: "Remove the password",
    removeHint: "Type it and press Remove to download the PDF without it.",
    removeRun: "Remove password",
    batchLegend: "Remove the passwords",
    batchHint: "Type one file's password and it's tried on all. If any remain, enter another and repeat.",
    batchRun: "Remove",
    recoverSummary: "Hints to try",
    rememberSub: "What you remember",
    bruteSub: "Brute force",
    wordsLabel: "Likely words",
    wordsHint: "One per line. Tried as-is and in UPPER/lower/Capital.",
    idsLabel: "Numbers (ID, account, phone)",
    idsHint: "One per line. Tried with and without check letter and zeros.",
    datesLabel: "Dates",
    datesHint: "One per line. Tried in several formats.",
    bruteIntro:
      "Try every combination of a character set and an exact length. Handy for a PIN or a very short key.",
    bruteCharsLabel: "Characters",
    bruteOff: "— (off)",
    bruteDigits: "digits (0-9)",
    bruteLower: "lowercase (a-z)",
    bruteLowerDigits: "lowercase + digits",
    bruteLetters: "upper + lower (a-z, A-Z)",
    bruteAll: "letters + digits",
    bruteLenLabel: "Exact length",
    bruteCount: "≈ {n} combinations to try.",
    bruteWarn:
      "Each try opens the PDF, so the space grows fast: with letters, 5+ characters can take hours. For that, use hashcat (below).",
    run: "Find password",
    cancel: "Cancel",
    gpuSummary: "Hard password? Crack it on your GPU with hashcat",
    gpuIntro:
      "When hints aren't enough, your graphics card tries millions of passwords per second with <strong>hashcat</strong> (a separate, free program). Copy your PDF's hash and follow the steps. The PDF never leaves your machine.",
    hashLabel: "Your PDF's hash",
    hashPlaceholder: "— load a PDF to see its hash —",
    gpuNoFile: "Load a PDF above and its hash plus the exact commands for its encryption will appear here.",
    copyHash: "Copy hash",
    footer: "Only for your own documents. Free, open source, serverless.",
    source: "Source",
    fileLocked: "password-protected",
    fileOpen: "opens without a password",
    fileBatch: "{n} PDFs · {locked} protected",
    bulkNeedPassword: "Type a password above.",
    bulkDone: "Done: {ok} of {n} unlocked.",
    bulkRemaining: "{n} left: enter another password and press Remove.",
    bulkPending: "still needs a password",
    bulkAlreadyOpen: "already opens without a password",
    probing: "Trying {n} candidate(s)…",
    noCandidates: "No candidates: add a hint or turn on brute force.",
    tried: "Tried {tried} of {total} · last: {cur}",
    found: "Password found after {n} attempt(s)!",
    exhausted: "No luck: none of the {n} candidates opened the PDF.",
    cancelled: "Search cancelled.",
    error: "Error: {msg}",
    passwordLabel: "Password:",
    resultTitleOne: "Your decoded PDF",
    resultTitle: "Your decoded PDFs",
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
      <div class="callout"><span class="callout-tag">Info</span><p>Your PDF uses <strong>${h.modeLabel}</strong> → hashcat mode <code>-m ${h.mode}</code>. ${speed}</p></div>
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
    <div class="callout"><span class="callout-tag">Info</span><p>Tu PDF usa <strong>${h.modeLabel}</strong> → modo <code>-m ${h.mode}</code> de hashcat. ${speed}</p></div>
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

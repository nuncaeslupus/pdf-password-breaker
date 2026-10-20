import { candidates, tryPassword, type Hints } from "./crack";

export interface StartMsg {
  bytes: Uint8Array;
  hints: Hints;
}

export type OutMsg =
  | { type: "progress"; tried: number; current: string }
  | { type: "found"; password: string; tried: number }
  | { type: "exhausted"; tried: number }
  | { type: "error"; message: string };

let cancelled = false;

self.onmessage = async (e: MessageEvent<StartMsg | "cancel">) => {
  if (e.data === "cancel") {
    cancelled = true;
    return;
  }
  cancelled = false;
  const { bytes, hints } = e.data;
  const post = (m: OutMsg) => self.postMessage(m);
  let tried = 0;
  try {
    for (const pw of candidates(hints)) {
      if (cancelled) return;
      tried++;
      if (await tryPassword(bytes, pw)) {
        post({ type: "found", password: pw, tried });
        return;
      }
      // Report every 25 so the UI shows progress without flooding postMessage.
      // tryPassword resolves synchronously, so the loop only drains microtasks;
      // yield a macrotask here so a queued "cancel" message actually gets delivered.
      if (tried % 25 === 0) {
        post({ type: "progress", tried, current: pw });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    post({ type: "exhausted", tried });
  } catch (err) {
    post({ type: "error", message: (err as Error).message });
  }
};

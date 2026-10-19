/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// Nothing leaves the page: the PDF is read and tested entirely in the worker.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export default defineConfig({
  // Relative paths so it works under any GitHub Pages subpath or opened locally.
  base: "./",
  plugins: [
    {
      name: "csp",
      apply: "build",
      transformIndexHtml: () => [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
          injectTo: "head",
        },
      ],
    },
  ],
  test: { environment: "node" },
});

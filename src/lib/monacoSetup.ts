import { loader } from "@monaco-editor/react";

const MONACO_VERSION = "0.55.1";

let configured = false;

/** Serve Monaco from jsDelivr (long-cache CDN) instead of bundling the full editor. */
export function configureMonacoLoader(): void {
  if (configured || typeof window === "undefined") return;
  configured = true;
  loader.config({
    paths: {
      vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`,
    },
  });
}

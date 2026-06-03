import { getSession } from "@/lib/auth";
import type { EditorMode } from "@/lib/blockly/types";

const BASE_KEY = "ftc-hub-challenge-code-v1";

export interface CodeDraft {
  /** OnBot Java editor content (starter or hand-written — not block output). */
  code: string;
  updatedAt: string;
  editorMode?: EditorMode;
  blockXml?: string;
  /** Blockly → Java output; used for grading in Blocks mode only. */
  generatedCode?: string;
}

/** Java shown in OnBot Java mode — never the hidden block translation. */
export function resolveJavaEditorCode(
  draft: CodeDraft | null,
  starterCode: string
): string {
  if (!draft?.code) return starterCode;
  if (draft.editorMode === "java") return draft.code;

  if (draft.editorMode === "blocks") {
    const generated = draft.generatedCode?.trim() ?? "";
    const saved = draft.code.trim();
    if (generated && saved === generated) return starterCode;
    // Older drafts stored Blockly output in `code` before `generatedCode` existed
    if (!generated && saved !== starterCode.trim()) return starterCode;
    if (saved === starterCode.trim()) return starterCode;
    return draft.code;
  }

  if (
    draft.generatedCode &&
    draft.code.trim() === draft.generatedCode.trim()
  ) {
    return starterCode;
  }
  if (draft.code.trim() !== starterCode.trim()) return draft.code;
  return starterCode;
}

type DraftMap = Record<string, CodeDraft>;

function storageKey(): string {
  try {
    const session = getSession();
    if (!session) return `${BASE_KEY}:guest`;
    return `${BASE_KEY}:${session.id}`;
  } catch {
    return `${BASE_KEY}:guest`;
  }
}

function readMap(): DraftMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? "{}") as DraftMap;
  } catch {
    return {};
  }
}

function writeMap(map: DraftMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(map));
  } catch {
    // Ignore quota / private-browsing errors
  }
}

export function readCodeDraft(challengeId: number): CodeDraft | null {
  const draft = readMap()[String(challengeId)];
  return draft?.code ? draft : null;
}

export function saveCodeDraft(
  challengeId: number,
  code: string,
  extras?: {
    editorMode?: EditorMode;
    blockXml?: string;
    generatedCode?: string;
  }
): void {
  const map = readMap();
  const prev = map[String(challengeId)];
  map[String(challengeId)] = {
    code,
    updatedAt: new Date().toISOString(),
    editorMode: extras?.editorMode ?? prev?.editorMode,
    blockXml: extras?.blockXml ?? prev?.blockXml,
    generatedCode: extras?.generatedCode ?? prev?.generatedCode,
  };
  writeMap(map);
}

export function clearCodeDraft(challengeId: number): void {
  const map = readMap();
  delete map[String(challengeId)];
  writeMap(map);
}

import { getSession } from "@/lib/auth";
import type { EditorMode } from "@/lib/blockly/types";

const BASE_KEY = "ftc-hub-challenge-code-v1";

export interface CodeDraft {
  code: string;
  updatedAt: string;
  editorMode?: EditorMode;
  blockXml?: string;
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
  extras?: { editorMode?: EditorMode; blockXml?: string }
): void {
  const map = readMap();
  const prev = map[String(challengeId)];
  map[String(challengeId)] = {
    code,
    updatedAt: new Date().toISOString(),
    editorMode: extras?.editorMode ?? prev?.editorMode,
    blockXml: extras?.blockXml ?? prev?.blockXml,
  };
  writeMap(map);
}

export function clearCodeDraft(challengeId: number): void {
  const map = readMap();
  delete map[String(challengeId)];
  writeMap(map);
}

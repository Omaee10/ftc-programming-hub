import { getSession } from "@/lib/auth";

const BASE_KEY = "ftc-hub-challenge-code-v1";

export interface CodeDraft {
  code: string;
  updatedAt: string;
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

export function saveCodeDraft(challengeId: number, code: string): void {
  const map = readMap();
  map[String(challengeId)] = {
    code,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}

export function clearCodeDraft(challengeId: number): void {
  const map = readMap();
  delete map[String(challengeId)];
  writeMap(map);
}

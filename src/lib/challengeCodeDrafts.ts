import { getSession } from "@/lib/auth";
import {
  CODE_DRAFT_BASE_KEY,
  GUEST_DRAFT_OWNER,
  readDraftMap,
  writeDraftMap,
  type DraftMap,
} from "@/lib/draftStorage";

export interface CodeDraft {
  code: string;
  updatedAt: string;
}

/** Owner id for the active session — drafts are per session id, like progress. */
function ownerId(): string {
  try {
    return getSession()?.id ?? GUEST_DRAFT_OWNER;
  } catch {
    return GUEST_DRAFT_OWNER;
  }
}

function readMap(): DraftMap<CodeDraft> {
  return readDraftMap<CodeDraft>(CODE_DRAFT_BASE_KEY, ownerId());
}

function writeMap(map: DraftMap<CodeDraft>): void {
  writeDraftMap(CODE_DRAFT_BASE_KEY, ownerId(), map);
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

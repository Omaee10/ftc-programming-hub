/**
 * localStorage persistence for the Blockly ("FTC Blocks") workspace state.
 *
 * Mirrors {@link ./challengeCodeDrafts} but stores serialized Blockly JSON under
 * a separate key so the Blocks editor and the Java editor keep fully independent
 * drafts per challenge. Logged-in students also sync blocks to Supabase via
 * {@link ../hooks/useSupabaseProgress}; local drafts remain the offline fallback.
 */

import { getSession } from "@/lib/auth";

const BASE_KEY = "ftc-hub-challenge-blocks-v1";

export type BlockState = Record<string, unknown>;

export interface BlockDraft {
  state: BlockState;
  updatedAt: string;
}

type DraftMap = Record<string, BlockDraft>;

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

export function readBlockDraft(challengeId: number): BlockDraft | null {
  const draft = readMap()[String(challengeId)];
  return draft?.state ? draft : null;
}

export function saveBlockDraft(challengeId: number, state: BlockState): void {
  const map = readMap();
  map[String(challengeId)] = {
    state,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}

export function clearBlockDraft(challengeId: number): void {
  const map = readMap();
  delete map[String(challengeId)];
  writeMap(map);
}

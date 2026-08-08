/**
 * localStorage persistence for the Blockly ("FTC Blocks") workspace state.
 *
 * Mirrors {@link ./challengeCodeDrafts} but stores serialized Blockly JSON under
 * a separate key so the Blocks editor and the Java editor keep fully independent
 * drafts per challenge. Logged-in students also sync blocks to Supabase via
 * {@link ../hooks/useSupabaseProgress}; local drafts remain the offline fallback.
 */

import { getSession } from "@/lib/auth";
import {
  BLOCK_DRAFT_BASE_KEY,
  GUEST_DRAFT_OWNER,
  readDraftMap,
  writeDraftMap,
  type DraftMap,
} from "@/lib/draftStorage";

export type BlockState = Record<string, unknown>;

export interface BlockDraft {
  state: BlockState;
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

function readMap(): DraftMap<BlockDraft> {
  return readDraftMap<BlockDraft>(BLOCK_DRAFT_BASE_KEY, ownerId());
}

function writeMap(map: DraftMap<BlockDraft>): void {
  writeDraftMap(BLOCK_DRAFT_BASE_KEY, ownerId(), map);
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

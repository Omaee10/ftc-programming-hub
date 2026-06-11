import type { WorkspaceState } from "@/data/blockChallenges";
import {
  readBlockDraft,
  type BlockState,
} from "@/lib/challengeBlockDrafts";
import { readCodeDraft } from "@/lib/challengeCodeDrafts";

/** Pick the newest Java draft between localStorage and a cloud snapshot. */
export function chooseSavedCode(
  challengeId: number,
  starterCode: string,
  cloudCode: string | null,
  cloudUpdatedAt: string | null
): string {
  const local = readCodeDraft(challengeId);
  if (cloudCode && local) {
    const localTs = Date.parse(local.updatedAt);
    const cloudTs = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : 0;
    return cloudTs >= localTs ? cloudCode : local.code;
  }
  if (cloudCode) return cloudCode;
  if (local) return local.code;
  return starterCode;
}

/** Pick the newest Blocks draft between localStorage and a cloud snapshot. */
export function chooseSavedBlocks(
  challengeId: number,
  starter: WorkspaceState,
  cloudBlocks: BlockState | null,
  cloudUpdatedAt: string | null
): WorkspaceState {
  const local = readBlockDraft(challengeId);
  if (cloudBlocks && local) {
    const localTs = Date.parse(local.updatedAt);
    const cloudTs = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : 0;
    return (cloudTs >= localTs ? cloudBlocks : local.state) as WorkspaceState;
  }
  if (cloudBlocks) return cloudBlocks as WorkspaceState;
  if (local) return local.state as WorkspaceState;
  return starter;
}

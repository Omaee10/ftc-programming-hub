import type { Challenge } from "@/data/challenges";
import { isLegacyBlockXml } from "@/data/blockStarters";
import type { CodeDraft } from "@/lib/challengeCodeDrafts";
import type { EditorMode } from "@/lib/blockly/types";

/**
 * Pick Java vs Blocks on open. Beginner + blocks-capable challenges default to
 * Blocks unless the student has meaningful Java draft work or saved block XML.
 */
export function resolveEditorModeForChallenge(
  challenge: Challenge,
  draft: CodeDraft | null,
  starterCode: string
): EditorMode {
  if (challenge.blocksSupport === "java-only") return "java";

  if (draft?.blockXml && !isLegacyBlockXml(draft.blockXml)) {
    return "blocks";
  }
  if (draft?.editorMode === "blocks") return "blocks";

  const hasJavaEdits =
    !!draft?.code &&
    draft.code.trim() !== starterCode.trim() &&
    draft.editorMode !== "blocks";

  if (hasJavaEdits) return "java";

  if (challenge.blocksSupport === "full" && challenge.difficulty === "Beginner") {
    return "blocks";
  }

  return draft?.editorMode ?? "java";
}

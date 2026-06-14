import type { BlockChallengeConfig } from "@/data/blockChallenges";
import {
  PLAYGROUND_JAVA_FRAME,
  PLAYGROUND_STARTER_BLOCKS,
} from "@/data/playgroundDefaults";
import { FULL_TOOLBOX } from "@/lib/blockly/ftcBlocks";

function sanitizeJavaClassName(title: string, id: number): string {
  let name = title.replace(/[^a-zA-Z0-9_]/g, "");
  if (!name || !/^[A-Za-z_]/.test(name)) {
    name = `Challenge${id}`;
  }
  if (/^\d/.test(name)) {
    name = `C${name}`;
  }
  return `${name}Blocks`.slice(0, 40);
}

/** Generic Blocks scaffold for mentor-authored challenges (id >= 1000). */
export function buildCustomBlockConfig(
  id: number,
  title: string
): BlockChallengeConfig {
  const safeTitle = title.replace(/"/g, '\\"');
  const className = sanitizeJavaClassName(title, id);

  return {
    toolbox: FULL_TOOLBOX,
    starter: PLAYGROUND_STARTER_BLOCKS,
    frame: {
      className,
      annotation: `@TeleOp(name = "${safeTitle} (Blocks)", group = "Class Challenge")`,
      imports: PLAYGROUND_JAVA_FRAME.imports,
    },
  };
}

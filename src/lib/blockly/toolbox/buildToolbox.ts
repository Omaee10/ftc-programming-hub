import type { Challenge } from "@/data/challenges";
import { FTC_BLOCK_TYPES } from "@/lib/blockly/toolbox/blockCategories";
import {
  getAllowedCategories,
  getBlockedBlockTypes,
} from "@/lib/blockly/toolbox/challengeBlockAllowlist";

export interface ToolboxDefinition {
  kind: "categoryToolbox";
  contents: ToolboxCategory[];
}

interface ToolboxCategory {
  kind: string;
  name: string;
  colour?: string;
  contents?: { kind: string; type?: string; custom?: string }[];
  custom?: string;
}

function blockEntry(type: string): { kind: "block"; type: string } {
  return { kind: "block", type };
}

function filterBlocks(types: readonly string[], blocked: Set<string>): string[] {
  return types.filter((t) => !blocked.has(t));
}

export function buildToolbox(challenge: Challenge): ToolboxDefinition {
  const allowed = getAllowedCategories(challenge);
  const blocked = getBlockedBlockTypes(challenge);
  const contents: ToolboxCategory[] = [];

  if (allowed.has("linearOpMode")) {
    contents.push({
      kind: "category",
      name: "LinearOpMode",
      colour: "#995ba5",
      contents: filterBlocks(FTC_BLOCK_TYPES.linearOpMode, blocked).map(blockEntry),
    });
  }

  if (allowed.has("gamepad")) {
    contents.push({
      kind: "category",
      name: "Gamepad",
      colour: "#cf8b49",
      contents: filterBlocks(FTC_BLOCK_TYPES.gamepad, blocked).map(blockEntry),
    });
  }

  if (allowed.has("actuators")) {
    const actuatorBlocks = filterBlocks(
      [
        ...(allowed.has("dcMotor") ? FTC_BLOCK_TYPES.dcMotor : []),
        ...(allowed.has("servo") ? FTC_BLOCK_TYPES.servo : []),
      ],
      blocked
    );
    if (actuatorBlocks.length) {
      contents.push({
        kind: "category",
        name: "Actuators",
        colour: "#5ba55b",
        contents: actuatorBlocks.map(blockEntry),
      });
    }
  }

  if (allowed.has("sensors")) {
    contents.push({
      kind: "category",
      name: "Sensors",
      colour: "#cf5749",
      contents: filterBlocks(FTC_BLOCK_TYPES.sensors, blocked).map(blockEntry),
    });
  }

  if (allowed.has("utilities")) {
    contents.push({
      kind: "category",
      name: "Utilities",
      colour: "#5ba5c6",
      contents: [
        blockEntry("ftc_call_telemetry_add_data"),
        blockEntry("ftc_call_telemetry_update"),
        blockEntry("ftc_elapsed_time_new"),
        blockEntry("ftc_elapsed_time_reset"),
        blockEntry("ftc_elapsed_time_seconds"),
      ],
    });
  }

  if (allowed.has("loops")) {
    contents.push({
      kind: "category",
      name: "Loops",
      colour: "#5ba55b",
      contents: filterBlocks(FTC_BLOCK_TYPES.loops, blocked).map(blockEntry),
    });
  }

  if (allowed.has("logic")) {
    contents.push({
      kind: "category",
      name: "Logic",
      colour: "#5b80a5",
      contents: filterBlocks(FTC_BLOCK_TYPES.logic, blocked).map(blockEntry),
    });
  }

  if (allowed.has("math")) {
    contents.push({
      kind: "category",
      name: "Math",
      colour: "#5b67a5",
      contents: filterBlocks(FTC_BLOCK_TYPES.math, blocked).map(blockEntry),
    });
  }

  contents.push({
    kind: "category",
    name: "Variables",
    colour: "#a55b80",
    custom: "VARIABLE",
  });

  return { kind: "categoryToolbox", contents };
}

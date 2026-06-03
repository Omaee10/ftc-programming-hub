import * as Blockly from "blockly/core";
import { blocks as blocklyLibraryBlocks } from "blockly/blocks";
import { registerFtcPrimitiveBlocks } from "@/lib/blockly/blocks/ftcPrimitives";
import { initBlocklyMessages } from "@/lib/blockly/initBlocklyMessages";

let registered = false;

/** Register Blockly built-ins (logic, loops, math, procedures, variables) + FTC primitives. */
export function registerAllBlocks(): void {
  if (registered) return;
  registered = true;

  initBlocklyMessages();
  Blockly.common.defineBlocks(blocklyLibraryBlocks);
  registerFtcPrimitiveBlocks();
}

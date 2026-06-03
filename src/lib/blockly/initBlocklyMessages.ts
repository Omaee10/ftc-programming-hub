import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";

let loaded = false;

/** Load Blockly.Msg strings required for built-in block templates (variables, procedures, etc.). */
export function initBlocklyMessages(): void {
  if (loaded) return;
  loaded = true;
  Object.assign(Blockly.Msg, En);
}

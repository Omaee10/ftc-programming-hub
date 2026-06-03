import * as Blockly from "blockly/core";
import {
  getBlockStarterXml,
  isLegacyBlockXml,
} from "@/data/blockStarters";

export function workspaceToXml(workspace: Blockly.Workspace): string {
  return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
}

export function loadXmlIntoWorkspace(
  workspace: Blockly.Workspace,
  xml: string,
  challengeId?: number
): boolean {
  workspace.clear();
  if (!xml.trim()) return false;

  let toLoad = xml;
  let migrated = false;
  if (isLegacyBlockXml(xml) && challengeId != null) {
    toLoad = getBlockStarterXml(challengeId);
    migrated = true;
  }

  try {
    const dom = Blockly.utils.xml.textToDom(toLoad);
    Blockly.Xml.domToWorkspace(dom, workspace);
    return migrated;
  } catch {
    if (challengeId != null) {
      try {
        const fallback = Blockly.utils.xml.textToDom(
          getBlockStarterXml(challengeId)
        );
        Blockly.Xml.domToWorkspace(fallback, workspace);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

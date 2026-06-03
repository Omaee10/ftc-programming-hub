import * as Blockly from "blockly/core";

export function workspaceToXml(workspace: Blockly.Workspace): string {
  return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
}

export function loadXmlIntoWorkspace(
  workspace: Blockly.Workspace,
  xml: string
): void {
  workspace.clear();
  if (!xml.trim()) return;
  try {
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, workspace);
  } catch {
    // Corrupt draft — leave empty
  }
}

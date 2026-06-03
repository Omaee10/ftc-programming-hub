/**
 * Smoke tests: FTC-style Blockly → Java source.
 * Run: npm run test:blockly
 */
import { JSDOM } from "jsdom";
import * as Blockly from "blockly/core";
import { initBlocklyOnce, generateJavaFromWorkspace } from "../src/lib/blockly/generators/javaGenerator";
import { getBlockStarterXml } from "../src/data/blockStarters";
import type { BlocklyChallengeMeta } from "../src/lib/blockly/types";

const win = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});
(globalThis as unknown as { window: typeof win.window }).window = win.window;
globalThis.document = win.document;
globalThis.DOMParser = win.DOMParser;
globalThis.XMLSerializer = win.XMLSerializer;
globalThis.HTMLElement = win.HTMLElement;
globalThis.SVGElement = win.SVGElement;
globalThis.Element = win.Element;
globalThis.Node = win.Node;
win.requestAnimationFrame =
  win.requestAnimationFrame?.bind(win) ??
  ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number);
win.cancelAnimationFrame =
  win.cancelAnimationFrame?.bind(win) ?? ((id: number) => clearTimeout(id));

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const meta: BlocklyChallengeMeta = {
  challengeId: 1,
  title: "Basic TeleOp",
  className: "Challenge1_BasicTeleOp",
  opModeName: "Basic TeleOp",
  isAutonomous: false,
  tags: ["TeleOp", "Motors", "Gamepad"],
  difficulty: "Beginner",
};

initBlocklyOnce();

const workspace = new Blockly.Workspace(new Blockly.Options({ sounds: false }));

const xml1 = getBlockStarterXml(1);
Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml1), workspace);
const java1 = generateJavaFromWorkspace(workspace, meta);

assert(java1.includes("extends LinearOpMode"), "extends LinearOpMode");
assert(java1.includes("waitForStart()"), "waitForStart");
assert(java1.includes("opModeIsActive()"), "opModeIsActive");
assert(java1.includes("-gamepad1.left_stick_y"), "negated stick");
assert(java1.includes('hardwareMap.get(DcMotor.class, "left_motor")'), "hw name");
assert(java1.includes("procedures") === false, "no procedures in output");
assert(
  workspace.getTopBlocks(true).some(
    (b) =>
      b.type === "procedures_defnoreturn" &&
      b.getFieldValue("NAME") === "runOpMode"
  ),
  "runOpMode hat present"
);

workspace.clear();
const xml2 = getBlockStarterXml(2);
Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml2), workspace);
const java2 = generateJavaFromWorkspace(workspace, {
  ...meta,
  challengeId: 2,
  className: "Challenge2_Encoder",
  isAutonomous: true,
});

assert(java2.includes("STOP_AND_RESET_ENCODER"), "encoder reset");
assert(java2.includes("setTargetPosition"), "setTargetPosition");
assert(
  java2.indexOf("setTargetPosition") < java2.indexOf("RUN_TO_POSITION"),
  "target before mode"
);
assert(java2.includes("isBusy()"), "isBusy wait");

workspace.clear();
console.log("OK: FTC-style blockly generator smoke tests passed");

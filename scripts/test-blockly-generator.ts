/**
 * Smoke tests: Blockly workspace XML → Java source.
 * Run: npx tsx scripts/test-blockly-generator.ts
 */
import { JSDOM } from "jsdom";
import * as Blockly from "blockly/core";
import { registerFtcBlocks } from "../src/lib/blockly/blocks/ftcBlocks";
import {
  generateJavaFromWorkspace,
  initBlocklyOnce,
} from "../src/lib/blockly/generators/javaGenerator";
import { getBlockStarterXml } from "../src/data/blockStarters";
import type { BlocklyChallengeMeta } from "../src/lib/blockly/types";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});
const win = dom.window;
(globalThis as unknown as { window: typeof win }).window = win;
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
registerFtcBlocks();

const workspace = new Blockly.Workspace(new Blockly.Options({ sounds: false }));

const xml = getBlockStarterXml(1);
const domXml = Blockly.utils.xml.textToDom(xml);
Blockly.Xml.domToWorkspace(domXml, workspace);

const java = generateJavaFromWorkspace(workspace, meta);

assert(java.includes("extends LinearOpMode"), "extends LinearOpMode");
assert(java.includes("waitForStart()"), "waitForStart");
assert(java.includes("opModeIsActive()"), "opModeIsActive loop");
assert(java.includes("-gamepad1.left_stick_y"), "negated stick");
assert(java.includes("hardwareMap.get(DcMotor.class, \"left_motor\")"), "hw name");
assert(java.includes("setPower"), "setPower");

const xml2 = getBlockStarterXml(2);
workspace.clear();
Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml2), workspace);
const java2 = generateJavaFromWorkspace(workspace, {
  ...meta,
  challengeId: 2,
  className: "Challenge2_EncoderBasics",
  isAutonomous: true,
  tags: ["Encoders", "Autonomous"],
});

assert(java2.includes("STOP_AND_RESET_ENCODER"), "encoder reset");
assert(java2.includes("setTargetPosition"), "setTargetPosition");
assert(java2.indexOf("setTargetPosition") < java2.indexOf("RUN_TO_POSITION"), "target before mode");
assert(java2.includes("isBusy()"), "isBusy wait");

workspace.clear();
console.log("OK: blockly generator smoke tests passed");

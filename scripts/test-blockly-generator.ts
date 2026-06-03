/**
 * Smoke tests: FTC-style Blockly → Java source.
 * Run: npm run test:blockly
 */
import { JSDOM } from "jsdom";
import * as Blockly from "blockly/core";
import { challenges } from "../src/data/challenges";
import { initBlocklyOnce, generateJavaFromWorkspace } from "../src/lib/blockly/generators/javaGenerator";
import { getBlockStarterXml } from "../src/data/blockStarters";
import { configureDeviceFieldsForChallenge } from "../src/lib/blockly/blocks/deviceFields";
import { challengeToBlocklyMeta } from "../src/lib/blockly/types";
import type { StarterArchetype } from "../src/data/challengeBlocksMeta";

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

function loadAndGenerate(challengeId: number): string {
  const challenge = challenges.find((c) => c.id === challengeId);
  assert(!!challenge, `challenge ${challengeId} exists`);
  configureDeviceFieldsForChallenge(challengeId);
  const workspace = new Blockly.Workspace(new Blockly.Options({ sounds: false }));
  const xml = getBlockStarterXml(challengeId);
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
  const java = generateJavaFromWorkspace(
    workspace,
    challengeToBlocklyMeta(challenge!)
  );
  workspace.clear();
  return java;
}

initBlocklyOnce();

const java1 = loadAndGenerate(1);
assert(java1.includes("extends LinearOpMode"), "ch1 extends LinearOpMode");
assert(java1.includes("waitForStart()"), "ch1 waitForStart");
assert(java1.includes("-gamepad1.left_stick_y"), "ch1 negated stick");

const java2 = loadAndGenerate(2);
assert(java2.includes("STOP_AND_RESET_ENCODER"), "ch2 encoder reset");
assert(
  java2.indexOf("setTargetPosition") < java2.indexOf("RUN_TO_POSITION"),
  "ch2 target before mode"
);

const java6 = loadAndGenerate(6);
assert(java6.includes("left_drive"), "ch6 tank motors");
assert(java6.includes("right_stick_y"), "ch6 right stick");

const java16 = loadAndGenerate(16);
assert(java16.includes("TouchSensor"), "ch16 touch sensor");
assert(java16.includes("touch_sensor"), "ch16 touch hw name");

const java22 = loadAndGenerate(22);
assert(java22.includes("DcMotorEx"), "ch22 motor ex");
assert(java22.includes("setVelocity"), "ch22 velocity");

// Every full-support challenge starter must generate valid skeleton
const fullIds = challenges
  .filter((c) => c.blocksSupport === "full")
  .map((c) => c.id);

for (const id of fullIds) {
  const java = loadAndGenerate(id);
  assert(java.includes("extends LinearOpMode"), `ch${id} LinearOpMode`);
  assert(java.includes("waitForStart()"), `ch${id} waitForStart`);
}

// Archetype coverage: at least one challenge per archetype
const archetypesSeen = new Set<StarterArchetype>();
for (const c of challenges) {
  if (c.starterArchetype) archetypesSeen.add(c.starterArchetype);
}
assert(archetypesSeen.has("teleop_single_drive"), "teleop_single_drive archetype used");
assert(archetypesSeen.has("autonomous_encoder_move"), "autonomous_encoder_move used");
assert(archetypesSeen.has("sensor_touch_homing"), "sensor_touch_homing used");

console.log(
  `OK: blockly generator — ${fullIds.length} full-support starters, ${archetypesSeen.size} archetypes`
);

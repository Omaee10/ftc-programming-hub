/**
 * Smoke tests: FTC-style Blockly → Java source + grader (not "wrong").
 * Run: npm run test:blockly
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import * as Blockly from "blockly/core";
import { challenges } from "../src/data/challenges";
import { initBlocklyOnce, generateJavaFromWorkspace } from "../src/lib/blockly/generators/javaGenerator";
import { getBlockStarterXml } from "../src/data/blockStarters";
import {
  configureDeviceFieldsForChallenge,
  refreshDeviceFieldsInWorkspace,
} from "../src/lib/blockly/blocks/deviceFields";
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
  refreshDeviceFieldsInWorkspace(workspace);
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
assert(java2.includes("setPower(0)"), "ch2 setPower zero after encoder macro");

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

// Grade every full-support starter via Java grader (javac + rubrics)
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const smokeDir = path.join(scriptDir, "../grader/build/blockly-smoke");
mkdirSync(smokeDir, { recursive: true });
const manifest = fullIds.map((id) => ({
  challengeId: id,
  code: loadAndGenerate(id),
}));
writeFileSync(
  path.join(smokeDir, "manifest.json"),
  JSON.stringify(manifest, null, 0)
);

const graderDir = path.join(scriptDir, "../grader");
const graderTest =
  "test --tests com.ftchub.grader.BlockStarterGradeTest -q --no-daemon";

function graderEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (!env.JAVA_HOME) {
    try {
      const java17 = execSync("/usr/libexec/java_home -v 17 2>/dev/null", {
        encoding: "utf8",
      }).trim();
      if (java17) env.JAVA_HOME = java17;
    } catch {
      // use default JVM
    }
  }
  return env;
}

function runGraderSmoke(): void {
  const gradlew = path.join(graderDir, "gradlew");
  const env = graderEnv();
  try {
    const bin = existsSync(gradlew) ? "./gradlew" : "gradle";
    execSync(`${bin} test --tests com.ftchub.grader.BlockStarterGradeTest -q --rerun-tasks`, {
      cwd: graderDir,
      stdio: "inherit",
      env,
    });
    return;
  } catch {
    // fall through — try Docker (same image as grader/Dockerfile)
  }
  try {
    execSync(
      `docker run --rm -v "${graderDir}:/home/gradle/src" -w /home/gradle/src gradle:8.10-jdk17 gradle ${graderTest}`,
      { stdio: "inherit", env }
    );
    return;
  } catch {
    throw new Error(
      "Grader smoke failed — install Gradle or Docker, then: cd grader && gradle test --tests BlockStarterGradeTest"
    );
  }
}

runGraderSmoke();

console.log(
  `OK: blockly generator + grader — ${fullIds.length} full-support starters, ${archetypesSeen.size} archetypes`
);

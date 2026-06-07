/**
 * FTC Java code generator for the Blockly editor mode.
 *
 * Turns a serialized Blockly workspace into a complete, compilable FTC
 * `LinearOpMode` source file. The output is what gets fed to the existing
 * grader (`gradeCode`) — it is never shown to the student/mentor.
 *
 * Design notes:
 * - Statement blocks return a single string (one or more lines, no trailing
 *   newline). Value blocks return `[code, order]`.
 * - `ftc_get_hardware` / `ftc_declare_field` / `ftc_declare_const` register
 *   class-level declarations into `ftcFields`; helper blocks register full
 *   methods into `ftcHelpers`. The assembler stitches everything into one class.
 */

import * as Blockly from "blockly/core";
import { registerFtcBlocks } from "./ftcBlocks";

// Runtime Blockly object (handles bundler/Node CJS-interop differences).
// `Blockly` remains the source of type information; `BK` is used for calls.
const BK = ((Blockly as unknown as { default?: typeof Blockly }).default ??
  Blockly) as typeof Blockly;

// Single, low-precedence order. We add parentheses explicitly in each emitter,
// and always read child values with NONE so Blockly never injects its own.
const ATOMIC = 0;
const NONE = 99;

export interface JavaFrame {
  /** Java class name (must be a valid identifier). */
  className: string;
  /** Full annotation line, e.g. `@TeleOp(name = "Basic TeleOp (Blocks)")`. */
  annotation: string;
  /** Fully-qualified import statements. */
  imports: string[];
}

interface FtcGenerator extends Blockly.CodeGenerator {
  ftcFields: string[];
  ftcHelpers: string[];
  ftcHelperKeys: Set<string>;
}

// ─── Small text helpers ─────────────────────────────────────────────────────

function safeId(raw: string | null, fallback: string): string {
  const cleaned = (raw ?? "").replace(/[^A-Za-z0-9_]/g, "");
  return cleaned.length > 0 ? cleaned : fallback;
}

function escapeStr(raw: string | null): string {
  return (raw ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

/** Blockly dropdown labels (e.g. "number") → Java types. */
function javaType(raw: string | null): string {
  const t = (raw ?? "double").trim();
  switch (t) {
    case "number":
    case "Number":
    case "double":
      return "double";
    case "boolean":
      return "boolean";
    case "string":
    case "String":
      return "String";
    default:
      return t.length > 0 ? t : "double";
  }
}

function defaultFor(type: string): string {
  const jt = javaType(type);
  if (jt === "boolean") return "false";
  if (jt === "String") return '""';
  return "0";
}

/** Drop round blocks that were snapped into the statement stack by mistake. */
function scrubStatementCode(code: unknown): string {
  if (Array.isArray(code)) return "";
  if (typeof code !== "string") return "";
  const t = code.trim();
  if (t === "") return "";
  // Bare identifier (e.g. "positive") or tuple coerced to "positive,99".
  if (/^[A-Za-z_]\w*$/.test(t)) return "";
  if (/^[A-Za-z_]\w*,\d+$/.test(t)) return "";
  return code;
}

/** Prefix every non-blank line of `code` with `pad` spaces. */
function indentLines(code: string, pad: number): string {
  const prefix = " ".repeat(pad);
  return code
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : prefix + line))
    .join("\n");
}

// ─── Generator instance ──────────────────────────────────────────────────────

const g = new BK.CodeGenerator("FtcJava") as unknown as FtcGenerator;
g.INDENT = "    ";
g.ftcFields = [];
g.ftcHelpers = [];
g.ftcHelperKeys = new Set<string>();

function addField(decl: string): void {
  if (!g.ftcFields.includes(decl)) g.ftcFields.push(decl);
}
function addHelper(key: string, code: string): void {
  if (g.ftcHelperKeys.has(key)) return;
  g.ftcHelperKeys.add(key);
  g.ftcHelpers.push(code);
}

/** Read a value input, returning Java source (falls back to `def`). */
function val(block: Blockly.Block, name: string, def = "0"): string {
  const code = g.valueToCode(block, name, NONE);
  return code && code.length > 0 ? code : def;
}

// Chain consecutive statement blocks with newlines; tolerate empty emitters
// (field/const/helper-definition blocks emit "").
g.scrub_ = function (block, code, thisOnly) {
  const cleaned = scrubStatementCode(code);
  const nextBlock =
    block.nextConnection && block.nextConnection.targetBlock();
  const nextRaw = nextBlock && !thisOnly ? g.blockToCode(nextBlock) : "";
  const nextStr = scrubStatementCode(nextRaw);
  if (cleaned === "") return nextStr;
  if (nextStr === "") return cleaned;
  return cleaned + "\n" + nextStr;
};

const F = g.forBlock;

// ── Lifecycle ────────────────────────────────────────────────────────────────

F["ftc_runopmode"] = (block) => g.statementToCode(block, "BODY");

F["ftc_wait_for_start"] = () => "waitForStart();";

F["ftc_idle"] = () => "idle();";

F["ftc_sleep"] = (block) => `sleep((long)(${val(block, "MS", "0")}));`;

F["ftc_init_telemetry"] = (block) => {
  const msg = escapeStr(block.getFieldValue("MSG"));
  return `telemetry.addData("Status", "${msg}");\ntelemetry.update();`;
};

F["ftc_while_active"] = (block) => {
  const inner = g.statementToCode(block, "DO");
  return `while (opModeIsActive()) {\n${inner}\n}`;
};

F["ftc_while_condition"] = (block) => {
  const cond = val(block, "COND", "true");
  const inner = g.statementToCode(block, "DO");
  return `while (${cond} && opModeIsActive()) {\n${inner}\n}`;
};

F["ftc_while_init"] = (block) => {
  const inner = g.statementToCode(block, "DO");
  return `while (!isStarted() && !isStopRequested()) {\n${inner}\n}`;
};

// ── Hardware ──────────────────────────────────────────────────────────────

F["ftc_get_hardware"] = (block) => {
  const type = block.getFieldValue("TYPE");
  const config = escapeStr(block.getFieldValue("CONFIG"));
  const varName = safeId(block.getFieldValue("VAR"), "device");
  addField(`private ${type} ${varName};`);
  return `${varName} = hardwareMap.get(${type}.class, "${config}");`;
};

// ── Motors ────────────────────────────────────────────────────────────────

F["ftc_set_power"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "motor")}.setPower(${val(
    block,
    "VALUE",
    "0"
  )});`;

F["ftc_set_direction"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "motor")}.setDirection(DcMotorSimple.Direction.${block.getFieldValue(
    "DIR"
  )});`;

F["ftc_set_zeropower"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "motor")}.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.${block.getFieldValue(
    "MODE"
  )});`;

F["ftc_reset_encoder"] = (block) => {
  const v = safeId(block.getFieldValue("VAR"), "motor");
  return (
    `${v}.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);\n` +
    `${v}.setMode(DcMotor.RunMode.RUN_USING_ENCODER);`
  );
};

F["ftc_run_to_position"] = (block) => {
  const v = safeId(block.getFieldValue("VAR"), "motor");
  const target = val(block, "VALUE", "0");
  const power = val(block, "POWER", "0");
  return (
    `${v}.setTargetPosition((int)(${target}));\n` +
    `${v}.setMode(DcMotor.RunMode.RUN_TO_POSITION);\n` +
    `${v}.setPower(${power});`
  );
};

F["ftc_set_target"] = (block) => {
  const v = safeId(block.getFieldValue("VAR"), "motor");
  const target = val(block, "VALUE", "0");
  return (
    `${v}.setTargetPosition((int)(${target}));\n` +
    `${v}.setMode(DcMotor.RunMode.RUN_TO_POSITION);\n` +
    `${v}.setPower(0.6);`
  );
};

F["ftc_set_velocity"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "motor")}.setVelocity(${val(
    block,
    "VALUE",
    "0"
  )});`;

F["ftc_motor_position"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "motor")}.getCurrentPosition()`,
  ATOMIC,
];

F["ftc_motor_velocity"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "motor")}.getVelocity()`,
  ATOMIC,
];

F["ftc_motor_isbusy"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "motor")}.isBusy()`,
  ATOMIC,
];

// ── Servos ──────────────────────────────────────────────────────────────

F["ftc_set_position"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "servo")}.setPosition(${val(
    block,
    "VALUE",
    "0"
  )});`;

F["ftc_servo_position"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "servo")}.getPosition()`,
  ATOMIC,
];

F["ftc_servo_set_power"] = (block) =>
  `${safeId(block.getFieldValue("VAR"), "servo")}.setPower(${val(
    block,
    "VALUE",
    "0"
  )});`;

// ── Gamepad ─────────────────────────────────────────────────────────────

F["ftc_gamepad_axis"] = (block) => [
  `${block.getFieldValue("PAD") || "gamepad1"}.${block.getFieldValue("AXIS")}`,
  ATOMIC,
];
F["ftc_gamepad_trigger"] = (block) => [
  `${block.getFieldValue("PAD") || "gamepad1"}.${block.getFieldValue("TRIG")}`,
  ATOMIC,
];
F["ftc_gamepad_button"] = (block) => [
  `${block.getFieldValue("PAD") || "gamepad1"}.${block.getFieldValue("BTN")}`,
  ATOMIC,
];

// ── Telemetry ─────────────────────────────────────────────────────────────

F["ftc_telemetry_add"] = (block) => {
  const caption = escapeStr(block.getFieldValue("CAPTION"));
  const value = val(block, "VALUE", '""');
  return `telemetry.addData("${caption}", ${value});`;
};

F["ftc_telemetry_addline"] = (block) =>
  `telemetry.addLine("${escapeStr(block.getFieldValue("TEXT"))}");`;

F["ftc_telemetry_update"] = () => "telemetry.update();";

// ── Logic ───────────────────────────────────────────────────────────────

F["ftc_if"] = (block) => {
  const cond = val(block, "COND", "false");
  const doCode = g.statementToCode(block, "DO");
  const elseCode = g.statementToCode(block, "ELSE");
  let out = `if (${cond}) {\n${doCode}\n}`;
  if (elseCode.trim() !== "") out += ` else {\n${elseCode}\n}`;
  return out;
};

F["ftc_compare"] = (block) => [
  `(${val(block, "A", "0")} ${block.getFieldValue("OP")} ${val(
    block,
    "B",
    "0"
  )})`,
  ATOMIC,
];

F["ftc_and"] = (block) => [
  `(${val(block, "A", "true")} && ${val(block, "B", "true")})`,
  ATOMIC,
];

F["ftc_not"] = (block) => {
  const v = val(block, "VALUE", "false");
  const simple = /^[A-Za-z_][A-Za-z0-9_.]*(\([^()]*\))?$/.test(v);
  return [simple ? `!${v}` : `!(${v})`, ATOMIC];
};

F["ftc_boolean"] = (block) => [block.getFieldValue("BOOL"), ATOMIC];

F["ftc_touch_pressed"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "touchSensor")}.isPressed()`,
  ATOMIC,
];

F["ftc_color_channel"] = (block) => {
  const v = safeId(block.getFieldValue("VAR"), "colorSensor");
  const channel = block.getFieldValue("CHANNEL") || "red";
  return [`${v}.${channel}()`, ATOMIC];
};

F["ftc_color_led"] = (block) => {
  const v = safeId(block.getFieldValue("VAR"), "colorSensor");
  const state = block.getFieldValue("STATE") === "false" ? "false" : "true";
  return `${v}.enableLed(${state});`;
};

F["ftc_distance"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "distanceSensor")}.getDistance(DistanceUnit.CM)`,
  ATOMIC,
];

F["ftc_imu_yaw"] = (block) => [
  `${safeId(block.getFieldValue("VAR"), "imu")}.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES)`,
  ATOMIC,
];

// ── Math ────────────────────────────────────────────────────────────────

F["ftc_number"] = (block) => [String(block.getFieldValue("NUM")), ATOMIC];

F["ftc_arith"] = (block) => [
  `(${val(block, "A", "0")} ${block.getFieldValue("OP")} ${val(
    block,
    "B",
    "0"
  )})`,
  ATOMIC,
];

F["ftc_negate"] = (block) => [`-${val(block, "VALUE", "0")}`, ATOMIC];

F["ftc_math_unary"] = (block) => [
  `Math.${block.getFieldValue("FN")}(${val(block, "VALUE", "0")})`,
  ATOMIC,
];

F["ftc_math_binary"] = (block) => [
  `Math.${block.getFieldValue("FN")}(${val(block, "A", "0")}, ${val(
    block,
    "B",
    "0"
  )})`,
  ATOMIC,
];

F["ftc_deadzone"] = (block) => {
  const v = val(block, "VALUE", "0");
  const thresh = (block.getFieldValue("THRESH") || "0.05").trim();
  return [`(Math.abs(${v}) < ${thresh} ? 0 : ${v})`, ATOMIC];
};

F["ftc_ternary"] = (block) => [
  `(${val(block, "COND", "false")} ? ${val(block, "A", "0")} : ${val(
    block,
    "B",
    "0"
  )})`,
  ATOMIC,
];

// ── Variables ─────────────────────────────────────────────────────────────

F["ftc_declare_var"] = (block) => {
  const type = javaType(block.getFieldValue("VTYPE"));
  const name = safeId(block.getFieldValue("NAME"), "value");
  return `${type} ${name} = ${val(block, "INIT", defaultFor(type))};`;
};

F["ftc_declare_field"] = (block) => {
  const type = javaType(block.getFieldValue("VTYPE"));
  const name = safeId(block.getFieldValue("NAME"), "value");
  addField(`private ${type} ${name} = ${val(block, "INIT", defaultFor(type))};`);
  return "";
};

F["ftc_declare_const"] = (block) => {
  const type = javaType(block.getFieldValue("VTYPE"));
  const name = safeId(block.getFieldValue("NAME"), "CONST");
  addField(
    `private static final ${type} ${name} = ${val(
      block,
      "INIT",
      defaultFor(type)
    )};`
  );
  return "";
};

F["ftc_assign"] = (block) =>
  `${safeId(block.getFieldValue("NAME"), "value")} = ${val(
    block,
    "VALUE",
    "0"
  )};`;

F["ftc_increment"] = (block) =>
  `${safeId(block.getFieldValue("NAME"), "loopCount")}++;`;

F["ftc_decrement"] = (block) =>
  `${safeId(block.getFieldValue("NAME"), "loopCount")}--;`;

F["ftc_change_by"] = (block) =>
  `${safeId(block.getFieldValue("NAME"), "value")} += ${val(
    block,
    "VALUE",
    "0"
  )};`;

F["ftc_var_get"] = (block) => [
  safeId(block.getFieldValue("NAME"), "value"),
  ATOMIC,
];

F["ftc_string"] = (block) => [
  `"${escapeStr(block.getFieldValue("TEXT"))}"`,
  ATOMIC,
];

F["ftc_new_timer"] = (block) =>
  `ElapsedTime ${safeId(block.getFieldValue("NAME"), "timer")} = new ElapsedTime();`;

F["ftc_timer_reset"] = (block) =>
  `${safeId(block.getFieldValue("NAME"), "timer")}.reset();`;

F["ftc_timer_seconds"] = (block) => [
  `${safeId(block.getFieldValue("NAME"), "timer")}.seconds()`,
  ATOMIC,
];

// ── Helpers ───────────────────────────────────────────────────────────────

F["ftc_def_normalize"] = () => {
  addHelper(
    "normalize",
    `private double[] normalize(double fl, double fr, double bl, double br) {
    double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr), Math.max(Math.abs(bl), Math.abs(br))));
    if (max > 1.0) {
        fl /= max;
        fr /= max;
        bl /= max;
        br /= max;
    }
    return new double[] { fl, fr, bl, br };
}`
  );
  return "";
};

F["ftc_call_normalize"] = (block) => {
  const fl = val(block, "FL", "0");
  const fr = val(block, "FR", "0");
  const bl = val(block, "BL", "0");
  const br = val(block, "BR", "0");
  const m0 = safeId(block.getFieldValue("M0"), "frontLeft");
  const m1 = safeId(block.getFieldValue("M1"), "frontRight");
  const m2 = safeId(block.getFieldValue("M2"), "backLeft");
  const m3 = safeId(block.getFieldValue("M3"), "backRight");
  return [
    `double[] powers = normalize(${fl}, ${fr}, ${bl}, ${br});`,
    `${m0}.setPower(powers[0]);`,
    `${m1}.setPower(powers[1]);`,
    `${m2}.setPower(powers[2]);`,
    `${m3}.setPower(powers[3]);`,
  ].join("\n");
};

F["ftc_def_tickstodeg"] = () => {
  addHelper(
    "ticksToDegrees",
    `private double ticksToDegrees(int ticks) {
    return ticks * 360.0 / (TICKS_PER_REV * GEAR_RATIO);
}`
  );
  return "";
};

F["ftc_call_tickstodeg"] = (block) => [
  `ticksToDegrees((int)(${val(block, "TICKS", "0")}))`,
  ATOMIC,
];

// ─── Full-file assembler ─────────────────────────────────────────────────────

/**
 * Generate a complete FTC OpMode source file from a serialized Blockly
 * workspace state and the per-challenge {@link JavaFrame}.
 */
export function generateJava(
  state: { [key: string]: unknown },
  frame: JavaFrame
): string {
  registerFtcBlocks();

  const workspace = new BK.Workspace();
  g.ftcFields = [];
  g.ftcHelpers = [];
  g.ftcHelperKeys = new Set<string>();

  let body = "";
  try {
    BK.serialization.workspaces.load(state, workspace);
    body = g.workspaceToCode(workspace);
  } catch {
    body = "";
  } finally {
    workspace.dispose();
  }

  const header = [
    "package org.firstinspires.ftc.teamcode;",
    "",
    ...frame.imports,
    "",
    frame.annotation,
    `public class ${frame.className} extends LinearOpMode {`,
  ].join("\n");

  const fieldsBlock =
    g.ftcFields.length > 0
      ? g.ftcFields.map((f) => "    " + f).join("\n") + "\n\n"
      : "";

  const runOpMode =
    "    @Override\n    public void runOpMode() {\n" +
    indentLines(body, 4) +
    "\n    }\n";

  const helpersBlock =
    g.ftcHelpers.length > 0
      ? "\n" + g.ftcHelpers.map((h) => indentLines(h, 4)).join("\n\n") + "\n"
      : "";

  return `${header}\n\n${fieldsBlock}${runOpMode}${helpersBlock}}\n`;
}

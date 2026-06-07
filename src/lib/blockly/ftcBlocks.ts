/**
 * Shared FTC Blockly block library.
 *
 * These are the reusable visual blocks that power the "FTC Blocks" editor mode.
 * Each block has a matching Java emitter in {@link ./javaGenerator}. The blocks
 * intentionally model FTC-SDK concepts (hardware devices, the OpMode lifecycle,
 * motors, servos, gamepad, telemetry) so the generated Java compiles against the
 * grader's FTC stubs and satisfies the rubric rules.
 *
 * The definitions are framework-agnostic JSON consumed by
 * `Blockly.common.defineBlocksWithJsonArray`. The actual Blockly module is only
 * imported on the client (see BlocklyWorkspace.tsx) — this file just holds data
 * plus a small registration helper.
 */

import * as Blockly from "blockly/core";

// Resolve the runtime Blockly object across bundler/Node interop shapes
// (some setups expose the CJS module under `.default`). `Blockly` is still used
// for type positions; `BK` is the value used for runtime calls.
const BK = ((Blockly as unknown as { default?: typeof Blockly }).default ??
  Blockly) as typeof Blockly;

// ─── Category metadata (drives toolbox grouping + colours) ──────────────────

export type BlockCategory =
  | "Lifecycle"
  | "Hardware"
  | "Motors"
  | "Servos"
  | "Gamepad"
  | "Telemetry"
  | "Logic"
  | "Math"
  | "Variables"
  | "Helpers";

export const CATEGORY_COLOUR: Record<BlockCategory, string> = {
  Lifecycle: "#a55b80",
  Hardware: "#5b67a5",
  Motors: "#5ba55b",
  Servos: "#a5825b",
  Gamepad: "#a5a55b",
  Telemetry: "#5ba5a5",
  Logic: "#5b80a5",
  Math: "#a55b5b",
  Variables: "#9b5ba5",
  Helpers: "#7d5ba5",
};

/** Maps every block type to the toolbox category it belongs to. */
export const CATEGORY_OF: Record<string, BlockCategory> = {
  ftc_runopmode: "Lifecycle",
  ftc_wait_for_start: "Lifecycle",
  ftc_while_active: "Lifecycle",
  ftc_while_condition: "Lifecycle",
  ftc_while_init: "Lifecycle",
  ftc_sleep: "Lifecycle",
  ftc_idle: "Lifecycle",
  ftc_init_telemetry: "Lifecycle",

  ftc_get_hardware: "Hardware",

  ftc_set_power: "Motors",
  ftc_set_direction: "Motors",
  ftc_set_zeropower: "Motors",
  ftc_reset_encoder: "Motors",
  ftc_run_to_position: "Motors",
  ftc_set_target: "Motors",
  ftc_set_velocity: "Motors",
  ftc_motor_position: "Motors",
  ftc_motor_velocity: "Motors",
  ftc_motor_isbusy: "Motors",

  ftc_set_position: "Servos",
  ftc_servo_position: "Servos",

  ftc_gamepad_axis: "Gamepad",
  ftc_gamepad_trigger: "Gamepad",
  ftc_gamepad_button: "Gamepad",

  ftc_telemetry_add: "Telemetry",
  ftc_telemetry_addline: "Telemetry",
  ftc_telemetry_update: "Telemetry",

  ftc_if: "Logic",
  ftc_compare: "Logic",
  ftc_and: "Logic",
  ftc_not: "Logic",
  ftc_boolean: "Logic",
  ftc_touch_pressed: "Logic",

  ftc_number: "Math",
  ftc_arith: "Math",
  ftc_negate: "Math",
  ftc_math_unary: "Math",
  ftc_math_binary: "Math",
  ftc_deadzone: "Math",
  ftc_ternary: "Math",

  ftc_declare_var: "Variables",
  ftc_declare_field: "Variables",
  ftc_declare_const: "Variables",
  ftc_assign: "Variables",
  ftc_increment: "Variables",
  ftc_decrement: "Variables",
  ftc_change_by: "Variables",
  ftc_var_get: "Variables",
  ftc_string: "Variables",
  ftc_new_timer: "Variables",
  ftc_timer_reset: "Variables",
  ftc_timer_seconds: "Variables",

  ftc_def_normalize: "Helpers",
  ftc_call_normalize: "Helpers",
  ftc_def_tickstodeg: "Helpers",
  ftc_call_tickstodeg: "Helpers",
};

const C = CATEGORY_COLOUR;

// ─── Custom field: variable / device name dropdown ──────────────────────────
//
// A dropdown that offers every name the student has "created" elsewhere in the
// workspace — hardware devices (ftc_get_hardware), declared variables/fields/
// constants, and timers. Reference blocks (set power of X, read X, etc.) use it
// so a name only ever has to be typed once, at the place it is created.

const NAME_PLACEHOLDER = "(create a variable)";

/** Block types whose VAR field introduces a hardware device name. */
const DEVICE_NAME_BLOCKS = new Set(["ftc_get_hardware"]);
/** Block types whose NAME field introduces a variable / timer name. */
const VAR_NAME_BLOCKS = new Set([
  "ftc_declare_var",
  "ftc_declare_field",
  "ftc_declare_const",
  "ftc_new_timer",
]);

/** Collect every created name (devices + variables + timers) in a workspace. */
function collectCreatedNames(ws: Blockly.Workspace | null | undefined): string[] {
  if (!ws) return [];
  const out: string[] = [];
  const add = (raw: string | null) => {
    const v = (raw ?? "").trim();
    if (v && !out.includes(v)) out.push(v);
  };
  for (const b of ws.getAllBlocks(false)) {
    if (DEVICE_NAME_BLOCKS.has(b.type)) add(b.getFieldValue("VAR"));
    else if (VAR_NAME_BLOCKS.has(b.type)) add(b.getFieldValue("NAME"));
  }
  return out;
}

type NameOption = [string, string];

// `this` is the field (see Blockly's MenuGeneratorFunction type).
function nameMenuGenerator(this: Blockly.FieldDropdown): NameOption[] {
  const block = this.getSourceBlock();
  const names = collectCreatedNames(block?.workspace);
  const current = this.getValue();
  if (typeof current === "string" && current && !names.includes(current)) {
    names.unshift(current);
  }
  if (names.length === 0) return [[NAME_PLACEHOLDER, ""]];
  return names.map((n) => [n, n] as NameOption);
}

/** Dropdown of created names; accepts any value so load order never drops it. */
class FieldNameDropdown extends BK.FieldDropdown {
  constructor(value?: string, validator?: unknown, config?: unknown) {
    super(nameMenuGenerator, validator as never, config as never);
    if (typeof value === "string" && value.length > 0) this.setValue(value);
  }

  static fromJson(
    options: Blockly.FieldDropdownFromJsonConfig
  ): FieldNameDropdown {
    const text = (options as { text?: string }).text;
    return new FieldNameDropdown(text, undefined, options);
  }

  // Accept any name even if the declaring block hasn't loaded yet, so saved
  // references survive (de)serialization regardless of block order.
  protected override doClassValidation_(newValue?: string): string | null {
    return newValue == null ? null : String(newValue);
  }

  // Show the raw name (label === value here); fall back to a hint when empty.
  protected override getText_(): string {
    const v = this.getValue();
    return typeof v === "string" && v.length > 0 ? v : NAME_PLACEHOLDER;
  }
}

// ─── Block definitions (JSON) ───────────────────────────────────────────────

export const FTC_BLOCK_DEFS: Record<string, unknown>[] = [
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  {
    type: "ftc_runopmode",
    message0: "▶ runOpMode %1 %2",
    args0: [
      { type: "input_dummy" },
      { type: "input_statement", name: "BODY" },
    ],
    colour: C.Lifecycle,
    tooltip:
      "The OpMode body. Put init code first, then waitForStart, then your loop.",
    deletable: false,
  },
  {
    type: "ftc_wait_for_start",
    message0: "waitForStart",
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Pause until the driver presses START. Call this exactly once.",
  },
  {
    type: "ftc_while_active",
    message0: "while OpMode is active %1 %2",
    args0: [
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Repeat while opModeIsActive() is true (the main match loop).",
  },
  {
    type: "ftc_while_condition",
    message0: "while %1 and OpMode active %2 %3",
    args0: [
      { type: "input_value", name: "COND", check: "Boolean" },
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip:
      "Repeat while a condition AND opModeIsActive() are both true (e.g. isBusy).",
  },
  {
    type: "ftc_while_init",
    message0: "while initializing (before start) %1 %2",
    args0: [
      { type: "input_dummy" },
      { type: "input_statement", name: "DO" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Run config code while !isStarted() && !isStopRequested().",
  },
  {
    type: "ftc_sleep",
    message0: "sleep %1 ms",
    args0: [{ type: "input_value", name: "MS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Pause for milliseconds (LinearOpMode.sleep, respects Stop).",
  },
  {
    type: "ftc_idle",
    message0: "idle",
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Yield to the system for one cycle (use inside busy-wait loops).",
  },
  {
    type: "ftc_init_telemetry",
    message0: "show init status %1",
    args0: [{ type: "field_input", name: "MSG", text: "Initialized" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Lifecycle,
    tooltip: "Report a status line before waitForStart().",
  },

  // ── Hardware ────────────────────────────────────────────────────────────
  {
    type: "ftc_get_hardware",
    message0: "get %1 from config %2 into %3",
    args0: [
      {
        type: "field_dropdown",
        name: "TYPE",
        options: [
          ["DcMotor", "DcMotor"],
          ["DcMotorEx", "DcMotorEx"],
          ["DcMotorSimple", "DcMotorSimple"],
          ["Servo", "Servo"],
          ["CRServo", "CRServo"],
          ["TouchSensor", "TouchSensor"],
        ],
      },
      { type: "field_input", name: "CONFIG", text: "left_motor" },
      { type: "field_input", name: "VAR", text: "motor" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Hardware,
    tooltip: "Retrieve a hardware device from hardwareMap into a variable.",
  },

  // ── Motors ────────────────────────────────────────────────────────────────
  {
    type: "ftc_set_power",
    message0: "set power of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Set a motor (or CRServo) power in [-1, 1].",
  },
  {
    type: "ftc_set_direction",
    message0: "set direction of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      {
        type: "field_dropdown",
        name: "DIR",
        options: [
          ["FORWARD", "FORWARD"],
          ["REVERSE", "REVERSE"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Set motor polarity (do this once in init).",
  },
  {
    type: "ftc_set_zeropower",
    message0: "set zero-power behavior of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      {
        type: "field_dropdown",
        name: "MODE",
        options: [
          ["BRAKE", "BRAKE"],
          ["FLOAT", "FLOAT"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Choose whether the motor brakes or floats at zero power.",
  },
  {
    type: "ftc_reset_encoder",
    message0: "reset encoder of %1",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "motor" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip:
      "Zero the encoder, then switch the motor to RUN_USING_ENCODER — no mode switching needed.",
  },
  {
    type: "ftc_run_to_position",
    message0: "run %1 to position %2 at power %3",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      { type: "input_value", name: "VALUE", check: "Number" },
      { type: "input_value", name: "POWER", check: "Number" },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip:
      "Set the target, switch to RUN_TO_POSITION, and apply power — all in one step.",
  },
  {
    type: "ftc_set_target",
    message0: "set target position of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip:
      "Set the target, switch to RUN_TO_POSITION, and apply power (0.6) — all in one step.",
  },
  {
    type: "ftc_set_velocity",
    message0: "set velocity of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "motor" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Set ticks-per-second (DcMotorEx, needs RUN_USING_ENCODER).",
  },
  {
    type: "ftc_motor_position",
    message0: "position of %1",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "motor" }],
    output: "Number",
    colour: C.Motors,
    tooltip: "motor.getCurrentPosition() in encoder ticks.",
  },
  {
    type: "ftc_motor_velocity",
    message0: "velocity of %1",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "motor" }],
    output: "Number",
    colour: C.Motors,
    tooltip: "motor.getVelocity() in ticks/sec (DcMotorEx).",
  },
  {
    type: "ftc_motor_isbusy",
    message0: "%1 is busy",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "motor" }],
    output: "Boolean",
    colour: C.Motors,
    tooltip: "True while a RUN_TO_POSITION move is still running.",
  },

  // ── Servos ──────────────────────────────────────────────────────────────
  {
    type: "ftc_set_position",
    message0: "set position of %1 to %2",
    args0: [
      { type: "field_ftc_name", name: "VAR", text: "servo" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Servos,
    tooltip: "Move a Servo to a position in [0.0, 1.0].",
  },
  {
    type: "ftc_servo_position",
    message0: "position of %1",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "servo" }],
    output: "Number",
    colour: C.Servos,
    tooltip: "servo.getPosition() — last commanded position in [0.0, 1.0].",
  },

  // ── Gamepad ─────────────────────────────────────────────────────────────
  {
    type: "ftc_gamepad_axis",
    message0: "%1 %2",
    args0: [
      {
        type: "field_dropdown",
        name: "PAD",
        options: [
          ["gamepad 1", "gamepad1"],
          ["gamepad 2", "gamepad2"],
        ],
      },
      {
        type: "field_dropdown",
        name: "AXIS",
        options: [
          ["left stick Y", "left_stick_y"],
          ["left stick X", "left_stick_x"],
          ["right stick Y", "right_stick_y"],
          ["right stick X", "right_stick_x"],
        ],
      },
    ],
    output: "Number",
    inputsInline: true,
    colour: C.Gamepad,
    tooltip: "Analog joystick axis value (-1.0 to 1.0).",
  },
  {
    type: "ftc_gamepad_trigger",
    message0: "%1 %2",
    args0: [
      {
        type: "field_dropdown",
        name: "PAD",
        options: [
          ["gamepad 1", "gamepad1"],
          ["gamepad 2", "gamepad2"],
        ],
      },
      {
        type: "field_dropdown",
        name: "TRIG",
        options: [
          ["right trigger", "right_trigger"],
          ["left trigger", "left_trigger"],
        ],
      },
    ],
    output: "Number",
    inputsInline: true,
    colour: C.Gamepad,
    tooltip: "Analog trigger value (0.0 to 1.0).",
  },
  {
    type: "ftc_gamepad_button",
    message0: "%1 %2 pressed",
    args0: [
      {
        type: "field_dropdown",
        name: "PAD",
        options: [
          ["gamepad 1", "gamepad1"],
          ["gamepad 2", "gamepad2"],
        ],
      },
      {
        type: "field_dropdown",
        name: "BTN",
        options: [
          ["A", "a"],
          ["B", "b"],
          ["X", "x"],
          ["Y", "y"],
          ["D-pad up", "dpad_up"],
          ["D-pad down", "dpad_down"],
          ["D-pad left", "dpad_left"],
          ["D-pad right", "dpad_right"],
          ["left bumper", "left_bumper"],
          ["right bumper", "right_bumper"],
        ],
      },
    ],
    output: "Boolean",
    inputsInline: true,
    colour: C.Gamepad,
    tooltip: "Whether a gamepad button is currently held.",
  },

  // ── Telemetry ─────────────────────────────────────────────────────────────
  {
    type: "ftc_telemetry_add",
    message0: "telemetry add %1 = %2",
    args0: [
      { type: "field_input", name: "CAPTION", text: "Power" },
      { type: "input_value", name: "VALUE" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Telemetry,
    tooltip: "Buffer a labelled value for the Driver Station.",
  },
  {
    type: "ftc_telemetry_addline",
    message0: "telemetry line %1",
    args0: [{ type: "field_input", name: "TEXT", text: "--- Status ---" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Telemetry,
    tooltip: "Add a header / separator line.",
  },
  {
    type: "ftc_telemetry_update",
    message0: "telemetry update",
    previousStatement: null,
    nextStatement: null,
    colour: C.Telemetry,
    tooltip: "Flush buffered telemetry to the screen (call inside the loop).",
  },

  // ── Logic ───────────────────────────────────────────────────────────────
  {
    type: "ftc_if",
    message0: "if %1 do %2",
    args0: [
      { type: "input_value", name: "COND", check: "Boolean" },
      { type: "input_statement", name: "DO" },
    ],
    message1: "else %1",
    args1: [{ type: "input_statement", name: "ELSE" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Logic,
    tooltip: "Conditional. Leave 'else' empty to skip it.",
  },
  {
    type: "ftc_compare",
    message0: "%1 %2 %3",
    args0: [
      { type: "input_value", name: "A" },
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["<", "<"],
          [">", ">"],
          ["≤", "<="],
          ["≥", ">="],
          ["=", "=="],
          ["≠", "!="],
        ],
      },
      { type: "input_value", name: "B" },
    ],
    output: "Boolean",
    inputsInline: true,
    colour: C.Logic,
    tooltip: "Compare two values.",
  },
  {
    type: "ftc_and",
    message0: "%1 and %2",
    args0: [
      { type: "input_value", name: "A", check: "Boolean" },
      { type: "input_value", name: "B", check: "Boolean" },
    ],
    output: "Boolean",
    inputsInline: true,
    colour: C.Logic,
    tooltip: "Both conditions are true.",
  },
  {
    type: "ftc_not",
    message0: "not %1",
    args0: [{ type: "input_value", name: "VALUE", check: "Boolean" }],
    output: "Boolean",
    colour: C.Logic,
    tooltip: "Logical NOT.",
  },
  {
    type: "ftc_boolean",
    message0: "%1",
    args0: [
      {
        type: "field_dropdown",
        name: "BOOL",
        options: [
          ["true", "true"],
          ["false", "false"],
        ],
      },
    ],
    output: "Boolean",
    colour: C.Logic,
    tooltip: "A boolean literal.",
  },
  {
    type: "ftc_touch_pressed",
    message0: "%1 is pressed",
    args0: [{ type: "field_ftc_name", name: "VAR", text: "touchSensor" }],
    output: "Boolean",
    colour: C.Logic,
    tooltip: "TouchSensor.isPressed().",
  },

  // ── Math ────────────────────────────────────────────────────────────────
  {
    type: "ftc_number",
    message0: "%1",
    args0: [{ type: "field_number", name: "NUM", value: 0 }],
    output: "Number",
    colour: C.Math,
    tooltip: "A numeric literal.",
  },
  {
    type: "ftc_arith",
    message0: "%1 %2 %3",
    args0: [
      { type: "input_value", name: "A", check: "Number" },
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["+", "+"],
          ["−", "-"],
          ["×", "*"],
          ["÷", "/"],
          ["mod", "%"],
        ],
      },
      { type: "input_value", name: "B", check: "Number" },
    ],
    output: "Number",
    inputsInline: true,
    colour: C.Math,
    tooltip: "Arithmetic on two numbers (+, −, ×, ÷, mod).",
  },
  {
    type: "ftc_negate",
    message0: "negate %1",
    args0: [{ type: "input_value", name: "VALUE", check: "Number" }],
    output: "Number",
    colour: C.Math,
    tooltip: "Negate a value (e.g. flip an inverted joystick axis).",
  },
  {
    type: "ftc_math_unary",
    message0: "%1 of %2",
    args0: [
      {
        type: "field_dropdown",
        name: "FN",
        options: [
          ["abs", "abs"],
          ["sqrt", "sqrt"],
          ["sin", "sin"],
          ["cos", "cos"],
          ["tan", "tan"],
          ["signum", "signum"],
          ["round", "round"],
          ["floor", "floor"],
          ["ceil", "ceil"],
          ["toRadians", "toRadians"],
          ["toDegrees", "toDegrees"],
        ],
      },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    output: "Number",
    colour: C.Math,
    tooltip: "One-argument Math function.",
  },
  {
    type: "ftc_math_binary",
    message0: "%1 of %2 and %3",
    args0: [
      {
        type: "field_dropdown",
        name: "FN",
        options: [
          ["max", "max"],
          ["min", "min"],
          ["hypot", "hypot"],
          ["pow", "pow"],
          ["atan2", "atan2"],
        ],
      },
      { type: "input_value", name: "A", check: "Number" },
      { type: "input_value", name: "B", check: "Number" },
    ],
    output: "Number",
    inputsInline: true,
    colour: C.Math,
    tooltip: "Two-argument Math function.",
  },
  {
    type: "ftc_deadzone",
    message0: "deadzone %1 below %2",
    args0: [
      { type: "input_value", name: "VALUE", check: "Number" },
      { type: "field_input", name: "THRESH", text: "0.05" },
    ],
    output: "Number",
    colour: C.Math,
    tooltip: "Return 0 when |value| is below the threshold, else the value.",
  },
  {
    type: "ftc_ternary",
    message0: "if %1 then %2 else %3",
    args0: [
      { type: "input_value", name: "COND", check: "Boolean" },
      { type: "input_value", name: "A" },
      { type: "input_value", name: "B" },
    ],
    output: null,
    inputsInline: true,
    colour: C.Math,
    tooltip: "Inline conditional value (a ? b : c).",
  },

  // ── Variables ─────────────────────────────────────────────────────────────
  {
    type: "ftc_declare_var",
    message0: "make %1 %2 = %3",
    args0: [
      {
        type: "field_dropdown",
        name: "VTYPE",
        options: [
          ["number", "double"],
          ["boolean", "boolean"],
          ["string", "String"],
        ],
      },
      { type: "field_input", name: "NAME", text: "value" },
      { type: "input_value", name: "INIT" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Declare a local variable (place before the loop if it persists).",
  },
  {
    type: "ftc_declare_field",
    message0: "field %1 %2 = %3",
    args0: [
      {
        type: "field_dropdown",
        name: "VTYPE",
        options: [
          ["number", "double"],
          ["boolean", "boolean"],
          ["string", "String"],
        ],
      },
      { type: "field_input", name: "NAME", text: "count" },
      { type: "input_value", name: "INIT" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Declare a class field (lives for the whole OpMode).",
  },
  {
    type: "ftc_declare_const",
    message0: "constant %1 %2 = %3",
    args0: [
      {
        type: "field_dropdown",
        name: "VTYPE",
        options: [
          ["number", "double"],
          ["string", "String"],
        ],
      },
      { type: "field_input", name: "NAME", text: "TICKS_PER_REV" },
      { type: "input_value", name: "INIT" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Declare a static final constant.",
  },
  {
    type: "ftc_assign",
    message0: "set %1 = %2",
    args0: [
      { type: "field_ftc_name", name: "NAME", text: "value" },
      { type: "input_value", name: "VALUE" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Assign a new value to an existing variable.",
  },
  {
    type: "ftc_increment",
    message0: "increment %1",
    args0: [{ type: "field_ftc_name", name: "NAME", text: "loopCount" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Add one to a counter (name++).",
  },
  {
    type: "ftc_decrement",
    message0: "decrement %1",
    args0: [{ type: "field_ftc_name", name: "NAME", text: "loopCount" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Subtract one from a counter (name--).",
  },
  {
    type: "ftc_change_by",
    message0: "change %1 by %2",
    args0: [
      { type: "field_ftc_name", name: "NAME", text: "value" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Add an amount to a variable (name += value).",
  },
  {
    type: "ftc_var_get",
    message0: "%1",
    args0: [{ type: "field_ftc_name", name: "NAME", text: "value" }],
    output: null,
    colour: C.Variables,
    tooltip: "Read a variable's value.",
  },
  {
    type: "ftc_string",
    message0: '" %1 "',
    args0: [{ type: "field_input", name: "TEXT", text: "hello" }],
    output: "String",
    colour: C.Variables,
    tooltip: "A text (string) value.",
  },
  {
    type: "ftc_new_timer",
    message0: "new timer %1",
    args0: [{ type: "field_input", name: "NAME", text: "timer" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Create an ElapsedTime timer (declare before the loop).",
  },
  {
    type: "ftc_timer_reset",
    message0: "reset timer %1",
    args0: [{ type: "field_ftc_name", name: "NAME", text: "timer" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Restart a timer at 0 (before a new timed segment).",
  },
  {
    type: "ftc_timer_seconds",
    message0: "seconds on %1",
    args0: [{ type: "field_ftc_name", name: "NAME", text: "timer" }],
    output: "Number",
    colour: C.Variables,
    tooltip: "Elapsed seconds on a timer.",
  },

  // ── Helpers (pre-built methods for the intermediate challenges) ───────────
  {
    type: "ftc_def_normalize",
    message0: "define normalize(fl, fr, bl, br) helper",
    previousStatement: null,
    nextStatement: null,
    colour: C.Helpers,
    tooltip:
      "Adds a helper method that scales four wheel powers so the largest is ≤ 1.",
  },
  {
    type: "ftc_call_normalize",
    message0:
      "normalize and apply: fl %1 fr %2 bl %3 br %4 to motors %5 %6 %7 %8",
    args0: [
      { type: "input_value", name: "FL", check: "Number" },
      { type: "input_value", name: "FR", check: "Number" },
      { type: "input_value", name: "BL", check: "Number" },
      { type: "input_value", name: "BR", check: "Number" },
      { type: "field_ftc_name", name: "M0", text: "frontLeft" },
      { type: "field_ftc_name", name: "M1", text: "frontRight" },
      { type: "field_ftc_name", name: "M2", text: "backLeft" },
      { type: "field_ftc_name", name: "M3", text: "backRight" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Helpers,
    tooltip: "Normalize four powers, then setPower() on each wheel.",
  },
  {
    type: "ftc_def_tickstodeg",
    message0: "define ticksToDegrees(ticks) helper",
    previousStatement: null,
    nextStatement: null,
    colour: C.Helpers,
    tooltip:
      "Adds a helper that converts encoder ticks to degrees using TICKS_PER_REV and GEAR_RATIO.",
  },
  {
    type: "ftc_call_tickstodeg",
    message0: "ticksToDegrees of %1",
    args0: [{ type: "input_value", name: "TICKS", check: "Number" }],
    output: "Number",
    colour: C.Helpers,
    tooltip: "Convert encoder ticks to degrees.",
  },
];

// ─── Per-field hover descriptions ───────────────────────────────────────────
//
// Hovering a specific field/parameter shows the matching description. Fields not
// listed here fall back to the block's own tooltip.

export const FIELD_TOOLTIPS: Record<string, Record<string, string>> = {
  ftc_get_hardware: {
    TYPE: "The kind of hardware device (motor, servo, or sensor).",
    CONFIG: "The device name exactly as it appears in your Robot Configuration.",
    VAR: "The variable name you'll use to refer to this device in your code.",
  },
  ftc_set_power: {
    VAR: "Which motor or CRServo to drive.",
    VALUE: "Power from -1.0 (full reverse) to 1.0 (full forward).",
  },
  ftc_set_direction: {
    VAR: "Which motor to configure.",
    DIR: "Motor polarity: FORWARD or REVERSE.",
  },
  ftc_set_zeropower: {
    VAR: "Which motor to configure.",
    MODE: "BRAKE holds position at zero power; FLOAT lets it coast.",
  },
  ftc_set_target: {
    VAR: "Which motor to move.",
    VALUE:
      "Target position in encoder ticks — also switches to RUN_TO_POSITION and applies power.",
  },
  ftc_set_velocity: {
    VAR: "Which DcMotorEx motor to drive.",
    VALUE: "Target velocity in encoder ticks per second.",
  },
  ftc_motor_position: { VAR: "Read this motor's encoder position (ticks)." },
  ftc_motor_velocity: { VAR: "Read this motor's velocity (ticks/sec)." },
  ftc_motor_isbusy: { VAR: "True while this motor is still running to position." },
  ftc_reset_encoder: { VAR: "Zero this motor's encoder and re-enable running." },
  ftc_run_to_position: {
    VAR: "Which motor to move.",
    VALUE: "Target position in encoder ticks.",
    POWER: "Power used to drive to the target (0.0 to 1.0).",
  },
  ftc_set_position: {
    VAR: "Which servo to move.",
    VALUE: "Servo position from 0.0 to 1.0.",
  },
  ftc_servo_position: {
    VAR: "Which servo to read — returns the last set position (0.0 to 1.0).",
  },
  ftc_touch_pressed: { VAR: "Which touch sensor to read." },
  ftc_gamepad_axis: {
    PAD: "Which controller (gamepad 1 or gamepad 2).",
    AXIS: "Which joystick axis to read (-1.0 to 1.0).",
  },
  ftc_gamepad_trigger: {
    PAD: "Which controller (gamepad 1 or gamepad 2).",
    TRIG: "Which trigger to read (0.0 to 1.0).",
  },
  ftc_gamepad_button: {
    PAD: "Which controller (gamepad 1 or gamepad 2).",
    BTN: "Which button to check.",
  },
  ftc_declare_var: {
    VTYPE: "Data type: number, true/false (boolean), or text (string).",
    NAME: "The name of this variable.",
  },
  ftc_declare_field: {
    VTYPE: "Data type: number, true/false (boolean), or text (string).",
    NAME: "The name of this field (lives for the whole OpMode).",
  },
  ftc_declare_const: {
    VTYPE: "Data type: number or text (string).",
    NAME: "The constant's name (usually UPPER_CASE).",
  },
  ftc_assign: { NAME: "The variable to change." },
  ftc_increment: { NAME: "The counter to add one to." },
  ftc_decrement: { NAME: "The counter to subtract one from." },
  ftc_change_by: { NAME: "The variable to add to." },
  ftc_var_get: { NAME: "The variable to read." },
  ftc_new_timer: { NAME: "The name of the timer." },
  ftc_timer_reset: { NAME: "The timer to restart at zero." },
  ftc_timer_seconds: { NAME: "The timer to read elapsed seconds from." },
  ftc_string: { TEXT: "The text value." },
  ftc_arith: { OP: "The arithmetic operator (+, −, ×, ÷, mod)." },
  ftc_math_unary: { FN: "The one-argument math function." },
  ftc_math_binary: { FN: "The two-argument math function." },
  ftc_compare: { OP: "The comparison operator." },
  ftc_deadzone: { THRESH: "Inputs smaller than this (absolute value) become 0." },
};

// ─── Registration ───────────────────────────────────────────────────────────

let registered = false;

/** Defines every FTC block exactly once (safe to call repeatedly). */
export function registerFtcBlocks(): void {
  if (registered) return;
  // Custom field must be registered before any block that uses it is built.
  try {
    BK.fieldRegistry.register(
      "field_ftc_name",
      FieldNameDropdown as unknown as Parameters<typeof BK.fieldRegistry.register>[1]
    );
  } catch {
    /* already registered (e.g. after a hot reload) */
  }

  // Extension that applies per-field hover descriptions on block init.
  try {
    BK.Extensions.register("ftc_field_tooltips", function (this: Blockly.Block) {
      const map = FIELD_TOOLTIPS[this.type];
      if (!map) return;
      for (const input of this.inputList) {
        for (const field of input.fieldRow) {
          const name = field.name;
          if (name && map[name]) field.setTooltip(map[name]);
        }
      }
    });
  } catch {
    /* already registered (e.g. after a hot reload) */
  }

  // Attach the field-tooltip extension to every block definition.
  for (const def of FTC_BLOCK_DEFS) {
    const d = def as { extensions?: string[] };
    if (!d.extensions) d.extensions = [];
    if (!d.extensions.includes("ftc_field_tooltips")) {
      d.extensions.push("ftc_field_tooltips");
    }
  }

  BK.common.defineBlocksWithJsonArray(FTC_BLOCK_DEFS);
  registered = true;
}

// ─── Toolbox builder ─────────────────────────────────────────────────────────

const CATEGORY_ORDER: BlockCategory[] = [
  "Lifecycle",
  "Hardware",
  "Motors",
  "Servos",
  "Gamepad",
  "Telemetry",
  "Logic",
  "Math",
  "Variables",
  "Helpers",
];

interface ShadowNumberInput {
  shadow: { type: "ftc_number"; fields: { NUM: number } };
}

interface ToolboxBlockEntry {
  kind: "block";
  type: string;
  inputs?: Record<string, ShadowNumberInput>;
}

export interface ToolboxJson {
  kind: "categoryToolbox";
  contents: Array<{
    kind: "category";
    name: string;
    colour: string;
    contents: ToolboxBlockEntry[];
  }>;
}

/**
 * Value inputs that should come pre-filled with an editable "0" number block
 * (a Blockly shadow) so students can type a number directly instead of having
 * to drag a separate number block into the socket.
 */
const NUMBER_SHADOW_INPUTS: Record<string, string[]> = {
  ftc_declare_var: ["INIT"],
  ftc_assign: ["VALUE"],
  ftc_change_by: ["VALUE"],
  ftc_set_power: ["VALUE"],
  ftc_set_position: ["VALUE"],
  ftc_set_target: ["VALUE"],
  ftc_set_velocity: ["VALUE"],
  ftc_run_to_position: ["VALUE", "POWER"],
  ftc_sleep: ["MS"],
};

function toolboxBlockEntry(type: string): ToolboxBlockEntry {
  const inputs = NUMBER_SHADOW_INPUTS[type];
  if (!inputs) return { kind: "block", type };
  const entry: ToolboxBlockEntry = { kind: "block", type, inputs: {} };
  for (const name of inputs) {
    entry.inputs![name] = { shadow: { type: "ftc_number", fields: { NUM: 0 } } };
  }
  return entry;
}

/**
 * Build a categorized toolbox containing only the supplied block types.
 * The mandatory root block (`ftc_runopmode`) is never offered in the palette —
 * it always exists on the canvas.
 */
export function buildToolbox(blockTypes: string[]): ToolboxJson {
  const allowed = blockTypes.filter((t) => t !== "ftc_runopmode");
  const byCategory = new Map<BlockCategory, string[]>();
  for (const type of allowed) {
    const cat = CATEGORY_OF[type];
    if (!cat) continue;
    const list = byCategory.get(cat) ?? [];
    list.push(type);
    byCategory.set(cat, list);
  }

  const contents = CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map(
    (cat) => ({
      kind: "category" as const,
      name: cat,
      colour: CATEGORY_COLOUR[cat],
      contents: (byCategory.get(cat) ?? []).map((type) =>
        toolboxBlockEntry(type)
      ),
    })
  );

  return { kind: "categoryToolbox", contents };
}

/**
 * The single, universal toolbox: every category and every block, identical for
 * every challenge (servos, logic, math, etc. are always available).
 */
export function buildFullToolbox(): ToolboxJson {
  return buildToolbox(Object.keys(CATEGORY_OF));
}

/** Shared universal toolbox instance used by every challenge. */
export const FULL_TOOLBOX: ToolboxJson = buildFullToolbox();

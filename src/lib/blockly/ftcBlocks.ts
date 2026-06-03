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
  ftc_set_mode: "Motors",
  ftc_set_target: "Motors",
  ftc_set_velocity: "Motors",
  ftc_motor_position: "Motors",
  ftc_motor_velocity: "Motors",
  ftc_motor_isbusy: "Motors",

  ftc_set_position: "Servos",

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
  ftc_var_get: "Variables",
  ftc_new_timer: "Variables",
  ftc_timer_reset: "Variables",
  ftc_timer_seconds: "Variables",

  ftc_def_normalize: "Helpers",
  ftc_call_normalize: "Helpers",
  ftc_def_tickstodeg: "Helpers",
  ftc_call_tickstodeg: "Helpers",
};

const C = CATEGORY_COLOUR;

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
      { type: "field_input", name: "VAR", text: "motor" },
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
      { type: "field_input", name: "VAR", text: "motor" },
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
      { type: "field_input", name: "VAR", text: "motor" },
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
    type: "ftc_set_mode",
    message0: "set mode of %1 to %2",
    args0: [
      { type: "field_input", name: "VAR", text: "motor" },
      {
        type: "field_dropdown",
        name: "RUNMODE",
        options: [
          ["STOP_AND_RESET_ENCODER", "STOP_AND_RESET_ENCODER"],
          ["RUN_TO_POSITION", "RUN_TO_POSITION"],
          ["RUN_USING_ENCODER", "RUN_USING_ENCODER"],
          ["RUN_WITHOUT_ENCODER", "RUN_WITHOUT_ENCODER"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Set the motor RunMode (encoder behaviour).",
  },
  {
    type: "ftc_set_target",
    message0: "set target position of %1 to %2",
    args0: [
      { type: "field_input", name: "VAR", text: "motor" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Motors,
    tooltip: "Set the encoder target (call before RUN_TO_POSITION).",
  },
  {
    type: "ftc_set_velocity",
    message0: "set velocity of %1 to %2",
    args0: [
      { type: "field_input", name: "VAR", text: "motor" },
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
    args0: [{ type: "field_input", name: "VAR", text: "motor" }],
    output: "Number",
    colour: C.Motors,
    tooltip: "motor.getCurrentPosition() in encoder ticks.",
  },
  {
    type: "ftc_motor_velocity",
    message0: "velocity of %1",
    args0: [{ type: "field_input", name: "VAR", text: "motor" }],
    output: "Number",
    colour: C.Motors,
    tooltip: "motor.getVelocity() in ticks/sec (DcMotorEx).",
  },
  {
    type: "ftc_motor_isbusy",
    message0: "%1 is busy",
    args0: [{ type: "field_input", name: "VAR", text: "motor" }],
    output: "Boolean",
    colour: C.Motors,
    tooltip: "True while a RUN_TO_POSITION move is still running.",
  },

  // ── Servos ──────────────────────────────────────────────────────────────
  {
    type: "ftc_set_position",
    message0: "set position of %1 to %2",
    args0: [
      { type: "field_input", name: "VAR", text: "servo" },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.Servos,
    tooltip: "Move a Servo to a position in [0.0, 1.0].",
  },

  // ── Gamepad ─────────────────────────────────────────────────────────────
  {
    type: "ftc_gamepad_axis",
    message0: "gamepad %1",
    args0: [
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
    colour: C.Gamepad,
    tooltip: "Analog joystick axis value (-1.0 to 1.0).",
  },
  {
    type: "ftc_gamepad_trigger",
    message0: "gamepad %1",
    args0: [
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
    colour: C.Gamepad,
    tooltip: "Analog trigger value (0.0 to 1.0).",
  },
  {
    type: "ftc_gamepad_button",
    message0: "gamepad %1 pressed",
    args0: [
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
    args0: [{ type: "field_input", name: "VAR", text: "touchSensor" }],
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
        ],
      },
      { type: "input_value", name: "B", check: "Number" },
    ],
    output: "Number",
    inputsInline: true,
    colour: C.Math,
    tooltip: "Arithmetic on two numbers.",
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
          ["double", "double"],
          ["int", "int"],
          ["boolean", "boolean"],
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
          ["double", "double"],
          ["int", "int"],
          ["boolean", "boolean"],
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
          ["double", "double"],
          ["int", "int"],
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
      { type: "field_input", name: "NAME", text: "value" },
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
    args0: [{ type: "field_input", name: "NAME", text: "loopCount" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Add one to a counter (name++).",
  },
  {
    type: "ftc_var_get",
    message0: "%1",
    args0: [{ type: "field_input", name: "NAME", text: "value" }],
    output: null,
    colour: C.Variables,
    tooltip: "Read a variable's value.",
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
    args0: [{ type: "field_input", name: "NAME", text: "timer" }],
    previousStatement: null,
    nextStatement: null,
    colour: C.Variables,
    tooltip: "Restart a timer at 0 (before a new timed segment).",
  },
  {
    type: "ftc_timer_seconds",
    message0: "seconds on %1",
    args0: [{ type: "field_input", name: "NAME", text: "timer" }],
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
      { type: "field_input", name: "M0", text: "frontLeft" },
      { type: "field_input", name: "M1", text: "frontRight" },
      { type: "field_input", name: "M2", text: "backLeft" },
      { type: "field_input", name: "M3", text: "backRight" },
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

// ─── Registration ───────────────────────────────────────────────────────────

let registered = false;

/** Defines every FTC block exactly once (safe to call repeatedly). */
export function registerFtcBlocks(): void {
  if (registered) return;
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

export interface ToolboxJson {
  kind: "categoryToolbox";
  contents: Array<{
    kind: "category";
    name: string;
    colour: string;
    contents: Array<{ kind: "block"; type: string }>;
  }>;
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
      contents: (byCategory.get(cat) ?? []).map((type) => ({
        kind: "block" as const,
        type,
      })),
    })
  );

  return { kind: "categoryToolbox", contents };
}

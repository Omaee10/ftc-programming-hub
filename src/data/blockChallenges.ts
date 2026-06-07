/**
 * Per-challenge configuration for the "FTC Blocks" editor mode.
 *
 * Only Beginner + easy-Intermediate challenges expose Blocks mode. Each entry
 * provides:
 *  - a curated `toolbox` (the subset of shared FTC blocks needed to solve it),
 *  - a `starter` Blockly workspace (a scaffold mirroring the Java starter code),
 *  - a `frame` (class name + annotation + imports) used to wrap the generated
 *    Java into a complete, compilable OpMode for the grader.
 *
 * The generated Java is never shown to the user — it only feeds `gradeCode`.
 */

import { buildToolbox, type ToolboxJson } from "@/lib/blockly/ftcBlocks";
import type { JavaFrame } from "@/lib/blockly/javaGenerator";

/** Challenges that offer the Blocks toggle (Beginner + easy Intermediate). */
export const BLOCKS_ENABLED = new Set<number>([
  1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 22, 23, 24,
]);

export type WorkspaceState = Record<string, unknown>;

export interface BlockChallengeConfig {
  toolbox: ToolboxJson;
  starter: WorkspaceState;
  frame: JavaFrame;
}

// ─── Serialization builders ───────────────────────────────────────────────

interface SerNode {
  type: string;
  fields?: Record<string, string>;
  inputs?: Record<string, { block: SerNode }>;
  next?: { block: SerNode };
  x?: number;
  y?: number;
  deletable?: boolean;
}

function chain(nodes: SerNode[]): SerNode | undefined {
  if (nodes.length === 0) return undefined;
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].next = { block: nodes[i + 1] };
  }
  return nodes[0];
}

function dev(type: string, config: string, varName: string): SerNode {
  return { type: "ftc_get_hardware", fields: { TYPE: type, CONFIG: config, VAR: varName } };
}

const initTelemetry: SerNode = {
  type: "ftc_init_telemetry",
  fields: { MSG: "Initialized" },
};
const waitForStart: SerNode = { type: "ftc_wait_for_start" };
const whileActiveEmpty = (): SerNode => ({ type: "ftc_while_active" });
const whileInitEmpty = (): SerNode => ({ type: "ftc_while_init" });

/** Assemble a starter workspace from device blocks + pre/post-start blocks. */
function starter(opts: {
  devices?: SerNode[];
  pre?: SerNode[];
  post?: SerNode[];
}): WorkspaceState {
  const body = [
    ...(opts.devices ?? []),
    initTelemetry,
    ...(opts.pre ?? []),
    waitForStart,
    ...(opts.post ?? []),
  ];
  const root: SerNode = {
    type: "ftc_runopmode",
    x: 24,
    y: 24,
    deletable: false,
  };
  const first = chain(body);
  if (first) root.inputs = { BODY: { block: first } };
  return { blocks: { languageVersion: 0, blocks: [root] } };
}

// ─── Shared frame pieces ───────────────────────────────────────────────────

const IMPORTS: string[] = [
  "import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;",
  "import com.qualcomm.robotcore.eventloop.opmode.TeleOp;",
  "import com.qualcomm.robotcore.eventloop.opmode.Autonomous;",
  "import com.qualcomm.robotcore.hardware.DcMotor;",
  "import com.qualcomm.robotcore.hardware.DcMotorEx;",
  "import com.qualcomm.robotcore.hardware.DcMotorSimple;",
  "import com.qualcomm.robotcore.hardware.Servo;",
  "import com.qualcomm.robotcore.hardware.CRServo;",
  "import com.qualcomm.robotcore.hardware.TouchSensor;",
  "import com.qualcomm.robotcore.util.ElapsedTime;",
  "import com.qualcomm.robotcore.util.Range;",
];

function frame(
  className: string,
  kind: "TeleOp" | "Autonomous",
  name: string,
  group: string
): JavaFrame {
  const annotation =
    kind === "Autonomous"
      ? `@Autonomous(name = "${name} (Blocks)", group = "${group}")`
      : `@TeleOp(name = "${name} (Blocks)", group = "${group}")`;
  return { className, annotation, imports: IMPORTS };
}

// ─── Reusable toolbox fragments ────────────────────────────────────────────

const HW = ["ftc_get_hardware"];
const LIFE_LOOP = ["ftc_wait_for_start", "ftc_while_active"];
const COND_LOOP = ["ftc_wait_for_start", "ftc_while_condition"];
const TELE = ["ftc_telemetry_add", "ftc_telemetry_addline", "ftc_telemetry_update"];
const MATH = ["ftc_number", "ftc_arith", "ftc_negate"];
const GP_DRIVE = ["ftc_gamepad_axis", "ftc_negate", "ftc_deadzone"];
const VARS = ["ftc_declare_var", "ftc_assign", "ftc_var_get"];
const LOGIC = ["ftc_if", "ftc_compare", "ftc_and", "ftc_not", "ftc_boolean"];
const ENCODER = ["ftc_reset_encoder", "ftc_run_to_position", "ftc_set_target", "ftc_motor_position", "ftc_motor_isbusy", "ftc_idle"];
const TIMER = ["ftc_new_timer", "ftc_timer_reset", "ftc_timer_seconds"];

const MECANUM_DEVICES = [
  dev("DcMotorEx", "front_left", "frontLeft"),
  dev("DcMotorEx", "front_right", "frontRight"),
  dev("DcMotorEx", "back_left", "backLeft"),
  dev("DcMotorEx", "back_right", "backRight"),
];

// ─── Per-challenge configs ──────────────────────────────────────────────────

const CONFIGS: Record<number, BlockChallengeConfig> = {
  // 1 — Basic TeleOp
  1: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_power",
      "ftc_set_direction",
      "ftc_set_zeropower",
      ...GP_DRIVE,
      "ftc_number",
      "ftc_var_get",
      "ftc_declare_var",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "left_motor", "leftMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("BasicTeleOpBlocks", "TeleOp", "Basic TeleOp", "Challenge 1"),
  },

  // 2 — Encoder Basics
  2: {
    toolbox: buildToolbox([
      ...HW,
      ...ENCODER,
      "ftc_set_power",
      ...COND_LOOP,
      "ftc_number",
      "ftc_var_get",
      ...TELE,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "drive_motor", "driveMotor")],
    }),
    frame: frame("EncoderTargetBlocks", "Autonomous", "Encoder Target", "Challenge 2"),
  },

  // 3 — Autonomous Timer
  3: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_power",
      "ftc_set_direction",
      ...TIMER,
      ...COND_LOOP,
      "ftc_compare",
      "ftc_number",
      "ftc_var_get",
      ...TELE,
    ]),
    starter: starter({
      devices: [
        dev("DcMotorEx", "left_motor", "leftMotor"),
        dev("DcMotorEx", "right_motor", "rightMotor"),
      ],
    }),
    frame: frame("AutonomousTimerBlocks", "Autonomous", "Autonomous Timer", "Challenge 3"),
  },

  // 6 — Dual Motor TeleOp
  6: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_power",
      "ftc_set_direction",
      "ftc_gamepad_axis",
      "ftc_negate",
      "ftc_deadzone",
      ...MATH,
      ...VARS,
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [
        dev("DcMotorEx", "left_drive", "leftMotor"),
        dev("DcMotorEx", "right_drive", "rightMotor"),
      ],
      post: [whileActiveEmpty()],
    }),
    frame: frame("DualMotorTeleOpBlocks", "TeleOp", "Dual Motor TeleOp", "Challenge 6"),
  },

  // 7 — Servo Position Control
  7: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_position",
      "ftc_servo_position",
      "ftc_gamepad_button",
      ...LOGIC,
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("Servo", "blocker_servo", "blockerServo")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("ServoControlBlocks", "TeleOp", "Servo Position Control", "Challenge 7"),
  },

  // 8 — CRServo Intake
  8: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_power",
      "ftc_gamepad_trigger",
      "ftc_gamepad_button",
      ...LOGIC,
      ...MATH,
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("CRServo", "intake_servo", "intakeServo")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("CRServoIntakeBlocks", "TeleOp", "CRServo Intake", "Challenge 8"),
  },

  // 9 — Telemetry Dashboard
  9: {
    toolbox: buildToolbox([
      ...HW,
      ...TIMER,
      "ftc_declare_var",
      "ftc_increment",
      "ftc_var_get",
      "ftc_motor_position",
      ...TELE,
      "ftc_number",
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "drive_motor", "driveMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("TelemetryDashboardBlocks", "TeleOp", "Telemetry Dashboard", "Challenge 9"),
  },

  // 10 — Button Debouncing
  10: {
    toolbox: buildToolbox([
      ...HW,
      ...VARS,
      "ftc_gamepad_button",
      ...LOGIC,
      "ftc_ternary",
      "ftc_set_power",
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("CRServo", "intake_servo", "intakeServo")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("ButtonDebounceBlocks", "TeleOp", "Button Debouncing", "Challenge 10"),
  },

  // 11 — ElapsedTime Patterns
  11: {
    toolbox: buildToolbox([
      ...HW,
      ...TIMER,
      ...COND_LOOP,
      "ftc_compare",
      "ftc_set_power",
      "ftc_idle",
      "ftc_number",
      "ftc_var_get",
      ...TELE,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "drive_motor", "driveMotor")],
    }),
    frame: frame("ElapsedTimeBlocks", "TeleOp", "ElapsedTime Patterns", "Challenge 11"),
  },

  // 12 — Motor Zero Power Behavior
  12: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_zeropower",
      "ftc_set_power",
      "ftc_gamepad_button",
      ...LOGIC,
      ...VARS,
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "drive_motor", "driveMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("ZeroPowerBlocks", "TeleOp", "Zero Power Behavior", "Challenge 12"),
  },

  // 13 — Init-Loop Configuration
  13: {
    toolbox: buildToolbox([
      ...VARS,
      "ftc_gamepad_button",
      ...LOGIC,
      "ftc_while_init",
      "ftc_while_active",
      "ftc_wait_for_start",
      "ftc_ternary",
      ...TELE,
    ]),
    starter: starter({
      pre: [whileInitEmpty()],
      post: [whileActiveEmpty()],
    }),
    frame: frame("InitLoopBlocks", "TeleOp", "Init-Loop Configuration", "Challenge 13"),
  },

  // 14 — Encoder-Based Drive Distance
  14: {
    toolbox: buildToolbox([
      ...HW,
      ...ENCODER,
      "ftc_set_power",
      ...COND_LOOP,
      "ftc_number",
      "ftc_var_get",
      ...TELE,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "drive_motor", "driveMotor")],
    }),
    frame: frame("EncoderDriveBlocks", "Autonomous", "Encoder Drive Distance", "Challenge 14"),
  },

  // 16 — REV Touch Sensor Homing
  16: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_power",
      "ftc_reset_encoder",
      "ftc_touch_pressed",
      "ftc_not",
      ...COND_LOOP,
      "ftc_idle",
      "ftc_number",
      ...TELE,
    ]),
    starter: starter({
      devices: [
        dev("DcMotorEx", "turret_motor", "turretMotor"),
        dev("TouchSensor", "touch_sensor", "touchSensor"),
      ],
    }),
    frame: frame("TouchHomingBlocks", "TeleOp", "Touch Sensor Homing", "Challenge 16"),
  },

  // 17 — Basic 4-Motor Mecanum
  17: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_direction",
      "ftc_set_power",
      "ftc_gamepad_axis",
      "ftc_negate",
      "ftc_deadzone",
      ...VARS,
      "ftc_arith",
      "ftc_number",
      "ftc_def_normalize",
      "ftc_call_normalize",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: MECANUM_DEVICES,
      post: [whileActiveEmpty()],
    }),
    frame: frame("MecanumBlocks", "TeleOp", "Basic Mecanum", "Challenge 17"),
  },

  // 18 — Mecanum Power Normalization
  18: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_def_normalize",
      "ftc_call_normalize",
      "ftc_set_direction",
      ...VARS,
      "ftc_gamepad_axis",
      "ftc_negate",
      "ftc_arith",
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: MECANUM_DEVICES,
      post: [whileActiveEmpty()],
    }),
    frame: frame("MecanumNormalizeBlocks", "TeleOp", "Mecanum Normalization", "Challenge 18"),
  },

  // 20 — Mecanum Strafing Test
  20: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_set_direction",
      "ftc_set_power",
      "ftc_sleep",
      ...VARS,
      "ftc_number",
      ...TELE,
      "ftc_wait_for_start",
    ]),
    starter: starter({
      devices: MECANUM_DEVICES,
    }),
    frame: frame("StrafeTestBlocks", "Autonomous", "Mecanum Strafing Test", "Challenge 20"),
  },

  // 21 — Velocity-Magnitude Braking
  21: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_declare_const",
      ...VARS,
      "ftc_gamepad_axis",
      "ftc_negate",
      "ftc_math_binary",
      "ftc_arith",
      "ftc_number",
      ...LOGIC,
      "ftc_set_power",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: MECANUM_DEVICES,
      post: [whileActiveEmpty()],
    }),
    frame: frame("VelocityBrakingBlocks", "TeleOp", "Velocity Braking", "Challenge 21"),
  },

  // 22 — DcMotorEx Velocity Control
  22: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_reset_encoder",
      "ftc_set_velocity",
      "ftc_motor_velocity",
      "ftc_gamepad_button",
      ...LOGIC,
      ...VARS,
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "shooter_motor", "shooterMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("VelocityControlBlocks", "TeleOp", "Velocity Control", "Challenge 22"),
  },

  // 23 — Simple P Controller
  23: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_declare_const",
      ...VARS,
      "ftc_motor_position",
      "ftc_arith",
      "ftc_math_binary",
      "ftc_number",
      "ftc_set_power",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "turret_motor", "turretMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("PControllerBlocks", "TeleOp", "Simple P Controller", "Challenge 23"),
  },

  // 24 — Encoder Ticks to Degrees
  24: {
    toolbox: buildToolbox([
      ...HW,
      "ftc_declare_const",
      "ftc_def_tickstodeg",
      "ftc_call_tickstodeg",
      "ftc_motor_position",
      ...VARS,
      "ftc_number",
      ...TELE,
      ...LIFE_LOOP,
    ]),
    starter: starter({
      devices: [dev("DcMotorEx", "turret_motor", "turretMotor")],
      post: [whileActiveEmpty()],
    }),
    frame: frame("TicksToDegreesBlocks", "TeleOp", "Ticks to Degrees", "Challenge 24"),
  },
};

// ─── Public accessors ────────────────────────────────────────────────────────

export function isBlocksEnabled(challengeId: number): boolean {
  return BLOCKS_ENABLED.has(challengeId) && challengeId in CONFIGS;
}

export function getBlockConfig(challengeId: number): BlockChallengeConfig | null {
  return CONFIGS[challengeId] ?? null;
}

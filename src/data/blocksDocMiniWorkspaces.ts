/**
 * Tiny per-block Blockly workspace states used to render inline block
 * visuals next to each Java example in the FTC Blocks documentation page.
 *
 * Each entry shows only the one (or two) blocks being described — no
 * runOpMode wrapper — so the visual is clear and small.
 */

import type { WorkspaceState } from "@/data/blockChallenges";

/** Helper to build a minimal single-block workspace at a fixed origin. */
function ws(block: object): WorkspaceState {
  return { blocks: { languageVersion: 0, blocks: [{ x: 20, y: 20, ...block }] } };
}

export const MINI_WORKSPACES: Record<string, WorkspaceState> = {

  // ── Motors ──────────────────────────────────────────────────────────────

  motor_set_power: ws({
    type: "ftc_set_power",
    fields: { VAR: "motor" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "0.8" } } } },
  }),

  motor_set_direction: ws({
    type: "ftc_set_direction",
    fields: { VAR: "motor", DIR: "REVERSE" },
  }),

  motor_set_zeropower: ws({
    type: "ftc_set_zeropower",
    fields: { VAR: "motor", MODE: "BRAKE" },
  }),

  motor_reset_encoder: ws({
    type: "ftc_reset_encoder",
    fields: { VAR: "motor" },
  }),

  motor_set_target: ws({
    type: "ftc_set_target",
    fields: { VAR: "motor" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "1000" } } } },
  }),

  motor_run_to_position: ws({
    type: "ftc_run_to_position",
    fields: { VAR: "motor" },
    inputs: {
      VALUE: { block: { type: "ftc_number", fields: { NUM: "1000" } } },
      POWER: { block: { type: "ftc_number", fields: { NUM: "0.6" } } },
    },
  }),

  motor_isbusy: ws({
    type: "ftc_motor_isbusy",
    fields: { VAR: "motor" },
  }),

  motor_get_position: ws({
    type: "ftc_motor_position",
    fields: { VAR: "motor" },
  }),

  motor_set_velocity: ws({
    type: "ftc_set_velocity",
    fields: { VAR: "motor" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "1500" } } } },
  }),

  // ── Servos ──────────────────────────────────────────────────────────────

  servo_set_position: ws({
    type: "ftc_set_position",
    fields: { VAR: "servo" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "0.5" } } } },
  }),

  servo_set_power: ws({
    type: "ftc_set_power",
    fields: { VAR: "crServo" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "1.0" } } } },
  }),

  // ── Gamepad ─────────────────────────────────────────────────────────────

  gamepad_left_stick_y: ws({
    type: "ftc_gamepad_axis",
    fields: { PAD: "gamepad1", AXIS: "left_stick_y" },
  }),

  gamepad_left_stick_x: ws({
    type: "ftc_gamepad_axis",
    fields: { PAD: "gamepad1", AXIS: "left_stick_x" },
  }),

  gamepad_right_stick_y: ws({
    type: "ftc_gamepad_axis",
    fields: { PAD: "gamepad1", AXIS: "right_stick_y" },
  }),

  gamepad_right_stick_x: ws({
    type: "ftc_gamepad_axis",
    fields: { PAD: "gamepad1", AXIS: "right_stick_x" },
  }),

  gamepad_trigger: ws({
    type: "ftc_gamepad_trigger",
    fields: { PAD: "gamepad1", TRIG: "right_trigger" },
  }),

  gamepad_button: ws({
    type: "ftc_gamepad_button",
    fields: { PAD: "gamepad1", BTN: "a" },
  }),

  gamepad_bumper: ws({
    type: "ftc_gamepad_button",
    fields: { PAD: "gamepad1", BTN: "left_bumper" },
  }),

  gamepad_dpad: ws({
    type: "ftc_gamepad_button",
    fields: { PAD: "gamepad1", BTN: "dpad_up" },
  }),

  // ── Telemetry ───────────────────────────────────────────────────────────

  telemetry_add: ws({
    type: "ftc_telemetry_add",
    fields: { CAPTION: "Power" },
    inputs: { VALUE: { block: { type: "ftc_motor_position", fields: { VAR: "motor" } } } },
  }),

  telemetry_addline: ws({
    type: "ftc_telemetry_addline",
    fields: { TEXT: "-- Drive Status --" },
  }),

  telemetry_update: ws({
    type: "ftc_telemetry_update",
  }),

  // ── Sensors ─────────────────────────────────────────────────────────────

  sensor_touch: ws({
    type: "ftc_touch_pressed",
    fields: { VAR: "touchSensor" },
  }),

  // ── Math ────────────────────────────────────────────────────────────────

  math_number: ws({
    type: "ftc_number",
    fields: { NUM: "0.8" },
  }),

  math_arith: ws({
    type: "ftc_arith",
    fields: { OP: "+" },
    inputs: {
      A: { block: { type: "ftc_number", fields: { NUM: "1" } } },
      B: { block: { type: "ftc_number", fields: { NUM: "2" } } },
    },
  }),

  math_negate: ws({
    type: "ftc_negate",
    inputs: {
      VALUE: { block: { type: "ftc_gamepad_axis", fields: { PAD: "gamepad1", AXIS: "left_stick_y" } } },
    },
  }),

  math_unary: ws({
    type: "ftc_math_unary",
    fields: { FN: "abs" },
    inputs: { VALUE: { block: { type: "ftc_number", fields: { NUM: "-0.5" } } } },
  }),

  math_binary: ws({
    type: "ftc_math_binary",
    fields: { FN: "max" },
    inputs: {
      A: { block: { type: "ftc_number", fields: { NUM: "-1.0" } } },
      B: { block: { type: "ftc_number", fields: { NUM: "1.0" } } },
    },
  }),

  math_deadzone: ws({
    type: "ftc_deadzone",
    fields: { THRESH: "0.05" },
    inputs: {
      VALUE: { block: { type: "ftc_gamepad_axis", fields: { PAD: "gamepad1", AXIS: "left_stick_y" } } },
    },
  }),

  math_ternary: ws({
    type: "ftc_ternary",
    inputs: {
      COND: { block: { type: "ftc_gamepad_button", fields: { PAD: "gamepad1", BTN: "right_bumper" } } },
      A: { block: { type: "ftc_number", fields: { NUM: "0.8" } } },
      B: { block: { type: "ftc_number", fields: { NUM: "0.0" } } },
    },
  }),
};

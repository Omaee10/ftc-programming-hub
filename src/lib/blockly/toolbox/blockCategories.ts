/** All FTC block types grouped by toolbox category. */
export const BLOCK_CATEGORIES = {
  structure: {
    name: "Structure",
    colour: "#6366f1",
    blocks: [
      { kind: "block", type: "ftc_declare_dc_motor" },
      { kind: "block", type: "ftc_declare_dc_motor_ex" },
      { kind: "block", type: "ftc_declare_servo" },
      { kind: "block", type: "ftc_declare_cr_servo" },
      { kind: "block", type: "ftc_declare_elapsed_time" },
      { kind: "block", type: "ftc_declare_boolean" },
      { kind: "block", type: "ftc_declare_int" },
      { kind: "block", type: "ftc_declare_double" },
      { kind: "block", type: "ftc_private_double_method" },
      { kind: "block", type: "ftc_comment" },
    ],
  },
  motors: {
    name: "Motors",
    colour: "#0ea5e9",
    blocks: [
      { kind: "block", type: "ftc_hw_get_dc_motor" },
      { kind: "block", type: "ftc_hw_get_dc_motor_ex" },
      { kind: "block", type: "ftc_set_direction" },
      { kind: "block", type: "ftc_set_zero_power_behavior" },
      { kind: "block", type: "ftc_motor_set_power" },
      { kind: "block", type: "ftc_motor_set_power_negated_stick" },
      { kind: "block", type: "ftc_motor_set_power_helper" },
      { kind: "block", type: "ftc_motor_set_power_stick_boost" },
      { kind: "block", type: "ftc_encoder_move" },
      { kind: "block", type: "ftc_run_using_encoder" },
      { kind: "block", type: "ftc_set_velocity" },
      { kind: "block", type: "ftc_motors_stop_zero" },
      { kind: "block", type: "ftc_number" },
    ],
  },
  servos: {
    name: "Servos",
    colour: "#14b8a6",
    blocks: [
      { kind: "block", type: "ftc_hw_get_servo" },
      { kind: "block", type: "ftc_hw_get_cr_servo" },
      { kind: "block", type: "ftc_servo_set_position" },
      { kind: "block", type: "ftc_servo_set_position_button" },
      { kind: "block", type: "ftc_cr_servo_set_power" },
      { kind: "block", type: "ftc_cr_servo_set_power_trigger" },
      { kind: "block", type: "ftc_sleep_after_servo" },
    ],
  },
  gamepad: {
    name: "Gamepad",
    colour: "#f59e0b",
    blocks: [
      { kind: "block", type: "ftc_motor_set_power_negated_stick" },
      { kind: "block", type: "ftc_button_toggle" },
      { kind: "block", type: "ftc_if_button" },
      { kind: "block", type: "ftc_servo_set_position_button" },
      { kind: "block", type: "ftc_cr_servo_set_power_trigger" },
      { kind: "block", type: "ftc_declare_boost_if_bumper" },
      { kind: "block", type: "ftc_motor_set_power_stick_boost" },
    ],
  },
  timing: {
    name: "Timing",
    colour: "#a855f7",
    blocks: [
      { kind: "block", type: "ftc_elapsed_time_new" },
      { kind: "block", type: "ftc_timer_reset" },
      { kind: "block", type: "ftc_while_timer_seconds" },
      { kind: "block", type: "ftc_sleep" },
      { kind: "block", type: "ftc_sleep_after_servo" },
    ],
  },
  telemetry: {
    name: "Telemetry",
    colour: "#22c55e",
    blocks: [
      { kind: "block", type: "ftc_telemetry_ready" },
      { kind: "block", type: "ftc_telemetry_add" },
      { kind: "block", type: "ftc_telemetry_update" },
    ],
  },
  control: {
    name: "Control",
    colour: "#ec4899",
    blocks: [
      { kind: "block", type: "ftc_if_button" },
      { kind: "block", type: "ftc_declare_boost_if_bumper" },
      { kind: "block", type: "ftc_loop_count_increment" },
      { kind: "block", type: "ftc_button_toggle" },
    ],
  },
  advanced: {
    name: "Advanced",
    colour: "#ef4444",
    blocks: [
      { kind: "block", type: "ftc_mecanum_teleop" },
      { kind: "block", type: "ftc_pid_p_loop" },
      { kind: "block", type: "ftc_road_runner_trajectory" },
      { kind: "block", type: "ftc_pedro_follow_path" },
      { kind: "block", type: "ftc_limelight_poll" },
    ],
  },
} as const;

export type BlockTypeId =
  | (typeof BLOCK_CATEGORIES.structure.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.motors.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.servos.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.gamepad.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.timing.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.telemetry.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.control.blocks)[number]["type"]
  | (typeof BLOCK_CATEGORIES.advanced.blocks)[number]["type"];

export const ALL_BLOCK_TYPES: string[] = Object.values(BLOCK_CATEGORIES).flatMap(
  (c) => c.blocks.map((b) => b.type)
);

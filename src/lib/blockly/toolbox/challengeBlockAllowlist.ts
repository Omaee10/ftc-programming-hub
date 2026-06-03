import type { Challenge } from "@/data/challenges";
import { ALL_BLOCK_TYPES } from "@/lib/blockly/toolbox/blockCategories";

/** Hardware config names per challenge (mirrors ChallengeRubrics.HARDWARE_NAMES). */
export const CHALLENGE_HARDWARE: Record<number, string[]> = {
  1: ["left_motor"],
  2: ["drive_motor"],
  3: ["left_motor", "right_motor"],
  6: ["left_drive", "right_drive"],
  7: ["blocker_servo"],
  8: ["intake_servo"],
  9: ["drive_motor"],
  10: ["intake_servo"],
  11: ["drive_motor"],
  12: ["drive_motor"],
  14: ["drive_motor"],
  15: ["drive_motor"],
  16: ["turret_motor", "touch_sensor"],
  17: ["front_left", "front_right", "back_left", "back_right"],
  18: ["front_left", "front_right", "back_left", "back_right"],
  19: ["front_left", "front_right", "back_left", "back_right"],
  21: ["front_left", "front_right", "back_left", "back_right"],
  22: ["shooter_motor"],
  23: ["turret_motor"],
  24: ["turret_motor"],
  26: ["shooter_motor"],
  27: ["drive_motor"],
  28: ["transfer_motor"],
  29: ["turret_motor", "touch_sensor"],
  30: ["left_drive", "right_drive", "shooter_motor"],
  31: ["left_drive", "right_drive", "shooter_motor"],
  32: ["left_drive", "right_drive"],
  37: ["odo"],
  38: ["odo"],
  39: ["limelight"],
  40: ["limelight"],
  41: ["limelight"],
  42: ["limelight", "turret_motor"],
  43: ["limelight"],
  51: ["drive_motor"],
  54: ["drive_motor"],
  55: ["drive_motor"],
  56: ["drive_motor"],
};

const BASE_BLOCKS = [
  "ftc_declare_dc_motor",
  "ftc_hw_get_dc_motor",
  "ftc_set_direction",
  "ftc_motor_set_power_negated_stick",
  "ftc_motor_set_power",
  "ftc_telemetry_ready",
  "ftc_telemetry_add",
  "ftc_telemetry_update",
  "ftc_comment",
];

const TAG_BLOCKS: Record<string, string[]> = {
  teleop: ["ftc_motor_set_power_negated_stick", "ftc_button_toggle", "ftc_if_button"],
  motors: ["ftc_set_zero_power_behavior", "ftc_set_direction"],
  gamepad: [
    "ftc_button_toggle",
    "ftc_if_button",
    "ftc_cr_servo_set_power_trigger",
    "ftc_servo_set_position_button",
  ],
  encoders: ["ftc_encoder_move"],
  "run_to_position": ["ftc_encoder_move"],
  autonomous: ["ftc_elapsed_time_new", "ftc_while_timer_seconds", "ftc_sleep", "ftc_motors_stop_zero"],
  "elapsedtime": ["ftc_elapsed_time_new", "ftc_timer_reset", "ftc_while_timer_seconds"],
  timing: ["ftc_elapsed_time_new", "ftc_while_timer_seconds", "ftc_sleep"],
  servo: ["ftc_declare_servo", "ftc_hw_get_servo", "ftc_servo_set_position", "ftc_sleep_after_servo"],
  crservo: ["ftc_declare_cr_servo", "ftc_hw_get_cr_servo", "ftc_cr_servo_set_power", "ftc_cr_servo_set_power_trigger"],
  intake: ["ftc_declare_cr_servo", "ftc_cr_servo_set_power_trigger"],
  trigger: ["ftc_cr_servo_set_power_trigger"],
  debouncing: ["ftc_declare_boolean", "ftc_button_toggle"],
  "state toggle": ["ftc_declare_boolean", "ftc_button_toggle"],
  telemetry: ["ftc_telemetry_add", "ftc_telemetry_update"],
  "mecanum drive": ["ftc_declare_dc_motor", "ftc_mecanum_teleop"],
  "4 motors": ["ftc_mecanum_teleop"],
  dcmotorex: ["ftc_declare_dc_motor_ex", "ftc_hw_get_dc_motor_ex", "ftc_run_using_encoder", "ftc_set_velocity"],
  flywheel: ["ftc_declare_dc_motor_ex", "ftc_run_using_encoder", "ftc_set_velocity"],
  "velocity control": ["ftc_run_using_encoder", "ftc_set_velocity"],
  pid: ["ftc_pid_p_loop"],
  "pid control": ["ftc_pid_p_loop"],
  "road runner": ["ftc_road_runner_trajectory"],
  splines: ["ftc_road_runner_trajectory"],
  "pedro pathing": ["ftc_pedro_follow_path"],
  bezier: ["ftc_pedro_follow_path"],
  pathchain: ["ftc_pedro_follow_path"],
  vision: ["ftc_limelight_poll"],
  limelight: ["ftc_limelight_poll"],
  apriltag: ["ftc_limelight_poll"],
  scope: ["ftc_declare_double", "ftc_declare_boost_if_bumper", "ftc_motor_set_power_stick_boost"],
  methods: ["ftc_private_double_method", "ftc_motor_set_power_helper"],
  "java basics": ["ftc_declare_int", "ftc_loop_count_increment", "ftc_declare_double"],
};

function tagsForChallenge(challenge: Challenge): string[] {
  return [
    ...challenge.tags.map((t) => t.toLowerCase()),
    challenge.difficulty.toLowerCase(),
  ];
}

/**
 * Returns allowed block type ids for a challenge (all 1–56 + mentor by tags).
 */
export function getAllowedBlocksForChallenge(challenge: Challenge): Set<string> {
  const allowed = new Set<string>(BASE_BLOCKS);

  for (const tag of tagsForChallenge(challenge)) {
    for (const [key, blocks] of Object.entries(TAG_BLOCKS)) {
      if (tag.includes(key)) blocks.forEach((b) => allowed.add(b));
    }
  }

  const hw = CHALLENGE_HARDWARE[challenge.id];
  if (hw?.some((n) => n.includes("servo") && !n.includes("cr"))) {
    allowed.add("ftc_declare_servo");
    allowed.add("ftc_hw_get_servo");
    allowed.add("ftc_servo_set_position");
  }
  if (hw?.some((n) => n.includes("intake") || challenge.id === 8 || challenge.id === 10)) {
    allowed.add("ftc_declare_cr_servo");
    allowed.add("ftc_hw_get_cr_servo");
  }
  if (hw && hw.length >= 4) {
    allowed.add("ftc_mecanum_teleop");
  }

  // Per-id overrides for rubric-specific needs
  const idExtras: Record<number, string[]> = {
    1: ["ftc_motor_set_power_negated_stick", "ftc_set_direction"],
    2: ["ftc_encoder_move"],
    3: ["ftc_elapsed_time_new", "ftc_while_timer_seconds", "ftc_motors_stop_zero"],
    4: ["ftc_road_runner_trajectory"],
    5: ["ftc_pedro_follow_path"],
    6: ["ftc_motor_set_power_negated_stick"],
    7: ["ftc_declare_servo", "ftc_servo_set_position", "ftc_servo_set_position_button"],
    8: ["ftc_declare_cr_servo", "ftc_cr_servo_set_power_trigger"],
    12: ["ftc_if_button", "ftc_declare_boolean"],
    22: ["ftc_declare_dc_motor_ex", "ftc_run_using_encoder", "ftc_set_velocity"],
    23: ["ftc_pid_p_loop"],
    39: ["ftc_limelight_poll"],
    42: ["ftc_limelight_poll", "ftc_pid_p_loop"],
    54: ["ftc_declare_int", "ftc_loop_count_increment"],
    55: ["ftc_private_double_method", "ftc_motor_set_power_helper"],
    56: ["ftc_declare_double", "ftc_declare_boost_if_bumper", "ftc_motor_set_power_stick_boost"],
  };
  (idExtras[challenge.id] ?? []).forEach((b) => allowed.add(b));

  // Mentor / unknown id: allow full library
  if (challenge.id > 56 || challenge.id < 1) {
    ALL_BLOCK_TYPES.forEach((b) => allowed.add(b));
  }

  return allowed;
}

/**
 * Robot config hardware names per challenge id.
 * Kept in sync with ChallengeRubrics.HARDWARE_NAMES in the Java grader.
 */
export const CHALLENGE_HARDWARE: Record<number, readonly string[]> = {
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
} as const;

export function getChallengeHardware(id: number): string[] {
  return [...(CHALLENGE_HARDWARE[id] ?? ["drive_motor"])];
}

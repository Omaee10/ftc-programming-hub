import type { Challenge } from "@/data/challenges";

export type ToolboxCategoryKey =
  | "linearOpMode"
  | "gamepad"
  | "actuators"
  | "dcMotor"
  | "servo"
  | "utilities"
  | "loops"
  | "logic"
  | "math";

/** Hardware config names per challenge (mirrors ChallengeRubrics). */
export const CHALLENGE_HARDWARE: Record<number, string[]> = {
  1: ["left_motor"],
  2: ["drive_motor"],
  3: ["left_motor", "right_motor"],
  6: ["left_drive", "right_drive"],
  7: ["blocker_servo"],
  8: ["intake_servo"],
  9: ["drive_motor"],
  10: ["intake_servo"],
  17: ["front_left", "front_right", "back_left", "back_right"],
  22: ["shooter_motor"],
  23: ["turret_motor"],
  54: ["drive_motor"],
  55: ["drive_motor"],
  56: ["drive_motor"],
};

export function getAllowedCategories(challenge: Challenge): Set<ToolboxCategoryKey> {
  const cats = new Set<ToolboxCategoryKey>([
    "linearOpMode",
    "gamepad",
    "actuators",
    "dcMotor",
    "utilities",
    "loops",
    "logic",
    "math",
  ]);

  const tags = challenge.tags.map((t) => t.toLowerCase()).join(" ");
  const hw = CHALLENGE_HARDWARE[challenge.id] ?? [];

  if (tags.includes("servo") || hw.some((n) => n.includes("servo") && !n.includes("intake"))) {
    cats.add("servo");
  }
  if (tags.includes("crservo") || tags.includes("intake") || challenge.id === 8 || challenge.id === 10) {
    cats.add("servo");
  }
  if (tags.includes("encoder") || tags.includes("run_to_position")) {
    // dcMotor toolbox already has encoder blocks
  }
  if (tags.includes("dcmotorex") || tags.includes("flywheel") || tags.includes("velocity")) {
    // ex blocks in dcMotor list
  }

  if (challenge.id > 56 || challenge.id < 1) {
    cats.add("servo");
  }

  return cats;
}

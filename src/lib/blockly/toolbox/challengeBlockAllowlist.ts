import type { Challenge } from "@/data/challenges";
import { CHALLENGE_HARDWARE, getChallengeHardware } from "@/lib/challengeHardware";

export type ToolboxCategoryKey =
  | "linearOpMode"
  | "gamepad"
  | "actuators"
  | "dcMotor"
  | "servo"
  | "sensors"
  | "utilities"
  | "loops"
  | "logic"
  | "math";

/** Re-export for Blockly device fields. */
export { CHALLENGE_HARDWARE, getChallengeHardware };

const PER_CHALLENGE_EXTRA_CATEGORIES: Record<number, ToolboxCategoryKey[]> = {
  10: ["logic"],
  23: ["logic", "math"],
  24: ["math"],
  25: ["math"],
  33: ["math"],
  34: ["math"],
  35: ["math"],
  49: ["math"],
  50: ["math"],
  51: ["math"],
  52: ["math"],
};

export function challengeUsesGamepad(challenge: Challenge): boolean {
  if (challenge.blocksSupport === "java-only") return false;
  const tags = challenge.tags.map((t) => t.toLowerCase()).join(" ");
  if (tags.includes("teleop") || tags.includes("gamepad")) return true;
  if (tags.includes("autonomous") && !tags.includes("teleop")) return false;
  if (challenge.courseTrack === "teleop" || challenge.courseTrack === "intro") {
    return tags.includes("telemetry") || tags.includes("scope");
  }
  return challenge.courseTrack !== "autonomous" && challenge.courseTrack !== "sensors";
}

export function challengeUsesSensors(challenge: Challenge): boolean {
  const tags = challenge.tags.map((t) => t.toLowerCase()).join(" ");
  return (
    tags.includes("touchsensor") ||
    tags.includes("touch sensor") ||
    tags.includes("color") ||
    tags.includes("distance") ||
    tags.includes("imu") ||
    challenge.courseTrack === "sensors"
  );
}

export function getAllowedCategories(challenge: Challenge): Set<ToolboxCategoryKey> {
  const cats = new Set<ToolboxCategoryKey>([
    "linearOpMode",
    "actuators",
    "dcMotor",
    "utilities",
    "loops",
    "logic",
    "math",
  ]);

  if (challenge.blocksSupport !== "java-only" && challengeUsesGamepad(challenge)) {
    cats.add("gamepad");
  }

  const tags = challenge.tags.map((t) => t.toLowerCase()).join(" ");
  const hw = getChallengeHardware(challenge.id);

  if (
    tags.includes("servo") ||
    hw.some((n) => n.includes("servo") && !n.includes("intake"))
  ) {
    cats.add("servo");
  }
  if (
    tags.includes("crservo") ||
    tags.includes("intake") ||
    hw.some((n) => n.includes("intake"))
  ) {
    cats.add("servo");
  }

  if (challengeUsesSensors(challenge)) {
    cats.add("sensors");
  }

  if (tags.includes("dcmotorex") || tags.includes("flywheel") || tags.includes("velocity")) {
    // DcMotorEx blocks live in dcMotor category list
  }

  for (const extra of PER_CHALLENGE_EXTRA_CATEGORIES[challenge.id] ?? []) {
    cats.add(extra);
  }

  if (challenge.id > 56 || challenge.id < 1) {
    cats.add("servo");
    cats.add("gamepad");
  }

  return cats;
}

/** Block types allowed beyond category filter (empty = use category defaults only). */
export function getBlockedBlockTypes(challenge: Challenge): Set<string> {
  const blocked = new Set<string>();
  const tags = challenge.tags.map((t) => t.toLowerCase()).join(" ");

  if (!tags.includes("crservo") && !tags.includes("intake")) {
    blocked.add("ftc_cr_servo_hw_get");
    blocked.add("ftc_cr_servo_set_power");
  }

  if (!tags.includes("servo") && !getChallengeHardware(challenge.id).some((n) => n.includes("servo") && !n.includes("intake"))) {
    blocked.add("ftc_servo_hw_get");
    blocked.add("ftc_servo_set_position");
  }

  if (!tags.includes("dcmotorex") && !tags.includes("flywheel") && challenge.id !== 22 && challenge.id !== 26 && challenge.id !== 53) {
    blocked.add("ftc_dc_motor_ex_hw_get");
    blocked.add("ftc_dc_motor_ex_set_velocity");
  }

  if (!challengeUsesGamepad(challenge)) {
    blocked.add("ftc_gamepad_stick_y");
    blocked.add("ftc_gamepad_button");
    blocked.add("ftc_gamepad_trigger");
  }

  return blocked;
}

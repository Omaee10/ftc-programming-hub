import type { Challenge } from "@/data/challenges";

export type BlocksSupport = "full" | "java-only";

export type CourseTrack =
  | "intro"
  | "movement"
  | "sensors"
  | "teleop"
  | "autonomous"
  | "advanced";

export type StarterArchetype =
  | "teleop_single_drive"
  | "teleop_dual_tank"
  | "teleop_mecanum_4"
  | "autonomous_encoder_move"
  | "autonomous_elapsed_time"
  | "autonomous_sleep_sequence"
  | "autonomous_init_config"
  | "servo_gamepad"
  | "crservo_trigger"
  | "debounce_toggle"
  | "telemetry_dashboard"
  | "dcmotorex_velocity"
  | "pid_proportional"
  | "encoder_math"
  | "state_machine_auto"
  | "state_machine_teleop"
  | "math_generic"
  | "scope_basics"
  | "sensor_touch_homing";

export interface ChallengeBlocksMeta {
  blocksSupport: BlocksSupport;
  courseTrack: CourseTrack;
  starterArchetype?: StarterArchetype;
  blocksGuideSteps?: string[];
}

const JAVA_ONLY_TAGS = [
  "road runner",
  "pedro pathing",
  "limelight",
  "lynxmodule",
  "bulk cache",
  "pinpoint",
  "gobilda",
  "odometry",
  "actionbuilder",
  "pathchain",
  "bezier",
  "follower",
  "apriltag",
  "fiducial",
];

/** Per-challenge blocks metadata (ids 1–56). */
export const CHALLENGE_BLOCKS_META: Record<number, ChallengeBlocksMeta> = {
  1: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "teleop_single_drive",
    blocksGuideSteps: [
      "Get the motor from hardwareMap in the init section.",
      "Set motor direction once before waitForStart.",
      "After start, read the left stick (negated) and setPower in the loop.",
      "Add telemetry so the driver sees target power.",
    ],
  },
  2: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "autonomous_encoder_move",
    blocksGuideSteps: [
      "Reset the encoder, then set target position.",
      "Switch to RUN_TO_POSITION and apply power.",
      "Wait in a while-isBusy loop, then set power to 0.",
    ],
  },
  3: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "autonomous_elapsed_time",
  },
  4: { blocksSupport: "java-only", courseTrack: "advanced" },
  5: { blocksSupport: "java-only", courseTrack: "advanced" },
  6: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "teleop_dual_tank",
  },
  7: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "servo_gamepad",
  },
  8: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "crservo_trigger",
  },
  9: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "telemetry_dashboard",
  },
  10: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "debounce_toggle",
  },
  11: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "autonomous_elapsed_time",
  },
  12: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "teleop_single_drive",
  },
  13: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "autonomous_init_config",
  },
  14: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "autonomous_encoder_move",
  },
  15: { blocksSupport: "java-only", courseTrack: "advanced" },
  16: {
    blocksSupport: "full",
    courseTrack: "sensors",
    starterArchetype: "sensor_touch_homing",
  },
  17: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "teleop_mecanum_4",
  },
  18: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "teleop_mecanum_4",
  },
  19: {
    blocksSupport: "full",
    courseTrack: "sensors",
    starterArchetype: "teleop_mecanum_4",
  },
  20: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "autonomous_sleep_sequence",
  },
  21: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "teleop_mecanum_4",
  },
  22: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "dcmotorex_velocity",
  },
  23: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "pid_proportional",
  },
  24: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "encoder_math",
  },
  25: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "math_generic",
  },
  26: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "dcmotorex_velocity",
  },
  27: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "telemetry_dashboard",
  },
  28: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "debounce_toggle",
  },
  29: {
    blocksSupport: "full",
    courseTrack: "sensors",
    starterArchetype: "state_machine_teleop",
  },
  30: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "state_machine_auto",
  },
  31: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "state_machine_auto",
  },
  32: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "debounce_toggle",
  },
  33: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "math_generic",
  },
  34: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "math_generic",
  },
  35: {
    blocksSupport: "full",
    courseTrack: "autonomous",
    starterArchetype: "math_generic",
  },
  36: { blocksSupport: "java-only", courseTrack: "advanced" },
  37: { blocksSupport: "java-only", courseTrack: "advanced" },
  38: { blocksSupport: "java-only", courseTrack: "advanced" },
  39: { blocksSupport: "java-only", courseTrack: "advanced" },
  40: { blocksSupport: "java-only", courseTrack: "advanced" },
  41: { blocksSupport: "java-only", courseTrack: "advanced" },
  42: { blocksSupport: "java-only", courseTrack: "advanced" },
  43: { blocksSupport: "java-only", courseTrack: "advanced" },
  44: { blocksSupport: "java-only", courseTrack: "advanced" },
  45: { blocksSupport: "java-only", courseTrack: "advanced" },
  46: { blocksSupport: "java-only", courseTrack: "advanced" },
  47: { blocksSupport: "java-only", courseTrack: "advanced" },
  48: { blocksSupport: "java-only", courseTrack: "advanced" },
  49: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "math_generic",
  },
  50: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "teleop_mecanum_4",
  },
  51: {
    blocksSupport: "full",
    courseTrack: "movement",
    starterArchetype: "autonomous_elapsed_time",
  },
  52: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "math_generic",
  },
  53: {
    blocksSupport: "full",
    courseTrack: "teleop",
    starterArchetype: "dcmotorex_velocity",
  },
  54: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "telemetry_dashboard",
  },
  55: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "teleop_single_drive",
  },
  56: {
    blocksSupport: "full",
    courseTrack: "intro",
    starterArchetype: "scope_basics",
  },
};

export function inferBlocksSupport(challenge: Challenge): BlocksSupport {
  const tagStr = challenge.tags.join(" ").toLowerCase();
  if (JAVA_ONLY_TAGS.some((t) => tagStr.includes(t))) return "java-only";
  return "full";
}

export function getChallengeBlocksMeta(id: number): ChallengeBlocksMeta {
  return (
    CHALLENGE_BLOCKS_META[id] ?? {
      blocksSupport: "full",
      courseTrack: "teleop",
      starterArchetype: "teleop_single_drive",
    }
  );
}

export function enrichChallengeWithBlocksMeta(challenge: Challenge): Challenge {
  const meta = getChallengeBlocksMeta(challenge.id);
  const blocksSupport =
    meta.blocksSupport ?? inferBlocksSupport(challenge);
  return {
    ...challenge,
    blocksSupport,
    courseTrack: meta.courseTrack,
    starterArchetype: meta.starterArchetype,
    blocksGuideSteps: meta.blocksGuideSteps,
  };
}

export const COURSE_TRACK_LABELS: Record<CourseTrack, string> = {
  intro: "FTC Intro",
  movement: "Movement",
  sensors: "Sensors",
  teleop: "TeleOp",
  autonomous: "Autonomous",
  advanced: "Advanced (Java)",
};

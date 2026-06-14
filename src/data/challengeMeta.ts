import type { Challenge } from "@/data/challenges";
import type { Difficulty } from "@/data/challengeConstants";

/** Card-level metadata for built-in challenges — avoids bundling full starter code. */
export interface ChallengeCardMeta {
  id: number;
  title: string;
  difficulty: Difficulty;
  xp: number;
  estimatedTime: string;
  tags: string[];
  description: string;
}

export const builtinChallengeMeta: ChallengeCardMeta[] = [
  {
    "id": 1,
    "title": "Basic TeleOp",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "TeleOp",
      "Motors",
      "Gamepad"
    ],
    "description": "Initialize a DC Motor from hardwareMap and map its power directly to gamepad1.left_stick_y so the driver can control it in real time."
  },
  {
    "id": 2,
    "title": "Encoder Basics",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "Encoders",
      "Autonomous",
      "RUN_TO_POSITION"
    ],
    "description": "Use a motor's built-in encoder to drive it to a precise target position of 500 ticks, then stop — no timers, no guessing."
  },
  {
    "id": 3,
    "title": "Autonomous Timer",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "20 min",
    "tags": [
      "Autonomous",
      "ElapsedTime",
      "Motors"
    ],
    "description": "Drive a two-motor tank-style robot forward for exactly 2 seconds using an ElapsedTime timer, then stop both motors."
  },
  {
    "id": 4,
    "title": "Road Runner Trajectory",
    "difficulty": "Intermediate",
    "xp": 250,
    "estimatedTime": "90 min",
    "tags": [
      "Road Runner",
      "Splines",
      "Autonomous",
      "ActionBuilder"
    ],
    "description": "Build a smooth, spline-based autonomous path using Road Runner 1.0's ActionBuilder — drive to a point with a curve, wait, then return home."
  },
  {
    "id": 5,
    "title": "Pedro Pathing Chain",
    "difficulty": "Advanced",
    "xp": 350,
    "estimatedTime": "2 hrs",
    "tags": [
      "Pedro Pathing",
      "PathChain",
      "Bézier",
      "Autonomous"
    ],
    "description": "Chain three Bézier curve path segments into a continuous PathChain using Pedro Pathing's follower, with different heading interpolations on each leg."
  },
  {
    "id": 6,
    "title": "Dual Motor TeleOp",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "20 min",
    "tags": [
      "TeleOp",
      "Motors",
      "Gamepad",
      "Tank Drive"
    ],
    "description": "Control two drive motors independently — left stick Y drives the left motor, right stick Y drives the right — with BRAKE mode to stop the robot instantly."
  },
  {
    "id": 7,
    "title": "Servo Position Control",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "TeleOp",
      "Servo",
      "Gamepad"
    ],
    "description": "Move a servo to three preset positions using gamepad buttons: A opens it (0.0), B closes it (1.0), and X moves it to the midpoint (0.5)."
  },
  {
    "id": 8,
    "title": "CRServo Intake",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "TeleOp",
      "CRServo",
      "Intake",
      "Trigger"
    ],
    "description": "Drive a continuous-rotation servo as a variable-speed intake: right trigger sets forward power, left trigger reverses, and releasing both stops the motor."
  },
  {
    "id": 9,
    "title": "Telemetry Dashboard",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "20 min",
    "tags": [
      "Telemetry",
      "TeleOp",
      "Debugging"
    ],
    "description": "Build a well-formatted Driver Station display showing loop count, elapsed time, motor power, encoder position, and a status string — organized with section headers."
  },
  {
    "id": 10,
    "title": "Button Debouncing",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "TeleOp",
      "Debouncing",
      "State Toggle",
      "Gamepad"
    ],
    "description": "Toggle an intake on/off with a single button press using rising-edge detection — without debouncing, the toggle fires hundreds of times per second."
  },
  {
    "id": 11,
    "title": "ElapsedTime Patterns",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "Autonomous",
      "ElapsedTime",
      "Non-blocking",
      "Timing"
    ],
    "description": "Write an autonomous that waits 1 second, drives a motor for 500 ms, then stops — all using ElapsedTime instead of Thread.sleep()."
  },
  {
    "id": 12,
    "title": "Motor Zero Power Behavior",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "TeleOp",
      "Motors",
      "ZeroPowerBehavior",
      "BRAKE",
      "FLOAT"
    ],
    "description": "Toggle a motor between BRAKE and FLOAT zero-power behavior with the X button and observe how stopping distance changes for each mode."
  },
  {
    "id": 13,
    "title": "Init-Loop Configuration",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "Autonomous",
      "Init Loop",
      "Alliance Selection",
      "Configuration"
    ],
    "description": "Use the init loop (before waitForStart) to let the driver choose RED or BLUE alliance with gamepad buttons, displaying the selection live on the Driver Station."
  },
  {
    "id": 14,
    "title": "Encoder-Based Drive Distance",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "Autonomous",
      "Encoders",
      "RUN_TO_POSITION",
      "RUN_USING_ENCODER"
    ],
    "description": "Drive a motor to exactly 1000 encoder ticks using RUN_TO_POSITION mode, then switch back to RUN_USING_ENCODER and display the final position."
  },
  {
    "id": 15,
    "title": "Bulk Cache Reads",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Optimization",
      "Bulk Cache",
      "LynxModule",
      "Loop Hz",
      "TeleOp"
    ],
    "description": "Enable MANUAL bulk caching on all REV hubs, clear the cache once per loop, and measure the improvement in loop frequency — a critical optimization for high-speed control loops."
  },
  {
    "id": 16,
    "title": "REV Touch Sensor Homing",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "25 min",
    "tags": [
      "Autonomous",
      "TouchSensor",
      "Homing",
      "Encoder Reset"
    ],
    "description": "Drive a motor slowly toward its mechanical limit until a Touch Sensor is pressed, then stop and reset the encoder to zero — the same pattern used for turret zeroing."
  },
  {
    "id": 17,
    "title": "Basic 4-Motor Mecanum",
    "difficulty": "Beginner",
    "xp": 100,
    "estimatedTime": "30 min",
    "tags": [
      "TeleOp",
      "Mecanum Drive",
      "4 Motors",
      "Normalization"
    ],
    "description": "Wire up all four mecanum wheels, apply the standard wheel-vector formula, and normalize output so no wheel exceeds 1.0 — the foundation of every FTC mecanum drive."
  },
  {
    "id": 18,
    "title": "Mecanum Power Normalization",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "Mecanum Drive",
      "Math",
      "Helper Method",
      "Normalization"
    ],
    "description": "Implement a standalone normalize() helper that scales four wheel powers down only if the maximum exceeds 1.0, preserving the ratio between all four values."
  },
  {
    "id": 19,
    "title": "Field-Relative Mecanum",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "40 min",
    "tags": [
      "Mecanum Drive",
      "Field-Relative",
      "IMU",
      "Rotation Matrix"
    ],
    "description": "Rotate the driver's joystick vector by the robot's current heading before computing mecanum powers, so pushing 'forward' always moves the robot toward the far wall regardless of its orientation."
  },
  {
    "id": 20,
    "title": "Mecanum Strafing Test",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "25 min",
    "tags": [
      "Autonomous",
      "Mecanum Drive",
      "Strafing",
      "sleep()"
    ],
    "description": "Write an autonomous that strafes right for 1 second then strafes left for 1 second, returning to the start — pure strafing tests that your mecanum formula and reversals are correct."
  },
  {
    "id": 21,
    "title": "Velocity-Magnitude Braking",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "TeleOp",
      "Mecanum Drive",
      "Deadband",
      "Velocity Magnitude"
    ],
    "description": "Compute the joystick input magnitude and apply a deadband — stop all motors if the magnitude is below 0.05 — mirroring the team's competition-ready braking pattern."
  },
  {
    "id": 22,
    "title": "DcMotorEx Velocity Control",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "TeleOp",
      "DcMotorEx",
      "Velocity Control",
      "Flywheel",
      "PIDF"
    ],
    "description": "Replace setPower() with setVelocity() on a DcMotorEx flywheel to hold a precise tick-per-second target, and compare the velocity stability against open-loop power control."
  },
  {
    "id": 23,
    "title": "Simple P Controller",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "PID Control",
      "Turret",
      "Proportional",
      "Feedback",
      "Encoder"
    ],
    "description": "Implement a proportional position controller for a turret motor: power = Kp × (target − current), clamped to ±0.8 — the simplest form of feedback control."
  },
  {
    "id": 24,
    "title": "Encoder Ticks to Degrees",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "Math",
      "Encoders",
      "Gear Ratio",
      "Turret",
      "Conversion"
    ],
    "description": "Write a ticksToDegrees() conversion method using gear ratio and ticks-per-revolution, then display a turret's real angle live in telemetry."
  },
  {
    "id": 25,
    "title": "Flywheel TPS Calibration",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Math",
      "Interpolation",
      "Flywheel",
      "Calibration",
      "Shooter"
    ],
    "description": "Implement interpolateTPS() that linearly maps shooting distance (inches) to flywheel speed (TPS) using the team's actual calibration table, clamping for out-of-range inputs."
  },
  {
    "id": 26,
    "title": "PIDF Velocity Loop",
    "difficulty": "Advanced",
    "xp": 250,
    "estimatedTime": "60 min",
    "tags": [
      "Advanced",
      "PIDF",
      "Flywheel",
      "Velocity Control",
      "Control Theory"
    ],
    "description": "Build a full PIDF controller for a flywheel: proportional, integral (with anti-windup clamp), derivative, and feedforward terms — the same structure used in production FTC code."
  },
  {
    "id": 27,
    "title": "Loop Frequency Measurement",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "25 min",
    "tags": [
      "Performance",
      "Loop Hz",
      "ElapsedTime",
      "Telemetry",
      "Optimization"
    ],
    "description": "Measure the actual loop frequency of your OpMode in Hz and average loop time in ms — essential for tuning PIDF derivative terms and diagnosing performance regressions."
  },
  {
    "id": 28,
    "title": "Button-Latch Shooting",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "TeleOp",
      "State Logic",
      "Shooting",
      "Latch Pattern",
      "Flywheel"
    ],
    "description": "Implement the team's shooting latch: the feeder only runs when the bumper is held AND the flywheel has reached target speed — preventing premature shots."
  },
  {
    "id": 29,
    "title": "Turret Zeroing State Machine",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "TeleOp",
      "State Machine",
      "Turret",
      "Homing",
      "TouchSensor"
    ],
    "description": "Implement a two-state machine (IDLE → ZEROING) triggered by Gamepad2.A that homes the turret to its limit switch, then resets the encoder — mirroring the team's competition homing routine."
  },
  {
    "id": 30,
    "title": "Autonomous State Machine",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "45 min",
    "tags": [
      "Autonomous",
      "State Machine",
      "ElapsedTime",
      "Motors",
      "Timer-Based"
    ],
    "description": "Build a 4-state autonomous — DRIVE_TO_SHOOT, SHOOTING, DRIVE_TO_COLLECT, DONE — using only motor powers and ElapsedTime timers, no path-following libraries needed."
  },
  {
    "id": 31,
    "title": "Multi-Shot Cycling",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "45 min",
    "tags": [
      "Autonomous",
      "State Machine",
      "Cycling",
      "Init Loop",
      "Counter"
    ],
    "description": "Extend the autonomous state machine to loop N times through a TO_HUMAN → SHOOT cycle, where N is configured in the init loop with Dpad Up/Down — mirroring the team's Far Auto cycling."
  },
  {
    "id": 32,
    "title": "TeleOp Mode Switching",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "TeleOp",
      "Mode Switching",
      "State",
      "Safe Mode",
      "Gamepad"
    ],
    "description": "Implement NORMAL and SAFE_MODE TeleOp modes — B button enters safe mode (capped 50% drive power, warning telemetry), Y exits — mirroring the team's competition safe-mode pattern."
  },
  {
    "id": 33,
    "title": "Pythagorean Distance to Goal",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "25 min",
    "tags": [
      "Math",
      "Odometry",
      "Distance",
      "Field Coordinates"
    ],
    "description": "Implement distanceToGoal() using Math.hypot() to compute the straight-line distance from the robot's current (x, y) position to the fixed goal, in millimeters."
  },
  {
    "id": 34,
    "title": "atan2 Turret Bearing",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Math",
      "Turret",
      "atan2",
      "Bearing",
      "Field Coordinates"
    ],
    "description": "Compute the required turret angle to point at the goal from any robot position and heading, using Math.atan2(dy, dx) — the core of the team's pointTurretAtGoal() method."
  },
  {
    "id": 35,
    "title": "Alliance Coordinate Mirror",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "20 min",
    "tags": [
      "Math",
      "Alliance",
      "Coordinate Mirror",
      "Autonomous"
    ],
    "description": "Implement mirrorX() to convert BLUE alliance coordinates to RED alliance by reflecting across the field's center line — so one autonomous works for both alliances."
  },
  {
    "id": 36,
    "title": "Degrees ↔ Radians Conversion",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "Math",
      "Angles",
      "Radians",
      "Degrees",
      "Pedro Pathing"
    ],
    "description": "Write toRadians() and toDegrees() helpers from scratch without Math.toRadians/toDegrees, then apply them to convert headings for Pedro Pathing Pose constructors."
  },
  {
    "id": 37,
    "title": "GoBilda Pinpoint Odometry",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "Odometry",
      "GoBilda",
      "Pinpoint",
      "Position Tracking"
    ],
    "description": "Initialize a GoBildaPinpointDriver, configure encoder offsets and resolution, call resetPosAndIMU(), and read live X/Y/heading position from the odometry computer."
  },
  {
    "id": 38,
    "title": "Field Position Reset",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "Odometry",
      "GoBilda",
      "Position Reset",
      "Field Coordinates"
    ],
    "description": "Add a button that resets the Pinpoint odometry computer to a known field position (72 in, 72 in, 0°) — the field center — mirroring the team's coordinate reset pattern."
  },
  {
    "id": 39,
    "title": "Limelight3A Init & Read",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Vision",
      "Limelight",
      "AprilTag",
      "Telemetry",
      "Targeting"
    ],
    "description": "Initialize a Limelight3A, start the pipeline, and read tx, ty, ta, and capture latency from the latest result — the starting point for all vision-based targeting."
  },
  {
    "id": 40,
    "title": "Stale Frame Detection",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "Vision",
      "Limelight",
      "Diagnostics",
      "Stale Frame",
      "Debugging"
    ],
    "description": "Implement the team's stale-frame counter: if tx, ty, and timestamp are identical for 5+ consecutive loops, increment a stale counter and report the camera health percentage."
  },
  {
    "id": 41,
    "title": "AprilTag Fiducial Extraction",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Vision",
      "Limelight",
      "AprilTag",
      "Fiducial",
      "Targeting"
    ],
    "description": "Iterate getFiducialResults() to find a specific AprilTag by ID (24 for RED, 20 for BLUE) and extract its horizontal offset — the targeting step before turret correction."
  },
  {
    "id": 42,
    "title": "tx-Based Turret Correction",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "Vision",
      "Limelight",
      "Turret",
      "P Controller",
      "Targeting"
    ],
    "description": "Drive a turret motor using proportional correction from the Limelight's tx value — stop when |tx| < 2°, showing 'ON TARGET' — the team's vision-servo loop."
  },
  {
    "id": 43,
    "title": "Poll Rate Cycling",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "Vision",
      "Limelight",
      "Poll Rate",
      "Tuning",
      "Performance"
    ],
    "description": "Implement Y-button cycling through Limelight poll rates (100, 50, 25, 10 Hz) and observe how frame latency changes — the team found 50 Hz outperformed 100 Hz for their setup."
  },
  {
    "id": 44,
    "title": "Pose Construction & Heading",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "20 min",
    "tags": [
      "Pedro Pathing",
      "Pose",
      "Heading",
      "Field Coordinates"
    ],
    "description": "Construct the three key field poses from the team's autonomous (start, shot point, human station) using Math.toRadians() for heading, and verify degree↔radian display in telemetry."
  },
  {
    "id": 45,
    "title": "BezierLine Path Follow",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "45 min",
    "tags": [
      "Pedro Pathing",
      "BezierLine",
      "PathChain",
      "Follower",
      "Autonomous"
    ],
    "description": "Build a simple straight-line PathChain from start to the shot point using BezierLine, follow it with the Pedro Pathing follower, and wait in a loop until isBusy() returns false."
  },
  {
    "id": 46,
    "title": "BezierCurve Tape Detour",
    "difficulty": "Advanced",
    "xp": 250,
    "estimatedTime": "60 min",
    "tags": [
      "Pedro Pathing",
      "BezierCurve",
      "Advanced",
      "Autonomous",
      "Control Points"
    ],
    "description": "Replicate the team's tape-3 detour: a BezierCurve that arcs from the start pose, through a control point at (startX, 35.864), to (19, 36) — avoiding the tape line with a smooth curve."
  },
  {
    "id": 47,
    "title": "Reversed Path",
    "difficulty": "Intermediate",
    "xp": 175,
    "estimatedTime": "40 min",
    "tags": [
      "Pedro Pathing",
      "Reversed Path",
      "BezierLine",
      "Autonomous"
    ],
    "description": "Build a BezierLine with setReversed(true) to drive the robot backward from the human station to the shot point — explaining when reversed paths are preferred over forward paths."
  },
  {
    "id": 48,
    "title": "Dynamic Path Building",
    "difficulty": "Advanced",
    "xp": 300,
    "estimatedTime": "60 min",
    "tags": [
      "Pedro Pathing",
      "Advanced",
      "Dynamic Paths",
      "Helper Method",
      "Autonomous"
    ],
    "description": "Implement a buildPathTo() helper that constructs a BezierLine PathChain from the follower's current position to any target Pose — then use it to chain three consecutive waypoints."
  },
  {
    "id": 49,
    "title": "Unit Conversion",
    "difficulty": "Beginner",
    "xp": 75,
    "estimatedTime": "15 min",
    "tags": [
      "Math",
      "Unit Conversion",
      "Field Dimensions",
      "Beginner"
    ],
    "description": "Implement inchesToMm() and mmToInches() conversion helpers, apply them to convert the FTC field dimensions (144×144 in) to millimeters, and display both representations."
  },
  {
    "id": 50,
    "title": "Vector Dot Product",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "Math",
      "Vector",
      "Dot Product",
      "Mecanum",
      "Motion Detection"
    ],
    "description": "Implement a 2D dot product helper and use it to check whether the robot's velocity vector is aligned with its intended drive direction — a signal used in motion-state detection."
  },
  {
    "id": 51,
    "title": "Linear Interpolation",
    "difficulty": "Intermediate",
    "xp": 125,
    "estimatedTime": "30 min",
    "tags": [
      "Math",
      "Interpolation",
      "ElapsedTime",
      "Ramp",
      "Motor Control"
    ],
    "description": "Implement lerp(a, b, t) and use it to ramp motor power from 0 to 1 over 2 seconds — the same ramp pattern used for the team's 250 ms transfer ramp."
  },
  {
    "id": 52,
    "title": "Projectile Distance from TPS",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Math",
      "Interpolation",
      "Flywheel",
      "Inverse Lookup",
      "Calibration"
    ],
    "description": "Implement a tpsToDistance() inverse lookup — given a flywheel TPS reading, find the corresponding shooting distance using linear interpolation on the team's calibration table."
  },
  {
    "id": 53,
    "title": "Robot Velocity Magnitude",
    "difficulty": "Intermediate",
    "xp": 150,
    "estimatedTime": "35 min",
    "tags": [
      "Math",
      "Velocity",
      "DcMotorEx",
      "Shooting Readiness",
      "Speed Check"
    ],
    "description": "Compute the robot's translational speed from two DcMotorEx velocity readings (forward + strafe wheels), compare against a 1000 mm/s threshold, and implement the team's robotSpeedOk check."
  },
  {
    "id": 54,
    "title": "Field vs Loop Scope",
    "difficulty": "Beginner",
    "xp": 50,
    "estimatedTime": "15 min",
    "tags": [
      "Scope",
      "Java Basics",
      "Telemetry",
      "TeleOp"
    ],
    "description": "Fix a loop counter that resets every frame by moving it from loop-local scope to a class field so telemetry shows the true iteration count."
  },
  {
    "id": 55,
    "title": "Method Scope & Parameters",
    "difficulty": "Beginner",
    "xp": 50,
    "estimatedTime": "15 min",
    "tags": [
      "Scope",
      "Java Basics",
      "Methods",
      "TeleOp",
      "Motors"
    ],
    "description": "Extract gamepad stick reading into a private helper method so stick logic lives in method scope and runOpMode() stays clean."
  },
  {
    "id": 56,
    "title": "Block Scope & Visibility",
    "difficulty": "Beginner",
    "xp": 50,
    "estimatedTime": "15 min",
    "tags": [
      "Scope",
      "Java Basics",
      "Control Flow",
      "TeleOp",
      "Motors"
    ],
    "description": "Fix a compile error caused by using a variable declared inside an if block outside its scope — declare boostMultiplier before the block instead."
  }
] as ChallengeCardMeta[];

export function isBuiltinChallengeId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id < 1000;
}

export function getBuiltinChallengeMeta(id: number): ChallengeCardMeta | undefined {
  return builtinChallengeMeta.find((c) => c.id === id);
}

/** Map card metadata to the Challenge shape used by list/card views. */
export function metaToChallengeSummary(meta: ChallengeCardMeta): Challenge {
  return {
    id: meta.id,
    title: meta.title,
    difficulty: meta.difficulty,
    description: meta.description,
    xp: meta.xp,
    estimatedTime: meta.estimatedTime,
    tags: meta.tags,
    objectives: [],
    instructions: "",
    starterCode: "",
    hints: [],
    conceptsCovered: [],
  };
}

export const builtinChallengeSummaries: Challenge[] =
  builtinChallengeMeta.map(metaToChallengeSummary);

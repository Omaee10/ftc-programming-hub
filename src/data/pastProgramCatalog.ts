// ─── Types ───────────────────────────────────────────────────────────────────

export type ProgramCategory =
  | "TeleOp"
  | "Autonomous"
  | "Vision / Diagnostics"
  | "Subsystem Tuning";

export interface HardwareDevice {
  /** Exact string passed to hardwareMap.get() */
  configName: string;
  /** Java class name (e.g. DcMotorEx, Servo, Limelight3A) */
  type: string;
  /** What this device physically does on the robot */
  description: string;
}

export interface PastProgramSummary {
  id: string;
  name: string;
  filename: string;
  season: string;
  category: ProgramCategory;
  /** One-liner for the dashboard card */
  summary: string;
  /** Detailed markdown-like hardware+tuning explanation for the viewer */
  description: string;
  hardware: HardwareDevice[];
  tags: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export type PastProgram = PastProgramSummary & { code: string };

export const pastProgramCatalog: PastProgramSummary[] = [
  {
    id: "main-teleop",
    name: "Main TeleOp — V10",
    filename: "MainTeleOp.java",
    season: "2025–2026 (DECODE)",
    category: "TeleOp",
    summary:
      "Full competition TeleOp orchestrating mecanum drive, velocity-controlled flywheel, Limelight-backed turret tracking, intake/transfer system, climber, and RGB LED feedback.",
    description: `**Main TeleOp V10** was the competition-ready driver-control program used during the 2025–2026 DECODE season. It coordinates two subsystems — \`Drive\` (mecanum chassis with GoBilda Pinpoint odometry) and \`Shooter\` (flywheel, rotary turret, ball intake/transfer, climber, and LED array) — through a single \`runOpMode()\` loop.

**Alliance & robot selection**

Before \`waitForStart()\`, the driver configures:
- **Alliance** (B = RED, X = BLUE): sets which AprilTag ID (24 or 20) the Limelight targets.
- **Robot** (Y = toggle 19564 ↔ 21171): loads different PID coefficients and motor constants via \`RobotConstants.setRobot()\`.

**Shooting state machine**

The program uses a "latch" pattern to prevent premature firing:
1. Bumpers spin up the flywheel; the latch arms only once \`isShooterSpeedReady(targetTPS)\` returns true.
2. The latch **stays open** (feeding continues) until the bumper is released or the turret drifts off-target / robot moves too fast (>1 000 mm/s).
3. A \`feedingStartTime\` ramp applies full transfer power for the first 250 ms, then backs off to 60% for sustained cycles.

**Turret tracking**

In normal mode, \`pointTurretAtGoal()\` relies entirely on Pinpoint odometry — no Limelight needed. **Safe mode** (B button) enables Limelight visual tracking as a fallback, useful when the odometry drift is suspected.

**Turret zeroing state machine**

Gamepad2-A triggers a homing routine (\`startHoming()\`) that mechanically drives the turret to its limit switch. During zeroing, shooting is blocked and the LED shows red.

**Goal offset tuning**

Gamepad2 D-pad shifts the virtual goal position by 1-inch increments per press so the driver can fine-tune aim mid-match without stopping.

**Tuning tips**

- If shots are consistently pulling left/right, use **Gamepad2 Dpad-Right / Dpad-Left** to adjust the X offset in real time; the change persists only for the current OpMode run.
- For close shots (right bumper), a 1 600 TPS cap prevents over-spinning; adjust \`setDefaultTPSOverride(1550.0)\` in code if the close-shot power needs calibrating.
- The \`TPS_INCREMENT = 50\` constant controls how coarsely Gamepad1 Dpad Up/Down tunes manual TPS; lower it for finer competition adjustments.`,
    hardware: [
      { configName: "front_left",   type: "DcMotorEx",             description: "Front-left mecanum wheel motor" },
      { configName: "front_right",  type: "DcMotorEx",             description: "Front-right mecanum wheel motor" },
      { configName: "back_left",    type: "DcMotorEx",             description: "Back-left mecanum wheel motor" },
      { configName: "back_right",   type: "DcMotorEx",             description: "Back-right mecanum wheel motor" },
      { configName: "pinpoint",     type: "GoBildaPinpointDriver", description: "Two-wheel odometry pod for field-relative localisation" },
      { configName: "shooter_motor",type: "DcMotorEx",             description: "Velocity-controlled flywheel — runs at target TPS" },
      { configName: "turret_motor", type: "DcMotorEx",             description: "Horizontal turret rotation with encoder-based PID" },
      { configName: "transfer_motor",type: "DcMotorEx",            description: "Ball transfer belt from intake to flywheel" },
      { configName: "blocker_servo", type: "Servo",                description: "Gates the transfer-to-flywheel channel open/closed" },
      { configName: "climber_servo", type: "Servo",                description: "End-game climber mechanism toggle" },
      { configName: "light_servo",   type: "ServoImplEx",          description: "REV Blinkin LED controller for driver feedback" },
      { configName: "diddler_servo", type: "CRServo",              description: "Continuous-rotation agitator inside intake chute" },
      { configName: "limelight",     type: "Limelight3A",          description: "AprilTag camera — used in safe mode for visual turret correction" },
    ],
    tags: ["Mecanum Drive", "Flywheel Shooter", "Limelight 3A", "AprilTag", "Pinpoint Odometry", "Turret PID", "State Machine", "LED Feedback"],
  },
  {
    id: "far-auto-blue",
    name: "Far Auto — Blue Alliance",
    filename: "FarAuto_BLUE.java",
    season: "2025–2026 (DECODE)",
    category: "Autonomous",
    summary:
      "Pedro Pathing autonomous that drives to a fixed shot-point, optionally collects from the tape-3 preload zone, then cycles between the human-player station and shot-point for up to 4 configurable scoring runs.",
    description: `**FarAuto_BLUE** is the blue-alliance far-side autonomous routine. It uses **Pedro Pathing** (\`Follower\` + \`BezierCurve\`/\`BezierLine\` path chains) for smooth, repeatable movement and the shared \`Shooter\` subsystem for all scoring actions.

**Starting pose**

The robot is placed at field coordinates \`(64, 8.35)\` facing **180°** (toward the far wall). All path positions in this file are expressed in **field inches** with the blue origin at the near-left corner.

**Init-loop configuration (pre-match)**

Before the driver presses START, Gamepad1 controls let the drive team tune:
- **LB / RB**: skip or include the Tape-3 preload pickup.
- **Dpad Up / Down**: increment or decrement the \`cycleCount\` (0–8). Each cycle = one human-player→shot-point run.

**State machine flow**

\`\`\`
StartShot  →  [skipTape3?]
               YES → StartToShotPoint → Shooting → ToHuman → …
               NO  → ToTape3 → Tape3ToShoot → Shooting → ToHuman → …
ToHuman → HumanToShoot → Shooting → [remainingCycles > 0?]
                                       YES → loop back to ToHuman
                                       NO  → Leave
\`\`\`

**Turret tracking during auto**

\`shooter.pointTurretAtGoalInches()\` is called every loop with the follower's current \`Pose\` — the turret continuously aims at the BLUE goal (AprilTag 20) while the robot is driving. Turret tracking is **disabled** during the tape-3 detour (where the robot is facing away) to avoid violent swings.

**Shoot sequencing**

In the \`Shooting\` state the follower is paused (\`follower.breakFollowing()\`). The shooter waits for:
1. TPS within \`VELOCITY_TOLERANCE\` of target.
2. A \`TURRET_LOCK_TIME\` (250 ms) settling window after the turret locks on.
3. Then \`unblockShooter()\` + \`runIntake()\` runs for \`SHOOT_TIME\` (500 ms).

**Tuning tips**

- **\`SHOT_POINT = (46.5, 10.5)\`** — move X toward field centre if shots are drifting wide; move Y if the robot's approach angle changes the turret's lead angle.
- **\`TURRET_ACQUIRE_TIMEOUT = 0.75 s\`** — the auto will force-shoot after 750 ms even if the turret hasn't locked. Reduce this if the turret is reliable; increase it if you see misses on the first shot.
- **\`TAPE3_CTRL.y = 35.864\`** — the Bezier control-point Y for the tape-3 detour curve. Raise it to push the curve farther from the wall.`,
    hardware: [
      { configName: "front_left",    type: "DcMotorEx",             description: "Drive — managed internally by Pedro Follower" },
      { configName: "front_right",   type: "DcMotorEx",             description: "Drive — managed internally by Pedro Follower" },
      { configName: "back_left",     type: "DcMotorEx",             description: "Drive — managed internally by Pedro Follower" },
      { configName: "back_right",    type: "DcMotorEx",             description: "Drive — managed internally by Pedro Follower" },
      { configName: "pinpoint",      type: "GoBildaPinpointDriver", description: "Odometry used by Pedro Pathing for localisation" },
      { configName: "shooter_motor", type: "DcMotorEx",             description: "Flywheel — runs continuously at target TPS" },
      { configName: "turret_motor",  type: "DcMotorEx",             description: "Rotary turret tracking goal during path following" },
      { configName: "transfer_motor",type: "DcMotorEx",             description: "Ball transfer belt" },
      { configName: "blocker_servo", type: "Servo",                 description: "Gates balls into flywheel on shoot commands" },
      { configName: "diddler_servo", type: "CRServo",               description: "Intake agitator for ball collection" },
      { configName: "limelight",     type: "Limelight3A",           description: "AprilTag camera — visual turret correction thread" },
    ],
    tags: ["Pedro Pathing", "BezierCurve", "Autonomous", "State Machine", "Limelight 3A", "Flywheel Shooter", "Pinpoint Odometry"],
  },
  {
    id: "limelight-diagnostic",
    name: "Limelight 3A Diagnostic",
    filename: "LimelightDiagnostic.java",
    season: "2025–2026 (DECODE)",
    category: "Vision / Diagnostics",
    summary:
      "Standalone diagnostic OpMode that reads raw Limelight 3A values — tx, ty, ta, timestamp, capture latency — and tracks stale-frame percentage with live telemetry to debug vision pipeline reliability.",
    description: `**LimelightDiagnostic** is a pure read-only diagnostic tool that was instrumental in debugging intermittent **stale frame** issues encountered with the Limelight 3A at match start. It bypasses all subsystem abstractions and talks directly to the \`Limelight3A\` hardware device.

**Why stale frames happen**

The Limelight polls at up to 100 Hz, but the FTC Control Hub reads results over USB. If the USB bandwidth is saturated (e.g. bulk motor reads happening simultaneously) or if the pipeline processing time exceeds the poll interval, \`getLatestResult()\` returns the same frame it returned on the previous loop iteration. This program exposes exactly how often that happens.

**Staleness detection logic**

Every loop the program compares \`tx\`, \`ty\`, and the internal \`timestamp\` field from the previous result. If all three are identical for more than **5 consecutive loops**, the frame is flagged as stale and \`staleFrames\` increments. The running percentage \`staleFrames / totalFrames\` is displayed on the Driver Station.

**Poll rate experimentation**

The Y button cycles through \`{100, 50, 25, 10}\` Hz. In practice, **50 Hz** was found to be the sweet spot — it halved the stale-frame rate compared to 100 Hz without meaningfully increasing latency for the turret correction loop.

**Fiducial (AprilTag) readout**

The program iterates \`result.getFiducialResults()\` and prints every detected tag ID, plus the \`targetXDegrees\` / \`targetYDegrees\` of the first tag. This makes it easy to confirm that the correct tag ID is visible and that the pipeline is correctly configured for fiducial tracking.

**Tuning tips**

- Run this program before a match to verify stale-frame rate is below ~5%. Above 10% indicates a hardware or config issue.
- If stale rate is high at 100 Hz, drop to 50 Hz. If it's still high, check USB cable quality and try moving the Limelight to a different hub port.
- The \`setPollRateHz()\` call persists across restarts within the same power cycle — restart the Control Hub if you want to reset to defaults.`,
    hardware: [
      { configName: "limelight", type: "Limelight3A", description: "Limelight 3A camera — configured for AprilTag fiducial pipeline (pipeline 0)" },
    ],
    tags: ["Limelight 3A", "AprilTag", "Vision", "Diagnostics", "Stale Frame Detection", "FPS Monitoring"],
  },
  {
    id: "gate-intake-test",
    name: "Gate Intake Alignment Test",
    filename: "GateIntakeTest.java",
    season: "2025–2026 (DECODE)",
    category: "Subsystem Tuning",
    summary:
      "Focused test OpMode that locks the turret to the pre-calculated angle used during autonomous gate-intake approach, then streams live AprilTag distance to the Driver Station for intake alignment verification.",
    description: `**GateIntakeTest** replicates the exact turret configuration used by the autonomous program when the robot approaches the gate intake station. Rather than running the full autonomous path, it lets a technician stand the robot at the lever position, engage the turret at the correct heading, and verify that the Limelight is reading the expected AprilTag distance.

**Why this program exists**

During the 2025–26 season, the autonomous program's gate-intake cycle depended on the turret being precisely aimed at the goal while the robot collected from the gate. Any deviation in turret angle at that position meant the first post-intake shot would miss. This program was created to characterise and tune that specific angle offline, without running the full 90-second autonomous.

**Hardcoded lever position**

The constants match the autonomous state machine's \`ToLever\` state:
\`\`\`
LEVER_POS_X = 12.25 in
LEVER_POS_Y = 54.50 in
LEVER_HEADING = 146.0°
\`\`\`
These are converted to millimetres before being passed to \`calculateTurretAngleToGoal()\`, which computes the bearing from the lever position to the goal AprilTag using the robot's heading.

**Alliance toggle**

Pressing **B** swaps between RED (tag 24) and BLUE (tag 20). The turret angle is recomputed immediately using the goal coordinates for the new alliance. This allows verifying aim on both sides without reflashing.

**Reading the output**

- **Tag Distance** — the 3D distance in inches from the Limelight to the detected AprilTag. If the robot is positioned correctly, this should match the known field geometry (approximately 47–52 inches to the goal on the far side).
- **Turret Angle** — the commanded angle in degrees. This should be stable; if it oscillates, the turret PID gains need tightening.

**Tuning tips**

- If the Tag Distance reads unexpectedly high (e.g. > 60 in from the lever), the robot may be picking up the wrong tag ID. Verify with the Limelight Diagnostic OpMode.
- Adjust \`LEVER_POS_X\` / \`LEVER_POS_Y\` if the robot's physical gate-intake position shifts between events due to field variations.
- \`LEVER_HEADING\` is sensitive — a 2–3° error causes a measurable turret misalignment. Re-measure with a protractor or field-tile ruler if shots drift consistently after gate pickups.`,
    hardware: [
      { configName: "shooter_motor", type: "DcMotorEx",   description: "Flywheel — idle during this test, but initialized via Shooter constructor" },
      { configName: "turret_motor",  type: "DcMotorEx",   description: "Rotary turret — driven to the precomputed hardcoded angle" },
      { configName: "limelight",     type: "Limelight3A", description: "AprilTag camera — reads tag distance in background thread" },
    ],
    tags: ["Subsystem Tuning", "Turret Alignment", "Limelight 3A", "AprilTag Distance", "Gate Intake", "Autonomous Tuning"],
  },
];

export const categoryColors: Record<
  ProgramCategory,
  { text: string; bg: string; border: string }
> = {
  TeleOp: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Autonomous: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  "Vision / Diagnostics": {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  "Subsystem Tuning": {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
};

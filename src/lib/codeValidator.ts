// ─── Grade ────────────────────────────────────────────────────────────────────
/**
 * Three-state grade returned after evaluating a submission:
 *
 * "good"             — all required checks pass AND all improvement hints pass
 * "needs-improvement"— all required checks pass BUT ≥1 improvement hint fails
 * "wrong"            — ≥1 required check fails (or a hard syntax error exists)
 */
export type Grade = "good" | "needs-improvement" | "wrong";

// ─── Check shape ─────────────────────────────────────────────────────────────

/** What role a check plays in the final grade. */
export type CheckTier =
  | "required"     // failure → "wrong"
  | "improvement"  // failure → "needs-improvement" (if required all pass)
  | "style";       // informational only — never affects grade

export interface ValidationCheck {
  label: string;
  /** One-sentence explanation shown in the console. */
  description: string;
  tier: CheckTier;
  /** When true, the check passes only if the pattern is NOT found. */
  shouldBeAbsent?: boolean;
  /**
   * Either a RegExp tested against the full code string, or an arbitrary
   * function for complex structural checks that regexes can't express cleanly.
   */
  pattern: RegExp | ((code: string) => boolean);
  /** Extra tip shown in the console when this check fails. */
  tip?: string;
  /**
   * When true, run this check against the original source (comments intact).
   * Default (false): run against the comment-stripped source so that hint text
   * inside // TODO comments cannot falsely satisfy structural checks.
   */
  checkOriginal?: boolean;
}

export interface CheckResult {
  label: string;
  description: string;
  tier: CheckTier;
  pass: boolean;
  tip?: string;
  /**
   * Line numbers (1-indexed) where the pattern was found in the original source.
   * Populated only for shouldBeAbsent:true checks that fail — i.e. the pattern
   * was found when it shouldn't have been (e.g. leftover TODO comments).
   * Empty / undefined for "not found" failures since there's no specific line to point to.
   */
  matchedLines?: number[];
}

// ─── Universal checks (every challenge) ──────────────────────────────────────

const UNIVERSAL: ValidationCheck[] = [
  {
    label: "Extends LinearOpMode",
    description: "Class declaration extends LinearOpMode.",
    tier: "required",
    pattern: /extends\s+LinearOpMode/,
    tip: "Every FTC OpMode must extend LinearOpMode (or OpMode).",
  },
  {
    label: "runOpMode() defined",
    description: "@Override public void runOpMode() method is present.",
    tier: "required",
    pattern: /void\s+runOpMode\s*\(\s*\)/,
    tip: "runOpMode() is the entry point the FTC runtime calls.",
  },
  {
    label: "waitForStart() called",
    description: "waitForStart() pauses execution until the driver presses Start.",
    tier: "required",
    pattern: /waitForStart\s*\(\s*\)/,
    tip: "Skipping waitForStart() causes the robot to run during initialization.",
  },
];

// ─── Comment stripper ─────────────────────────────────────────────────────────

/**
 * Remove all Java/C-style comments from source before running structural checks.
 * This prevents hint text inside // TODO lines (e.g. "// Hint: hardwareMap.get(…)")
 * from falsely satisfying regex patterns that are meant to match real code.
 *
 * checkSyntax() and any check with checkOriginal:true still receive the raw source.
 */
function stripComments(code: string): string {
  // Remove block comments first (/* … */) to avoid // inside a block comment
  // being treated as a line-comment start.
  const noBlock = code.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Remove line comments (// … to end of line)
  return noBlock.replace(/\/\/[^\n]*/g, "");
}

/**
 * Returns the 1-indexed line numbers of every line in `code` that matches
 * `pattern`. Used to annotate failing checks with a location in the source.
 */
function findMatchingLines(code: string, pattern: RegExp): number[] {
  // Create a fresh, non-global version so `.test()` doesn't carry lastIndex state.
  const linePattern = new RegExp(
    pattern.source,
    pattern.flags.replace("g", ""),
  );
  return code
    .split("\n")
    .map((line, i) => (linePattern.test(line) ? i + 1 : null))
    .filter((n): n is number => n !== null);
}

// ─── Per-challenge checks ─────────────────────────────────────────────────────

/**
 * Helper: does `setPower` appear inside the while(opModeIsActive()) loop body?
 *
 * Strategy: split the code at the first while(…opModeIsActive…) { and test
 * whether the fragment that follows contains .setPower(. This is a pragmatic
 * heuristic — it covers the typical single-loop pattern correctly.
 */
function setPowerInsideLoop(code: string): boolean {
  // Split at the while(opModeIsActive()) { opening.
  // Using [^{]* instead of [^)]* so nested parentheses like opModeIsActive()
  // don't break the match before we reach the opening brace.
  const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
  if (parts.length < 2) return false;
  return /\.setPower\(/.test(parts[1]);
}

/** Does the code contain a while(opModeIsActive()) loop? */
function hasOpModeActiveLoop(code: string): boolean {
  return /while\s*\([^)]*opModeIsActive[^)]*\)/.test(code);
}

const CHALLENGE_CHECKS: Record<number, ValidationCheck[]> = {
  // ── Challenge 1 ─ Basic TeleOp ──────────────────────────────────────────────
  1: [
    // ── Required ────────────────────────────────────────────────────────────
    {
      label: "DcMotor declared",
      description: "A DcMotor or DcMotorEx field is declared.",
      tier: "required",
      pattern: /\bDcMotor(Ex)?\b/,
      tip: "Declare the motor as a class field: `private DcMotor leftMotor;`",
    },
    {
      label: "hardwareMap.get(DcMotor…) called",
      description: "Motor retrieved from hardwareMap inside runOpMode().",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*DcMotor/,
      tip: 'Use: leftMotor = hardwareMap.get(DcMotor.class, "left_motor");',
    },
    {
      label: "gamepad1.left_stick_y read",
      description: "The left joystick Y-axis value is read from gamepad1.",
      tier: "required",
      pattern: /gamepad1\.left_stick_y/,
      tip: "Read the stick: double power = -gamepad1.left_stick_y;",
    },
    {
      label: "Y-axis negated",
      description: "Stick value negated so pushing forward gives positive power.",
      tier: "required",
      pattern: /-\s*gamepad1\.left_stick_y/,
      tip: "FTC gamepads invert Y — use: double power = -gamepad1.left_stick_y;",
    },
    {
      label: "while(opModeIsActive()) loop",
      description: "Main TeleOp loop runs while the OpMode is active.",
      tier: "required",
      pattern: hasOpModeActiveLoop,
      tip: "Wrap your driving code in: while (opModeIsActive()) { ... }",
    },
    {
      label: "setPower() called",
      description: "Motor power applied via motor.setPower(value).",
      tier: "required",
      pattern: /\.setPower\(/,
      tip: "Call leftMotor.setPower(power) to drive the motor.",
    },

    // ── Improvement ─────────────────────────────────────────────────────────
    {
      label: "setPower() inside the loop",
      description: "Motor power is updated every iteration (not set-and-forget).",
      tier: "improvement",
      pattern: setPowerInsideLoop,
      tip:
        "Move leftMotor.setPower(power) inside the while(opModeIsActive()) block so it updates every frame.",
    },
    {
      label: "Motor direction set",
      description:
        "setDirection() explicitly sets motor polarity (prevents wrong-way driving).",
      tier: "improvement",
      pattern: /\.setDirection\s*\(/,
      tip:
        "Add: leftMotor.setDirection(DcMotorSimple.Direction.REVERSE); after initialization.",
    },
    {
      label: "ZeroPowerBehavior set to BRAKE",
      description:
        "Motor holds position when released instead of coasting (safety best-practice).",
      tier: "improvement",
      pattern: /ZeroPowerBehavior\.BRAKE/,
      tip:
        "Add: leftMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
    },

    // ── Required (anti-starter-code gate) ───────────────────────────────────
    {
      label: "No leftover TODO comments",
      description: "All template TODO placeholders have been filled in.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
      tip: "Remove or resolve all // TODO comments before deploying.",
    },
  ],

  // ── Challenge 2 ─ Encoder Basics ────────────────────────────────────────────
  2: [
    {
      label: "Encoder reset",
      description: "STOP_AND_RESET_ENCODER zeroes the encoder before use.",
      tier: "required",
      pattern: /STOP_AND_RESET_ENCODER/,
      tip: "driveMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
    },
    {
      label: "RUN_TO_POSITION mode",
      description: "Motor switched to RUN_TO_POSITION mode.",
      tier: "required",
      pattern: /RUN_TO_POSITION/,
      tip: "driveMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);",
    },
    {
      label: "setTargetPosition() called",
      description: "Target encoder tick count passed to setTargetPosition().",
      tier: "required",
      pattern: /\.setTargetPosition\(/,
      tip: "driveMotor.setTargetPosition(TARGET_TICKS);",
    },
    {
      label: "Non-zero power applied",
      description: "setPower() called with a non-zero value to start movement.",
      tier: "required",
      pattern: /\.setPower\(\s*(?!0\b)[^)]+\)/,
      tip: "driveMotor.setPower(0.6); — RUN_TO_POSITION won't move without power.",
    },
    {
      label: "isBusy() polled",
      description: "Loop blocks on motor.isBusy() until target reached.",
      tier: "required",
      pattern: /\.isBusy\(\)/,
      tip: "while (driveMotor.isBusy() && opModeIsActive()) { idle(); }",
    },
    {
      label: "Motor stopped after arriving",
      description: "setPower(0) cuts motor power once the position is reached.",
      tier: "required",
      pattern: /\.setPower\(\s*0\s*\)/,
      tip: "driveMotor.setPower(0); after the isBusy() loop to prevent overheating.",
    },
    {
      label: "Telemetry reports position",
      description: "getCurrentPosition() logged to telemetry for debugging.",
      tier: "improvement",
      pattern: /getCurrentPosition\s*\(\s*\)/,
      tip: "telemetry.addData(\"Position\", driveMotor.getCurrentPosition()); inside the loop.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 3 ─ Autonomous Timer ──────────────────────────────────────────
  3: [
    {
      label: "ElapsedTime declared",
      description: "An ElapsedTime object created to track real time.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime timer = new ElapsedTime();",
    },
    {
      label: "Timer compared in while condition",
      description: "timer.seconds() used as the loop exit condition.",
      tier: "required",
      pattern: /\w+\.seconds\(\)\s*[<>]/,
      tip: "while (timer.seconds() < DRIVE_DURATION && opModeIsActive()) { ... }",
    },
    {
      label: "Motors driven forward",
      description: "setPower() called with a non-zero value for forward motion.",
      tier: "required",
      pattern: /setPower\(\s*(?!0\b)[^)]+\)/,
      tip: "leftMotor.setPower(DRIVE_SPEED); rightMotor.setPower(DRIVE_SPEED);",
    },
    {
      label: "Both motors stopped after timer",
      description: "setPower(0) stops both motors after the timed segment.",
      tier: "required",
      pattern: /setPower\(\s*0\s*\)/,
      tip: "Set both leftMotor.setPower(0) and rightMotor.setPower(0) after the loop.",
    },
    {
      label: "opModeIsActive() safety guard",
      description: "opModeIsActive() in the while condition allows emergency stop.",
      tier: "required",
      pattern: /opModeIsActive\(\)/,
      tip: "Always include opModeIsActive() in timed loops so the referee can stop the robot.",
    },
    {
      label: "Motor direction reversed for one side",
      description: "One motor reversed so both sides drive forward together.",
      tier: "improvement",
      pattern: /setDirection\s*\(\s*DcMotorSimple\.Direction\.REVERSE\s*\)/,
      tip: "leftMotor.setDirection(DcMotorSimple.Direction.REVERSE); — left and right motors are mirrored.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 4 ─ Road Runner Trajectory ────────────────────────────────────
  //
  // Per spec: "Good" = TrajectorySequence init + .splineTo() + followTrajectorySequence()
  // We also accept the RR 1.0 ActionBuilder pattern as an equivalent "Good" solution.
  4: [
    // Required ────────────────────────────────────────────────────────────────
    {
      label: "Drive object created",
      description: "MecanumDrive or SampleMecanumDrive constructed with hardwareMap.",
      tier: "required",
      pattern: /new\s+(Mecanum|SampleMecanum)Drive\s*\(/,
      tip: "MecanumDrive drive = new MecanumDrive(hardwareMap, startPose);",
    },
    {
      label: "Trajectory constructed",
      description:
        "Either a TrajectorySequence (RR 0.5) or ActionBuilder chain (RR 1.0) is built.",
      tier: "required",
      pattern: (code) =>
        // RR 0.5.x — TrajectorySequenceBuilder
        /TrajectorySequence\s+\w+|trajectorySequenceBuilder\s*\(/.test(code) ||
        // RR 1.0 — actionBuilder
        /\.actionBuilder\s*\(/.test(code),
      tip:
        "For RR 0.5: drive.trajectorySequenceBuilder(start).splineTo(…).build()\n" +
        "For RR 1.0: drive.actionBuilder(start).splineTo(…).build()",
    },
    {
      label: "splineTo() segment present",
      description: "At least one splineTo() call creates a curved path segment.",
      tier: "required",
      pattern: /\.splineTo\s*\(/,
      tip: ".splineTo(new Vector2d(30, 30), Math.PI / 2) — curves to the target point.",
    },
    {
      label: "Trajectory executed",
      description:
        "Either drive.followTrajectorySequence() or Actions.runBlocking() runs the path.",
      tier: "required",
      pattern: (code) =>
        /followTrajectorySequence\s*\(/.test(code) ||
        /Actions\s*\.\s*runBlocking\s*\(/.test(code),
      tip:
        "For RR 0.5: drive.followTrajectorySequence(autoSequence);\n" +
        "For RR 1.0: Actions.runBlocking(trajectory);",
    },

    // Improvement ─────────────────────────────────────────────────────────────
    {
      label: "waitSeconds() or temporal marker used",
      description: "A pause is included in the trajectory for mechanism timing.",
      tier: "improvement",
      pattern: (code) =>
        /\.waitSeconds\s*\(/.test(code) ||
        /addTemporalMarker\s*\(/.test(code),
      tip:
        ".waitSeconds(0.5) pauses the trajectory at a point — useful for scoring mechanisms.",
    },
    {
      label: "Starting pose set",
      description: "drive.setPoseEstimate() or Pose2d start used to anchor the position.",
      tier: "improvement",
      pattern: (code) =>
        /setPoseEstimate\s*\(/.test(code) ||
        /new\s+Pose2d\s*\(\s*0\s*,\s*0/.test(code),
      tip: "drive.setPoseEstimate(startPose); anchors odometry to match the robot's starting position.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO / commented-out trajectory stubs resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 6 ─ Dual Motor TeleOp ─────────────────────────────────────────
  6: [
    {
      label: "Both motors declared",
      description: "leftDrive and rightDrive DcMotor fields declared.",
      tier: "required",
      pattern: /\bDcMotor(Ex)?\b/,
      tip: "Declare both as `private DcMotor leftDrive;` and `private DcMotor rightDrive;`",
    },
    {
      label: "Left motor retrieved from hardwareMap",
      description: "leftDrive initialized with hardwareMap.get(DcMotor…).",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*DcMotor(Ex)?\.class,\s*"left_drive"\s*\)/,
      tip: 'leftDrive = hardwareMap.get(DcMotor.class, "left_drive");',
    },
    {
      label: "Right motor retrieved from hardwareMap",
      description: "rightDrive initialized with hardwareMap.get(DcMotor…).",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*DcMotor(Ex)?\.class,\s*"right_drive"\s*\)/,
      tip: 'rightDrive = hardwareMap.get(DcMotor.class, "right_drive");',
    },
    {
      label: "Left stick Y negated",
      description: "Left stick Y negated for the left motor.",
      tier: "required",
      pattern: /-\s*gamepad1\.left_stick_y/,
      tip: "double leftPower = -gamepad1.left_stick_y;",
    },
    {
      label: "Right stick Y negated",
      description: "Right stick Y negated for the right motor.",
      tier: "required",
      pattern: /-\s*gamepad1\.right_stick_y/,
      tip: "double rightPower = -gamepad1.right_stick_y;",
    },
    {
      label: "Motor direction reversed",
      description: "One motor reversed so both sides drive forward.",
      tier: "improvement",
      pattern: /Direction\.REVERSE/,
      tip: "leftDrive.setDirection(DcMotorSimple.Direction.REVERSE);",
    },
    {
      label: "BRAKE behavior set",
      description: "ZeroPowerBehavior.BRAKE applied to prevent coasting.",
      tier: "improvement",
      pattern: /ZeroPowerBehavior\.BRAKE/,
      tip: "leftDrive.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 7 ─ Servo Position Control ──────────────────────────────────
  7: [
    {
      label: "Servo declared",
      description: "A Servo field is declared.",
      tier: "required",
      pattern: /\bServo\b/,
      tip: "Declare as `private Servo blockerServo;`",
    },
    {
      label: "Servo initialized from hardwareMap",
      description: "Servo retrieved from hardwareMap.",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*Servo\.class/,
      tip: 'blockerServo = hardwareMap.get(Servo.class, "blocker_servo");',
    },
    {
      label: "setPosition(0.0) called",
      description: "Servo commanded to fully open position (0.0).",
      tier: "required",
      pattern: /\.setPosition\(\s*0(\.0)?\s*\)/,
      tip: "blockerServo.setPosition(0.0); when A button pressed.",
    },
    {
      label: "setPosition(1.0) called",
      description: "Servo commanded to fully closed position (1.0).",
      tier: "required",
      pattern: /\.setPosition\(\s*1(\.0)?\s*\)/,
      tip: "blockerServo.setPosition(1.0); when B button pressed.",
    },
    {
      label: "setPosition(0.5) called for midpoint",
      description: "Servo commanded to midpoint (0.5).",
      tier: "required",
      pattern: /\.setPosition\(\s*0\.5\s*\)/,
      tip: "blockerServo.setPosition(0.5); when X button pressed.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 8 ─ CRServo Intake ─────────────────────────────────────────
  8: [
    {
      label: "CRServo declared",
      description: "A CRServo field is declared.",
      tier: "required",
      pattern: /\bCRServo\b/,
      tip: "Declare as `private CRServo intakeServo;`",
    },
    {
      label: "CRServo initialized from hardwareMap",
      description: "CRServo retrieved with CRServo.class.",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*CRServo\.class/,
      tip: 'intakeServo = hardwareMap.get(CRServo.class, "diddler_servo");',
    },
    {
      label: "Right trigger read",
      description: "gamepad1.right_trigger used for forward intake power.",
      tier: "required",
      pattern: /gamepad1\.right_trigger/,
      tip: "if (gamepad1.right_trigger > 0.05) { intakePower = gamepad1.right_trigger; }",
    },
    {
      label: "Left trigger read for reverse",
      description: "gamepad1.left_trigger used for reverse power.",
      tier: "required",
      pattern: /gamepad1\.left_trigger/,
      tip: "intakePower = -gamepad1.left_trigger; for reverse.",
    },
    {
      label: "setPower() called on CRServo",
      description: "CRServo power applied each loop.",
      tier: "required",
      pattern: /\.setPower\(/,
      tip: "intakeServo.setPower(intakePower);",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 10 ─ Button Debouncing ──────────────────────────────────────
  10: [
    {
      label: "lastAButton variable declared",
      description: "lastAButton boolean tracks the previous button state.",
      tier: "required",
      pattern: /\blastAButton\b/,
      tip: "boolean lastAButton = false; — declared outside the loop.",
    },
    {
      label: "Rising-edge detection",
      description: "Button checked with gamepad1.a && !lastAButton.",
      tier: "required",
      pattern: /gamepad1\.a\s*&&\s*!lastAButton/,
      tip: "if (gamepad1.a && !lastAButton) { intakeRunning = !intakeRunning; }",
    },
    {
      label: "lastAButton updated each loop",
      description: "lastAButton = gamepad1.a; at end of loop.",
      tier: "required",
      pattern: /lastAButton\s*=\s*gamepad1\.a/,
      tip: "Put `lastAButton = gamepad1.a;` at the END of the loop body.",
    },
    {
      label: "intakeRunning boolean toggled",
      description: "intakeRunning flipped with the ! operator on rising edge.",
      tier: "required",
      pattern: /\bintakeRunning\b/,
      tip: "intakeRunning = !intakeRunning; inside the rising-edge if block.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 11 ─ ElapsedTime Patterns ───────────────────────────────────
  11: [
    {
      label: "ElapsedTime declared",
      description: "An ElapsedTime object created for timing.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime timer = new ElapsedTime();",
    },
    {
      label: "timer.reset() called",
      description: "timer.reset() resets the counter for each timed phase.",
      tier: "required",
      pattern: /\w+\.reset\s*\(\s*\)/,
      tip: "timer.reset(); before each timed segment.",
    },
    {
      label: "Timer compared with seconds()",
      description: "timer.seconds() used in a while loop condition.",
      tier: "required",
      pattern: /\w+\.seconds\(\)\s*[<>]/,
      tip: "while (timer.seconds() < 1.0 && opModeIsActive()) { ... }",
    },
    {
      label: "Motor stopped after timed run",
      description: "setPower(0) called after the timed drive segment.",
      tier: "required",
      pattern: /\.setPower\(\s*0\s*\)/,
      tip: "driveMotor.setPower(0); after the drive while loop exits.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 17 ─ Basic 4-Motor Mecanum ──────────────────────────────────
  17: [
    {
      label: "frontLeft motor declared",
      description: "frontLeft DcMotor field declared.",
      tier: "required",
      pattern: /\bfrontLeft\b/,
      tip: "private DcMotor frontLeft;",
    },
    {
      label: "frontRight motor declared",
      description: "frontRight DcMotor field declared.",
      tier: "required",
      pattern: /\bfrontRight\b/,
      tip: "private DcMotor frontRight;",
    },
    {
      label: "backLeft motor declared",
      description: "backLeft DcMotor field declared.",
      tier: "required",
      pattern: /\bbackLeft\b/,
      tip: "private DcMotor backLeft;",
    },
    {
      label: "backRight motor declared",
      description: "backRight DcMotor field declared.",
      tier: "required",
      pattern: /\bbackRight\b/,
      tip: "private DcMotor backRight;",
    },
    {
      label: "Strafe input read",
      description: "gamepad1.left_stick_x used as strafe input.",
      tier: "required",
      pattern: /gamepad1\.left_stick_x/,
      tip: "double strafe = gamepad1.left_stick_x;",
    },
    {
      label: "All four motors set power",
      description: "setPower() called on all four wheels.",
      tier: "required",
      pattern: (code) => (code.match(/\.setPower\s*\(/g) ?? []).length >= 4,
      tip: "Call setPower() on frontLeft, frontRight, backLeft, backRight.",
    },
    {
      label: "Left-side motors reversed",
      description: "Direction.REVERSE applied to correct the left side mounting.",
      tier: "improvement",
      pattern: /Direction\.REVERSE/,
      tip: "frontLeft.setDirection(DcMotorSimple.Direction.REVERSE); backLeft.setDirection(DcMotorSimple.Direction.REVERSE);",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 22 ─ DcMotorEx Velocity Control ─────────────────────────────
  22: [
    {
      label: "DcMotorEx declared",
      description: "Motor declared as DcMotorEx (not DcMotor).",
      tier: "required",
      pattern: /\bDcMotorEx\b/,
      tip: "private DcMotorEx shooterMotor;",
    },
    {
      label: "DcMotorEx retrieved from hardwareMap",
      description: "hardwareMap.get(DcMotorEx.class, ...) used.",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*DcMotorEx\.class/,
      tip: 'shooterMotor = hardwareMap.get(DcMotorEx.class, "shooter_motor");',
    },
    {
      label: "setVelocity() called",
      description: "setVelocity(targetTPS) commands closed-loop speed.",
      tier: "required",
      pattern: /\.setVelocity\s*\(/,
      tip: "shooterMotor.setVelocity(TARGET_TPS);",
    },
    {
      label: "getVelocity() called",
      description: "getVelocity() reads actual TPS from the motor.",
      tier: "required",
      pattern: /\.getVelocity\s*\(\s*\)/,
      tip: "double actual = shooterMotor.getVelocity();",
    },
    {
      label: "RUN_USING_ENCODER mode set",
      description: "RUN_USING_ENCODER required before velocity control.",
      tier: "improvement",
      pattern: /RUN_USING_ENCODER/,
      tip: "shooterMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 23 ─ Simple P Controller ────────────────────────────────────
  23: [
    {
      label: "Kp constant defined",
      description: "Proportional gain Kp declared as a constant.",
      tier: "required",
      pattern: /\bKp\b/,
      tip: "private static final double Kp = 0.003;",
    },
    {
      label: "Error computed",
      description: "Error = target − current computed.",
      tier: "required",
      pattern: /\berror\b/,
      tip: "int error = targetTicks - current;",
    },
    {
      label: "Power proportional to error",
      description: "Motor power = Kp * error.",
      tier: "required",
      pattern: /Kp\s*\*\s*error/,
      tip: "double rawPower = Kp * error;",
    },
    {
      label: "Power clamped",
      description: "Motor power clamped with Math.max/Math.min.",
      tier: "required",
      pattern: /Math\.max\s*\(|Math\.min\s*\(/,
      tip: "double clamped = Math.max(-MAX_POWER, Math.min(MAX_POWER, rawPower));",
    },
    {
      label: "getCurrentPosition() called",
      description: "Encoder position read from motor.",
      tier: "required",
      pattern: /\.getCurrentPosition\s*\(\s*\)/,
      tip: "int current = turretMotor.getCurrentPosition();",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 24 ─ Encoder Ticks to Degrees ───────────────────────────────
  24: [
    {
      label: "TICKS_PER_REV constant",
      description: "TICKS_PER_REV constant declared.",
      tier: "required",
      pattern: /TICKS_PER_REV/,
      tip: "private static final double TICKS_PER_REV = 537.7;",
    },
    {
      label: "ticksToDegrees() method",
      description: "ticksToDegrees helper method implemented.",
      tier: "required",
      pattern: /ticksToDegrees\s*\(/,
      tip: "private double ticksToDegrees(int ticks) { ... }",
    },
    {
      label: "Conversion formula uses 360",
      description: "Formula divides by (TICKS_PER_REV * GEAR_RATIO) and multiplies by 360.",
      tier: "required",
      pattern: /360(\.0)?/,
      tip: "return (ticks / (TICKS_PER_REV * GEAR_RATIO)) * 360.0;",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 28 ─ Button-Latch Shooting ──────────────────────────────────
  28: [
    {
      label: "shootingLatched boolean",
      description: "shootingLatched boolean declared.",
      tier: "required",
      pattern: /\bshootingLatched\b/,
      tip: "boolean shootingLatched = false;",
    },
    {
      label: "shooterReady boolean",
      description: "shooterReady boolean computed from TPS tolerance check.",
      tier: "required",
      pattern: /\bshooterReady\b/,
      tip: "boolean shooterReady = Math.abs(simulatedTPS - TARGET_TPS) <= TOLERANCE;",
    },
    {
      label: "Latch logic: release on button release",
      description: "shootingLatched = false when shoot button is not pressed.",
      tier: "required",
      pattern: /shootingLatched\s*=\s*false/,
      tip: "if (!shootButtonPressed) { shootingLatched = false; }",
    },
    {
      label: "feeding depends on latch AND button",
      description: "feeding = shootButtonPressed && shootingLatched.",
      tier: "required",
      pattern: /\bfeeding\b/,
      tip: "boolean feeding = shootButtonPressed && shootingLatched;",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 33 ─ Pythagorean Distance to Goal ───────────────────────────
  33: [
    {
      label: "distanceToGoal() method",
      description: "distanceToGoal helper method implemented.",
      tier: "required",
      pattern: /distanceToGoal\s*\(/,
      tip: "private double distanceToGoal(double x, double y) { ... }",
    },
    {
      label: "Math.hypot() used",
      description: "Math.hypot() computes the Pythagorean distance.",
      tier: "required",
      pattern: /Math\.hypot\s*\(/,
      tip: "return Math.hypot(GOAL_X - x, GOAL_Y - y);",
    },
    {
      label: "GOAL_X and GOAL_Y defined",
      description: "Goal coordinates defined in mm.",
      tier: "required",
      pattern: /GOAL_X|GOAL_Y/,
      tip: "private static final double GOAL_X = 72 * 25.4;",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 49 ─ Unit Conversion ────────────────────────────────────────
  49: [
    {
      label: "inchesToMm() method",
      description: "inchesToMm helper method implemented.",
      tier: "required",
      pattern: /inchesToMm\s*\(/,
      tip: "private double inchesToMm(double inches) { return inches * 25.4; }",
    },
    {
      label: "mmToInches() method",
      description: "mmToInches helper method implemented.",
      tier: "required",
      pattern: /mmToInches\s*\(/,
      tip: "private double mmToInches(double mm) { return mm / 25.4; }",
    },
    {
      label: "25.4 conversion factor used",
      description: "The exact 25.4 mm/inch conversion factor is used.",
      tier: "required",
      pattern: /25\.4/,
      tip: "1 inch = 25.4 mm exactly.",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 51 ─ Linear Interpolation ───────────────────────────────────
  51: [
    {
      label: "lerp() method",
      description: "lerp helper method implemented.",
      tier: "required",
      pattern: /\blerp\s*\(/,
      tip: "private double lerp(double a, double b, double t) { return a + t * (b - a); }",
    },
    {
      label: "t clamped to [0,1]",
      description: "t parameter clamped with Math.min(1.0, ...)",
      tier: "required",
      pattern: /Math\.min\s*\(\s*1(\.0)?\s*,/,
      tip: "double t = Math.min(1.0, elapsed / RAMP_DURATION);",
    },
    {
      label: "ElapsedTime used for ramp",
      description: "ElapsedTime drives the ramp parameter.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime timer = new ElapsedTime(); timer.reset();",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 53 ─ Robot Velocity Magnitude ───────────────────────────────
  53: [
    {
      label: "DcMotorEx used for velocity reading",
      description: "DcMotorEx declared for getVelocity() access.",
      tier: "required",
      pattern: /\bDcMotorEx\b/,
      tip: "private DcMotorEx forwardMotor, strafeMotor;",
    },
    {
      label: "getVelocity() called",
      description: "getVelocity() reads encoder velocity in TPS.",
      tier: "required",
      pattern: /\.getVelocity\s*\(\s*\)/,
      tip: "double fwdTPS = forwardMotor.getVelocity();",
    },
    {
      label: "Speed magnitude computed",
      description: "sqrt or hypot used to compute 2D speed magnitude.",
      tier: "required",
      pattern: /Math\.(sqrt|hypot)\s*\(/,
      tip: "double speed = Math.sqrt(vxMMs * vxMMs + vyMMs * vyMMs);",
    },
    {
      label: "Speed threshold compared",
      description: "Speed compared against SPEED_THRESHOLD constant.",
      tier: "required",
      pattern: /SPEED_THRESHOLD/,
      tip: "boolean robotSpeedOk = speed < SPEED_THRESHOLD;",
    },
    {
      label: "No leftover TODO comments",
      description: "All TODO placeholders resolved.",
      tier: "required",
      shouldBeAbsent: true,
      checkOriginal: true,
      pattern: /\/\/\s*TODO/i,
    },
  ],

  // ── Challenge 5 ─ Pedro Pathing Chain ────────────────────────────────────────
  5: [
    {
      label: "Follower instantiated",
      description: "new Follower(hardwareMap) creates the path follower.",
      tier: "required",
      pattern: /new\s+Follower\s*\(/,
      tip: "follower = new Follower(hardwareMap);",
    },
    {
      label: "Starting pose configured",
      description: "follower.setStartingPose(pose) tells Pedro where the robot starts.",
      tier: "required",
      pattern: /\.setStartingPose\s*\(/,
      tip: "follower.setStartingPose(new Pose(0, 0, 0));",
    },
    {
      label: "PathChain built",
      description: "follower.pathBuilder()…build() creates the chained path.",
      tier: "required",
      pattern: /pathBuilder\s*\(\s*\)/,
      tip: "PathChain chain = follower.pathBuilder().addPath(…).build();",
    },
    {
      label: "BezierCurve segment added",
      description: "At least one BezierCurve with control points shapes the path.",
      tier: "required",
      pattern: /new\s+BezierCurve\s*\(/,
      tip: "new BezierCurve(new Point(start), new Point(control), new Point(end))",
    },
    {
      label: "followPath() called",
      description: "follower.followPath(chain, true) starts path execution.",
      tier: "required",
      pattern: /\.followPath\s*\(/,
      tip: "follower.followPath(chain, true); — true = hold position at end.",
    },
    {
      label: "follower.update() in loop",
      description: "follower.update() called every loop tick to drive toward the path.",
      tier: "required",
      pattern: /follower\.update\s*\(\s*\)/,
      tip: "Call follower.update() inside your while loop — without it the robot won't move.",
    },
    {
      label: "atParametricEnd() checked",
      description: "Loop exits when follower reaches the end of the last segment.",
      tier: "required",
      pattern: /\.atParametricEnd\s*\(\s*\)/,
      tip: "if (follower.atParametricEnd()) break;",
    },
    {
      label: "Heading interpolation set per segment",
      description: "Each path segment has an explicit heading interpolation strategy.",
      tier: "improvement",
      pattern: /setLinearHeadingInterpolation|setConstantHeadingInterpolation|setTangentHeadingInterpolation/,
      tip:
        "Each .addPath() call should be followed by .setLinearHeadingInterpolation(start, end) or .setConstantHeadingInterpolation(angle).",
    },
  ],
};

// ─── Syntax sanity ─────────────────────────────────────────────────────────────

export interface SyntaxIssue {
  message: string;
  severity: "error" | "warning";
  /** Line numbers (1-indexed) relevant to this issue, when determinable. */
  lines?: number[];
}

function countChar(code: string, ch: string): number {
  return (code.match(new RegExp("\\" + ch, "g")) ?? []).length;
}

export function checkSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];

  const opens = countChar(code, "{");
  const closes = countChar(code, "}");
  if (opens !== closes) {
    issues.push({
      message: `Unbalanced braces: ${opens} '{' but ${closes} '}' — check every method and class body.`,
      severity: "error",
    });
  }

  const openP = countChar(code, "(");
  const closeP = countChar(code, ")");
  if (openP !== closeP) {
    issues.push({
      message: `Unbalanced parentheses: ${openP} '(' but ${closeP} ')' — likely a missing or extra ')'.`,
      severity: "error",
    });
  }

  // Semicolon after a closing brace outside of a for-loop is almost always wrong
  if (/\}\s*;/.test(code) && !/for\s*\([^)]*;[^)]*;/.test(code)) {
    issues.push({
      message: "Suspicious ';' after '}' — class and method bodies don't end with a semicolon.",
      severity: "warning",
    });
  }

  // Detect if the code is essentially unmodified starter code.
  // No line numbers here — this is a "nothing written" gate, not a specific code error.
  const todoCount = (code.match(/\/\/\s*TODO/gi) ?? []).length;
  if (todoCount >= 3) {
    issues.push({
      message: `${todoCount} unresolved TODO comments detected — have you filled in the starter code?`,
      severity: "error",
    });
  }

  // ── Invalid expression statements ──────────────────────────────────────────
  // Strip comments so hint text in // TODO lines never triggers these checks.
  const noComments = stripComments(code);

  // Keywords that legitimately appear alone on a line without a trailing ';'
  // (they're followed by a '{' block, either on the same line or the next)
  const SOLO_KEYWORDS = new Set([
    "else", "try", "finally", "do", "class", "interface", "enum",
  ]);

  // Keywords that are valid as a full statement ending with ';'
  const STMT_KEYWORDS = new Set(["return", "break", "continue"]);

  const badStmtLines: number[] = [];
  noComments.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "") return;

    // Case 1 — bare word, no semicolon: `Hi`
    // A single Java identifier with no trailing ';', operators, parens, or braces.
    if (/^[A-Za-z_]\w*$/.test(trimmed) && !SOLO_KEYWORDS.has(trimmed)) {
      badStmtLines.push(i + 1);
      return;
    }

    // Case 2 — bare word + semicolon: `Hi;`
    // A single identifier followed immediately by ';' is not a valid Java
    // expression statement (no method call, no assignment, no increment).
    if (/^[A-Za-z_]\w*;$/.test(trimmed) && !STMT_KEYWORDS.has(trimmed)) {
      badStmtLines.push(i + 1);
    }
  });

  if (badStmtLines.length > 0) {
    issues.push({
      message:
        `Invalid statement${badStmtLines.length > 1 ? "s" : ""} — ` +
        `not a valid Java expression (missing '()', '=', or method call?)`,
      severity: "error",
      lines: badStmtLines,
    });
  }

  // ── Check 1: Missing semicolons ────────────────────────────────────────────
  // Words that open a block on the same or next line — no ';' needed
  const CTRL_FLOW_WORDS = new Set([
    "if", "else", "while", "for", "do", "try", "catch", "finally", "switch",
  ]);
  // Line prefixes that indicate a declaration/modifier — no ';' needed here
  const DECL_PREFIX = /^(public|private|protected|static|abstract|final|synchronized|native|class|interface|enum|@|\*|\/)/;

  const missingSemiLines: number[] = [];
  noComments.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Already terminated correctly
    const last = trimmed[trimmed.length - 1];
    if (last === ";" || last === "{" || last === "}" || last === ",") return;

    // Excluded by control-flow or declaration prefix
    const firstWord = trimmed.split(/[\s(<]/)[0];
    if (CTRL_FLOW_WORDS.has(firstWord)) return;
    if (DECL_PREFIX.test(trimmed)) return;

    // Type + name + value assignment: `double power = -gamepad1.left_stick_y`
    const isAssignment = /^[\w.<>[\]]+\s+\w+\s*=.+[^;{},]$/.test(trimmed);

    // Re-assignment or compound: `x = val`, `x += val`  (exclude == comparisons)
    const isCompoundAssign = /^\w[\w.]*\s*[-+*/%]?=(?!=).*[^;{},]$/.test(trimmed);

    // Method call: `obj.method(args)` — ends with ) and nothing else
    const isMethodCall = /^\w[\w.]*\s*\(.*\)\s*$/.test(trimmed);

    // `return expr` without ;
    const isReturn = /^return\s+.+[^;{},]$/.test(trimmed);

    // `throw new ...` without ;
    const isThrow = /^throw\s+.+[^;{},]$/.test(trimmed);

    if (isAssignment || isCompoundAssign || isMethodCall || isReturn || isThrow) {
      missingSemiLines.push(i + 1);
    }
  });

  if (missingSemiLines.length > 0) {
    issues.push({
      message: `Missing ';' on statement${missingSemiLines.length > 1 ? "s" : ""}`,
      severity: "error",
      lines: missingSemiLines,
    });
  }

  // ── Check 2: Unclosed string literals ──────────────────────────────────────
  const unclosedStringLines: number[] = [];
  noComments.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Remove escaped quotes before counting so \" doesn't skew the tally
    const withoutEscaped = trimmed.replace(/\\"/g, "");
    const quoteCount = (withoutEscaped.match(/"/g) ?? []).length;
    if (quoteCount % 2 !== 0) {
      unclosedStringLines.push(i + 1);
    }
  });

  if (unclosedStringLines.length > 0) {
    issues.push({
      message: `Unclosed string literal — odd number of " on this line`,
      severity: "error",
      lines: unclosedStringLines,
    });
  }

  // ── Check 3: `return` appearing outside a method body ──────────────────────
  // In typical FTC OpMode code, brace depth 0 = file scope, depth 1 = class body.
  // A `return` at depth ≤ 1 is almost certainly a misplaced statement.
  {
    let depth = 0;
    const shallowReturnLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      // Check depth BEFORE counting this line's braces so a line like
      // `public void foo() { return x` is evaluated at depth 1 (correct).
      if (/\breturn\b/.test(line.trim()) && depth <= 1) {
        shallowReturnLines.push(i + 1);
      }
      depth += opens - closes;
    });
    if (shallowReturnLines.length > 0) {
      issues.push({
        message: "'return' appears outside a method body — possible misplaced statement",
        severity: "warning",
        lines: shallowReturnLines,
      });
    }
  }

  // ── Check 4: Duplicate variable declarations ───────────────────────────────
  // Detects the same FTC/Java type + variable name declared more than once in
  // the file — a common copy-paste mistake that causes a compile error.
  {
    const FTC_DECL = /\b(DcMotor(?:Ex)?|Servo|CRServo|int|double|boolean|String|float|ElapsedTime)\s+(\w+)\s*[;=(]/;
    const firstSeen = new Map<string, number>(); // varName → first line
    const dupNames: string[] = [];
    const dupDeclLines: number[] = [];

    noComments.split("\n").forEach((line, i) => {
      const m = FTC_DECL.exec(line);
      if (m) {
        const varName = m[2];
        if (firstSeen.has(varName)) {
          if (!dupNames.includes(varName)) dupNames.push(varName);
          dupDeclLines.push(i + 1);
        } else {
          firstSeen.set(varName, i + 1);
        }
      }
    });

    if (dupDeclLines.length > 0) {
      issues.push({
        message: `Duplicate variable declaration: '${dupNames.join("', '")}' is declared more than once`,
        severity: "warning",
        lines: dupDeclLines,
      });
    }
  }

  return issues;
}

/*
// ── REGRESSION TESTS ──────────────────────────────────────────────────────────
// These are documented expectations — not executable assertions — to verify the
// four new checks behave correctly on known inputs.
//
// 1. Input:  `leftMotor.setPower(power)`        (no semicolon)
//    Expect: Check 1 fires — "Missing ';' on statement"
//
// 2. Input:  `leftMotor.setPower(power);`       (correct)
//    Expect: Check 1 silent
//
// 3. Input:  `double power = -gamepad1.left_stick_y`  (no semicolon)
//    Expect: Check 1 fires — "Missing ';' on statement"
//
// 4. Input:  `String msg = "Hello`              (unclosed string)
//    Expect: Check 2 fires — "Unclosed string literal"
//
// 5. Input:  `String msg = "Hello";`            (correct)
//    Expect: Check 2 silent
//
// 6. Input:  Two lines both declaring `DcMotor leftMotor`
//    Expect: Check 4 fires — "Duplicate variable declaration: 'leftMotor'"
//
// 7. Input:  Fully correct Challenge 1 solution (all ; present, no duplicates)
//    Expect: Zero SyntaxIssue errors; no warnings
//
// 8. Input:  Unmodified Challenge 1 starter code (4 // TODO comments)
//    Expect: Existing TODO check fires —
//            "4 unresolved TODO comments detected — have you filled in the starter code?"
// ─────────────────────────────────────────────────────────────────────────────
*/

// ─── Main runner ───────────────────────────────────────────────────────────────

export interface GradedResult {
  grade: Grade;
  syntaxIssues: SyntaxIssue[];
  universalResults: CheckResult[];
  requiredResults: CheckResult[];
  improvementResults: CheckResult[];
  styleResults: CheckResult[];
  score: {
    required: { passed: number; total: number };
    improvement: { passed: number; total: number };
  };
  verdict: {
    title: string;
    subtitle: string;
  };
}

function runCheck(
  stripped: string,
  original: string,
  check: ValidationCheck
): CheckResult {
  // Structural checks run against comment-stripped source so that hint text
  // in // TODO lines cannot satisfy a pattern meant for real code.
  // Checks that need to see comments (e.g. the TODO detector) set checkOriginal.
  const target = check.checkOriginal ? original : stripped;
  const raw =
    typeof check.pattern === "function"
      ? check.pattern(target)
      : check.pattern.test(target);
  const pass = check.shouldBeAbsent ? !raw : raw;

  // For shouldBeAbsent checks that fail (pattern found when it shouldn't be),
  // record which lines the offending pattern appears on so the console can
  // surface a precise location to the user (e.g. leftover TODO comments).
  let matchedLines: number[] | undefined;
  if (!pass && check.shouldBeAbsent && typeof check.pattern !== "function") {
    matchedLines = findMatchingLines(original, check.pattern);
  }

  return {
    label: check.label,
    description: check.description,
    tier: check.tier,
    pass,
    tip: check.tip,
    matchedLines,
  };
}

export function gradeCode(code: string, challengeId: number): GradedResult {
  // checkSyntax always receives the original source (brace counts, TODO counts)
  const syntaxIssues = checkSyntax(code);
  const hasFatalSyntax = syntaxIssues.some((i) => i.severity === "error");

  // All structural checks receive comment-stripped source to prevent hint text
  // inside // TODO comments from falsely satisfying a regex pattern.
  const stripped = stripComments(code);

  const universalResults = UNIVERSAL.map((c) => runCheck(stripped, code, c));
  const allChecks = CHALLENGE_CHECKS[challengeId] ?? [];

  const requiredResults = allChecks
    .filter((c) => c.tier === "required")
    .map((c) => runCheck(stripped, code, c));

  const improvementResults = allChecks
    .filter((c) => c.tier === "improvement")
    .map((c) => runCheck(stripped, code, c));

  const styleResults = allChecks
    .filter((c) => c.tier === "style")
    .map((c) => runCheck(stripped, code, c));

  // ── Determine grade ──────────────────────────────────────────────────────
  const universalPassed = universalResults.every((r) => r.pass);
  const requiredPassed = requiredResults.every((r) => r.pass);
  const improvementPassed = improvementResults.every((r) => r.pass);

  let grade: Grade;
  if (hasFatalSyntax || !universalPassed || !requiredPassed) {
    grade = "wrong";
  } else if (!improvementPassed) {
    grade = "needs-improvement";
  } else {
    grade = "good";
  }

  // ── Score ────────────────────────────────────────────────────────────────
  const score = {
    required: {
      passed: universalResults.filter((r) => r.pass).length + requiredResults.filter((r) => r.pass).length,
      total: universalResults.length + requiredResults.length,
    },
    improvement: {
      passed: improvementResults.filter((r) => r.pass).length,
      total: improvementResults.length,
    },
  };

  // ── Verdict copy ─────────────────────────────────────────────────────────
  const failedRequired = [
    ...universalResults.filter((r) => !r.pass),
    ...requiredResults.filter((r) => !r.pass),
  ];
  const failedImprovements = improvementResults.filter((r) => !r.pass);

  const verdict =
    grade === "good"
      ? {
          title: "Challenge Passed!",
          subtitle: `All ${score.required.total} required checks passed${
            score.improvement.total > 0
              ? ` and ${score.improvement.total} best-practice checks passed`
              : ""
          }. XP awarded — great work!`,
        }
      : grade === "needs-improvement"
      ? {
          title: "Works — But Could Be Better",
          subtitle: `Core logic is correct, but ${failedImprovements.length} improvement suggestion${
            failedImprovements.length !== 1 ? "s" : ""
          } ${failedImprovements.length !== 1 ? "were" : "was"} not addressed. Fix the ⚠ hints to reach "Good".`,
        }
      : {
          title: "Not Quite Right",
          subtitle: `${failedRequired.length} required check${
            failedRequired.length !== 1 ? "s" : ""
          } failed. Review the ✗ errors above and re-submit.`,
        };

  return {
    grade,
    syntaxIssues,
    universalResults,
    requiredResults,
    improvementResults,
    styleResults,
    score,
    verdict,
  };
}

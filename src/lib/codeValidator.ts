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
  // ── Required ────────────────────────────────────────────────────────────────
  {
    label: "Extends LinearOpMode or OpMode",
    description: "Class declaration extends LinearOpMode or OpMode.",
    tier: "required",
    pattern: /extends\s+(LinearOpMode|OpMode)\b/,
    tip: "Every FTC OpMode must extend LinearOpMode (for sequential code) or OpMode (for iterative init/loop style).",
  },
  {
    label: "runOpMode() or init()/loop() defined",
    description: "LinearOpMode requires runOpMode(); iterative OpMode requires init() and loop().",
    tier: "required",
    pattern: (code) => {
      // LinearOpMode style
      if (/extends\s+LinearOpMode\b/.test(code)) return /void\s+runOpMode\s*\(\s*\)/.test(code);
      // Iterative OpMode style
      if (/extends\s+OpMode\b/.test(code)) {
        return /void\s+init\s*\(\s*\)/.test(code) && /void\s+loop\s*\(\s*\)/.test(code);
      }
      // Unknown base — require runOpMode as fallback
      return /void\s+runOpMode\s*\(\s*\)/.test(code);
    },
    tip: "runOpMode() is the entry point the FTC runtime calls.",
  },
  {
    label: "waitForStart() called",
    description: "waitForStart() pauses execution until the driver presses Start.",
    tier: "required",
    pattern: (code) => {
      // Iterative OpMode (extends OpMode) does not use waitForStart() — skip check.
      if (/extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code)) return true;
      return /waitForStart\s*\(\s*\)/.test(code);
    },
    tip: "Skipping waitForStart() causes the robot to run during initialization.",
  },

  // ── Improvement (universal best-practice hints) ──────────────────────────
  {
    label: "@TeleOp or @Autonomous annotation present",
    description: "OpMode registered with @TeleOp or @Autonomous so it appears in the FTC app.",
    tier: "improvement",
    checkOriginal: true,
    pattern: /@TeleOp\b|@Autonomous\b/,
    tip: 'Add @TeleOp(name = "My TeleOp") or @Autonomous(name = "My Auto") above the class declaration.',
  },
  {
    label: "opModeIsActive() guards the main loop",
    description: "while(opModeIsActive()) lets the referee stop the robot at any time.",
    tier: "improvement",
    pattern: (code) => {
      // Only apply when a while loop exists; if there's no loop, consider it passing.
      if (!/while\s*\(/.test(code)) return true;
      return /opModeIsActive\s*\(\s*\)/.test(code);
    },
    tip: "Wrap your driving/control code in: while (opModeIsActive()) { ... }",
  },
  {
    label: "telemetry.update() called",
    description: "telemetry.update() flushes buffered lines to the Driver Station screen.",
    tier: "improvement",
    pattern: (code) => {
      // Not applicable if addData is never used.
      if (!/telemetry\.addData\s*\(/.test(code)) return true;
      // Must have at least one update() call.
      if (!/telemetry\.update\s*\(\s*\)/.test(code)) return false;

      // Line-by-line check: every addData() must be followed by update() before
      // the next sleep() call. Track whether there's a "pending" addData without
      // a matching update yet.
      const codeNoStrings = code.replace(/"[^"]*"/g, '""');
      const lines = codeNoStrings.split("\n");
      let pendingAddData = false;
      for (const line of lines) {
        const t = line.trim();
        if (/telemetry\.addData\s*\(/.test(t)) pendingAddData = true;
        if (/telemetry\.update\s*\(\s*\)/.test(t)) pendingAddData = false;
        if (/\bsleep\s*\(/.test(t) && pendingAddData) return false;
      }
      return true;
    },
    tip: "Call telemetry.update() after every batch of addData() calls — without it the Driver Station screen never refreshes.",
  },
  {
    label: "Motors explicitly stopped on exit",
    description: "Calling setPower(0) after the loop is good practice even though the FTC runtime stops motors automatically.",
    tier: "style",
    pattern: (code) => {
      // Only apply when setPower is used with a non-zero value.
      if (!/\.setPower\(\s*(?!0\b)[^)]+\)/.test(code)) return true;
      return /\.setPower\(\s*0(?:\.0*)?\s*\)/.test(code);
    },
    tip: "Optional: add motor.setPower(0) after your loop. The FTC runtime stops motors automatically on Stop, but explicit cleanup makes intent clear.",
  },
  {
    label: "hardwareMap initialisation inside runOpMode()",
    description: "Hardware devices retrieved from hardwareMap before use.",
    tier: "improvement",
    pattern: (code) => {
      // Only apply when a hardware type is declared as a field.
      if (!/\b(?:DcMotor|Servo|CRServo|IMU|ColorSensor|DistanceSensor|TouchSensor)\b/.test(code)) return true;
      return /hardwareMap\.get\s*\(/.test(code);
    },
    tip: "Initialise hardware inside runOpMode(): e.g. motor = hardwareMap.get(DcMotor.class, \"motor\");",
  },

  // ── Order checks ────────────────────────────────────────────────────────────

  {
    label: "waitForStart() is inside runOpMode()",
    description: "waitForStart() must live inside the runOpMode() method, not above it.",
    tier: "required",
    pattern: (code) => {
      // Iterative OpMode (init/loop) does not use waitForStart — skip.
      if (/extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code)) return true;
      const runOpIdx  = firstIndex(code, /void\s+runOpMode\s*\(\s*\)/);
      const waitIdx   = firstIndex(code, /waitForStart\s*\(\s*\)/);
      if (runOpIdx === -1 || waitIdx === -1) return true;
      return waitIdx > runOpIdx;
    },
      tip: "waitForStart() is not in the right spot.",
  },
  {
    label: "waitForStart() before the main loop",
    description: "waitForStart() must be called before the while(opModeIsActive()) loop.",
    tier: "required",
    pattern: (code) => {
      // Iterative OpMode does not use waitForStart — skip.
      if (/extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code)) return true;
      const waitIdx = firstIndex(code, /waitForStart\s*\(\s*\)/);
      const loopIdx = firstIndex(code, /while\s*\([^{]*opModeIsActive/);
      if (waitIdx === -1 || loopIdx === -1) return true;
      return waitIdx < loopIdx;
    },
      tip: "waitForStart() is not in the right spot.",
  },
  {
    label: "Hardware initialized before waitForStart()",
    description: "All hardwareMap.get() calls should appear before waitForStart().",
    tier: "improvement",
    pattern: (code) => {
      if (!/hardwareMap\.get\s*\(/.test(code) || !/waitForStart\s*\(\s*\)/.test(code)) return true;
      const waitIdx = firstIndex(code, /waitForStart\s*\(\s*\)/);
      // Fail if any hardwareMap.get() appears after waitForStart().
      const hwRe = /hardwareMap\.get\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = hwRe.exec(code)) !== null) {
        if (m.index > waitIdx) return false;
      }
      return true;
    },
      tip: "Hardware initialization is not in the right spot.",
  },
  {
    label: "setTargetPosition() before RUN_TO_POSITION",
    description: "setTargetPosition() must be set before switching to RUN_TO_POSITION mode.",
    tier: "required",
    pattern: (code) => {
      if (!/setTargetPosition\s*\(/.test(code) || !/RUN_TO_POSITION/.test(code)) return true;
      const targetIdx = firstIndex(code, /setTargetPosition\s*\(/);
      const modeIdx   = firstIndex(code, /RUN_TO_POSITION/);
      return targetIdx < modeIdx;
    },
      tip: "setTargetPosition() is not in the right spot.",
  },

  // ── Missing-element checks ─────────────────────────────────────────────────

  {
    label: "@Override on runOpMode()",
    description: "@Override annotation confirms the method signature matches LinearOpMode.",
    tier: "improvement",
    pattern: (code) => {
      if (!/void\s+runOpMode\s*\(\s*\)/.test(code)) return true;
      // @Override and runOpMode() must appear within ~120 chars of each other.
      return /@Override[\s\S]{1,120}void\s+runOpMode\s*\(\s*\)/.test(code);
    },
    tip: "Add @Override directly above runOpMode() — it lets the compiler catch signature typos.",
  },
  {
    label: "opModeIsActive() guards every while loop with motor code",
    description: "Any while loop that drives motors must check opModeIsActive() so the referee can stop the robot.",
    tier: "improvement",
    pattern: (code) => {
      // Only relevant when there's a while loop AND motor commands.
      if (!/while\s*\(/.test(code) || !/\.setPower\(/.test(code)) return true;
      // If opModeIsActive is present somewhere, treat as passing.
      return /opModeIsActive\s*\(\s*\)/.test(code);
    },
    tip: "Change while (...) to while (opModeIsActive() && ...) so pressing Stop ends your loop immediately.",
  },

  // ── Issue 33: while(true) without opModeIsActive guard ─────────────────
  {
    label: "No while(true) loop",
    description: "while(true) prevents the FTC app from stopping the robot; use while(opModeIsActive()) instead.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: /while\s*\(\s*true\s*\)/,
    tip: "Replace while(true) with while(opModeIsActive()) so the FTC app can stop the robot when Stop is pressed or the match ends.",
  },

  // ── Issue 17: Thread.sleep() instead of LinearOpMode.sleep() ──────────
  {
    label: "No Thread.sleep() — use sleep() instead",
    description: "Thread.sleep() bypasses FTC's stop-request mechanism; LinearOpMode.sleep() respects it.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: /Thread\.sleep\s*\(/,
    tip: "Replace Thread.sleep(ms) with sleep(ms). LinearOpMode's sleep() checks for stop requests during the pause — Thread.sleep() ignores them.",
  },

  // ── Issue 5: waitForStart() inside the main while loop ─────────────────
  {
    label: "waitForStart() not inside the main loop",
    description: "waitForStart() must be called exactly once, before the while(opModeIsActive()) loop.",
    tier: "required",
    pattern: (code) => {
      // Iterative OpMode does not use waitForStart — skip.
      if (/extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code)) return true;
      if (!/waitForStart\s*\(\s*\)/.test(code) || !/while\s*\([^{]*opModeIsActive/.test(code)) return true;
      const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
      if (parts.length < 2) return true;
      return !/waitForStart\s*\(\s*\)/.test(parts[1]);
    },
      tip: "waitForStart() is not in the right spot.",
  },

  // ── Issue 24: Trigger compared with == instead of a threshold ──────────
  {
    label: "Trigger uses threshold comparison (not ==)",
    description: "Triggers return a float 0.0–1.0; comparing with == 1.0 almost never fires.",
    tier: "improvement",
    shouldBeAbsent: true,
    pattern: /gamepad\d+\.\w+_trigger\s*==\s*[\d.]+/,
    tip: "Triggers return an analog float — use > 0.05 (or similar) instead of == 1.0 to detect any meaningful press.",
  },

  // ── Issue 16: sleep() inside TeleOp main loop alongside gamepad reads ──
  {
    label: "No sleep() inside TeleOp gamepad loop",
    description: "sleep() inside a loop that reads gamepad input freezes driver control for its entire duration.",
    tier: "improvement",
    pattern: (code) => {
      // Only flag when gamepad input is used (TeleOp context) and a loop exists.
      if (!/gamepad\d+\./.test(code) || !/while\s*\([^{]*opModeIsActive/.test(code)) return true;
      // Check whether sleep() appears inside the opModeIsActive loop body.
      const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
      if (parts.length < 2) return true;
      return !/\bsleep\s*\(/.test(parts[1]);
    },
    tip: "Remove sleep() from TeleOp loops — it freezes gamepad input for its full duration. Reserve sleep() for Autonomous between discrete motion segments.",
  },

  // ── Issue 3: One-time config calls (setDirection / setZeroPowerBehavior) inside loop ──
  {
    label: "setDirection() not inside main loop",
    description: "setDirection() should be called once during init, not unconditionally every loop iteration.",
    tier: "improvement",
    pattern: (code) => {
      if (!/\.setDirection\s*\(/.test(code) || !/while\s*\([^{]*opModeIsActive/.test(code)) return true;
      const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
      if (parts.length < 2) return true;
      const loopBody = parts[1];
      if (!/\.setDirection\s*\(/.test(loopBody)) return true;
      // Allow when guarded by an if-statement (intentional runtime toggle).
      const guardedPattern = /if\s*\([^)]+\)\s*\{[^}]*\.setDirection\s*\(/;
      return guardedPattern.test(loopBody);
    },
      tip: "setDirection() is not in the right spot.",
  },
  {
    label: "setZeroPowerBehavior() not inside main loop",
    description: "setZeroPowerBehavior() should be called once during init, not unconditionally every loop iteration.",
    tier: "improvement",
    pattern: (code) => {
      if (!/\.setZeroPowerBehavior\s*\(/.test(code) || !/while\s*\([^{]*opModeIsActive/.test(code)) return true;
      const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
      if (parts.length < 2) return true;
      const loopBody = parts[1];
      // Only flag when the call is NOT guarded by an if-statement (i.e. called every frame).
      // A call inside `if (...) { ... setZeroPowerBehavior ... }` is intentional (e.g. toggle).
      if (!/\.setZeroPowerBehavior\s*\(/.test(loopBody)) return true;
      // Check if the call is directly at loop scope (no enclosing if-block).
      // Heuristic: if every setZeroPowerBehavior call in the loop body is preceded by
      // an `if` keyword on the same logical nesting level, consider it guarded.
      const guardedPattern = /if\s*\([^)]+\)\s*\{[^}]*\.setZeroPowerBehavior\s*\(/;
      return guardedPattern.test(loopBody);
    },
      tip: "setZeroPowerBehavior() is not in the right spot.",
  },

  // ── waitForStart() inside if(opModeIsActive()) ─────────────────────────
  {
    label: "waitForStart() not inside if(opModeIsActive())",
    description: "waitForStart() must be called directly, not wrapped in an if(opModeIsActive()) guard.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: (code) => {
      // Iterative OpMode does not use waitForStart — skip.
      if (/extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code)) return false;
      return /if\s*\(\s*opModeIsActive\s*\(\s*\)\s*\)\s*\{[\s\S]*?waitForStart\s*\(\s*\)/.test(code);
    },
    tip: "waitForStart() is not in the right spot.",
  },

  // ── hardwareMap used as argument before runOpMode() opens ───────────────
  {
    label: "hardwareMap not used before runOpMode()",
    description: "Any use of hardwareMap (including as a constructor argument) must be inside runOpMode() or init(), not at class-field level.",
    tier: "required",
    pattern: (code) => {
      // For OpMode, check before init() instead of runOpMode()
      const isIterativeOpMode = /extends\s+OpMode\b/.test(code) && !/extends\s+LinearOpMode\b/.test(code);
      const entryMethodPattern = isIterativeOpMode
        ? /void\s+init\s*\(\s*\)/
        : /void\s+runOpMode\s*\(\s*\)/;
      const entryIdx = code.search(entryMethodPattern);
      if (entryIdx === -1) return true;
      const beforeEntry = code.slice(0, entryIdx);
      return !/\bhardwareMap\b/.test(beforeEntry);
    },
    tip: "hardwareMap is not in the right spot.",
  },

  // ── Anti-starter / placeholder detection ────────────────────────────────
  {
    label: 'No placeholder "TBD" telemetry values',
    description: 'Replace "TBD" strings with real variable names or computed values.',
    tier: "required",
    shouldBeAbsent: true,
    pattern: /telemetry\.addData\s*\([^)]*,\s*"TBD"\s*\)/,
    tip: 'Replace telemetry.addData("State", "TBD") with the actual state variable, e.g. state.name().',
  },
  {
    label: "No stub sensor checks (if false)",
    description: "Replace if (false) with a real sensor or condition.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: /if\s*\(\s*false\s*\)/,
    tip: "Use the real sensor call, e.g. if (touchSensor.isPressed()) break;",
  },
  {
    label: "No stub interpolation (t = 0; return 0)",
    description: "Interpolation helpers must compute t and return a table-based value, not placeholders.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: /double\s+t\s*=\s*0\s*;\s*\n\s*return\s+0(?:\.0*)?\s*;/,
    tip: "Compute t from the bracket pair, then return the interpolated table value.",
  },
  {
    label: "No stub helper methods (return 0 only)",
    description: "Helper methods that only return 0 are placeholders — implement the real formula.",
    tier: "required",
    shouldBeAbsent: true,
    pattern: /(?:private|public)\s+\w+\s+\w+\s*\([^)]*\)\s*\{[\s\n]*return\s+0(?:\.0*)?\s*;[\s\n]*\}/,
    tip: "Replace return 0; with the actual conversion or interpolation formula.",
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
 * Returns the character index of the first match of `pattern` in `code`,
 * or -1 if not found. Used for positional ordering checks.
 */
function firstIndex(code: string, pattern: RegExp): number {
  const m = pattern.exec(code);
  return m ? m.index : -1;
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
      tip: "setPower() is not in the right spot.",
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
      label: "isBusy() polled inside a while loop",
      description: "while(motor.isBusy() ...) loop blocks until the motor reaches its target.",
      tier: "required",
      pattern: /while\s*\([^{]*\.isBusy\s*\(\s*\)/,
      tip: "Use: while (driveMotor.isBusy() && opModeIsActive()) { ... } — this makes the code wait for the motor to finish.",
    },
    {
      label: "Motor stopped after arriving",
      description: "setPower(0) cuts motor power once the position is reached.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "driveMotor.setPower(0); after the isBusy() loop to prevent overheating.",
    },
    // ── Issue 13: isBusy() loop missing opModeIsActive() guard ─────────────
    {
      label: "isBusy() loop guarded by opModeIsActive()",
      description: "while(motor.isBusy() && opModeIsActive()) prevents an infinite loop if the motor jams.",
      tier: "required",
      pattern: (code) => {
        // Only relevant when isBusy() is polled in a while loop.
        if (!/while\s*\([^{]*\.isBusy\s*\(\s*\)/.test(code)) return true;
        // The isBusy() while condition must also include opModeIsActive().
        return /while\s*\([^{]*\.isBusy\s*\(\s*\)[^{]*opModeIsActive|while\s*\([^{]*opModeIsActive[^{]*\.isBusy\s*\(\s*\)/.test(code);
      },
      tip: "Always pair isBusy() with opModeIsActive(): while (driveMotor.isBusy() && opModeIsActive()) { idle(); } — without it a jammed motor loops forever.",
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
      pattern: /setPower\(\s*0(?:\.0*)?\s*\)/,
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
      pattern: /setDirection\s*\(\s*(?:DcMotor(?:Simple)?\.)?Direction\.REVERSE\s*\)/,
      tip: "One motor should be reversed: e.g. leftMotor.setDirection(DcMotor.Direction.REVERSE); — which side depends on how your motors are mounted.",
    },
    // ── Issue 7: ElapsedTime created inside the loop ────────────────────────
    {
      label: "ElapsedTime declared outside the loop",
      description: "Creating new ElapsedTime() inside the loop resets the clock to zero every frame.",
      tier: "required",
      pattern: (code) => {
        if (!/new\s+ElapsedTime\s*\(\s*\)/.test(code)) return true;
        // Fail if new ElapsedTime() appears inside any while loop body.
        const parts = code.split(/while\s*\([^{]*\{/);
        if (parts.length < 2) return true;
        return !/new\s+ElapsedTime\s*\(\s*\)/.test(parts.slice(1).join(""));
      },
      tip: "ElapsedTime declaration is not in the right spot.",
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
      description: "leftDrive and rightDrive DcMotor fields declared (two separate declarations required).",
      tier: "required",
      pattern: (code) => {
        // Count distinct DcMotor/DcMotorEx variable declaration lines to require at least two.
        const matches = code.match(/\bDcMotor(Ex)?\b[^;{(]*\w+\s*[;=]/g) ?? [];
        return matches.length >= 2;
      },
      tip: "Declare BOTH motors as separate fields: `private DcMotor leftDrive;` AND `private DcMotor rightDrive;`",
    },
    {
      label: "Both motors retrieved from hardwareMap",
      description: "Both drive motors initialized via hardwareMap.get(DcMotor…).",
      tier: "required",
      pattern: (code) =>
        (code.match(/hardwareMap\.get\s*\(\s*DcMotor(Ex)?\.class/g) ?? []).length >= 2,
      tip: 'leftDrive = hardwareMap.get(DcMotor.class, "left_drive"); rightDrive = hardwareMap.get(DcMotor.class, "right_drive");',
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
      tip: "Reverse one side to drive straight: e.g. leftDrive.setDirection(DcMotor.Direction.REVERSE); — which side depends on your motor mounting.",
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
      pattern: (code) => {
        // Accept the literal value directly
        if (/\.setPosition\(\s*0(?:\.0+)?\s*\)/.test(code)) return true;
        // Accept a named constant whose declaration equals 0.0
        const constNames = [...code.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*=\s*0(?:\.0+)?\s*;/g)]
          .map((m) => m[1]);
        return constNames.some((n) =>
          new RegExp(`\\.setPosition\\(\\s*${n}\\s*\\)`).test(code)
        );
      },
      tip: "blockerServo.setPosition(0.0); when A button pressed — or use a constant: private static final double POSITION_OPEN = 0.0;",
    },
    {
      label: "setPosition(1.0) called",
      description: "Servo commanded to fully closed position (1.0).",
      tier: "required",
      pattern: (code) => {
        if (/\.setPosition\(\s*1(?:\.0+)?\s*\)/.test(code)) return true;
        const constNames = [...code.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*=\s*1(?:\.0+)?\s*;/g)]
          .map((m) => m[1]);
        return constNames.some((n) =>
          new RegExp(`\\.setPosition\\(\\s*${n}\\s*\\)`).test(code)
        );
      },
      tip: "blockerServo.setPosition(1.0); when B button pressed — or use a constant: private static final double POSITION_CLOSED = 1.0;",
    },
    {
      label: "setPosition(0.5) called for midpoint",
      description: "Servo commanded to midpoint (0.5).",
      tier: "required",
      pattern: (code) => {
        if (/\.setPosition\(\s*0\.5\s*\)/.test(code)) return true;
        const constNames = [...code.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*=\s*0\.5\s*;/g)]
          .map((m) => m[1]);
        return constNames.some((n) =>
          new RegExp(`\\.setPosition\\(\\s*${n}\\s*\\)`).test(code)
        );
      },
      tip: "blockerServo.setPosition(0.5); when X button pressed — or use a constant: private static final double POSITION_MID = 0.5;",
    },
    // ── Issue 29: setPower() on a regular Servo ─────────────────────────────
    {
      label: "No setPower() on Servo — use setPosition()",
      description: "Regular Servo uses setPosition(0.0–1.0); setPower() is for CRServo only.",
      tier: "required",
      shouldBeAbsent: true,
      pattern: (code) => {
        // Only flag when a Servo (not CRServo) was actually initialized from hardwareMap,
        // confirming the student intended to use a standard Servo, then called setPower().
        if (!/hardwareMap\.get\(\s*Servo\.class/.test(code)) return false;
        if (/\bCRServo\b/.test(code)) return false;
        return /\.setPower\s*\(/.test(code);
      },
      tip: "Use blockerServo.setPosition(0.0–1.0) to move a standard servo. setPower() is only valid on CRServo (continuous rotation).",
    },
    // ── Issue 42: setPosition() value outside [0.0, 1.0] ───────────────────
    {
      label: "setPosition() values within [0.0, 1.0]",
      description: "setPosition() accepts only values from 0.0 to 1.0 (not degrees or raw PWM).",
      tier: "required",
      shouldBeAbsent: true,
      pattern: /\.setPosition\(\s*(?:[2-9]\d*(?:\.\d+)?|1\.[1-9]\d*|\d{2,}(?:\.\d+)?|-\s*[\d.]+)\s*\)/,
      tip: "setPosition() takes a fraction from 0.0 (one extreme) to 1.0 (other extreme) — not degrees. Values outside this range are silently clamped.",
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
      tip: 'intakeServo = hardwareMap.get(CRServo.class, "intake_servo");',
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
    // ── Issue 30: setPosition() on a CRServo ────────────────────────────────
    {
      label: "No setPosition() on CRServo — use setPower()",
      description: "CRServo spins continuously like a motor; it uses setPower(), not setPosition().",
      tier: "required",
      shouldBeAbsent: true,
      pattern: /\.setPosition\s*\(/,
      tip: "Use intakeServo.setPower(1.0) for full forward, setPower(0.0) to stop, setPower(-1.0) for reverse. CRServo does not have setPosition().",
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
      label: "Previous-state boolean declared",
      description: "A boolean variable tracks the previous button state for edge detection.",
      tier: "required",
      pattern: /\blast\w+\s*=\s*false|boolean\s+\w*[Pp]rev\w*\s*=/,
      tip: "boolean lastAButton = false; — declared before the loop to track the previous press state.",
    },
    {
      label: "Rising-edge detection",
      description: "Button checked with gamepad1.x && !lastX — fires only on the first frame the button is pressed.",
      tier: "required",
      pattern: /gamepad1\.\w+\s*&&\s*!\w+/,
      tip: "if (gamepad1.a && !lastAButton) { intakeRunning = !intakeRunning; } — the !last part makes it fire only once per press.",
    },
    {
      label: "Previous-state variable updated at end of loop",
      description: "lastButton = gamepad1.button; at the END of the loop body so rising edges are detected next frame.",
      tier: "required",
      pattern: (code) => {
        // Check that an assignment matching "lastX = gamepad1.Y" appears inside the loop body
        const parts = code.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
        if (parts.length < 2) return false;
        return /\blast\w+\s*=\s*gamepad1\.\w+/.test(parts[1]);
      },
      tip: "lastAButton = gamepad1.a; must appear at the END of the while loop — updating it at the top means rising edges are never detected.",
    },
    {
      label: "Toggle boolean flipped with !",
      description: "A state variable toggled using the ! operator on the rising edge.",
      tier: "required",
      pattern: /\w+\s*=\s*!\s*\w+/,
      tip: "intakeRunning = !intakeRunning; — the ! operator flips the boolean each time the button is newly pressed.",
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
      label: "Two separate timed segments",
      description: "Two distinct timer.seconds() comparisons drive the 1 s forward and 0.5 s reverse segments.",
      tier: "required",
      pattern: (code) => (code.match(/\w+\.seconds\s*\(\s*\)\s*[<>]/g) ?? []).length >= 2,
      tip: "There should be two timed while loops: while(timer.seconds() < 1.0 ...) and while(timer.seconds() < 0.5 ...). Call timer.reset() between them.",
    },
    {
      label: "Motor stopped after timed run",
      description: "setPower(0) called after the timed drive segment.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "driveMotor.setPower(0); after the drive while loop exits.",
    },
    // ── Issue 7: ElapsedTime created inside the loop ────────────────────────
    {
      label: "ElapsedTime declared outside the loop",
      description: "Creating new ElapsedTime() inside the loop resets the clock to zero every frame.",
      tier: "required",
      pattern: (code) => {
        if (!/new\s+ElapsedTime\s*\(\s*\)/.test(code)) return true;
        const parts = code.split(/while\s*\([^{]*\{/);
        if (parts.length < 2) return true;
        return !/new\s+ElapsedTime\s*\(\s*\)/.test(parts.slice(1).join(""));
      },
      tip: "ElapsedTime declaration is not in the right spot.",
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
      label: "Four DcMotor fields declared",
      description: "Four separate DcMotor or DcMotorEx fields declared for the four mecanum wheels.",
      tier: "required",
      pattern: (code) => {
        const matches = code.match(/\bDcMotor(Ex)?\b[^;{(]*\w+\s*[;=]/g) ?? [];
        return matches.length >= 4;
      },
      tip: "Declare all four: private DcMotor frontLeft, frontRight, backLeft, backRight;",
    },
    {
      label: "All four motors retrieved from hardwareMap",
      description: "All four mecanum wheels initialized from hardwareMap.get(DcMotor…).",
      tier: "required",
      pattern: (code) =>
        (code.match(/hardwareMap\.get\s*\(\s*DcMotor(Ex)?\.class/g) ?? []).length >= 4,
      tip: "frontLeft = hardwareMap.get(DcMotor.class, \"front_left\"); — repeat for all four.",
    },
    {
      label: "Strafe input read",
      description: "gamepad1.left_stick_x used as strafe input.",
      tier: "required",
      pattern: /gamepad1\.left_stick_x/,
      tip: "double strafe = gamepad1.left_stick_x;",
    },
    {
      label: "Rotate input read",
      description: "gamepad1.right_stick_x used as rotation input.",
      tier: "required",
      pattern: /gamepad1\.right_stick_x/,
      tip: "double rotate = gamepad1.right_stick_x;",
    },
    {
      label: "Mecanum formula combines drive + strafe + rotate",
      description: "Each motor power mixes drive, strafe, and rotate with the correct signs.",
      tier: "required",
      pattern: (code) =>
        // At least two of the three inputs are combined in an arithmetic expression
        (/drive\s*[\+\-]\s*strafe|strafe\s*[\+\-]\s*drive/.test(code)) &&
        (/\+\s*rotate|\-\s*rotate/.test(code)),
      tip: "frontLeft.setPower(drive + strafe + rotate); — mecanum mixes all three axes with +/- signs per wheel.",
    },
    {
      label: "All four motors set power",
      description: "setPower() called on all four wheels.",
      tier: "required",
      pattern: (code) => (code.match(/\.setPower\s*\(/g) ?? []).length >= 4,
      tip: "Call setPower() on frontLeft, frontRight, backLeft, backRight.",
    },
    {
      label: "One or more motors reversed",
      description: "Direction.REVERSE applied to correct motor mounting polarity.",
      tier: "improvement",
      pattern: /Direction\.REVERSE/,
      tip: "Reverse the side that drives backward: e.g. frontLeft.setDirection(DcMotor.Direction.REVERSE); — which side depends on how your motors are physically mounted.",
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
      description: "RUN_USING_ENCODER is required before calling setVelocity() — without it the velocity PID is ignored.",
      tier: "required",
      pattern: /RUN_USING_ENCODER/,
      tip: "setMode(RUN_USING_ENCODER) is not in the right spot.",
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
      label: "Error computed (target − current)",
      description: "Error computed as target minus current — not current minus target.",
      tier: "required",
      pattern: (code) => {
        // Require that 'error' is assigned using target - current order (not current - target).
        // Accept any variable name for target and current, but the subtraction must be target-first.
        // We check that there is NO assignment "error = <something> - targetTicks" where the
        // current position comes first. Positive form: target... - current... is present.
        if (!/\berror\b/.test(code)) return false;
        // Pass if the code contains a "target - current" pattern
        const hasCorrectSign = /\btarget\w*\s*-\s*current|targetTicks\s*-\s*current|\bKp\s*\*\s*\(\s*target/.test(code);
        const hasWrongSign = /\bcurrent\s*-\s*target\w*|current\s*-\s*targetTicks/.test(code);
        return hasCorrectSign && !hasWrongSign;
      },
      tip: "Compute error as `targetTicks - current` (not `current - targetTicks`). Positive error means the motor is below target → positive power drives it forward.",
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
      label: "Latch boolean declared",
      description: "A boolean variable used as a shoot latch (prevents re-firing without releasing).",
      tier: "required",
      pattern: /boolean\s+\w*[Ll]atch\w*\s*=|boolean\s+\w*[Ss]hoot\w*\s*=|\bshootingLatched\b/,
      tip: "boolean shootingLatched = false; — tracks whether the shoot button has been held through a valid fire event.",
    },
    {
      label: "Shooter-ready tolerance check",
      description: "Math.abs(actual − target) compared to a tolerance constant to gate the latch.",
      tier: "required",
      pattern: /Math\.abs\s*\([^)]*\)\s*<=\s*\w+/,
      tip: "boolean shooterReady = Math.abs(simulatedTPS - TARGET_TPS) <= TOLERANCE; — the tolerance window prevents firing before speed is stable.",
    },
    {
      label: "Latch released when button released",
      description: "The latch variable set to false when the shoot button is not pressed.",
      tier: "required",
      pattern: /\w+\s*=\s*false[^;]*;(?:[^}]*\})?[^}]*gamepad|\bif\s*\(\s*!/,
      tip: "if (!gamepad1.right_bumper) { shootingLatched = false; } — releasing the button resets the latch so the next press can fire again.",
    },
    {
      label: "Feeding gated by both latch and button",
      description: "A feeding/fire flag uses && to require both the button AND the latch being true.",
      tier: "required",
      pattern: /\bboolean\s+\w+\s*=\s*\w+\s*&&\s*\w+|\bfeeding\b|\bfire\b\s*=\s*\w+\s*&&/,
      tip: "boolean feeding = shootButtonPressed && shootingLatched; — both conditions must be true to actually feed.",
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
      label: "Distance helper method defined",
      description: "A method that computes distance to the goal using Pythagorean theorem.",
      tier: "required",
      pattern: /private\s+double\s+\w+\s*\(\s*double[^)]*,\s*double/,
      tip: "private double distanceToGoal(double x, double y) { return Math.hypot(GOAL_X - x, GOAL_Y - y); }",
    },
    {
      label: "Math.hypot() or Math.sqrt() with squared terms used",
      description: "Pythagorean distance computed using Math.hypot() or sqrt(dx² + dy²).",
      tier: "required",
      pattern: (code) =>
        /Math\.hypot\s*\(/.test(code) ||
        (/Math\.sqrt\s*\(/.test(code) && /\*\s*\w+|\w+\s*\*/.test(code)),
      tip: "Math.hypot(GOAL_X - x, GOAL_Y - y) computes √((dx)²+(dy)²) in one call.",
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
      label: "inches→mm conversion implemented",
      description: "A method or expression multiplies inches by 25.4 to convert to millimetres.",
      tier: "required",
      pattern: /25\.4[^;]*\*|\*[^;]*25\.4|inchesToMm\s*\(/,
      tip: "private double inchesToMm(double inches) { return inches * 25.4; }",
    },
    {
      label: "mm→inches conversion implemented",
      description: "A method or expression divides millimetres by 25.4 to convert to inches.",
      tier: "required",
      pattern: /\/\s*25\.4|mmToInches\s*\(/,
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
      label: "Linear interpolation method implemented",
      description: "A helper method computes a + t*(b-a) (lerp formula) between two values.",
      tier: "required",
      pattern: (code) =>
        /\blerp\s*\(/.test(code) ||
        // Accept any method body with the lerp formula: a + t * (b - a) or equivalent
        /\w+\s*\+\s*\w+\s*\*\s*\(\s*\w+\s*-\s*\w+\s*\)/.test(code),
      tip: "private double lerp(double a, double b, double t) { return a + t * (b - a); } — interpolates between two values.",
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
      label: "Follower instantiated before use",
      description: "new Follower(hardwareMap) must appear before any follower.method() calls.",
      tier: "required",
      pattern: (code) => {
        const newFollowerIdx = code.search(/new\s+Follower\s*\(/);
        if (newFollowerIdx === -1) return false; // not instantiated at all
        // Check that no follower. call appears before the instantiation
        const beforeInit = code.slice(0, newFollowerIdx);
        // Require lowercase after the dot so import paths like
        // `com.pedropathing.follower.Follower` are not flagged as method calls.
        return !/follower\s*\.[a-z_$]/.test(beforeInit);
      },
      tip: "follower = new Follower(hardwareMap) is not in the right spot.",
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
      label: "BezierLine segment added",
      description: "At least one BezierLine creates a straight-line leg in the chain.",
      tier: "required",
      pattern: /new\s+BezierLine\s*\(/,
      tip: "Leg 2 uses a straight BezierLine: new BezierLine(new Point(24, 0, Point.CARTESIAN), new Point(48, 0, Point.CARTESIAN))",
    },
    {
      label: "Three path segments chained",
      description: "PathChain contains exactly three addPath() calls (one per leg).",
      tier: "required",
      pattern: (code) => {
        const count = (code.match(/\.addPath\s*\(/g) ?? []).length;
        return count >= 3;
      },
      tip: "Chain three segments with .addPath(leg1).addPath(leg2).addPath(leg3). The challenge requires three legs.",
    },
    {
      label: "followPath() called",
      description: "follower.followPath(chain, true) starts path execution.",
      tier: "required",
      pattern: /\.followPath\s*\(/,
      tip: "follower.followPath(chain, true); — true = hold position at end.",
    },
    {
      label: "follower.update() inside while loop",
      description: "follower.update() must be inside while(opModeIsActive()), not outside it.",
      tier: "required",
      pattern: (code) =>
        /while\s*\(\s*opModeIsActive\s*\(\s*\)\s*\)[\s\S]*?follower\.update\s*\(\s*\)/.test(code),
      tip: "follower.update() is not in the right spot.",
    },
    {
      label: "atParametricEnd() checked to exit loop",
      description: "follower.atParametricEnd() used to break out of the path loop when the segment completes.",
      tier: "required",
      pattern: /follower\.atParametricEnd\s*\(\s*\)/,
      tip: "Add: if (follower.atParametricEnd()) break; inside the while(opModeIsActive()) loop so the robot advances to the next action when each path segment finishes.",
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

  // ── Challenge 9 ─ Telemetry Dashboard ────────────────────────────────────
  9: [
    {
      label: "ElapsedTime created for runtime tracking",
      description: "ElapsedTime object declared to measure total OpMode runtime.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime timer = new ElapsedTime();",
    },
    {
      label: "RUNTIME section header present",
      description: 'telemetry.addLine("RUNTIME") adds the first section header.',
      tier: "required",
      pattern: /telemetry\.addLine\s*\(\s*["']RUNTIME["']\s*\)/,
      tip: 'telemetry.addLine("RUNTIME");',
    },
    {
      label: "MOTOR section header present",
      description: 'telemetry.addLine("MOTOR") adds the second section header.',
      tier: "required",
      pattern: /telemetry\.addLine\s*\(\s*["']MOTOR["']\s*\)/,
      tip: 'telemetry.addLine("MOTOR");',
    },
    {
      label: "STATUS section header present",
      description: 'telemetry.addLine("STATUS") adds the third section header.',
      tier: "required",
      pattern: /telemetry\.addLine\s*\(\s*["']STATUS["']\s*\)/,
      tip: 'telemetry.addLine("STATUS");',
    },
    {
      label: "Loop counter incremented",
      description: "A loop counter variable is incremented each iteration.",
      tier: "required",
      pattern: /\w+\+\+\s*;|\+\+\w+\s*;/,
      tip: "loopCount++; inside the while loop.",
    },
    {
      label: "Elapsed time displayed",
      description: "timer.seconds() used to display how long the OpMode has been running.",
      tier: "required",
      pattern: /\.seconds\s*\(\s*\)/,
      tip: 'telemetry.addData("Elapsed", timer.seconds());',
    },
    {
      label: "Motor power displayed",
      description: "Motor power value sent to telemetry.",
      tier: "required",
      pattern: /telemetry\.addData\s*\([^)]*[Pp]ower/,
      tip: 'telemetry.addData("Power", driveMotor.getPower());',
    },
    {
      label: "getCurrentPosition() read",
      description: "Motor encoder position read and displayed.",
      tier: "required",
      pattern: /\.getCurrentPosition\s*\(\s*\)/,
      tip: 'telemetry.addData("Encoder", driveMotor.getCurrentPosition());',
    },
    {
      label: "timer.reset() after waitForStart()",
      description: "Timer reset after waitForStart() so elapsed time measures match time, not init time.",
      tier: "improvement",
      pattern: /\.reset\s*\(\s*\)/,
      tip: "timer.reset() is not in the right spot.",
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

  // ── Challenge 12 ─ Motor Zero Power Behavior ──────────────────────────────
  12: [
    {
      label: "DcMotor declared",
      description: "A DcMotor field is declared.",
      tier: "required",
      pattern: /\bDcMotor(Ex)?\b/,
      tip: "private DcMotor driveMotor;",
    },
    {
      label: "ZeroPowerBehavior set",
      description: "setZeroPowerBehavior() called to configure BRAKE or FLOAT.",
      tier: "required",
      pattern: /\.setZeroPowerBehavior\s*\(/,
      tip: "driveMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
    },
    {
      label: "BRAKE and FLOAT both referenced",
      description: "Both ZeroPowerBehavior.BRAKE and ZeroPowerBehavior.FLOAT appear (toggle implementation).",
      tier: "required",
      pattern: (code) =>
        /ZeroPowerBehavior\.BRAKE/.test(code) && /ZeroPowerBehavior\.FLOAT/.test(code),
      tip: "Toggle: driveMotor.setZeroPowerBehavior(brakeMode ? ZeroPowerBehavior.BRAKE : ZeroPowerBehavior.FLOAT);",
    },
    {
      label: "Rising-edge button detection",
      description: "Toggle fires only on button rising edge (debounced).",
      tier: "required",
      pattern: /gamepad1\.\w+\s*&&\s*!\w+/,
      tip: "if (gamepad1.x && !lastXButton) { brakeMode = !brakeMode; }",
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

  // ── Challenge 13 ─ Init-Loop Configuration ───────────────────────────────
  13: [
    {
      label: "isStarted() used in init loop",
      description: "while(!isStarted() ...) loop runs during initialization phase.",
      tier: "required",
      pattern: /isStarted\s*\(\s*\)/,
      tip: "while (!isStarted() && !isStopRequested()) { /* read gamepad, update telemetry */ }",
    },
    {
      label: "isStopRequested() safety check",
      description: "isStopRequested() in the init loop allows clean exit when Stop is pressed.",
      tier: "required",
      pattern: /isStopRequested\s*\(\s*\)/,
      tip: "while (!isStarted() && !isStopRequested()) — both conditions are necessary.",
    },
    {
      label: "Alliance-selection boolean declared",
      description: "A boolean variable tracks whether the robot is on RED or BLUE alliance.",
      tier: "required",
      pattern: /boolean\s+\w*[Rr]ed\w*\s*=|boolean\s+\w*[Aa]lliance\w*\s*=|\bisRedAlliance\b/,
      tip: "boolean isRedAlliance = true; — declare before the init loop so it persists when match starts.",
    },
    {
      label: "Alliance set via B or X button",
      description: "B button sets RED and X button sets BLUE inside the init loop.",
      tier: "required",
      pattern: (code) => /gamepad1\.b/.test(code) && /gamepad1\.x/.test(code),
      tip: "if (gamepad1.b) isRedAlliance = true; else if (gamepad1.x) isRedAlliance = false;",
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

  // ── Challenge 14 ─ Encoder-Based Drive Distance ───────────────────────────
  14: [
    {
      label: "Encoder reset before move",
      description: "STOP_AND_RESET_ENCODER zeroes the encoder.",
      tier: "required",
      pattern: /STOP_AND_RESET_ENCODER/,
      tip: "driveMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
    },
    {
      label: "setTargetPosition() called",
      description: "Target tick count set before switching to RUN_TO_POSITION.",
      tier: "required",
      pattern: /\.setTargetPosition\s*\(/,
      tip: "driveMotor.setTargetPosition(TARGET_TICKS);",
    },
    {
      label: "RUN_TO_POSITION mode",
      description: "Motor switched to RUN_TO_POSITION closed-loop mode.",
      tier: "required",
      pattern: /RUN_TO_POSITION/,
      tip: "driveMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);",
    },
    {
      label: "Non-zero power applied",
      description: "Motor driven with non-zero power so it actually moves.",
      tier: "required",
      pattern: /\.setPower\(\s*(?!0\b)[^)]+\)/,
      tip: "driveMotor.setPower(MOTOR_POWER); — RUN_TO_POSITION won't move without power.",
    },
    {
      label: "isBusy() while loop present",
      description: "while(motor.isBusy() && opModeIsActive()) waits for arrival.",
      tier: "required",
      pattern: /while\s*\([^{]*\.isBusy\s*\(\s*\)/,
      tip: "while (driveMotor.isBusy() && opModeIsActive()) { telemetry.update(); }",
    },
    {
      label: "Motor stopped after encoder move",
      description: "setPower(0) cuts power after arrival.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "driveMotor.setPower(0); after the isBusy() loop.",
    },
    {
      label: "RUN_USING_ENCODER after arrival",
      description: "Motor switched back to RUN_USING_ENCODER to release position hold.",
      tier: "required",
      pattern: /RUN_USING_ENCODER/,
      tip: "driveMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER); after setPower(0).",
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

  // ── Challenge 15 ─ Bulk Cache Reads ──────────────────────────────────────
  15: [
    {
      label: "LynxModule list retrieved",
      description: "hardwareMap.getAll(LynxModule.class) gets all connected hubs.",
      tier: "required",
      pattern: /LynxModule/,
      tip: "List<LynxModule> hubs = hardwareMap.getAll(LynxModule.class);",
    },
    {
      label: "MANUAL bulk caching mode set",
      description: "setBulkCachingMode(MANUAL) enables single-transaction sensor reads.",
      tier: "required",
      pattern: /BulkCachingMode\.MANUAL/,
      tip: "for (LynxModule hub : hubs) hub.setBulkCachingMode(LynxModule.BulkCachingMode.MANUAL);",
    },
    {
      label: "clearBulkCache() called in loop",
      description: "clearBulkCache() at the top of the loop triggers a fresh bulk read.",
      tier: "required",
      pattern: /clearBulkCache\s*\(\s*\)/,
      tip: "clearBulkCache() is not in the right spot.",
    },
    {
      label: "Loop Hz measured and displayed",
      description: "Loop frequency computed and shown in telemetry.",
      tier: "improvement",
      pattern: /Hz|loopsPerSecond|loopsThisSecond/,
      tip: "Track loopsThisSecond and compute hz = loopsThisSecond / loopTimer.seconds() once per second.",
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

  // ── Challenge 16 ─ REV Touch Sensor Homing ───────────────────────────────
  16: [
    {
      label: "TouchSensor declared",
      description: "A TouchSensor field declared for the limit switch.",
      tier: "required",
      pattern: /\bTouchSensor\b/,
      tip: "private TouchSensor touchSensor;",
    },
    {
      label: "TouchSensor retrieved from hardwareMap",
      description: "touchSensor initialized from hardwareMap.",
      tier: "required",
      pattern: /hardwareMap\.get\(\s*TouchSensor\.class/,
      tip: 'touchSensor = hardwareMap.get(TouchSensor.class, "touch_sensor");',
    },
    {
      label: "isPressed() polled in loop",
      description: "touchSensor.isPressed() checked to detect limit hit.",
      tier: "required",
      pattern: /\.isPressed\s*\(\s*\)/,
      tip: "isPressed() check is not in the right spot.",
    },
    {
      label: "Motor stopped after sensor triggers",
      description: "setPower(0) stops the motor immediately after the limit switch fires.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "turretMotor.setPower(0); right after the homing loop exits.",
    },
    {
      label: "Encoder reset after homing",
      description: "STOP_AND_RESET_ENCODER zeros the encoder at the physical reference.",
      tier: "required",
      pattern: /STOP_AND_RESET_ENCODER/,
      tip: "turretMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
    },
    {
      label: "RUN_USING_ENCODER after homing",
      description: "Motor switched to RUN_USING_ENCODER for subsequent moves.",
      tier: "required",
      pattern: /RUN_USING_ENCODER/,
      tip: "turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);",
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

  // ── Challenge 18 ─ Mecanum Power Normalization ───────────────────────────
  18: [
    {
      label: "normalize() helper method defined",
      description: "A normalize() method exists and accepts four wheel power values.",
      tier: "required",
      pattern: /\bnormalize\s*\(/,
      tip: "private double[] normalize(double fl, double fr, double bl, double br) { ... }",
    },
    {
      label: "Max absolute value found",
      description: "Math.max() used to find the largest wheel power before scaling.",
      tier: "required",
      pattern: /Math\.max\s*\(/,
      tip: "double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr), Math.max(Math.abs(bl), Math.abs(br))));",
    },
    {
      label: "Division by max when > 1.0",
      description: "Powers divided by max only when max exceeds 1.0.",
      tier: "required",
      pattern: /max\s*>\s*1(\.0)?/,
      tip: "if (max > 1.0) { fl /= max; fr /= max; bl /= max; br /= max; }",
    },
    {
      label: "double[] returned from normalize()",
      description: "normalize() returns the four scaled values as a double array.",
      tier: "required",
      pattern: /return\s+new\s+double\s*\[\s*\]/,
      tip: "return new double[]{fl, fr, bl, br};",
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

  // ── Challenge 19 ─ Field-Relative Mecanum ────────────────────────────────
  19: [
    {
      label: "Math.cos() used for rotation",
      description: "Math.cos(-heading) applied in the 2D rotation matrix.",
      tier: "required",
      pattern: /Math\.cos\s*\(/,
      tip: "double rotDrive = drive * Math.cos(-heading) - strafe * Math.sin(-heading);",
    },
    {
      label: "Math.sin() used for rotation",
      description: "Math.sin(-heading) applied in the 2D rotation matrix.",
      tier: "required",
      pattern: /Math\.sin\s*\(/,
      tip: "double rotStrafe = drive * Math.sin(-heading) + strafe * Math.cos(-heading);",
    },
    {
      label: "Rotated vectors used in wheel power formula",
      description: "Variables derived from the cos/sin rotation are fed into the mecanum power computation.",
      tier: "required",
      pattern: (code) => {
        // Rotation result must be stored and then used in setPower calls
        // Accept rotDrive/rotStrafe or any variable assigned from cos/sin expression
        if (/rot[Dd]rive|rot[Ss]trafe/.test(code)) return true;
        // Accept pattern: variable = ... Math.cos ... then used in setPower
        return /=\s*[^;]*Math\.(?:cos|sin)[^;]*;[\s\S]{1,800}\.setPower\s*\(/.test(code);
      },
      tip: "Store the rotated drive/strafe values (e.g. rotDrive, rotStrafe) and use those — not the raw stick values — in the mecanum wheel formula.",
    },
    {
      label: "Four mecanum motors driven",
      description: "All four wheels receive power from the rotated vector.",
      tier: "required",
      pattern: (code) => (code.match(/\.setPower\s*\(/g) ?? []).length >= 4,
      tip: "frontLeft.setPower(fl); frontRight.setPower(fr); backLeft.setPower(bl); backRight.setPower(br);",
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

  // ── Challenge 20 ─ Mecanum Strafing Test ─────────────────────────────────
  20: [
    {
      label: "Four motors initialized",
      description: "All four mecanum wheels retrieved from hardwareMap.",
      tier: "required",
      pattern: (code) => (code.match(/hardwareMap\.get\s*\(\s*DcMotor/g) ?? []).length >= 4,
      tip: "Initialize frontLeft, frontRight, backLeft, backRight from hardwareMap.",
    },
    {
      label: "Direction reversed for one side",
      description: "At least one motor reversed to correct mounting polarity.",
      tier: "required",
      pattern: /Direction\.REVERSE/,
      tip: "Reverse the motors on the side that drives backward: e.g. frontLeft.setDirection(DcMotor.Direction.REVERSE); — which side depends on your hardware.",
    },
    {
      label: "ElapsedTime used for timed strafe",
      description: "ElapsedTime controls each 1-second strafe phase.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime timer = new ElapsedTime(); timer.reset();",
    },
    {
      label: "setMecanumPowers() or strafe formula applied",
      description: "Mecanum strafe pattern sets different signs on left vs right wheels.",
      tier: "required",
      pattern: (code) =>
        /setMecanumPowers\s*\(/.test(code) ||
        // Accept inline mecanum strafe: at least one motor gets negative of another's value
        /strafe/.test(code),
      tip: "Call setMecanumPowers(0, strafe, 0) or set frontLeft = -frontRight = backLeft = -backRight for pure strafe.",
    },
    {
      label: "Two timed strafe phases",
      description: "Separate right-strafe and left-strafe timed segments with timer.reset() between them.",
      tier: "required",
      pattern: (code) => (code.match(/\w+\.seconds\s*\(\s*\)\s*[<>]/g) ?? []).length >= 2,
      tip: "Strafe right for 1 s, call timer.reset(), then strafe left for 1 s.",
    },
    {
      label: "All motors stopped at end",
      description: "All four wheels set to zero power after both strafe phases.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "Stop all four motors: frontLeft.setPower(0); frontRight.setPower(0); backLeft.setPower(0); backRight.setPower(0);",
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

  // ── Challenge 21 ─ Velocity-Magnitude Braking ────────────────────────────
  21: [
    {
      label: "DEADBAND constant defined",
      description: "DEADBAND threshold constant declared.",
      tier: "required",
      pattern: /DEADBAND/,
      tip: "private static final double DEADBAND = 0.05;",
    },
    {
      label: "Magnitude computed with sqrt or hypot",
      description: "Input magnitude calculated using Math.sqrt() or Math.hypot().",
      tier: "required",
      pattern: /Math\.(sqrt|hypot)\s*\(/,
      tip: "double magnitude = Math.sqrt(drive * drive + strafe * strafe);  // or Math.hypot(drive, strafe)",
    },
    {
      label: "Deadband comparison applied",
      description: "Drive/strafe zeroed or gated when magnitude < DEADBAND.",
      tier: "required",
      pattern: /magnitude\s*[<>]/,
      tip: "if (magnitude < DEADBAND) { drive = 0; strafe = 0; }",
    },
    {
      label: "All four motors receive power",
      description: "Mecanum formula applied to all four wheels.",
      tier: "required",
      pattern: (code) => (code.match(/\.setPower\s*\(/g) ?? []).length >= 4,
      tip: "frontLeft.setPower(fl); frontRight.setPower(fr); backLeft.setPower(bl); backRight.setPower(br);",
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

  // ── Challenge 25 ─ Flywheel TPS Calibration ──────────────────────────────
  25: [
    {
      label: "Calibration table arrays defined",
      description: "DIST_TABLE and TPS_TABLE parallel arrays contain the calibration data.",
      tier: "required",
      pattern: (code) => /DIST_TABLE/.test(code) && /TPS_TABLE/.test(code),
      tip: "private static final double[] DIST_TABLE = {30, 40, 50, 60}; and TPS_TABLE = {1200, 1350, 1500, 1650};",
    },
    {
      label: "Interpolation helper method defined and called",
      description: "A helper method that takes a distance and returns a TPS value is defined and called.",
      tier: "required",
      pattern: (code) => {
        // Accept any method defined as "private double name(double ...)" that is also called
        const methodMatch = code.match(/private\s+double\s+(\w+)\s*\(\s*double/);
        if (!methodMatch) return false;
        const name = methodMatch[1];
        // Ensure it's called somewhere (other than its own definition)
        return new RegExp(`\\b${name}\\s*\\(`).test(code.replace(`private double ${name}`, ''));
      },
      tip: "private double interpolateTPS(double distanceInches) { ... } — define the helper, then call it inside the loop.",
    },
    {
      label: "Linear interpolation computed (t parameter)",
      description: "t = (distance - lower) / (upper - lower) interpolation parameter computed.",
      tier: "required",
      pattern: (code) =>
        /\bt\s*=\s*\([^)]*(?:DIST_TABLE|TPS_TABLE)/.test(code),
      tip: "double t = (distanceInches - DIST_TABLE[i]) / (DIST_TABLE[i+1] - DIST_TABLE[i]);",
    },
    {
      label: "Interpolated TPS returned from table",
      description: "Return uses TPS_TABLE[i] and the t parameter — not a bare return 0.",
      tier: "required",
      pattern: /return\s+TPS_TABLE\[i\]\s*\+/,
      tip: "return TPS_TABLE[i] + t * (TPS_TABLE[i+1] - TPS_TABLE[i]);",
    },
    {
      label: "Clamping for out-of-range inputs",
      description: "Input clamped to table range so extreme distances return min/max TPS.",
      tier: "required",
      pattern: /DIST_TABLE\[0\]|DIST_TABLE\.length/,
      tip: "if (distanceInches <= DIST_TABLE[0]) return TPS_TABLE[0]; if (distanceInches >= ...) return ...;",
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

  // ── Challenge 26 ─ PIDF Velocity Loop ────────────────────────────────────
  26: [
    {
      label: "DcMotorEx used",
      description: "DcMotorEx declared for getVelocity() access.",
      tier: "required",
      pattern: /\bDcMotorEx\b/,
      tip: "private DcMotorEx shooterMotor;",
    },
    {
      label: "All four PIDF gains defined",
      description: "Kp, Ki, Kd, and Kf constants all declared.",
      tier: "required",
      pattern: (code) =>
        /\bKp\b/.test(code) && /\bKi\b/.test(code) && /\bKd\b/.test(code) && /\bKf\b/.test(code),
      tip: "private static final double Kp = 0.001, Ki = 0.0002, Kd = 0.0003, Kf = 0.00055;",
    },
    {
      label: "Integral term accumulated with +=",
      description: "A running integral accumulates error × dt each loop iteration.",
      tier: "required",
      pattern: /\w+\s*\+=\s*\w*error\w*\s*\*\s*dt|\w+\s*\+=\s*dt\s*\*\s*\w*error\w*/,
      tip: "integral += error * dt; — place this inside the while loop.",
    },
    {
      label: "Integral anti-windup clamp",
      description: "Integral clamped with Math.max/Math.min to prevent unbounded growth.",
      tier: "required",
      pattern: /Math\.max\s*\([^)]*Math\.min|Math\.min\s*\([^)]*Math\.max|WINDUP/,
      tip: "integral = Math.max(-WINDUP, Math.min(WINDUP, integral));",
    },
    {
      label: "Derivative term: (error − lastError) / dt",
      description: "Derivative computed as change-in-error divided by elapsed time.",
      tier: "required",
      pattern: /\(\s*\w*error\w*\s*-\s*\w*[Ll]ast[Ee]rror\w*\s*\)\s*\/\s*dt|\w*[Ll]ast[Ee]rror\w*/,
      tip: "double derivative = (error - lastError) / dt; — store lastError = error; at the end of each loop.",
    },
    {
      label: "Feedforward term (Kf × target)",
      description: "Kf multiplied by the target TPS to compute the feedforward term.",
      tier: "required",
      pattern: /Kf\s*\*|feedforward/,
      tip: "double feedforward = Kf * TARGET_TPS; — feedforward reduces the error the PID needs to correct.",
    },
    {
      label: "RUN_USING_ENCODER mode set",
      description: "RUN_USING_ENCODER enables the motor's built-in velocity PID — without it getVelocity() is meaningless.",
      tier: "required",
      pattern: /RUN_USING_ENCODER/,
      tip: "shooterMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER); before the loop.",
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

  // ── Challenge 27 ─ Loop Frequency Measurement ────────────────────────────
  27: [
    {
      label: "ElapsedTime loop timer declared",
      description: "ElapsedTime used to gate the Hz computation.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime loopTimer = new ElapsedTime();",
    },
    {
      label: "Loop counter incremented",
      description: "A counter variable tracks iterations per measurement window.",
      tier: "required",
      pattern: /loops?\w*\+\+|\+\+\s*loops?\w*/,
      tip: "loopsThisSecond++;",
    },
    {
      label: "Hz computed as count / elapsed",
      description: "Hz = loopCount / elapsedSeconds computed once per second.",
      tier: "required",
      pattern: /\/\s*\w+\.seconds\s*\(\s*\)|loopsThisSecond\s*\/|loops\w*\s*\//,
      tip: "hz = loopsThisSecond / loopTimer.seconds();",
    },
    {
      label: "Hz displayed in telemetry",
      description: "Loop frequency value shown on Driver Station.",
      tier: "required",
      pattern: /[Hh]z|loopsPerSecond/,
      tip: 'telemetry.addData("Loop Hz", hz);',
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

  // ── Challenge 29 ─ Turret Zeroing State Machine ───────────────────────────
  29: [
    {
      label: "Enum with IDLE and ZEROING states",
      description: "Java enum defines at least IDLE and ZEROING state values.",
      tier: "required",
      pattern: (code) => /\benum\b/.test(code) && /\bIDLE\b/.test(code) && /\bZEROING\b/.test(code),
      tip: "enum TurretState { IDLE, ZEROING }",
    },
    {
      label: "switch statement on state",
      description: "switch(state) dispatches behavior per state.",
      tier: "required",
      pattern: /switch\s*\(/,
      tip: "switch (state) { case IDLE: ... case ZEROING: ... }",
    },
    {
      label: "TouchSensor declared",
      description: "A TouchSensor limit switch used to detect the home position.",
      tier: "required",
      pattern: /\bTouchSensor\b/,
      tip: "private TouchSensor limitSwitch;",
    },
    {
      label: "Encoder reset on transition to IDLE",
      description: "STOP_AND_RESET_ENCODER called when the limit switch fires.",
      tier: "required",
      pattern: /STOP_AND_RESET_ENCODER/,
      tip: "turretMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER); when limitSwitch.isPressed().",
    },
    {
      label: "RUN_USING_ENCODER restored after zeroing",
      description: "Motor switched back to RUN_USING_ENCODER after encoder reset.",
      tier: "required",
      pattern: /RUN_USING_ENCODER/,
      tip: "turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER); after STOP_AND_RESET_ENCODER.",
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

  // ── Challenge 30 ─ Autonomous State Machine ───────────────────────────────
  30: [
    {
      label: "State enum with multiple states",
      description: "Java enum defines the autonomous states.",
      tier: "required",
      pattern: /\benum\b/,
      tip: "enum State { DRIVE_TO_SHOOT, SHOOTING, DRIVE_TO_COLLECT, DONE }",
    },
    {
      label: "ElapsedTime stateTimer declared",
      description: "ElapsedTime used to time each state's duration.",
      tier: "required",
      pattern: /ElapsedTime\s+\w+\s*=/,
      tip: "ElapsedTime stateTimer = new ElapsedTime();",
    },
    {
      label: "switch statement dispatches states",
      description: "switch(state) runs the correct logic for the current state.",
      tier: "required",
      pattern: (code) => {
        if (!/switch\s*\(/.test(code)) return false;
        // Require at least two case labels so the student wrote a real state machine
        const cases = (code.match(/\bcase\b/g) ?? []).length;
        return cases >= 2;
      },
      tip: "switch (state) { case DRIVE_TO_SHOOT: ... case SHOOTING: ... } — need at least two cases.",
    },
    {
      label: "Timer reset on state transition",
      description: "stateTimer.reset() called when transitioning to the next state.",
      tier: "required",
      pattern: /\w+\.reset\s*\(\s*\)/,
      tip: "stateTimer.reset() is not in the right spot.",
    },
    {
      label: "All motors stopped in DONE state",
      description: "All motors set to zero power once DONE state is reached.",
      tier: "required",
      pattern: /\.setPower\(\s*0(?:\.0*)?\s*\)/,
      tip: "leftDrive.setPower(0); rightDrive.setPower(0); flywheel.setPower(0); in the DONE case.",
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

  // ── Challenge 31 ─ Multi-Shot Cycling ─────────────────────────────────────
  31: [
    {
      label: "Cycle count configured in init loop",
      description: "cycleCount variable set during the init loop before waitForStart().",
      tier: "required",
      pattern: (code) => /\bcycleCount\b/.test(code) && /isStarted\s*\(\s*\)|isStopRequested\s*\(\s*\)/.test(code),
      tip: "while (!isStarted() && !isStopRequested()) { if (gamepad1.dpad_up && !lastUp) cycleCount++; }",
    },
    {
      label: "remainingCycles counter used",
      description: "remainingCycles decremented after each shot cycle.",
      tier: "required",
      pattern: /\bremainingCycles\b/,
      tip: "remainingCycles--; after each SHOOT state completes.",
    },
    {
      label: "State machine loops when cycles remain",
      description: "Transitions back to TO_HUMAN while remainingCycles > 0, then LEAVE.",
      tier: "required",
      pattern: /remainingCycles\s*[><=]/,
      tip: "state = (remainingCycles > 0) ? State.TO_HUMAN : State.LEAVE; stateTimer.reset();",
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

  // ── Challenge 32 ─ TeleOp Mode Switching ─────────────────────────────────
  32: [
    {
      label: "safeMode boolean declared",
      description: "boolean safeMode tracks the current drive mode.",
      tier: "required",
      pattern: /\bsafeMode\b/,
      tip: "boolean safeMode = false;",
    },
    {
      label: "Power scaled at 50% in safe mode",
      description: "Motor power multiplied by 0.5 (or similar cap) when safeMode is true.",
      tier: "required",
      pattern: /0\.5\s*\*|\*\s*0\.5|scale\s*=.*0\.5|0\.5.*safeMode|safeMode.*0\.5/,
      tip: "double scale = safeMode ? 0.5 : 1.0; leftDrive.setPower(leftPower * scale);",
    },
    {
      label: "Safe mode entered via B button",
      description: "gamepad1.b press (debounced) enters safe mode.",
      tier: "required",
      pattern: /gamepad1\.b/,
      tip: "if (gamepad1.b && !lastBButton) { safeMode = true; }",
    },
    {
      label: "Safe mode exited via Y button",
      description: "gamepad1.y press exits safe mode.",
      tier: "required",
      pattern: /gamepad1\.y/,
      tip: "if (gamepad1.y) safeMode = false;",
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

  // ── Challenge 34 ─ atan2 Turret Bearing ──────────────────────────────────
  34: [
    {
      label: "Math.atan2() called",
      description: "Math.atan2(dy, dx) computes the field bearing to the goal.",
      tier: "required",
      pattern: /Math\.atan2\s*\(/,
      tip: "double fieldBearing = Math.toDegrees(Math.atan2(dy, dx));",
    },
    {
      label: "toDegrees() conversion applied",
      description: "Math.toDegrees() converts atan2 radians to degrees.",
      tier: "required",
      pattern: /Math\.toDegrees\s*\(/,
      tip: "double fieldBearingDeg = Math.toDegrees(Math.atan2(dy, dx));",
    },
    {
      label: "Turret angle computed (bearing − heading)",
      description: "turretAngle = fieldBearing − robotHeading computed.",
      tier: "required",
      pattern: /turretAngle|fieldBearing/,
      tip: "double turretAngle = fieldBearingDeg - robotHeading;",
    },
    {
      label: "Angle wrapped to [-180, 180]",
      description: "while loops or equivalent wrap the turret angle into valid range.",
      tier: "required",
      pattern: /turretAngle\s*[+-]=\s*360|turretAngle\s*>\s*180|turretAngle\s*<\s*-180/,
      tip: "while (turretAngle > 180) turretAngle -= 360; while (turretAngle < -180) turretAngle += 360;",
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

  // ── Challenge 35 ─ Alliance Coordinate Mirror ─────────────────────────────
  35: [
    {
      label: "FIELD_MM constant defined",
      description: "FIELD_MM (144 × 25.4 = 3657.6 mm) declared as a constant.",
      tier: "required",
      pattern: /FIELD_MM/,
      tip: "private static final double FIELD_MM = 144.0 * 25.4;",
    },
    {
      label: "mirrorX() method implemented",
      description: "mirrorX() helper method returns FIELD_MM - x.",
      tier: "required",
      pattern: /mirrorX\s*\(/,
      tip: "private double mirrorX(double x) { return FIELD_MM - x; }",
    },
    {
      label: "FIELD_MM - x formula used",
      description: "The reflection formula subtracts x from FIELD_MM.",
      tier: "required",
      pattern: /FIELD_MM\s*-/,
      tip: "return FIELD_MM - x; — this reflects the coordinate across the field center.",
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

  // ── Challenge 36 ─ Degrees ↔ Radians Conversion ──────────────────────────
  36: [
    {
      label: "Custom toRadians() method implemented",
      description: "toRadians() helper converts degrees to radians using * Math.PI / 180.",
      tier: "required",
      pattern: /toRadians\s*\(/,
      tip: "private double toRadians(double degrees) { return degrees * Math.PI / 180.0; }",
    },
    {
      label: "Custom toDegrees() method implemented",
      description: "toDegrees() helper converts radians to degrees using * 180 / Math.PI.",
      tier: "required",
      pattern: /toDegrees\s*\(/,
      tip: "private double toDegrees(double radians) { return radians * 180.0 / Math.PI; }",
    },
    {
      label: "Math.PI used in conversion",
      description: "Math.PI constant used in both conversion formulas.",
      tier: "required",
      pattern: /Math\.PI/,
      tip: "degrees * Math.PI / 180.0  and  radians * 180.0 / Math.PI",
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

  // ── Challenge 37 ─ GoBilda Pinpoint Odometry ──────────────────────────────
  37: [
    {
      label: "GoBildaPinpointDriver declared",
      description: "GoBildaPinpointDriver field initialized from hardwareMap.",
      tier: "required",
      pattern: /GoBildaPinpointDriver/,
      tip: "GoBildaPinpointDriver odo = hardwareMap.get(GoBildaPinpointDriver.class, \"odo\");",
    },
    {
      label: "setOffsets() called",
      description: "Pod X/Y offsets from robot center configured.",
      tier: "required",
      pattern: /\.setOffsets\s*\(/,
      tip: "odo.setOffsets(-84.0, -168.0);",
    },
    {
      label: "resetPosAndIMU() called",
      description: "Position and IMU zeroed during init.",
      tier: "required",
      pattern: (code) => {
        const waitIdx = code.indexOf("waitForStart()");
        if (waitIdx === -1) return /\.resetPosAndIMU\s*\(\s*\)/.test(code);
        // Must appear before waitForStart
        return /\.resetPosAndIMU\s*\(\s*\)/.test(code.slice(0, waitIdx));
      },
      tip: "resetPosAndIMU() is not in the right spot.",
    },
    {
      label: "odo.update() called in loop",
      description: "odo.update() refreshes position data each loop tick.",
      tier: "required",
      pattern: (code) =>
        /while\s*\(\s*opModeIsActive[^)]*\)[^{]*\{[\s\S]*?\w+\.update\s*\(\s*\)/.test(code),
      tip: "odo.update() is not in the right spot.",
    },
    {
      label: "getPosition() read",
      description: "odo.getPosition() retrieves the current Pose2D.",
      tier: "required",
      pattern: /\.getPosition\s*\(\s*\)/,
      tip: "Pose2D pos = odo.getPosition();",
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

  // ── Challenge 38 ─ Field Position Reset ──────────────────────────────────
  38: [
    {
      label: "GoBildaPinpointDriver used",
      description: "GoBildaPinpointDriver initialized for odometry.",
      tier: "required",
      pattern: /GoBildaPinpointDriver/,
      tip: "odo = hardwareMap.get(GoBildaPinpointDriver.class, \"odo\");",
    },
    {
      label: "setPosition() called on button press",
      description: "odo.setPosition() re-anchors the odometry to the known reset coordinate.",
      tier: "required",
      pattern: /\.setPosition\s*\(/,
      tip: "odo.setPosition(new Pose2D(DistanceUnit.MM, RESET_X_MM, RESET_Y_MM, AngleUnit.DEGREES, 0));",
    },
    {
      label: "Triggered on gamepad1.x",
      description: "Position reset triggered by the X button.",
      tier: "required",
      pattern: /gamepad1\.x/,
      tip: "if (gamepad1.x && !lastX) { odo.setPosition(...); }",
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

  // ── Challenge 39 ─ Limelight3A Init & Read ───────────────────────────────
  39: [
    {
      label: "Limelight3A declared",
      description: "Limelight3A field declared and retrieved from hardwareMap.",
      tier: "required",
      pattern: /\bLimelight3A\b/,
      tip: "private Limelight3A limelight; ... limelight = hardwareMap.get(Limelight3A.class, \"limelight\");",
    },
    {
      label: "pipelineSwitch() called",
      description: "Active pipeline set before streaming begins.",
      tier: "required",
      pattern: /\.pipelineSwitch\s*\(/,
      tip: "limelight.pipelineSwitch(0);",
    },
    {
      label: "limelight.start() called",
      description: "limelight.start() begins frame capture.",
      tier: "required",
      pattern: /limelight\.start\s*\(\s*\)/,
      tip: "limelight.start() is not in the right spot.",
    },
    {
      label: "getLatestResult() called in loop",
      description: "LLResult fetched each iteration to get the freshest frame.",
      tier: "required",
      pattern: /\.getLatestResult\s*\(\s*\)/,
      tip: "LLResult result = limelight.getLatestResult();",
    },
    {
      label: "result.isValid() checked before reading",
      description: "Null and validity check prevents NPE from empty frames.",
      tier: "required",
      pattern: /\.isValid\s*\(\s*\)/,
      tip: "if (result != null && result.isValid()) { ... }",
    },
    {
      label: "limelight.stop() called after loop",
      description: "Camera stopped cleanly after the OpMode ends.",
      tier: "improvement",
      pattern: /limelight\.stop\s*\(\s*\)/,
      tip: "limelight.stop() is not in the right spot.",
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

  // ── Challenge 40 ─ Stale Frame Detection ─────────────────────────────────
  40: [
    {
      label: "staleFrames counter declared",
      description: "staleFrames tracks consecutive identical frames.",
      tier: "required",
      pattern: /\bstaleFrames\b/,
      tip: "int staleFrames = 0;",
    },
    {
      label: "totalFrames counter declared",
      description: "totalFrames counts all frames processed.",
      tier: "required",
      pattern: /\btotalFrames\b/,
      tip: "int totalFrames = 0;",
    },
    {
      label: "Stale detection compares previous values",
      description: "Current tx/ty/latency compared to last loop's values.",
      tier: "required",
      pattern: /lastTx|lastLatency|lastTy/,
      tip: "boolean stale = (result.getTx() == lastTx) && (result.getTy() == lastTy) && (...);",
    },
    {
      label: "Health percentage computed",
      description: "Camera health % = (1 - staleFrames / totalFrames) × 100.",
      tier: "required",
      pattern: /health|staleFrames\s*\/|1\.0\s*-/,
      tip: "double health = (1.0 - (double)staleFrames / Math.max(1, totalFrames)) * 100;",
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

  // ── Challenge 41 ─ AprilTag Fiducial Extraction ───────────────────────────
  41: [
    {
      label: "getFiducialResults() called",
      description: "List of fiducial results extracted from the LLResult.",
      tier: "required",
      pattern: /\.getFiducialResults\s*\(\s*\)/,
      tip: "List<LLResultTypes.FiducialResult> tags = result.getFiducialResults();",
    },
    {
      label: "getFiducialId() compared to expected ID",
      description: "Tag list searched for the target alliance AprilTag ID.",
      tier: "required",
      pattern: /\.getFiducialId\s*\(\s*\)/,
      tip: "if (tag.getFiducialId() == expectedId) { tx = tag.getTargetXDegrees(); break; }",
    },
    {
      label: "getTargetXDegrees() read",
      description: "Horizontal offset (tx) extracted from the matching tag.",
      tier: "required",
      pattern: /\.getTargetXDegrees\s*\(\s*\)/,
      tip: "double tx = tag.getTargetXDegrees();",
    },
    {
      label: "Tag ID constants defined",
      description: "RED_TAG_ID and/or BLUE_TAG_ID constants declared.",
      tier: "required",
      pattern: /RED_TAG_ID|BLUE_TAG_ID|expectedId/,
      tip: "private static final int RED_TAG_ID = 24; private static final int BLUE_TAG_ID = 20;",
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

  // ── Challenge 42 ─ tx-Based Turret Correction ─────────────────────────────
  42: [
    {
      label: "getTx() read from result",
      description: "Horizontal offset tx read from the Limelight result.",
      tier: "required",
      pattern: /\.getTx\s*\(\s*\)/,
      tip: "double tx = result.getTx();",
    },
    {
      label: "ON_TARGET_THRESHOLD constant defined",
      description: "ON_TARGET_THRESHOLD controls the deadband for 'on target' status.",
      tier: "required",
      pattern: /ON_TARGET_THRESHOLD/,
      tip: "private static final double ON_TARGET_THRESHOLD = 2.0;",
    },
    {
      label: "correctionPower = Kp × tx",
      description: "Proportional correction computed from Kp and tx.",
      tier: "required",
      pattern: /Kp\s*\*\s*\w*[tT]x|correctionPower/,
      tip: "double correctionPower = Kp * tx;",
    },
    {
      label: "Math.abs() deadband check",
      description: "Math.abs(tx) compared to threshold for on-target detection.",
      tier: "required",
      pattern: /Math\.abs\s*\(/,
      tip: "if (Math.abs(tx) < ON_TARGET_THRESHOLD) { correctionPower = 0; onTarget = true; }",
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

  // ── Challenge 43 ─ Poll Rate Cycling ─────────────────────────────────────
  43: [
    {
      label: "Poll rate array defined",
      description: "Array of poll rates (e.g., {100, 50, 25, 10}) declared.",
      tier: "required",
      pattern: /int\s*\[\s*\]\s*rates|rates\s*=\s*\{[^}]*100/,
      tip: "int[] rates = {100, 50, 25, 10};",
    },
    {
      label: "setPollRateHz() called",
      description: "limelight.setPollRateHz() updates the camera poll rate.",
      tier: "required",
      pattern: /\.setPollRateHz\s*\(/,
      tip: "limelight.setPollRateHz(rates[rateIdx]);",
    },
    {
      label: "Rate index cycled with modulo",
      description: "rateIdx advances with (rateIdx + 1) % rates.length to wrap around.",
      tier: "required",
      pattern: /rateIdx.*%.*length|%.*rates\.length/,
      tip: "rateIdx = (rateIdx + 1) % rates.length;",
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

  // ── Challenge 44 ─ Pose Construction & Heading ────────────────────────────
  44: [
    {
      label: "Three Pose objects constructed",
      description: "startPose, shotPose, and humanStation all constructed with new Pose().",
      tier: "required",
      pattern: (code) => (code.match(/new\s+Pose\s*\(/g) ?? []).length >= 3,
      tip: "new Pose(64, 8.35, Math.toRadians(180)), new Pose(46.5, 10.5, ...), new Pose(6.689, 8.874, ...)",
    },
    {
      label: "Math.toRadians() used for heading",
      description: "Heading angles converted to radians with Math.toRadians().",
      tier: "required",
      pattern: /Math\.toRadians\s*\(/,
      tip: "Math.toRadians(180) converts 180° to π radians for the Pose constructor.",
    },
    {
      label: "getHeading() read and displayed",
      description: "Pose heading read back and displayed in telemetry.",
      tier: "required",
      pattern: /\.getHeading\s*\(\s*\)/,
      tip: "telemetry.addData(\"Hdg deg\", Math.toDegrees(startPose.getHeading()));",
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

  // ── Challenge 45 ─ BezierLine Path Follow ────────────────────────────────
  45: [
    {
      label: "Follower instantiated before use",
      description: "new Follower(hardwareMap) must appear before any follower.method() calls.",
      tier: "required",
      pattern: (code) => {
        const newFollowerIdx = code.search(/new\s+Follower\s*\(/);
        if (newFollowerIdx === -1) return false;
        const beforeInit = code.slice(0, newFollowerIdx);
        // Require lowercase after the dot so import paths like
        // `com.pedropathing.follower.Follower` are not flagged as method calls.
        return !/follower\s*\.[a-z_$]/.test(beforeInit);
      },
      tip: "follower = new Follower(hardwareMap) is not in the right spot.",
    },
    {
      label: "setStartingPose() called",
      description: "follower.setStartingPose() configures the initial robot position.",
      tier: "required",
      pattern: /\.setStartingPose\s*\(/,
      tip: "follower.setStartingPose(startPose);",
    },
    {
      label: "BezierLine path built",
      description: "A BezierLine segment creates the straight-line path.",
      tier: "required",
      pattern: /new\s+BezierLine\s*\(/,
      tip: "new BezierLine(new Point(startPose, Point.POSE), new Point(shotPose, Point.POSE))",
    },
    {
      label: "follower.followPath() called",
      description: "follower.followPath() starts path execution.",
      tier: "required",
      pattern: /follower\.followPath\s*\(/,
      tip: "follower.followPath(drivePath, true);",
    },
    {
      label: "follower.isBusy() in loop condition",
      description: "Loop runs while follower.isBusy() to wait for path completion.",
      tier: "required",
      pattern: /follower\.isBusy\s*\(\s*\)/,
      tip: "while (opModeIsActive() && follower.isBusy()) { follower.update(); }",
    },
    {
      label: "follower.update() called in loop",
      description: "follower.update() drives motors toward the path each tick.",
      tier: "required",
      pattern: (code) =>
        /while\s*\(\s*opModeIsActive[^)]*\)[^{]*\{[\s\S]*?follower\.update\s*\(\s*\)/.test(code),
      tip: "follower.update() is not in the right spot.",
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

  // ── Challenge 46 ─ BezierCurve Tape Detour ───────────────────────────────
  46: [
    {
      label: "Follower instantiated before use",
      description: "new Follower(hardwareMap) must appear before any follower.method() calls.",
      tier: "required",
      pattern: (code) => {
        const newFollowerIdx = code.search(/new\s+Follower\s*\(/);
        if (newFollowerIdx === -1) return false;
        const beforeInit = code.slice(0, newFollowerIdx);
        // Require lowercase after the dot so import paths like
        // `com.pedropathing.follower.Follower` are not flagged as method calls.
        return !/follower\s*\.[a-z_$]/.test(beforeInit);
      },
      tip: "follower = new Follower(hardwareMap) is not in the right spot.",
    },
    {
      label: "BezierCurve with control point",
      description: "new BezierCurve() with start, control, and end Point objects.",
      tier: "required",
      pattern: /new\s+BezierCurve\s*\(/,
      tip: "new BezierCurve(new Point(64, 8.35, CARTESIAN), new Point(64, controlY, CARTESIAN), new Point(endX, endY, CARTESIAN))",
    },
    {
      label: "setTangentHeadingInterpolation() applied",
      description: "Tangent heading makes the robot face its direction of travel.",
      tier: "required",
      pattern: /setTangentHeadingInterpolation/,
      tip: ".setTangentHeadingInterpolation() — no arguments needed.",
    },
    {
      label: "follower.followPath() called",
      description: "Path executed via follower.followPath().",
      tier: "required",
      pattern: /follower\.followPath\s*\(/,
      tip: "follower.followPath(tapeCurve, true);",
    },
    {
      label: "follower.update() called in loop",
      description: "follower.update() commands motors every tick.",
      tier: "required",
      pattern: (code) =>
        /while\s*\(\s*opModeIsActive[^)]*\)[^{]*\{[\s\S]*?follower\.update\s*\(\s*\)/.test(code),
      tip: "follower.update() is not in the right spot.",
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

  // ── Challenge 47 ─ Reversed Path ─────────────────────────────────────────
  47: [
    {
      label: "Follower instantiated before use",
      description: "new Follower(hardwareMap) must appear before any follower.method() calls.",
      tier: "required",
      pattern: (code) => {
        const newFollowerIdx = code.search(/new\s+Follower\s*\(/);
        if (newFollowerIdx === -1) return false;
        const beforeInit = code.slice(0, newFollowerIdx);
        // Require lowercase after the dot so import paths like
        // `com.pedropathing.follower.Follower` are not flagged as method calls.
        return !/follower\s*\.[a-z_$]/.test(beforeInit);
      },
      tip: "follower = new Follower(hardwareMap) is not in the right spot.",
    },
    {
      label: "BezierLine path built",
      description: "BezierLine creates the return path segment.",
      tier: "required",
      pattern: /new\s+BezierLine\s*\(/,
      tip: "new BezierLine(new Point(humanStation, Point.POSE), new Point(shotPose, Point.POSE))",
    },
    {
      label: "setReversed(true) applied",
      description: "setReversed(true) makes the robot drive backward along the path.",
      tier: "required",
      pattern: /\.setReversed\s*\(\s*true\s*\)/,
      tip: ".setReversed(true) — the robot's back leads the movement.",
    },
    {
      label: "setLinearHeadingInterpolation() used",
      description: "Heading interpolated linearly between start and end headings.",
      tier: "required",
      pattern: /setLinearHeadingInterpolation/,
      tip: ".setLinearHeadingInterpolation(humanStation.getHeading(), shotPose.getHeading())",
    },
    {
      label: "follower.followPath() and update() called",
      description: "Path executed and follower updated in the loop.",
      tier: "required",
      pattern: (code) =>
        /follower\.followPath\s*\(/.test(code) &&
        /while\s*\(\s*opModeIsActive[^)]*\)[^{]*\{[\s\S]*?follower\.update\s*\(\s*\)/.test(code),
      tip: "follower.update() is not in the right spot.",
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

  // ── Challenge 48 ─ Dynamic Path Building ──────────────────────────────────
  48: [
    {
      label: "Follower instantiated before use",
      description: "new Follower(hardwareMap) must appear before any follower.method() calls.",
      tier: "required",
      pattern: (code) => {
        const newFollowerIdx = code.search(/new\s+Follower\s*\(/);
        if (newFollowerIdx === -1) return false;
        const beforeInit = code.slice(0, newFollowerIdx);
        // Require lowercase after the dot so import paths like
        // `com.pedropathing.follower.Follower` are not flagged as method calls.
        return !/follower\s*\.[a-z_$]/.test(beforeInit);
      },
      tip: "follower = new Follower(hardwareMap) is not in the right spot.",
    },
    {
      label: "buildPathTo() helper method defined",
      description: "buildPathTo() encapsulates dynamic path construction.",
      tier: "required",
      pattern: /buildPathTo\s*\(/,
      tip: "private PathChain buildPathTo(Pose target, boolean reversed) { ... }",
    },
    {
      label: "follower.getPose() used inside helper",
      description: "follower.getPose() captures the current robot position as the path start.",
      tier: "required",
      pattern: /follower\.getPose\s*\(\s*\)/,
      tip: "follower.getPose() is not in the right spot.",
    },
    {
      label: "BezierLine used in dynamic builder",
      description: "BezierLine creates the straight segment in buildPathTo().",
      tier: "required",
      pattern: /new\s+BezierLine\s*\(/,
      tip: "new BezierLine(new Point(current, Point.POSE), new Point(target, Point.POSE))",
    },
    {
      label: "isBusy() loop in followTo()",
      description: "Loop waits for each segment to complete before building the next.",
      tier: "required",
      pattern: /follower\.isBusy\s*\(\s*\)/,
      tip: "while (opModeIsActive() && follower.isBusy()) { follower.update(); }",
    },
    {
      label: "follower.update() called in loop",
      description: "follower.update() drives motors every tick inside the isBusy wait loop.",
      tier: "required",
      pattern: (code) =>
        /while\s*\([^)]*follower\.isBusy[^)]*\)[^{]*\{[\s\S]*?follower\.update\s*\(\s*\)/.test(code),
      tip: "follower.update() is not in the right spot.",
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

  // ── Challenge 50 ─ Vector Dot Product ────────────────────────────────────
  50: [
    {
      label: "dot() method implemented",
      description: "dot(ax, ay, bx, by) helper returns ax*bx + ay*by.",
      tier: "required",
      pattern: /\bdot\s*\(/,
      tip: "private double dot(double ax, double ay, double bx, double by) { return ax*bx + ay*by; }",
    },
    {
      label: "Dot product formula correct (ax*bx + ay*by)",
      description: "Implementation multiplies matching components and sums them.",
      tier: "required",
      pattern: /\*\s*bx|\*\s*by/,
      tip: "return ax * bx + ay * by;",
    },
    {
      label: "Math.hypot() used for magnitude",
      description: "Magnitudes computed with Math.hypot() for cosine similarity.",
      tier: "required",
      pattern: /Math\.hypot\s*\(/,
      tip: "double magDrive = Math.hypot(driveX, driveY);",
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

  // ── Challenge 52 ─ Projectile Distance from TPS ───────────────────────────
  52: [
    {
      label: "Inverse-lookup helper method defined and called",
      description: "A method that takes a TPS value and returns an estimated distance is defined and used.",
      tier: "required",
      pattern: (code) => {
        const methodMatch = code.match(/private\s+double\s+(\w+)\s*\(\s*double/);
        if (!methodMatch) return false;
        const name = methodMatch[1];
        return new RegExp(`\\b${name}\\s*\\(`).test(code.replace(`private double ${name}`, ''));
      },
      tip: "private double tpsToDistance(double tps) { ... } — define the helper, then call it in the loop.",
    },
    {
      label: "Same calibration tables used",
      description: "DIST_TABLE and TPS_TABLE parallel arrays hold the calibration data.",
      tier: "required",
      pattern: (code) => /DIST_TABLE/.test(code) && /TPS_TABLE/.test(code),
      tip: "Use the same tables as Challenge 25: DIST={30,40,50,60}, TPS={1200,1350,1500,1650}",
    },
    {
      label: "Inverse interpolation computed",
      description: "t = (tps - TPS_TABLE[i]) / (TPS_TABLE[i+1] - TPS_TABLE[i]) bracket search.",
      tier: "required",
      pattern: (code) =>
        /\bt\s*=\s*\([^)]*TPS_TABLE/.test(code),
      tip: "double t = (tps - TPS_TABLE[i]) / (TPS_TABLE[i+1] - TPS_TABLE[i]); return DIST_TABLE[i] + t * (DIST_TABLE[i+1] - DIST_TABLE[i]);",
    },
    {
      label: "Interpolated distance returned from table",
      description: "Return uses DIST_TABLE[i] and the t parameter — not a bare return 0.",
      tier: "required",
      pattern: /return\s+DIST_TABLE\[i\]\s*\+/,
      tip: "return DIST_TABLE[i] + t * (DIST_TABLE[i+1] - DIST_TABLE[i]);",
    },
    {
      label: "Clamping for out-of-range TPS",
      description: "TPS values outside the table range return the min/max distance.",
      tier: "required",
      pattern: /TPS_TABLE\[0\]|TPS_TABLE\.length/,
      tip: "if (tps <= TPS_TABLE[0]) return DIST_TABLE[0]; if (tps >= TPS_TABLE[last]) return DIST_TABLE[last];",
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

// Levenshtein edit distance — shared by the keyword and SDK fuzzy checks.
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function checkSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];

  // ── Check: Misspelled package declaration ──────────────────────────────────
  // The standard FTC package is org.firstinspires.ftc.teamcode[.optional.sub].
  // Flag any component that is one edit away from the expected segment.
  {
    const pkgLine = code.split("\n").find((l) => l.trim().startsWith("package "));
    if (pkgLine) {
      const pkgValue = pkgLine.trim().replace(/^package\s+/, "").replace(/;.*$/, "").trim();
      const parts = pkgValue.split(".");
      const expected = ["org", "firstinspires", "ftc", "teamcode"];
      const badParts: string[] = [];
      for (let i = 0; i < Math.min(parts.length, expected.length); i++) {
        const p = parts[i], e = expected[i];
        if (p !== e && Math.abs(p.length - e.length) <= 1 && editDistance(p, e) === 1) {
          badParts.push(`'${p}' (did you mean '${e}'?)`);
        }
      }
      if (badParts.length > 0) {
        issues.push({
          message: `Misspelled package component: ${badParts.join(", ")} — check the package declaration.`,
          severity: "error",
        });
      }
    }
  }

  // ── Check: Misspelled class name in import statements ──────────────────────
  // Extract the class name (last component) of each import and compare it
  // against known FTC SDK class names. One-edit-away typos are flagged.
  {
    const KNOWN_FTC_CLASSES = new Set([
      "LinearOpMode", "OpMode",
      "TeleOp", "Autonomous",
      "DcMotor", "DcMotorEx", "DcMotorSimple",
      "Servo", "CRServo",
      "ColorSensor", "DistanceSensor", "TouchSensor", "RevColorSensorV3",
      "IMU", "ElapsedTime", "Gamepad", "HardwareMap", "Telemetry",
      "GoBildaPinpointDriver",
      // Pedro Pathing
      "Follower", "BezierCurve", "BezierLine", "PathChain", "PathBuilder",
      "Point", "Pose", "MathFunctions",
      // Road Runner
      "SampleMecanumDrive", "TrajectorySequence", "TrajectorySequenceBuilder",
      "Pose2d", "Vector2d",
      // Limelight
      "LimelightManager", "LimelightResult",
    ]);

    const importTypoLines: number[] = [];
    const importTypoTokens: string[] = [];
    code.split("\n").forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("import ")) return;
      // Get the last dot-separated segment (the class name), strip trailing `;`
      const segments = trimmed.replace(/^import\s+/, "").replace(/;.*$/, "").split(".");
      const className = segments[segments.length - 1].trim();
      if (!className || className === "*") return;
      // Already a known class — nothing to flag
      if (KNOWN_FTC_CLASSES.has(className)) return;
      // Check if it's one edit away from any known class
      for (const known of KNOWN_FTC_CLASSES) {
        if (Math.abs(className.length - known.length) > 1) continue;
        if (editDistance(className, known) === 1) {
          importTypoLines.push(i + 1);
          importTypoTokens.push(`'${className}' (did you mean '${known}'?)`);
          break;
        }
      }
    });
    if (importTypoLines.length > 0) {
      issues.push({
        message: `Misspelled class in import: ${importTypoTokens.join(", ")} — check the import statement.`,
        severity: "error",
        lines: importTypoLines,
      });
    }
  }

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

  // Double (or more) semicolons — e.g. `telemetry.update();;`
  {
    const doubleSemiLines: number[] = [];
    code.split("\n").forEach((line, i) => {
      // Strip string literals first so ;; inside a string doesn't false-positive
      const safe = line.replace(/"[^"]*"/g, '""');
      if (/;\s*;/.test(safe)) doubleSemiLines.push(i + 1);
    });
    if (doubleSemiLines.length > 0) {
      issues.push({
        message: "Double ';;' — remove the extra semicolon.",
        severity: "error",
        lines: doubleSemiLines,
      });
    }
  }

  // Semicolon after an annotation is always wrong — @Annotation is a declaration, not a statement
  {
    const annoSemiLines: number[] = [];
    code.split("\n").forEach((line, i) => {
      if (/^\s*@\w+\s*(\([^)]*\))?\s*;/.test(line)) annoSemiLines.push(i + 1);
    });
    if (annoSemiLines.length > 0) {
      issues.push({
        message:
          "Annotation followed by ';' — annotations are not statements and must not end with a semicolon.",
        severity: "error",
        lines: annoSemiLines,
      });
    }
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

  const noCommentLines = noComments.split("\n");
  const badStmtLines: number[] = [];
  noCommentLines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "") return;

    // Method-chain lines (start with '.') are never standalone statements.
    if (trimmed.startsWith(".")) return;

    // If the next non-empty line starts with '.', this line is the opening
    // object of a multi-line chain (e.g. `follower\n  .update()`). Skip it.
    const nextNonEmptyBadStmt = noCommentLines.slice(i + 1).find((l) => l.trim() !== "");
    if (nextNonEmptyBadStmt && nextNonEmptyBadStmt.trim().startsWith(".")) return;

    // Lines ending with ':' are case labels, default labels, or loop labels — skip.
    if (trimmed.endsWith(":")) return;

    // Case 1 — bare word, no semicolon: `Hi`
    // Only flag when the word is not a keyword that legitimately stands alone.
    const SOLO_KW = new Set([
      "else", "try", "finally", "do", "class", "interface", "enum",
      "switch", "case", "default", "new", "assert", "synchronized",
    ]);
    if (/^[A-Za-z_]\w*$/.test(trimmed) && !SOLO_KW.has(trimmed)) {
      badStmtLines.push(i + 1);
      return;
    }

    // Case 2 — bare word + semicolon: `Hi;`
    // Only flag identifiers that are definitely not valid single-word statements.
    // NOTE: trimmed includes the ';', so strip it before the keyword lookup.
    const STMT_KW = new Set(["return", "break", "continue", "throw"]);
    if (/^[A-Za-z_]\w*;$/.test(trimmed) && !STMT_KW.has(trimmed.slice(0, -1))) {
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
  const missingSemiSrcLines = noComments.split("\n");
  missingSemiSrcLines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Already terminated correctly
    const last = trimmed[trimmed.length - 1];
    if (last === ";" || last === "{" || last === "}" || last === ",") return;

    // Method-chain continuation lines (start with '.') are never standalone statements.
    if (trimmed.startsWith(".")) return;

    // If the NEXT non-empty line starts with '.', this line is the opening of a
    // multi-line method chain (e.g. `foo = bar()\n  .baz()`).  No ';' needed here.
    const nextNonEmpty = missingSemiSrcLines.slice(i + 1).find((l) => l.trim() !== "");
    if (nextNonEmpty && nextNonEmpty.trim().startsWith(".")) return;

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

  // ── Check: Access modifier on local variable (field declared inside method) ──
  // In Java, `private`/`public`/`protected` are class-level modifiers.
  // Writing `private DcMotor motor;` inside runOpMode() is a compile error.
  // Depth map: 0 = file scope, 1 = class body, 2+ = method / block body.
  {
    let depth = 0;
    const accessInMethodLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (depth >= 2) {
        const trimmed = line.trim();
        // Match lines that start with an access modifier followed by a type name.
        // Exclude: method declarations (contain '(' before any '=' or ';')
        //          annotations (@Override etc.)
        //          lines that are just closing/opening braces
        if (
          /^(private|public|protected)\s+(static\s+)?(final\s+)?[A-Za-z]/.test(trimmed) &&
          !trimmed.startsWith("@") &&
          !/^(private|public|protected).*\(/.test(trimmed.split(/[;=]/)[0])
        ) {
          accessInMethodLines.push(i + 1);
        }
      }
      depth += opens - closes;
    });
    if (accessInMethodLines.length > 0) {
      issues.push({
        message:
          "Access modifier ('private'/'public'/'protected') on a local variable — " +
          "this is not valid Java. Move the field declaration to the class body (outside runOpMode).",
        severity: "error",
        lines: accessInMethodLines,
      });
    }
  }

  // ── Check: import statement missing semicolon ────────────────────────────
  // `import com.qualcomm.robotcore.hardware.CRServo` without `;` is a compile
  // error and can cause the next line (e.g. a field declaration) to be silently
  // appended as if it were part of the import, hiding the real placement bug.
  {
    const importNoSemiLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("import ") && !trimmed.endsWith(";")) {
        importNoSemiLines.push(i + 1);
      }
    });
    if (importNoSemiLines.length > 0) {
      issues.push({
        message: "import statement missing ';' — every import must end with a semicolon.",
        severity: "error",
        lines: importNoSemiLines,
      });
    }
  }

  // ── Check: Field/statement declarations at file scope (depth 0) ─────────
  // In Java, code like `private PathChain autoPath;` at file scope (outside
  // any class) is a compile error. This catches imports-then-field patterns
  // where the student pasted a field declaration before the class declaration.
  {
    let depth = 0;
    let classOpened = false;
    const fileScope: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const trimmed = line.trim();
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (depth === 1) classOpened = true;
      // At depth 0 (file scope), after any import/package but before the class opens
      if (depth === 0 && !classOpened && trimmed !== "") {
        // Ignore blank lines, import, package, annotations, and comments
        if (
          !trimmed.startsWith("import ") &&
          !trimmed.startsWith("package ") &&
          !trimmed.startsWith("@") &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("/*") &&
          !trimmed.startsWith("*") &&
          !/^public\s+class\b/.test(trimmed) &&
          !/^class\b/.test(trimmed) &&
          // Flag field declarations (access modifier + type + name)
          /^(private|public|protected|static|final)\s+/.test(trimmed)
        ) {
          fileScope.push(i + 1);
        }
      }
      depth += opens - closes;
    });
    if (fileScope.length > 0) {
      issues.push({
        message:
          "Field or statement declared outside the class body — " +
          "move it inside 'public class ... extends LinearOpMode { }'.",
        severity: "error",
        lines: fileScope,
      });
    }
  }

  // ── Check: hardwareMap.get() at class field level ─────────────────────────
  // `DcMotor motor = hardwareMap.get(...)` as a field initializer compiles but
  // crashes at runtime with NullPointerException because hardwareMap is null
  // until the FTC runtime calls runOpMode().
  {
    let depth = 0;
    const hwFieldLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      // depth 1 = class body, outside any method
      if (depth === 1 && /hardwareMap\.get\s*\(/.test(line)) {
        hwFieldLines.push(i + 1);
      }
      depth += opens - closes;
    });
    if (hwFieldLines.length > 0) {
      issues.push({
        message:
          "hardwareMap.get() used as a field initializer — hardwareMap is null at class init time and will crash with NullPointerException. " +
          "Move all hardwareMap.get() calls inside runOpMode(), before waitForStart().",
        severity: "error",
        lines: hwFieldLines,
      });
    }
  }

  // ── Check: Hardware object used before it's initialized ───────────────────
  // Variables assigned via `hardwareMap.get(...)` or `new X(hardwareMap...)`
  // must not be called as `varName.method()` anywhere before that assignment.
  // This catches: follower.setStartingPose() before new Follower(hardwareMap),
  //               motor.setPower() before hardwareMap.get(DcMotor.class, "m"), etc.
  {
    const hwAssignPattern =
      /(\w+)\s*=\s*(?:hardwareMap\.get\s*\(|new\s+\w+\s*\(\s*hardwareMap)/g;
    const useBeforeInitLines: number[] = [];
    let hwMatch: RegExpExecArray | null;
    while ((hwMatch = hwAssignPattern.exec(noComments)) !== null) {
      const varName = hwMatch[1];
      // Skip language keywords and obvious non-hardware names
      if (["this", "super", "null", "true", "false"].includes(varName)) continue;
      const assignIdx = hwMatch.index;
      const beforeAssign = noComments.slice(0, assignIdx);
      // Look for varName used as receiver of a method call before the init.
      // Require a lowercase letter after the dot so that import path segments like
      // `com.pedropathing.follower.Follower` (where the next char is uppercase) are
      // not mistaken for method calls.
      const usePattern = new RegExp(`\\b${varName}\\s*\\.[a-z_$]`);
      const firstUse = usePattern.exec(beforeAssign);
      if (firstUse) {
        const lineNum = beforeAssign.slice(0, firstUse.index).split("\n").length;
        if (!useBeforeInitLines.includes(lineNum)) {
          useBeforeInitLines.push(lineNum);
        }
      }
    }
    if (useBeforeInitLines.length > 0) {
      issues.push({
        message:
          "Hardware object used before it was initialized — " +
          "move the hardwareMap.get() or constructor call above the first use of that variable.",
        severity: "error",
        lines: useBeforeInitLines,
      });
    }
  }

  // ── Check: Executable hardware/OpMode statements at class body level ──────
  // Statements like `motor.setPower(0.5)` or `waitForStart()` are not valid
  // outside a method body. At class depth (depth 1) they cause a compile error.
  {
    const EXEC_PATTERNS = [
      /\bwaitForStart\s*\(\s*\)/,
      /\.setPower\s*\(/,
      /\.setMode\s*\(/,
      /\.setDirection\s*\(/,
      /\.setTargetPosition\s*\(/,
      /\.setPosition\s*\(/,
      /\.setZeroPowerBehavior\s*\(/,
      /\.followPath\s*\(/,
      /\.update\s*\(\s*\)/,
      /\btelemetry\.(addData|update|addLine)\s*\(/,
      /\bsleep\s*\(\s*\d/,
      /\bopModeIsActive\s*\(\s*\)/,
    ];

    let depth = 0;
    const execAtClassLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (depth === 1) {
        const trimmed = line.trim();
        // Skip method/field declarations and annotations — only flag bare statements
        const isDecl = /^(public|private|protected|static|final|abstract|@|\*|\/)/.test(trimmed)
          || /\b(void|class|interface|enum)\b/.test(trimmed)
          || /^\w[\w.<>[\]]*\s+\w+\s*[;=(]/.test(trimmed); // type + name = declaration
        if (!isDecl && EXEC_PATTERNS.some((p) => p.test(line))) {
          execAtClassLines.push(i + 1);
        }
        // Also catch raw re-assignments: `intakeServo = null;` or `intakeServo = hardwareMap.get(...)`
        // that are not field declarations (no type keyword before the name).
        if (
          !isDecl &&
          !execAtClassLines.includes(i + 1) &&
          /^\w+\s*=\s*[^=]/.test(trimmed) && // assignment but not ==
          !trimmed.startsWith("@")
        ) {
          execAtClassLines.push(i + 1);
        }
      }
      depth += opens - closes;
    });
    if (execAtClassLines.length > 0) {
      issues.push({
        message:
          "Executable statement found at class body level (outside any method) — " +
          "hardware calls, waitForStart(), and telemetry must be inside runOpMode().",
        severity: "error",
        lines: execAtClassLines,
      });
    }
  }

  // ── Check: new ElapsedTime() created inside the while(opModeIsActive()) loop ──
  // Creating ElapsedTime inside the loop resets the timer to zero every frame,
  // so it never advances past a few milliseconds.
  {
    const loopSplit = noComments.split(/while\s*\([^{]*opModeIsActive[^{]*\{/);
    if (loopSplit.length >= 2) {
      const loopBody = loopSplit.slice(1).join(""); // everything inside any opModeIsActive loop
      if (/new\s+ElapsedTime\s*\(\s*\)/.test(loopBody)) {
        // Find the actual line number
        const fullCode = noComments;
        const loopStart = fullCode.search(/while\s*\([^{]*opModeIsActive[^{]*\{/);
        const afterLoop = fullCode.slice(loopStart);
        const timerInLoop = /new\s+ElapsedTime\s*\(\s*\)/.exec(afterLoop);
        const linesBefore = loopStart + (timerInLoop?.index ?? 0);
        const lineNum = fullCode.slice(0, loopStart + (timerInLoop?.index ?? 0)).split("\n").length;
        void linesBefore; // suppress unused warning
        issues.push({
          message:
            "new ElapsedTime() created inside while(opModeIsActive()) — " +
            "this resets the timer to zero every loop iteration. " +
            "Declare it before waitForStart() so it counts from the start of the match.",
          severity: "error",
          lines: [lineNum],
        });
      }
    }
  }

  // ── Check: Trailing comma in method/constructor argument list ───────────
  // `method(a, b,)` is invalid Java (valid in JS/TS but not Java).
  // The comma and `)` can be on different lines, so scan the full text,
  // not per-line. Array initializers `{1, 2, 3,}` close with `}` not `)` — safe.
  {
    const trailingCommaLines: number[] = [];
    const tcPattern = /,(\s*)\)/g;
    let tcMatch: RegExpExecArray | null;
    while ((tcMatch = tcPattern.exec(noComments)) !== null) {
      // Calculate line number of the comma
      const lineNum = noComments.slice(0, tcMatch.index).split("\n").length;
      if (!trailingCommaLines.includes(lineNum)) {
        trailingCommaLines.push(lineNum);
      }
    }
    if (trailingCommaLines.length > 0) {
      issues.push({
        message:
          "Trailing comma before ')' — Java method/constructor arguments cannot end with a comma. Remove the last comma.",
        severity: "error",
        lines: trailingCommaLines,
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

  // ── Check: Duplicate letters in class name ────────────────────────────────
  // Catches typos like `EncoderrTarget` (double 'r') in the class declaration.
  {
    const classMatch = code.match(/\bclass\s+([A-Z][A-Za-z0-9_]*)/);
    if (classMatch) {
      const className = classMatch[1];
      if (/(.)\1{1,}/.test(className)) {
        const doubled = className.match(/(.)\1+/g) ?? [];
        issues.push({
          message: `Class name '${className}' appears to have a repeated letter (${doubled.join(", ")}) — possible typo`,
          severity: "warning",
        });
      }
    }
  }

  // ── Collect declared variable names (shared by keyword, Check 5, and Check 6) ──
  // Scan for `Type varName` patterns and build a lowercase → exact-name map.
  const declaredVarNames = new Map<string, string>();
  {
    const declGlobalPattern =
      /\b(?:DcMotor(?:Ex)?|Servo|CRServo|int|double|boolean|String|float|long|ElapsedTime|IMU|ColorSensor|DistanceSensor|TouchSensor)\s+(\w+)\s*[;=(]/g;
    let dm: RegExpExecArray | null;
    while ((dm = declGlobalPattern.exec(noComments)) !== null) {
      const name = dm[1];
      if (
        name.length >= 3 &&
        !/^(true|false|null|new|this|super|class)$/.test(name)
      ) {
        declaredVarNames.set(name.toLowerCase(), name);
      }
    }
  }

  // ── Check: Misspelled Java keywords ──────────────────────────────────────
  // Scan all-lowercase tokens (Java keywords are always lowercase) and flag
  // any that are one edit away from a real keyword but are not themselves valid.
  // e.g. `stati` → `static`, `finla` → `final`, `pubic` → `public`.
  {
    const JAVA_KEYWORDS = new Set([
      "abstract", "assert", "boolean", "break", "byte", "case", "catch",
      "char", "class", "continue", "default", "do", "double", "else",
      "enum", "extends", "final", "finally", "float", "for", "if",
      "implements", "import", "instanceof", "int", "interface", "long",
      "native", "new", "package", "private", "protected", "public",
      "return", "short", "static", "super", "switch",
      "synchronized", "this", "throw", "throws", "transient", "try",
      "void", "volatile", "while",
    ]);

    const kwErrLines: number[] = [];
    const kwErrTokens: string[] = [];

    // Common FTC method/identifier names that are one edit away from a keyword
    // but are perfectly valid Java identifiers — never flag these.
    const ALLOWED_NON_KEYWORDS = new Set([
      "init", "loop", "stop", // OpMode lifecycle methods
      "idle", "opMode", "pose", "path", "node", "edge", "dist", "gyro",
      "imu", "odo", "pid", "rpm", "fps", "deg", "rad",
    ]);

    noComments.split("\n").forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("import ") || trimmed.startsWith("package ")) return;

      // Only match all-lowercase tokens (keywords are never mixed-case)
      const wordRe = /\b([a-z]{3,})\b/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRe.exec(line)) !== null) {
        const token = wm[1];
        if (JAVA_KEYWORDS.has(token)) continue;           // it IS a keyword — correct
        if (declaredVarNames.has(token)) continue;        // it's a declared variable
        if (ALLOWED_NON_KEYWORDS.has(token)) continue;   // known FTC/Java identifier

        for (const kw of JAVA_KEYWORDS) {
          if (Math.abs(token.length - kw.length) > 1) continue; // fast pre-filter
          if (editDistance(token, kw) === 1) {
            if (!kwErrLines.includes(i + 1)) kwErrLines.push(i + 1);
            if (!kwErrTokens.includes(token)) kwErrTokens.push(token);
            break;
          }
        }
      }
    });

    if (kwErrLines.length > 0) {
      issues.push({
        message: `Possible misspelled keyword: '${kwErrTokens.join("', '")}' — check for a typo in a Java keyword`,
        severity: "error",
        lines: kwErrLines,
      });
    }
  }

  // ── Check: import statement inside class/method body ─────────────────────
  // In Java, imports must appear at the top of the file before the class
  // declaration. An import inside a { } block is always a compile error.
  {
    let depth = 0;
    const bodyImportLines: number[] = [];
    code.split("\n").forEach((line, i) => {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (line.trim().startsWith("import ") && depth > 0) {
        bodyImportLines.push(i + 1);
      }
      depth += opens - closes;
    });
    if (bodyImportLines.length > 0) {
      issues.push({
        message: "import statement inside a class body — imports must appear at the top of the file, before the class declaration",
        severity: "error",
        lines: bodyImportLines,
      });
    }
  }

  // ── Check: Misspelled import path segments ────────────────────────────────
  // Splits each import statement by '.' and fuzzy-checks every segment against
  // known FTC/Java package names and class names (edit distance ≤ 1).
  // e.g. `com.qualcomm.robotcore.hardwaree.DcMotor` → flags `hardwaree`.
  {
    const KNOWN_IMPORT_SEGMENTS = new Set([
      // Java / Android package segments
      "com", "org", "java", "util", "lang", "list", "arraylist",
      // Qualcomm / FTC package segments
      "qualcomm", "robotcore", "eventloop", "opmode", "hardware",
      "util", "firstinspires", "ftc", "external", "navigation",
      "limelightvision", "roadrunner", "acmerobotics", "pedropathing",
      "follower", "pathgen", "localization", "teamcode", "vision",
      "apriltag", "gobilda", "lynx", "bosch", "rev", "hardware",
      // Common FTC class names (last segment of import)
      "DcMotor", "DcMotorEx", "DcMotorSimple",
      "Servo", "CRServo",
      "LinearOpMode", "OpMode",
      "ElapsedTime",
      "IMU", "BNO055IMU",
      "ColorSensor", "DistanceSensor", "TouchSensor", "VoltageSensor",
      "DigitalChannel", "AnalogInput",
      "RevHubOrientationOnRobot", "LynxModule",
      "Limelight3A", "LLResult", "LLResultTypes",
      "GoBildaPinpointDriver",
      "AprilTagDetection", "AprilTagProcessor", "VisionPortal",
      "WebcamName",
      "AngleUnit", "DistanceUnit", "YawPitchRollAngles", "AngularVelocity",
      "Actions", "Action", "Pose2d", "Vector2d", "TrajectorySequence",
      "Follower", "PathChain", "BezierCurve", "BezierLine", "Point", "Pose",
      "MecanumDrive",
    ]);

    const badImportLines: number[] = [];
    const badImportSegments: string[] = [];

    code.split("\n").forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("import ")) return;

      const pathMatch = trimmed.match(/^import\s+([\w.]+)\s*;/);
      if (!pathMatch) return;

      for (const seg of pathMatch[1].split(".")) {
        if (seg.length < 3) continue;                 // too short to usefully check
        if (KNOWN_IMPORT_SEGMENTS.has(seg)) continue; // exact match — correct

        for (const known of KNOWN_IMPORT_SEGMENTS) {
          if (Math.abs(seg.length - known.length) > 1) continue;
          if (editDistance(seg, known) === 1) {
            if (!badImportLines.includes(i + 1)) badImportLines.push(i + 1);
            if (!badImportSegments.includes(seg)) badImportSegments.push(seg);
            break;
          }
        }
      }
    });

    if (badImportLines.length > 0) {
      issues.push({
        message: `Possible misspelled import path: '${badImportSegments.join("', '")}' — check the import statement`,
        severity: "error",
        lines: badImportLines,
      });
    }
  }

  // ── Check: Adjacent string literals (missing comma) ──────────────────────
  // Java has no implicit string concatenation — two string literals next to
  // each other with only whitespace between them is always a compile error.
  // e.g. telemetry.addData("Status" "Ready") — comma missing between args.
  {
    const adjStringLines: number[] = [];
    noComments.split("\n").forEach((line, i) => {
      // Replace escaped quotes so \" inside a string doesn't confuse the pattern.
      const safe = line.replace(/\\"/g, "''");
      if (/"[^"]*"\s+"[^"]*"/.test(safe)) {
        adjStringLines.push(i + 1);
      }
    });
    if (adjStringLines.length > 0) {
      issues.push({
        message: `Adjacent string literals with no comma or operator between them — missing ','?`,
        severity: "error",
        lines: adjStringLines,
      });
    }
  }

  // ── Check: Invalid compound operators ────────────────────────────────────
  // Catch operators like /==, *==, +==, -==, %==, and === which are not valid
  // Java. The student likely meant /= (divide-assign) or == (equality) but
  // accidentally wrote both together.
  {
    const badOpLines: number[] = [];
    const badOpTokens: string[] = [];
    noComments.split("\n").forEach((line, i) => {
      // Strip string literals so we don't match inside quoted text.
      const safe = line.replace(/"[^"]*"/g, '""');
      const m = safe.match(/[+\-*\/%]==|===/g);
      if (m) {
        m.forEach((op) => {
          if (!badOpTokens.includes(op)) badOpTokens.push(op);
        });
        badOpLines.push(i + 1);
      }
    });
    if (badOpLines.length > 0) {
      issues.push({
        message: `Invalid operator '${badOpTokens.join("', '")}' — did you mean '/=' (divide-assign) or '==' (equality)? Java does not have a '${badOpTokens[0]}' operator.`,
        severity: "error",
        lines: badOpLines,
      });
    }
  }


  // Catch variable names used with different casing than their declaration,
  // and UPPER_SNAKE_CASE constants used without their underscores
  // (e.g. MOTOR_POWER declared → MOTORPOWER used).
  {
    const caseErrNames: string[] = [];
    const caseErrLines: number[] = [];
    const codeLines5 = noComments.split("\n");

    declaredVarNames.forEach((exactName) => {
      const lowerName = exactName.toLowerCase();
      // Detect UPPER_SNAKE_CASE constants (e.g. MOTOR_POWER, DRIVE_SPEED)
      const isConstant =
        /^[A-Z][A-Z0-9_]*[A-Z0-9]$/.test(exactName) && exactName.includes("_");
      const strippedDeclared = exactName.replace(/_/g, "").toLowerCase();

      codeLines5.forEach((line, idx) => {
        // Strip string literal contents so tokens inside "quotes" are never matched.
        const safeLine = line.replace(/"[^"]*"/g, '""');
        const wordRe = /\b([A-Za-z_]\w*)\b/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRe.exec(safeLine)) !== null) {
          const token = wm[1];
          if (token === exactName) continue; // exact match — correct

          let flagged = false;

          // Case A: same lowercase form but different casing (motorSpeed vs motorspeed)
          // Do NOT flag when the declared variable is camelCase (starts lowercase) and
          // the token is PascalCase (starts uppercase) — that's the standard Java pattern
          // of "ClassName instanceName" (e.g. TouchSensor touchSensor).
          if (token.toLowerCase() === lowerName) {
            const declaredStartsLower = /^[a-z]/.test(exactName);
            const tokenStartsUpper   = /^[A-Z]/.test(token);
            if (!(declaredStartsLower && tokenStartsUpper)) flagged = true;
          }

          // Case B: ALL_CAPS constant used without underscores (MOTORPOWER vs MOTOR_POWER)
          // Only trigger when the token itself is all-uppercase with no underscores,
          // so camelCase variables (driveMotor) don't false-match constants (DRIVE_MOTOR).
          if (
            !flagged &&
            isConstant &&
            /^[A-Z][A-Z0-9]+$/.test(token) &&
            token.toLowerCase() === strippedDeclared
          ) {
            flagged = true;
          }

          // Case C: fuzzy typo — single-char insertion/deletion/substitution
          // (e.g. driveotor vs driveMotor, drveMotor vs driveMotor).
          // Only apply to names ≥ 6 chars to keep false-positives low.
          // Skip when the token is itself a declared variable — it has its own
          // declaration, so it cannot be a typo of another variable.
          // (e.g. flPower vs frPower: both declared, both correct.)
          if (
            !flagged &&
            exactName.length >= 6 &&
            token.length >= 5 &&
            Math.abs(token.length - exactName.length) <= 2 &&
            !declaredVarNames.has(token.toLowerCase()) &&
            editDistance(token.toLowerCase(), lowerName) === 1
          ) {
            flagged = true;
          }

          if (flagged) {
            if (!caseErrLines.includes(idx + 1)) caseErrLines.push(idx + 1);
            if (!caseErrNames.includes(exactName)) caseErrNames.push(exactName);
          }
        }
      });
    });

    if (caseErrLines.length > 0) {
      issues.push({
        message: `Identifier used with inconsistent capitalisation: '${caseErrNames.join("', '")}' — spelling must exactly match the declaration`,
        severity: "error",
        lines: caseErrLines,
      });
    }
  }

  // ── Check 6: FTC SDK identifier casing ────────────────────────────────────
  // Detect known FTC SDK identifiers written with the wrong case OR with a
  // single-character insertion/deletion typo (e.g. `geTargetPosition` instead
  // of `getTargetPosition`).
  // Skips import/package lines and declared variable names to avoid false positives.
  {
    const SDK_IDENTIFIERS = [
      // ── Annotations ─────────────────────────────────────────────────────
      "TeleOp", "Autonomous", "Override", "Disabled",

      // ── Types (PascalCase) ───────────────────────────────────────────────
      "DcMotor", "DcMotorEx", "DcMotorSimple",
      "Servo", "CRServo",
      "LinearOpMode", "OpMode",
      "ElapsedTime",
      "ZeroPowerBehavior", "RunMode",
      "IMU", "BNO055IMU",
      "ColorSensor", "NormalizedColorSensor", "NormalizedRGBA",
      "DistanceSensor", "TouchSensor", "LightSensor",
      "VoltageSensor", "DigitalChannel", "AnalogInput", "AnalogOutput",
      "RevHubOrientationOnRobot",
      // Road Runner types
      "Pose2d", "Vector2d", "TrajectorySequence", "PathChain",

      // ── OpMode built-in fields ───────────────────────────────────────────
      // Both the camelCase field AND the PascalCase type are listed so that
      // correct usages of either form are recognised as exact matches and skipped.
      "telemetry", "Telemetry",
      "hardwareMap", "HardwareMap",

      // ── Gamepad fields (always snake_case) ──────────────────────────────
      "gamepad1", "gamepad2",
      "left_stick_x", "left_stick_y",
      "right_stick_x", "right_stick_y",
      "left_trigger", "right_trigger",
      "left_bumper", "right_bumper",
      "left_stick_button", "right_stick_button",
      "dpad_up", "dpad_down", "dpad_left", "dpad_right",

      // ── DcMotor / DcMotorEx methods ──────────────────────────────────────
      "setPower", "getPower",
      "setMode", "getMode",
      "setDirection", "getDirection",
      "setTargetPosition", "getTargetPosition",
      "getCurrentPosition",
      "setZeroPowerBehavior", "getZeroPowerBehavior",
      "isBusy",
      "setVelocity", "getVelocity",
      "setTargetPositionTolerance", "getTargetPositionTolerance",
      "setCurrentAlert", "getCurrentAlert", "isOverCurrent",
      "setMotorEnable", "setMotorDisable",

      // ── Servo / CRServo methods ──────────────────────────────────────────
      "setPosition", "getPosition",
      "scaleRange",

      // ── LinearOpMode / OpMode methods ────────────────────────────────────
      "runOpMode",
      "waitForStart",
      "opModeIsActive",
      "isStopRequested",
      "isStarted",
      "getRuntime",
      "resetRuntime",
      "sleep",
      "idle",

      // ── Telemetry methods ────────────────────────────────────────────────
      "addData", "addLine",
      "update",
      "setAutoClear",
      "clearAll",
      "setDisplayFormat",

      // ── IMU methods ──────────────────────────────────────────────────────
      "getRobotYawPitchRollAngles",
      "getRobotAngularVelocity",
      "getRobotOrientation",
      "resetYaw",

      // ── Road Runner methods ──────────────────────────────────────────────
      "setPoseEstimate", "getPoseEstimate",
      "followTrajectorySequence",
      "trajectorySequenceBuilder",
      "actionBuilder",
      "setStartingPose",
      "followPath",
      "atParametricEnd",
      "pathBuilder",
      "setLinearHeadingInterpolation",
      "setConstantHeadingInterpolation",
      "setTangentHeadingInterpolation",
      "addTemporalMarker",
      "waitSeconds",
      "splineTo", "lineTo", "strafeTo", "forward", "back", "strafeLeft", "strafeRight",
      "turn", "turnTo",

      // ── FTC SDK enum constants (UPPER_SNAKE_CASE) ────────────────────────
      // Direction enum (DcMotorSimple.Direction / DcMotor.Direction)
      "FORWARD", "REVERSE",
      // RunMode enum
      "RUN_TO_POSITION", "RUN_USING_ENCODER", "RUN_WITHOUT_ENCODER", "STOP_AND_RESET_ENCODER",
      // ZeroPowerBehavior enum
      "BRAKE", "FLOAT",
      // BulkCachingMode enum
      "MANUAL", "AUTO", "OFF",
      // EncoderDirection (Pinpoint)
      "REVERSED",
    ];

    const sdkErrLines: number[] = [];
    const sdkErrNames: string[] = [];
    const codeLines6 = noComments.split("\n");

    // Exact-match sets: token must match one of these to be considered correct.
    const sdkExactSet = new Set(SDK_IDENTIFIERS);          // exact string match
    const sdkLowerSet = new Set(SDK_IDENTIFIERS.map((n) => n.toLowerCase())); // lowercase match

    // Token-centric scan: for each token decide once whether it's wrong.
    codeLines6.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("import ") || trimmedLine.startsWith("package ")) return;

      // Strip string literal contents so tokens inside "quotes" are never matched.
        const safeLine6 = line.replace(/"[^"]*"/g, '""');
        const wordRe = /\b([A-Za-z_]\w*)\b/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRe.exec(safeLine6)) !== null) {
          const token = wm[1];

          // If the token exactly matches any SDK identifier it is correct — skip it.
          if (sdkExactSet.has(token)) continue;

        // Skip tokens that are correctly-used declared variable names.
        if (declaredVarNames.get(token.toLowerCase()) === token) continue;

        const tokenLower = token.toLowerCase();
        let matchedSdk: string | null = null;

        for (const sdkName of SDK_IDENTIFIERS) {
          const lowerName = sdkName.toLowerCase();

          // Exact case-mismatch (e.g. setpower → setPower, Telemetry → telemetry).
          if (tokenLower === lowerName) {
            matchedSdk = sdkName;
            break;
          }

          // Fuzzy typo — edit distance 1 for identifiers ≥ 5 chars.
          // Token must NOT already be a valid SDK name (sdkLowerSet guard).
          const lengthDiff = token.length - sdkName.length;
          if (
            sdkName.length >= 5 &&
            token.length >= 4 &&
            Math.abs(lengthDiff) <= 2 &&
            !sdkLowerSet.has(tokenLower) &&
            editDistance(tokenLower, lowerName) === 1
          ) {
            matchedSdk = sdkName;
            break;
          }
        }

        if (matchedSdk) {
          if (!sdkErrLines.includes(idx + 1)) sdkErrLines.push(idx + 1);
          if (!sdkErrNames.includes(matchedSdk)) sdkErrNames.push(matchedSdk);
        }
      }
    });

    if (sdkErrLines.length > 0) {
      issues.push({
        message: `'${sdkErrNames.join("', '")}' is spelled incorrectly`,
        severity: "error",
        lines: sdkErrLines,
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

/** Preview of a grader check shown in the workspace requirements panel. */
export interface RequirementPreview {
  label: string;
  description: string;
  tier: CheckTier;
  /** "universal" = every challenge; "challenge" = per-challenge rule */
  scope: "universal" | "challenge";
}

/** All checks the grader will run for a challenge (before code is submitted). */
export function getChallengeRequirements(challengeId: number): RequirementPreview[] {
  const challengeChecks = CHALLENGE_CHECKS[challengeId] ?? [];
  const toPreview = (checks: ValidationCheck[], scope: RequirementPreview["scope"]) =>
    checks.map((c) => ({
      label: c.label,
      description: c.description,
      tier: c.tier,
      scope,
    }));

  return [
    ...toPreview(UNIVERSAL.filter((c) => c.tier === "required"), "universal"),
    ...toPreview(challengeChecks.filter((c) => c.tier === "required"), "challenge"),
    ...toPreview(UNIVERSAL.filter((c) => c.tier !== "required"), "universal"),
    ...toPreview(challengeChecks.filter((c) => c.tier !== "required"), "challenge"),
  ];
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
  // Split universal results by tier so improvement-tier universal hints
  // degrade to "needs-improvement" rather than hard-failing to "wrong".
  const universalRequiredResults  = universalResults.filter((r) => r.tier === "required");
  const universalImprovResults    = universalResults.filter((r) => r.tier !== "required");

  const universalRequiredPassed   = universalRequiredResults.every((r) => r.pass);
  const universalImprovPassed     = universalImprovResults.every((r) => r.pass);
  const requiredPassed            = requiredResults.every((r) => r.pass);
  const improvementPassed         = improvementResults.every((r) => r.pass);

  let grade: Grade;
  if (hasFatalSyntax || !universalRequiredPassed || !requiredPassed) {
    grade = "wrong";
  } else if (!universalImprovPassed || !improvementPassed) {
    grade = "needs-improvement";
  } else {
    grade = "good";
  }

  // ── Score ────────────────────────────────────────────────────────────────
  const score = {
    required: {
      passed: universalRequiredResults.filter((r) => r.pass).length + requiredResults.filter((r) => r.pass).length,
      total:  universalRequiredResults.length + requiredResults.length,
    },
    improvement: {
      passed: universalImprovResults.filter((r) => r.pass).length + improvementResults.filter((r) => r.pass).length,
      total:  universalImprovResults.length + improvementResults.length,
    },
  };

  // ── Verdict copy ─────────────────────────────────────────────────────────
  const failedRequired = [
    ...universalRequiredResults.filter((r) => !r.pass),
    ...requiredResults.filter((r) => !r.pass),
  ];
  const failedImprovements = [
    ...universalImprovResults.filter((r) => !r.pass),
    ...improvementResults.filter((r) => !r.pass),
  ];

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

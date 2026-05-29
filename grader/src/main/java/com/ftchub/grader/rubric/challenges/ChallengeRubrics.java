package com.ftchub.grader.rubric.challenges;

import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.Rules;
import com.ftchub.grader.rubric.TreeHelpers;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static com.ftchub.grader.rubric.TreeHelpers.callsMethod;
import static com.ftchub.grader.rubric.TreeHelpers.callsMethodInsideWhileLoop;
import static com.ftchub.grader.rubric.TreeHelpers.declaresField;
import static com.ftchub.grader.rubric.TreeHelpers.declaresMethod;
import static com.ftchub.grader.rubric.TreeHelpers.firstCallLine;
import static com.ftchub.grader.rubric.TreeHelpers.instantiates;
import static com.ftchub.grader.rubric.TreeHelpers.instantiatesInsideWhileLoop;
import static com.ftchub.grader.rubric.TreeHelpers.sourceContains;

/**
 * Per-challenge rubric definitions.
 *
 * The legacy validator only had detailed rules for 19 of the 53 built-in
 * challenges. Every challenge now has at least a handful of structural rules
 * derived from its objectives — challenges that are fully covered get rich
 * type-aware checks, while the rest get sensible defaults the compiler can
 * verify (e.g. "Servo declared" for servo challenges).
 *
 * To add or tune a challenge: edit the corresponding {@code List<RubricRule>}
 * below — no regex required.
 */
public final class ChallengeRubrics {

    private ChallengeRubrics() {}

    private static final Pattern NEGATED_LEFT_STICK_Y = Pattern.compile("-\\s*gamepad1\\.left_stick_y");
    private static final Pattern NON_ZERO_POWER       = Pattern.compile("\\.setPower\\(\\s*(?!0[\\s.)])[^)]+\\)");
    private static final Pattern ZERO_POWER           = Pattern.compile("\\.setPower\\(\\s*0(?:\\.0*)?\\s*\\)");
    private static final Pattern IS_BUSY_WHILE        = Pattern.compile("while\\s*\\([^{]*\\.isBusy\\s*\\(\\s*\\)[^{]*opModeIsActive|while\\s*\\([^{]*opModeIsActive[^{]*\\.isBusy\\s*\\(\\s*\\)");
    private static final Pattern REVERSE_DIRECTION    = Pattern.compile("setDirection\\s*\\(\\s*(?:DcMotor(?:Simple)?\\.)?Direction\\.REVERSE\\s*\\)");
    private static final Pattern TIMER_SECONDS_CMP    = Pattern.compile("\\w+\\.seconds\\(\\)\\s*[<>]");
    private static final Pattern BRAKE_BEHAVIOR       = Pattern.compile("ZeroPowerBehavior\\.BRAKE");
    private static final Pattern RUN_USING_ENCODER    = Pattern.compile("RUN_USING_ENCODER");

    /** Resolve the rubric for a given challenge id (empty list if unknown). */
    public static List<RubricRule> forChallenge(int id) {
        return REGISTRY.getOrDefault(id, List.of());
    }

    public static boolean isKnown(int id) {
        return REGISTRY.containsKey(id);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Registry
    // ──────────────────────────────────────────────────────────────────────

    private static final Map<Integer, List<RubricRule>> REGISTRY = Map.ofEntries(
        Map.entry(1, challenge1()),
        Map.entry(2, challenge2()),
        Map.entry(3, challenge3()),
        Map.entry(4, challenge4()),
        Map.entry(5, challenge5()),
        Map.entry(6, challenge6()),
        Map.entry(7, challenge7()),
        Map.entry(8, challenge8()),
        Map.entry(9, challenge9()),
        Map.entry(10, challenge10()),
        Map.entry(11, challenge11()),
        Map.entry(12, challenge12()),
        Map.entry(13, challenge13()),
        Map.entry(14, challenge14()),
        Map.entry(15, challenge15()),
        Map.entry(16, challenge16()),
        Map.entry(17, challenge17()),
        Map.entry(18, challenge18()),
        Map.entry(19, challenge19()),
        Map.entry(20, challenge20()),
        Map.entry(21, challenge21()),
        Map.entry(22, challenge22()),
        Map.entry(23, challenge23()),
        Map.entry(24, challenge24()),
        Map.entry(25, challenge25()),
        Map.entry(26, challenge26()),
        Map.entry(27, challenge27()),
        Map.entry(28, challenge28()),
        Map.entry(29, challenge29()),
        Map.entry(30, challenge30()),
        Map.entry(31, challenge31()),
        Map.entry(32, challenge32()),
        Map.entry(33, challenge33()),
        Map.entry(34, challenge34()),
        Map.entry(35, challenge35()),
        Map.entry(36, challenge36()),
        Map.entry(37, challenge37()),
        Map.entry(38, challenge38()),
        Map.entry(39, challenge39()),
        Map.entry(40, challenge40()),
        Map.entry(41, challenge41()),
        Map.entry(42, challenge42()),
        Map.entry(43, challenge43()),
        Map.entry(44, challenge44()),
        Map.entry(45, challenge45()),
        Map.entry(46, challenge46()),
        Map.entry(47, challenge47()),
        Map.entry(48, challenge48()),
        Map.entry(49, challenge49()),
        Map.entry(50, challenge50()),
        Map.entry(51, challenge51()),
        Map.entry(52, challenge52()),
        Map.entry(53, challenge53())
    );

    // ──────────────────────────────────────────────────────────────────────
    // Built-in rubrics — original 19 (ported from codeValidator.ts)
    // ──────────────────────────────────────────────────────────────────────

    /** Challenge 1 — Basic TeleOp. */
    private static List<RubricRule> challenge1() {
        return Rules.of(
            Rules.required("DcMotor declared",
                "A DcMotor or DcMotorEx field is declared.",
                "Declare the motor as a class field: `private DcMotor leftMotor;`",
                ctx -> declaresField(ctx, "DcMotor") || declaresField(ctx, "DcMotorEx")),
            Rules.required("hardwareMap.get(DcMotor.class) called",
                "Motor retrieved from hardwareMap inside runOpMode().",
                "Use: leftMotor = hardwareMap.get(DcMotor.class, \"left_motor\");",
                ctx -> callsMethod(ctx, "get")
                       && sourceContains(ctx, Pattern.compile("hardwareMap\\.get\\(\\s*DcMotor"))),
            Rules.required("gamepad1.left_stick_y read",
                "The left joystick Y-axis value is read from gamepad1.",
                "Read the stick: `double power = -gamepad1.left_stick_y;`",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.left_stick_y"))),
            Rules.required("Y-axis negated",
                "Stick value negated so pushing forward gives positive power.",
                "FTC gamepads invert Y — use `double power = -gamepad1.left_stick_y;`.",
                ctx -> sourceContains(ctx, NEGATED_LEFT_STICK_Y)),
            Rules.required("setPower() called",
                "Motor power applied via motor.setPower(value).",
                "Call leftMotor.setPower(power) to drive the motor.",
                ctx -> callsMethod(ctx, "setPower")),
            Rules.required("opModeIsActive() loop present",
                "Main TeleOp loop runs while the OpMode is active.",
                "Wrap your driving code in `while (opModeIsActive()) { ... }`.",
                TreeHelpers::hasOpModeIsActiveWhile),
            Rules.improvement("setPower() inside the loop",
                "Motor power is updated every iteration (not set-and-forget).",
                "Move setPower() inside the while-loop body so the stick value updates each frame.",
                ctx -> callsMethodInsideWhileLoop(ctx, "setPower")),
            Rules.improvement("Motor direction set",
                "setDirection() explicitly sets motor polarity (prevents wrong-way driving).",
                "Add motor.setDirection(DcMotorSimple.Direction.FORWARD) or REVERSE in init.",
                ctx -> callsMethod(ctx, "setDirection"))
        );
    }

    /** Challenge 2 — Encoder Basics. */
    private static List<RubricRule> challenge2() {
        return Rules.of(
            Rules.required("Encoder reset",
                "STOP_AND_RESET_ENCODER zeroes the encoder before use.",
                "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
                ctx -> sourceContains(ctx, Pattern.compile("STOP_AND_RESET_ENCODER"))),
            Rules.required("RUN_TO_POSITION mode",
                "Motor switched to RUN_TO_POSITION mode.",
                "motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);",
                ctx -> sourceContains(ctx, Pattern.compile("RUN_TO_POSITION"))),
            Rules.required("setTargetPosition() called",
                "Target encoder tick count passed to setTargetPosition().",
                "motor.setTargetPosition(TARGET_TICKS);",
                ctx -> callsMethod(ctx, "setTargetPosition")),
            Rules.required("setTargetPosition before RUN_TO_POSITION",
                "setTargetPosition() must execute before switching the motor to RUN_TO_POSITION.",
                "Call setTargetPosition() first, then setMode(RUN_TO_POSITION), then setPower().",
                ctx -> {
                    long target = TreeHelpers.firstSourceLineMatching(
                            ctx, Pattern.compile("\\.setTargetPosition\\s*\\("));
                    long runTo = TreeHelpers.firstSourceLineMatching(
                            ctx, Pattern.compile("\\.setMode\\s*\\([^)]*RUN_TO_POSITION"));
                    if (target < 0 || runTo < 0) return true;
                    return target < runTo;
                }),
            Rules.required("Non-zero power applied",
                "setPower() called with a non-zero value to start movement.",
                "motor.setPower(0.6); — RUN_TO_POSITION won't move without power.",
                ctx -> sourceContains(ctx, NON_ZERO_POWER)),
            Rules.required("isBusy() polled inside a while loop",
                "while(motor.isBusy() ...) blocks until the motor reaches its target.",
                "while (motor.isBusy() && opModeIsActive()) { idle(); }",
                ctx -> sourceContains(ctx, Pattern.compile("while\\s*\\([^{]*\\.isBusy\\s*\\(\\s*\\)"))),
            Rules.required("Motor stopped after arriving",
                "setPower(0) cuts motor power once the position is reached.",
                "Call motor.setPower(0) after the isBusy() loop.",
                ctx -> sourceContains(ctx, ZERO_POWER)),
            Rules.required("isBusy() loop guarded by opModeIsActive()",
                "Pair isBusy() with opModeIsActive() so a jammed motor doesn't loop forever.",
                "while (motor.isBusy() && opModeIsActive()) { idle(); }",
                ctx -> !sourceContains(ctx, Pattern.compile("while\\s*\\([^{]*\\.isBusy\\s*\\(\\s*\\)"))
                       || sourceContains(ctx, IS_BUSY_WHILE)),
            Rules.improvement("Telemetry reports position",
                "getCurrentPosition() logged to telemetry helps debugging.",
                "telemetry.addData(\"Pos\", motor.getCurrentPosition());",
                ctx -> callsMethod(ctx, "getCurrentPosition"))
        );
    }

    /** Challenge 3 — Autonomous Timer. */
    private static List<RubricRule> challenge3() {
        return Rules.of(
            Rules.required("ElapsedTime declared",
                "An ElapsedTime object created to track real time.",
                "ElapsedTime timer = new ElapsedTime();",
                ctx -> instantiates(ctx, "ElapsedTime")),
            Rules.required("Timer compared in while condition",
                "timer.seconds() used as the loop exit condition.",
                "while (timer.seconds() < DRIVE_DURATION && opModeIsActive()) { ... }",
                ctx -> sourceContains(ctx, TIMER_SECONDS_CMP)),
            Rules.required("Motors driven forward",
                "setPower() called with a non-zero value for forward motion.",
                "leftMotor.setPower(DRIVE_SPEED);",
                ctx -> sourceContains(ctx, NON_ZERO_POWER)),
            Rules.required("Motors stopped after timer",
                "setPower(0) stops the motors after the timed segment.",
                "leftMotor.setPower(0); rightMotor.setPower(0);",
                ctx -> sourceContains(ctx, ZERO_POWER)),
            Rules.required("opModeIsActive() safety guard",
                "opModeIsActive() in the while condition allows emergency stop.",
                "Include opModeIsActive() in timed loops.",
                TreeHelpers::hasOpModeIsActiveWhile),
            Rules.required("ElapsedTime declared outside the loop",
                "Creating new ElapsedTime() inside the loop resets the clock every frame.",
                "Declare ElapsedTime once before the while loop.",
                ctx -> !instantiatesInsideWhileLoop(ctx, "ElapsedTime")),
            Rules.improvement("Motor direction reversed for one side",
                "One side must be reversed so both sides drive forward together.",
                "leftMotor.setDirection(DcMotor.Direction.REVERSE);",
                ctx -> sourceContains(ctx, REVERSE_DIRECTION))
        );
    }

    /** Challenge 4 — Road Runner Trajectory. */
    private static List<RubricRule> challenge4() {
        return Rules.of(
            Rules.required("Drive object created",
                "MecanumDrive or SampleMecanumDrive constructed with hardwareMap.",
                "MecanumDrive drive = new MecanumDrive(hardwareMap, startPose);",
                ctx -> instantiates(ctx, "MecanumDrive") || instantiates(ctx, "SampleMecanumDrive")),
            Rules.required("Trajectory constructed",
                "TrajectorySequenceBuilder (RR 0.5) or actionBuilder (RR 1.0) is used.",
                "Use drive.trajectorySequenceBuilder(start)...build() or drive.actionBuilder(start)...build().",
                ctx -> sourceContains(ctx, Pattern.compile("trajectorySequenceBuilder|\\.actionBuilder\\s*\\("))),
            Rules.required("splineTo() segment present",
                "At least one splineTo() call creates a curved path segment.",
                ".splineTo(new Vector2d(30, 30), Math.PI / 2)",
                ctx -> callsMethod(ctx, "splineTo")),
            Rules.required("Trajectory executed",
                "drive.followTrajectorySequence() or Actions.runBlocking() runs the path.",
                "RR 0.5: drive.followTrajectorySequence(seq);  RR 1.0: Actions.runBlocking(action);",
                ctx -> callsMethod(ctx, "followTrajectorySequence") || callsMethod(ctx, "runBlocking")),
            Rules.improvement("waitSeconds() or temporal marker",
                "Pause included for mechanism timing.",
                ".waitSeconds(0.5) pauses at a point — useful for scoring mechanisms.",
                ctx -> callsMethod(ctx, "waitSeconds") || callsMethod(ctx, "addTemporalMarker"))
        );
    }

    /** Challenge 5 — Pedro Pathing Chain. */
    private static List<RubricRule> challenge5() {
        return Rules.of(
            Rules.required("Follower declared and constructed",
                "A Follower is built from hardwareMap.",
                "Follower follower = new Follower(hardwareMap);",
                ctx -> instantiates(ctx, "Follower")),
            Rules.required("PathBuilder used",
                "Path is built via PathBuilder().addPath(...).build().",
                "new PathBuilder().addPath(...).build()",
                ctx -> instantiates(ctx, "PathBuilder")),
            Rules.required("BezierLine used",
                "Path uses BezierLine for straight segments.",
                "new Path(new BezierLine(new Point(0,0), new Point(24,0)))",
                ctx -> instantiates(ctx, "BezierLine")),
            Rules.required("followPath() executed",
                "follower.followPath() runs the path.",
                "follower.followPath(pathChain, true);",
                ctx -> callsMethod(ctx, "followPath")),
            Rules.required("follower.update() inside loop",
                "follower.update() must be called every iteration to drive motors.",
                "while (...) { follower.update(); telemetry.update(); }",
                ctx -> callsMethodInsideWhileLoop(ctx, "update")),
            Rules.improvement("BezierCurve used for at least one segment",
                "Curved segment improves path smoothness.",
                "new Path(new BezierCurve(p0, p1, p2))",
                ctx -> instantiates(ctx, "BezierCurve"))
        );
    }

    /** Challenge 6 — Dual Motor TeleOp. */
    private static List<RubricRule> challenge6() {
        return Rules.of(
            Rules.required("Two DcMotor fields declared",
                "Tank drive needs a left and a right motor.",
                "Declare two DcMotor fields, e.g. leftMotor and rightMotor.",
                ctx -> declaresField(ctx, "DcMotor") && TreeHelpers.countMethodCalls(ctx, "get") >= 2),
            Rules.required("gamepad1.left_stick_y read",
                "Left stick drives the left side.",
                "double leftPower = -gamepad1.left_stick_y;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.left_stick_y"))),
            Rules.required("gamepad1.right_stick_y read",
                "Right stick drives the right side.",
                "double rightPower = -gamepad1.right_stick_y;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.right_stick_y"))),
            Rules.required("Both stick values negated",
                "FTC Y-axes are inverted; negate both.",
                "double leftPower = -gamepad1.left_stick_y; double rightPower = -gamepad1.right_stick_y;",
                ctx -> sourceContains(ctx, Pattern.compile("-\\s*gamepad1\\.left_stick_y"))
                       && sourceContains(ctx, Pattern.compile("-\\s*gamepad1\\.right_stick_y"))),
            Rules.required("setPower() called",
                "Both motors must be powered each loop.",
                "leftMotor.setPower(leftPower); rightMotor.setPower(rightPower);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "setPower") >= 2),
            Rules.improvement("setDirection() for one side",
                "Reverse one side so the robot drives forward when both sticks are pushed forward.",
                "rightMotor.setDirection(DcMotor.Direction.REVERSE);",
                ctx -> sourceContains(ctx, REVERSE_DIRECTION))
        );
    }

    /** Challenge 7 — Servo Position Control. */
    private static List<RubricRule> challenge7() {
        return Rules.of(
            Rules.required("Servo field declared",
                "A Servo (not CRServo) field is declared.",
                "private Servo armServo;",
                ctx -> declaresField(ctx, "Servo") && !declaresField(ctx, "CRServo")),
            Rules.required("hardwareMap.get(Servo.class) used",
                "Servo retrieved from hardwareMap.",
                "armServo = hardwareMap.get(Servo.class, \"arm_servo\");",
                ctx -> sourceContains(ctx, Pattern.compile("hardwareMap\\.get\\(\\s*Servo"))),
            Rules.required("setPosition() called",
                "Servo moved with setPosition() in the range 0.0–1.0.",
                "armServo.setPosition(1.0);",
                ctx -> callsMethod(ctx, "setPosition")),
            Rules.required("No setPower() on Servo",
                "Regular Servo uses setPosition(), not setPower().",
                "Use armServo.setPosition(0.5) — setPower is only for CRServo.",
                ctx -> {
                    // Type-aware: pass when there is no .setPower call whose receiver is a Servo.
                    if (!declaresField(ctx, "Servo")) return true;
                    return !TreeHelpers.callsMethod(ctx, "Servo", "setPower");
                }),
            Rules.improvement("Gamepad button toggles position",
                "Button press triggers movement.",
                "if (gamepad1.a) armServo.setPosition(1.0);",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.[abxy]|gamepad1\\.dpad")))
        );
    }

    /** Challenge 8 — CRServo Intake. */
    private static List<RubricRule> challenge8() {
        return Rules.of(
            Rules.required("CRServo declared",
                "A CRServo field is declared.",
                "private CRServo intakeServo;",
                ctx -> declaresField(ctx, "CRServo")),
            Rules.required("setPower() called on CRServo",
                "CRServo uses setPower() in [-1, 1], not setPosition().",
                "intakeServo.setPower(1.0);",
                ctx -> callsMethod(ctx, "setPower")),
            Rules.required("No setPosition() on CRServo",
                "CRServo doesn't have setPosition(); use setPower() instead.",
                "intakeServo.setPower(value); — setPosition won't compile on CRServo.",
                ctx -> !declaresField(ctx, "CRServo") || !callsMethod(ctx, "setPosition")),
            Rules.improvement("Gamepad trigger drives the servo",
                "Trigger (analog) gives smooth speed control.",
                "intakeServo.setPower(gamepad1.right_trigger - gamepad1.left_trigger);",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.(?:left|right)_trigger")))
        );
    }

    /** Challenge 9 — Telemetry Dashboard. */
    private static List<RubricRule> challenge9() {
        return Rules.of(
            Rules.required("ElapsedTime tracks runtime",
                "Timer measures total OpMode elapsed time.",
                "ElapsedTime runtime = new ElapsedTime();",
                ctx -> instantiates(ctx, "ElapsedTime")),
            Rules.required("Loop counter incremented",
                "A counter accumulates across loop iterations.",
                "loopCount++;",
                ctx -> sourceContains(ctx, Pattern.compile("\\+\\+|loopCount\\s*=\\s*loopCount\\s*\\+"))),
            Rules.required("Encoder position read",
                "Motor position surfaced with getCurrentPosition().",
                "motor.getCurrentPosition()",
                ctx -> callsMethod(ctx, "getCurrentPosition")),
            Rules.required("Section headers in telemetry",
                "Use addLine() to organize the dashboard.",
                "telemetry.addLine(\"--- Status ---\");",
                ctx -> callsMethod(ctx, "addLine")),
            Rules.improvement("Multiple telemetry fields",
                "Show loop count, time, power, encoder, and status.",
                "telemetry.addData(...); telemetry.update();",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 4
                       && callsMethodInsideWhileLoop(ctx, "update"))
        );
    }

    /** Challenge 10 — Button Debouncing. */
    private static List<RubricRule> challenge10() {
        return Rules.of(
            Rules.required("Previous button state tracked",
                "Store last frame's button value for edge detection.",
                "boolean lastAButton = false;",
                ctx -> sourceContains(ctx, Pattern.compile("boolean\\s+\\w+"))
                       && sourceContains(ctx, Pattern.compile("&&\\s*!\\w+|!\\w+\\s*&&"))),
            Rules.required("Toggle state stored",
                "A boolean holds the current intake on/off state.",
                "boolean intakeRunning = false;",
                ctx -> sourceContains(ctx, Pattern.compile("intakeRunning|toggle|running"))),
            Rules.required("CRServo powered from toggle",
                "Intake runs with setPower() based on toggle state.",
                "intakeServo.setPower(intakeRunning ? 1.0 : 0.0);",
                ctx -> declaresField(ctx, "CRServo") && callsMethod(ctx, "setPower")),
            Rules.improvement("lastButton updated at loop end",
                "Edge detection requires updating previous state after the check.",
                "lastAButton = gamepad1.a;",
                ctx -> sourceContains(ctx, Pattern.compile("=\\s*gamepad1\\.a")))
        );
    }

    /** Challenge 11 — ElapsedTime Patterns. */
    private static List<RubricRule> challenge11() {
        return Rules.of(
            Rules.required("ElapsedTime used",
                "Timer drives timed segments.",
                "ElapsedTime timer = new ElapsedTime();",
                ctx -> instantiates(ctx, "ElapsedTime")),
            Rules.required("timer.seconds() in while condition",
                "Blocking wait uses timer.seconds() with opModeIsActive().",
                "while (timer.seconds() < 1.0 && opModeIsActive()) { ... }",
                ctx -> sourceContains(ctx, TIMER_SECONDS_CMP)),
            Rules.required("timer.reset() between segments",
                "Reset timer before each new timed segment.",
                "timer.reset();",
                ctx -> callsMethod(ctx, "reset")),
            Rules.required("Motor stopped after timed move",
                "setPower(0) after the timed segment completes.",
                "motor.setPower(0);",
                ctx -> sourceContains(ctx, ZERO_POWER))
        );
    }

    /** Challenge 12 — Motor Zero Power Behavior. */
    private static List<RubricRule> challenge12() {
        return Rules.of(
            Rules.required("setZeroPowerBehavior() called",
                "Explicitly choose BRAKE or FLOAT mode.",
                "motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
                ctx -> callsMethod(ctx, "setZeroPowerBehavior")),
            Rules.required("Both BRAKE and FLOAT referenced",
                "Toggle between brake and float behaviors.",
                "ZeroPowerBehavior.BRAKE ... ZeroPowerBehavior.FLOAT",
                ctx -> sourceContains(ctx, BRAKE_BEHAVIOR)
                       && sourceContains(ctx, Pattern.compile("ZeroPowerBehavior\\.FLOAT"))),
            Rules.required("X button toggles mode",
                "Rising edge on gamepad1.x switches behavior.",
                "if (gamepad1.x && !lastX) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.x")))
        );
    }

    /** Challenge 13 — Init-Loop Configuration. */
    private static List<RubricRule> challenge13() {
        return Rules.of(
            Rules.required("Alliance flag declared",
                "Boolean tracks RED vs BLUE selection.",
                "boolean isRedAlliance = true;",
                ctx -> sourceContains(ctx, Pattern.compile("isRedAlliance|redAlliance"))),
            Rules.required("Init loop before start",
                "Configure alliance while !isStarted() && !isStopRequested().",
                "while (!isStarted() && !isStopRequested()) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("isStarted\\s*\\(\\s*\\)"))
                       && sourceContains(ctx, Pattern.compile("isStopRequested\\s*\\(\\s*\\)"))),
            Rules.required("B and X set alliance",
                "B selects RED, X selects BLUE.",
                "if (gamepad1.b) ... if (gamepad1.x) ...",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.b"))
                       && sourceContains(ctx, Pattern.compile("gamepad1\\.x"))),
            Rules.improvement("Alliance shown in telemetry",
                "Driver sees current selection during init.",
                "telemetry.addData(\"Alliance\", isRedAlliance ? \"RED\" : \"BLUE\");",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 14 — Encoder-Based Drive Distance. */
    private static List<RubricRule> challenge14() {
        return Rules.of(
            Rules.required("Encoder reset",
                "STOP_AND_RESET_ENCODER before the move.",
                "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
                ctx -> sourceContains(ctx, Pattern.compile("STOP_AND_RESET_ENCODER"))),
            Rules.required("RUN_TO_POSITION mode",
                "Encoder move uses RUN_TO_POSITION.",
                "motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);",
                ctx -> sourceContains(ctx, Pattern.compile("RUN_TO_POSITION"))),
            Rules.required("setTargetPosition() called",
                "Target tick count specified before the move.",
                "motor.setTargetPosition(1000);",
                ctx -> callsMethod(ctx, "setTargetPosition")),
            Rules.required("isBusy() wait loop",
                "Block until the motor reaches its target.",
                "while (motor.isBusy() && opModeIsActive()) { idle(); }",
                ctx -> sourceContains(ctx, Pattern.compile("\\.isBusy\\s*\\("))),
            Rules.improvement("Return to RUN_USING_ENCODER",
                "Switch back after the move for manual control.",
                "motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);",
                ctx -> sourceContains(ctx, RUN_USING_ENCODER))
        );
    }

    /** Challenge 15 — Bulk Cache Reads. */
    private static List<RubricRule> challenge15() {
        return Rules.of(
            Rules.required("LynxModule hubs retrieved",
                "Get all expansion/control hubs from hardwareMap.",
                "List<LynxModule> modules = hardwareMap.getAll(LynxModule.class);",
                ctx -> sourceContains(ctx, Pattern.compile("getAll\\s*\\(\\s*LynxModule"))),
            Rules.required("Manual bulk caching enabled",
                "Set BulkCachingMode.MANUAL on each hub.",
                "module.setBulkCachingMode(BulkCachingMode.MANUAL);",
                ctx -> sourceContains(ctx, Pattern.compile("BulkCachingMode\\.MANUAL"))),
            Rules.required("clearBulkCache() each loop",
                "Clear bulk cache at the top of the main loop.",
                "module.clearBulkCache();",
                ctx -> callsMethod(ctx, "clearBulkCache")),
            Rules.improvement("Loop Hz measured",
                "Display measured loop frequency in telemetry.",
                "telemetry.addData(\"Loop Hz\", hz);",
                ctx -> sourceContains(ctx, Pattern.compile("Hz|hz|loopCount"))
                       && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 16 — REV Touch Sensor Homing. */
    private static List<RubricRule> challenge16() {
        return Rules.of(
            Rules.required("TouchSensor declared",
                "Limit switch retrieved from hardwareMap.",
                "TouchSensor touchSensor = hardwareMap.get(TouchSensor.class, \"touch_sensor\");",
                ctx -> declaresField(ctx, "TouchSensor")),
            Rules.required("Homing loop until pressed",
                "Drive slowly until isPressed() returns true.",
                "while (!touchSensor.isPressed() && opModeIsActive()) { ... }",
                ctx -> callsMethod(ctx, "isPressed")),
            Rules.required("Encoder reset at home",
                "Zero encoder when the limit triggers.",
                "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
                ctx -> sourceContains(ctx, Pattern.compile("STOP_AND_RESET_ENCODER"))),
            Rules.improvement("Motor stopped at limit",
                "Cut power immediately when the sensor fires.",
                "motor.setPower(0);",
                ctx -> sourceContains(ctx, ZERO_POWER))
        );
    }

    /** Challenge 17 — Basic 4-Motor Mecanum. */
    private static List<RubricRule> challenge17() {
        return Rules.of(
            Rules.required("Four motors initialized",
                "All four mecanum wheels retrieved from hardwareMap.",
                "frontLeft, frontRight, backLeft, backRight",
                ctx -> TreeHelpers.countMethodCalls(ctx, "get") >= 4),
            Rules.required("Left side reversed",
                "Reverse left-side motors for mirrored mounting.",
                "frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);",
                ctx -> sourceContains(ctx, REVERSE_DIRECTION)),
            Rules.required("Three sticks read",
                "Drive, strafe, and rotate from gamepad.",
                "gamepad1.left_stick_y, left_stick_x, right_stick_x",
                ctx -> sourceContains(ctx, Pattern.compile("left_stick_y"))
                       && sourceContains(ctx, Pattern.compile("left_stick_x"))
                       && sourceContains(ctx, Pattern.compile("right_stick_x"))),
            Rules.required("Four setPower() calls",
                "Each wheel powered independently.",
                "frontLeft.setPower(...); ... backRight.setPower(...);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "setPower") >= 4),
            Rules.improvement("Power normalization",
                "Scale powers so max absolute value is 1.0.",
                "double max = Math.max(Math.abs(fl), ...);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max|Math\\.abs")))
        );
    }

    /** Challenge 18 — Mecanum Power Normalization. */
    private static List<RubricRule> challenge18() {
        return Rules.of(
            Rules.required("normalize() helper declared",
                "Encapsulate scaling logic in a reusable method.",
                "private double[] normalize(double fl, double fr, double bl, double br) { ... }",
                ctx -> declaresMethod(ctx, "normalize")),
            Rules.required("Max absolute value found",
                "Find the largest wheel power magnitude.",
                "double max = Math.max(Math.abs(fl), ...);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max"))
                       && sourceContains(ctx, Pattern.compile("Math\\.abs"))),
            Rules.required("Helper called from loop",
                "Apply normalized powers each iteration.",
                "double[] powers = normalize(fl, fr, bl, br);",
                ctx -> callsMethod(ctx, "normalize")),
            Rules.improvement("Scale only when max > 1",
                "Divide by max only when exceeding motor range.",
                "if (max > 1.0) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("max\\s*>\\s*1")))
        );
    }

    /** Challenge 19 — Field-Relative Mecanum. */
    private static List<RubricRule> challenge19() {
        return Rules.of(
            Rules.required("Rotation matrix applied",
                "Rotate drive/strafe by heading using sin/cos.",
                "rotX = x * Math.cos(-heading) - y * Math.sin(-heading);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.(sin|cos)"))),
            Rules.required("Four motors powered",
                "Mecanum formula applied to all wheels.",
                "frontLeft.setPower(...); backRight.setPower(...);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "setPower") >= 4),
            Rules.improvement("Raw and rotated vectors in telemetry",
                "Show both stick input and field-relative values.",
                "telemetry.addData(\"Rotated drive\", rotY);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 2)
        );
    }

    /** Challenge 20 — Mecanum Strafing Test. */
    private static List<RubricRule> challenge20() {
        return Rules.of(
            Rules.required("Four motors configured",
                "All mecanum wheels initialized with directions.",
                "setDirection() on left-side motors",
                ctx -> TreeHelpers.countMethodCalls(ctx, "get") >= 4),
            Rules.required("Strafe power applied",
                "Mecanum strafe uses left_stick_x or fixed strafe value.",
                "strafe = gamepad1.left_stick_x;",
                ctx -> sourceContains(ctx, Pattern.compile("left_stick_x|strafe"))),
            Rules.required("Timed strafe segments",
                "Use sleep() between strafe directions.",
                "sleep(1000);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "sleep") >= 2),
            Rules.improvement("Motors stopped at end",
                "All wheels set to zero power after test.",
                "motor.setPower(0);",
                ctx -> sourceContains(ctx, ZERO_POWER))
        );
    }

    /** Challenge 21 — Velocity-Magnitude Braking. */
    private static List<RubricRule> challenge21() {
        return Rules.of(
            Rules.required("Input magnitude computed",
                "Combine drive and strafe with sqrt or hypot.",
                "double magnitude = Math.hypot(drive, strafe);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.sqrt|Math\\.hypot"))),
            Rules.required("Deadband applied",
                "Zero motors when stick input is below threshold.",
                "if (magnitude < 0.05) { ... setPower(0); }",
                ctx -> sourceContains(ctx, Pattern.compile("0\\.05|DEADBAND|deadband"))),
            Rules.improvement("Magnitude shown in telemetry",
                "Display input magnitude for tuning.",
                "telemetry.addData(\"Magnitude\", magnitude);",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 22 — DcMotorEx Velocity Control. */
    private static List<RubricRule> challenge22() {
        return Rules.of(
            Rules.required("DcMotorEx declared",
                "Velocity control requires DcMotorEx, not DcMotor.",
                "DcMotorEx shooter = hardwareMap.get(DcMotorEx.class, \"shooter\");",
                ctx -> declaresField(ctx, "DcMotorEx")),
            Rules.required("setVelocity() called",
                "Velocity (ticks/sec) commanded via setVelocity.",
                "shooter.setVelocity(1500);",
                ctx -> callsMethod(ctx, "setVelocity")),
            Rules.required("RUN_USING_ENCODER set before setVelocity",
                "setVelocity() needs the motor in RUN_USING_ENCODER mode.",
                "shooter.setMode(DcMotor.RunMode.RUN_USING_ENCODER);",
                ctx -> sourceContains(ctx, RUN_USING_ENCODER)),
            Rules.improvement("getVelocity() shown in telemetry",
                "Current velocity displayed for tuning.",
                "telemetry.addData(\"Vel\", shooter.getVelocity());",
                ctx -> callsMethod(ctx, "getVelocity"))
        );
    }

    /** Challenge 23 — Simple P Controller. */
    private static List<RubricRule> challenge23() {
        return Rules.of(
            Rules.required("Error term computed (target - current)",
                "Sign convention matters — error must be target - current.",
                "int error = targetPosition - currentPosition;",
                ctx -> sourceContains(ctx, Pattern.compile(
                    "(?:target|setpoint|goal)\\w*\\s*-\\s*"
                    + "(?:current\\w*|measured\\w*|actual\\w*|\\bpos\\b|getCurrentPosition\\s*\\()"))),
            Rules.required("Proportional gain applied",
                "Multiply error by Kp.",
                "double power = Kp * error;",
                ctx -> sourceContains(ctx, Pattern.compile("\\bKp\\b\\s*\\*\\s*error|\\berror\\b\\s*\\*\\s*Kp"))),
            Rules.required("Output clamped",
                "Math.max/Math.min keep power within motor range.",
                "power = Math.max(-0.8, Math.min(0.8, power));",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max[\\s\\S]*Math\\.min|Range\\.clip"))),
            Rules.improvement("Telemetry shows error and power",
                "Tuning a P-controller needs live values.",
                "telemetry.addData(\"err\", error); telemetry.addData(\"power\", power);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 2)
        );
    }

    /** Challenge 24 — Encoder Ticks to Degrees. */
    private static List<RubricRule> challenge24() {
        return Rules.of(
            Rules.required("ticksToDegrees() helper",
                "Convert encoder ticks to degrees.",
                "private double ticksToDegrees(int ticks) { return ticks * 360.0 / (TICKS_PER_REV * GEAR_RATIO); }",
                ctx -> declaresMethod(ctx, "ticksToDegrees")),
            Rules.required("Calibration constants defined",
                "TICKS_PER_REV and gear ratio declared.",
                "static final double TICKS_PER_REV = 537.7;",
                ctx -> sourceContains(ctx, Pattern.compile("TICKS_PER_REV|537\\.7"))),
            Rules.required("Helper used in loop",
                "Display degrees converted from encoder ticks.",
                "double degrees = ticksToDegrees(motor.getCurrentPosition());",
                ctx -> callsMethod(ctx, "ticksToDegrees")),
            Rules.improvement("Both ticks and degrees in telemetry",
                "Show raw ticks and converted degrees.",
                "telemetry.addData(\"Degrees\", degrees);",
                ctx -> callsMethod(ctx, "getCurrentPosition") && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 25 — Flywheel TPS Calibration. */
    private static List<RubricRule> challenge25() {
        return Rules.of(
            Rules.required("Calibration tables defined",
                "Parallel DIST_TABLE and TPS_TABLE arrays.",
                "private static final double[] DIST_TABLE = { ... };",
                ctx -> sourceContains(ctx, Pattern.compile("DIST_TABLE"))
                       && sourceContains(ctx, Pattern.compile("TPS_TABLE"))),
            Rules.required("Interpolation helper",
                "Map distance to TPS with bracket search.",
                "private double interpolateTPS(double distanceIn) { ... }",
                ctx -> declaresMethod(ctx, "interpolateTPS")),
            Rules.improvement("Interpolated TPS displayed",
                "Show distance and computed TPS in telemetry.",
                "telemetry.addData(\"TPS\", interpolateTPS(distance));",
                ctx -> callsMethod(ctx, "interpolateTPS") && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 26 — PIDF Velocity Loop. */
    private static List<RubricRule> challenge26() {
        return Rules.of(
            Rules.required("Velocity error computed",
                "Error is target TPS minus measured velocity.",
                "double error = targetTps - shooter.getVelocity();",
                ctx -> sourceContains(ctx, Pattern.compile("getVelocity\\s*\\("))
                       && sourceContains(ctx, Pattern.compile("\\berror\\b"))),
            Rules.required("PIDF gains used",
                "Proportional, integral, derivative, and feedforward terms.",
                "Kp, Ki, Kd, and Kf referenced in power calculation.",
                ctx -> sourceContains(ctx, Pattern.compile("\\bKp\\b"))
                       && sourceContains(ctx, Pattern.compile("\\bKi\\b"))
                       && sourceContains(ctx, Pattern.compile("\\bKd\\b"))
                       && sourceContains(ctx, Pattern.compile("\\bKf\\b"))),
            Rules.required("Output clamped to [0, 1]",
                "Flywheel power clamped for one-direction spin.",
                "power = Math.max(0.0, Math.min(1.0, power));",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max[\\s\\S]*Math\\.min"))),
            Rules.improvement("PIDF terms in telemetry",
                "Display each term for tuning.",
                "telemetry.addData(\"P term\", pTerm);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 3)
        );
    }

    /** Challenge 27 — Loop Frequency Measurement. */
    private static List<RubricRule> challenge27() {
        return Rules.of(
            Rules.required("Loop counter incremented",
                "Count iterations each frame.",
                "loopCount++;",
                ctx -> sourceContains(ctx, Pattern.compile("\\+\\+|loopCount\\s*=\\s*loopCount\\s*\\+"))),
            Rules.required("ElapsedTime gates Hz calculation",
                "Recompute Hz about once per second.",
                "if (hzTimer.seconds() >= 1.0) { ... hzTimer.reset(); }",
                ctx -> instantiates(ctx, "ElapsedTime")
                       && sourceContains(ctx, Pattern.compile("Hz|loopCount|seconds\\s*\\(\\s*\\)\\s*>="))),
            Rules.improvement("Hz and loop time in telemetry",
                "Show Hz, average ms per loop, and total count.",
                "telemetry.addData(\"Loop Hz\", hz);",
                ctx -> sourceContains(ctx, Pattern.compile("Hz|ms"))
                       && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 28 — Button-Latch Shooting. */
    private static List<RubricRule> challenge28() {
        return Rules.of(
            Rules.required("Latch booleans declared",
                "Track shootingLatched and shooterReady state.",
                "boolean shootingLatched = false; boolean shooterReady = false;",
                ctx -> sourceContains(ctx, Pattern.compile("shootingLatched|latched"))
                       && sourceContains(ctx, Pattern.compile("shooterReady|ready"))),
            Rules.required("Feeder motor controlled by latch",
                "Transfer/feeder motor runs only when latched and firing.",
                "feederMotor.setPower(shootingLatched ? 1.0 : 0.0);",
                ctx -> callsMethod(ctx, "setPower")),
            Rules.improvement("Latch state in telemetry",
                "Show latch, readiness, and feeder status.",
                "telemetry.addData(\"Latched\", shootingLatched);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 2)
        );
    }

    /** Challenge 29 — Turret Zeroing State Machine. */
    private static List<RubricRule> challenge29() {
        return Rules.of(
            Rules.required("State enum declared",
                "Turret uses IDLE and ZEROING states.",
                "enum TurretState { IDLE, ZEROING }",
                ctx -> sourceContains(ctx, Pattern.compile("enum\\s+\\w+"))
                       && sourceContains(ctx, Pattern.compile("IDLE|ZEROING"))),
            Rules.required("switch on state",
                "State machine uses switch(state) or if/else branches.",
                "switch (state) { case ZEROING: ... }",
                ctx -> sourceContains(ctx, Pattern.compile("switch\\s*\\(\\s*\\w*[Ss]tate"))),
            Rules.required("Touch sensor ends zeroing",
                "Transition to IDLE when limit switch triggers.",
                "if (limitSwitch.isPressed()) state = TurretState.IDLE;",
                ctx -> callsMethod(ctx, "isPressed")),
            Rules.improvement("Encoder reset after homing",
                "Zero encoder when homing completes.",
                "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
                ctx -> sourceContains(ctx, Pattern.compile("STOP_AND_RESET_ENCODER")))
        );
    }

    /** Challenge 30 — Autonomous State Machine. */
    private static List<RubricRule> challenge30() {
        return Rules.of(
            Rules.required("Multi-state enum",
                "Autonomous sequence uses named states.",
                "enum State { DRIVE_TO_SHOOT, SHOOTING, DRIVE_TO_COLLECT, DONE }",
                ctx -> sourceContains(ctx, Pattern.compile("enum\\s+\\w+"))
                       && sourceContains(ctx, Pattern.compile("DONE|SHOOT|COLLECT"))),
            Rules.required("ElapsedTime per state",
                "Timer drives state transitions.",
                "stateTimer.reset(); if (stateTimer.seconds() > ...) { next state }",
                ctx -> instantiates(ctx, "ElapsedTime") && callsMethod(ctx, "reset")),
            Rules.required("Motors stopped in DONE",
                "All drive motors zeroed in final state.",
                "case DONE: leftDrive.setPower(0);",
                ctx -> sourceContains(ctx, ZERO_POWER)),
            Rules.improvement("@Autonomous annotation",
                "Register as an autonomous OpMode.",
                "@Autonomous(name = \"State Machine Auto\")",
                ctx -> TreeHelpers.hasAnnotation(ctx, "Autonomous"))
        );
    }

    /** Challenge 31 — Multi-Shot Cycling. */
    private static List<RubricRule> challenge31() {
        return Rules.of(
            Rules.required("Remaining cycles tracked",
                "Counter decrements after each shot.",
                "remainingCycles--;",
                ctx -> sourceContains(ctx, Pattern.compile("remainingCycles|--"))),
            Rules.required("State machine with shot states",
                "TO_HUMAN, SHOOT, and LEAVE states present.",
                "enum State { TO_HUMAN, SHOOT, LEAVE, DONE }",
                ctx -> sourceContains(ctx, Pattern.compile("SHOOT|TO_HUMAN|LEAVE"))),
            Rules.required("Dpad adjusts cycle count in init",
                "Configure 1–8 cycles before start.",
                "if (gamepad1.dpad_up) remainingCycles++;",
                ctx -> sourceContains(ctx, Pattern.compile("dpad_up|dpad_down"))),
            Rules.improvement("Cycles shown in telemetry",
                "Display remaining cycles during the match.",
                "telemetry.addData(\"Cycles left\", remainingCycles);",
                ctx -> sourceContains(ctx, Pattern.compile("remainingCycles"))
                       && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 32 — TeleOp Mode Switching. */
    private static List<RubricRule> challenge32() {
        return Rules.of(
            Rules.required("safeMode flag declared",
                "Boolean tracks reduced-power safe mode.",
                "boolean safeMode = false;",
                ctx -> sourceContains(ctx, Pattern.compile("safeMode"))),
            Rules.required("B enters safe mode",
                "Debounced B button enables safe mode.",
                "if (gamepad1.b && !lastB) safeMode = true;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.b"))),
            Rules.required("Y exits safe mode",
                "Y button disables safe mode.",
                "if (gamepad1.y) safeMode = false;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.y"))),
            Rules.improvement("Power capped in safe mode",
                "Limit motor power to 50% when safeMode is true.",
                "power = safeMode ? power * 0.5 : power;",
                ctx -> sourceContains(ctx, Pattern.compile("safeMode"))
                       && sourceContains(ctx, Pattern.compile("0\\.5|50")))
        );
    }

    /** Challenge 33 — Pythagorean Distance to Goal. */
    private static List<RubricRule> challenge33() {
        return Rules.of(
            Rules.required("distanceToGoal() helper",
                "Compute distance with Math.hypot(dx, dy).",
                "return Math.hypot(goalX - x, goalY - y);",
                ctx -> declaresMethod(ctx, "distanceToGoal")),
            Rules.required("Goal coordinates defined",
                "Goal position constants in mm or inches.",
                "private static final double GOAL_X = 72 * 25.4;",
                ctx -> sourceContains(ctx, Pattern.compile("GOAL_X|goalX"))),
            Rules.required("Helper called from loop",
                "Display live distance to goal.",
                "double dist = distanceToGoal(robotX, robotY);",
                ctx -> callsMethod(ctx, "distanceToGoal")),
            Rules.improvement("Position and distance in telemetry",
                "Show robot position and distance to goal.",
                "telemetry.addData(\"Distance (mm)\", dist);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 2)
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Challenges 34–38 — math / odometry (must match challenges.ts titles)
    // ──────────────────────────────────────────────────────────────────────

    /** Challenge 34 — atan2 Turret Bearing. */
    private static List<RubricRule> challenge34() {
        return Rules.of(
            Rules.required("Math.atan2 bearing computed",
                "Field bearing uses atan2 on dy and dx.",
                "double fieldBearing = Math.toDegrees(Math.atan2(dy, dx));",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.atan2\\s*\\("))),
            Rules.required("Goal delta computed",
                "Compute dx and dy from goal minus robot position.",
                "double dx = GOAL_X - robotX; double dy = GOAL_Y - robotY;",
                ctx -> sourceContains(ctx, Pattern.compile("\\bdx\\b"))
                       && sourceContains(ctx, Pattern.compile("\\bdy\\b"))),
            Rules.required("Turret angle relative to heading",
                "Subtract robot heading from field bearing.",
                "double turretAngle = fieldBearing - robotHeading;",
                ctx -> sourceContains(ctx, Pattern.compile("turretAngle|turret"))
                       && sourceContains(ctx, Pattern.compile("-\\s*robotHeading|robotHeading\\s*-"))),
            Rules.required("Angle wrapped to [-180, 180]",
                "Wrap turret angle so corrections take the shortest path.",
                "while (turretAngle > 180) turretAngle -= 360;",
                ctx -> sourceContains(ctx, Pattern.compile(">\\s*180\\).*360|<\\s*-180\\).*360"))),
            Rules.improvement("Bearing values in telemetry",
                "Show field bearing and turret angle on the Driver Station.",
                "telemetry.addData(\"Field Bearing\", fieldBearingDeg);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 3)
        );
    }

    /** Challenge 35 — Alliance Coordinate Mirror. */
    private static List<RubricRule> challenge35() {
        return Rules.of(
            Rules.required("Field width constant",
                "FIELD_MM defined as 144 * 25.4 mm.",
                "private static final double FIELD_MM = 144.0 * 25.4;",
                ctx -> sourceContains(ctx, Pattern.compile("FIELD_MM|144\\.0\\s*\\*\\s*25\\.4"))),
            Rules.required("mirrorX() helper implemented",
                "Mirror blue X coordinates across the field center.",
                "private double mirrorX(double x) { return FIELD_MM - x; }",
                ctx -> declaresMethod(ctx, "mirrorX")
                       && sourceContains(ctx, Pattern.compile("FIELD_MM\\s*-\\s*x"))),
            Rules.required("mirrorX() applied to coordinates",
                "Convert BLUE X values to RED with mirrorX().",
                "double redShotX = mirrorX(BLUE_SHOT_X);",
                ctx -> callsMethod(ctx, "mirrorX")),
            Rules.improvement("Both alliances shown in telemetry",
                "Display BLUE and RED coordinate sections.",
                "telemetry.addLine(\"=== RED ===\");",
                ctx -> sourceContains(ctx, Pattern.compile("BLUE"))
                       && sourceContains(ctx, Pattern.compile("RED")))
        );
    }

    /** Challenge 36 — Degrees ↔ Radians Conversion. */
    private static List<RubricRule> challenge36() {
        return Rules.of(
            Rules.required("toRadians() helper implemented",
                "Convert degrees to radians with Math.PI / 180.",
                "return degrees * Math.PI / 180.0;",
                ctx -> declaresMethod(ctx, "toRadians")
                       && sourceContains(ctx, Pattern.compile("toRadians[^{]*\\{[^}]*Math\\.PI\\s*/\\s*180"))),
            Rules.required("toDegrees() helper implemented",
                "Convert radians to degrees with 180 / Math.PI.",
                "return radians * 180.0 / Math.PI;",
                ctx -> declaresMethod(ctx, "toDegrees")
                       && sourceContains(ctx, Pattern.compile("toDegrees[^{]*\\{[^}]*180[^}]*Math\\.PI"))),
            Rules.required("Conversion helpers used",
                "Call toRadians and toDegrees from runOpMode.",
                "double rad = toRadians(deg); double back = toDegrees(rad);",
                ctx -> callsMethod(ctx, "toRadians") && callsMethod(ctx, "toDegrees")),
            Rules.improvement("Round-trip verification",
                "Convert back to degrees to verify accuracy.",
                "double roundTrip = toDegrees(toRadians(90));",
                ctx -> sourceContains(ctx, Pattern.compile("toDegrees\\s*\\(\\s*toRadians")))
        );
    }

    /** Challenge 37 — GoBilda Pinpoint Odometry. */
    private static List<RubricRule> challenge37() {
        return Rules.of(
            Rules.required("GoBildaPinpointDriver declared",
                "Retrieve Pinpoint from hardwareMap.",
                "odo = hardwareMap.get(GoBildaPinpointDriver.class, \"odo\");",
                ctx -> declaresField(ctx, "GoBildaPinpointDriver")),
            Rules.required("Pod offsets configured",
                "setOffsets() with X/Y mm from robot center.",
                "odo.setOffsets(-84.0, -168.0);",
                ctx -> callsMethod(ctx, "setOffsets")),
            Rules.required("Encoder resolution set",
                "Configure goBILDA pod resolution before tracking.",
                "odo.setEncoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD);",
                ctx -> callsMethod(ctx, "setEncoderResolution")),
            Rules.required("Position reset at init",
                "resetPosAndIMU() zeros pose and calibrates IMU.",
                "odo.resetPosAndIMU();",
                ctx -> callsMethod(ctx, "resetPosAndIMU")),
            Rules.required("update() each loop",
                "Call update() before reading position each iteration.",
                "odo.update(); Pose2D pos = odo.getPosition();",
                ctx -> callsMethodInsideWhileLoop(ctx, "update")),
            Rules.improvement("Position telemetry",
                "Display X, Y, and heading from getPosition().",
                "telemetry.addData(\"X (mm)\", pos.getX(DistanceUnit.MM));",
                ctx -> callsMethod(ctx, "getPosition") && callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 38 — Field Position Reset. */
    private static List<RubricRule> challenge38() {
        return Rules.of(
            Rules.required("GoBildaPinpointDriver declared",
                "Pinpoint localizer configured for position reset.",
                "private GoBildaPinpointDriver odo;",
                ctx -> declaresField(ctx, "GoBildaPinpointDriver")),
            Rules.required("setPosition() called",
                "Re-anchor odometry to a known field pose.",
                "odo.setPosition(new Pose2D(DistanceUnit.MM, 72*25.4, 72*25.4, AngleUnit.DEGREES, 0));",
                ctx -> callsMethod(ctx, "setPosition")),
            Rules.required("Field center in millimeters",
                "Reset coordinates use 72 inches converted to mm.",
                "private static final double RESET_X_MM = 72 * 25.4;",
                ctx -> sourceContains(ctx, Pattern.compile("72\\s*\\*\\s*25\\.4"))),
            Rules.required("X button debounced",
                "Rising-edge detection on gamepad1.x triggers reset.",
                "if (gamepad1.x && !lastX) { odo.setPosition(...); }",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.x"))
                       && sourceContains(ctx, Pattern.compile("&&\\s*!lastX|!lastX\\s*&&"))),
            Rules.improvement("Position shown after reset",
                "Telemetry displays pose from getPosition().",
                "telemetry.addData(\"X (mm)\", pos.getX(DistanceUnit.MM));",
                ctx -> callsMethod(ctx, "getPosition") && callsMethod(ctx, "addData"))
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Previously generic rubrics — challenges 35–36 section removed above
    // ──────────────────────────────────────────────────────────────────────

    /** Challenge 39 — Limelight3A Init & Read. */
    private static List<RubricRule> challenge39() {
        return Rules.of(
            Rules.required("Limelight3A declared",
                "Retrieve the Limelight from hardwareMap.",
                "limelight = hardwareMap.get(Limelight3A.class, \"limelight\");",
                ctx -> declaresField(ctx, "Limelight3A")),
            Rules.required("Pipeline started",
                "Switch to pipeline 0 and call start() before the match loop.",
                "limelight.pipelineSwitch(0); limelight.start();",
                ctx -> callsMethod(ctx, "pipelineSwitch") && callsMethod(ctx, "start")),
            Rules.required("Latest result polled",
                "Read frames each loop with getLatestResult().",
                "LLResult result = limelight.getLatestResult();",
                ctx -> callsMethod(ctx, "getLatestResult")),
            Rules.required("Targeting values read",
                "Read tx, ty, and ta from the Limelight result.",
                "double tx = result.getTx(); double ty = result.getTy(); double ta = result.getTa();",
                ctx -> callsMethod(ctx, "getTx")
                       && callsMethod(ctx, "getTy")
                       && callsMethod(ctx, "getTa")),
            Rules.improvement("Capture latency displayed",
                "Report getCaptureLatency() for frame timing diagnostics.",
                "telemetry.addData(\"Latency (ms)\", result.getCaptureLatency());",
                ctx -> callsMethod(ctx, "getCaptureLatency"))
        );
    }

    /** Challenge 40 — Stale Frame Detection. */
    private static List<RubricRule> challenge40() {
        return Rules.of(
            Rules.required("Limelight3A declared",
                "Limelight field configured for vision reads.",
                "limelight = hardwareMap.get(Limelight3A.class, \"limelight\");",
                ctx -> declaresField(ctx, "Limelight3A")),
            Rules.required("Latest result polled",
                "Read frames each loop with getLatestResult().",
                "LLResult result = limelight.getLatestResult();",
                ctx -> callsMethod(ctx, "getLatestResult")),
            Rules.required("Stale frame counter",
                "Increment a counter when consecutive frames match.",
                "if (stale) staleFrames++; else staleFrames = 0;",
                ctx -> sourceContains(ctx, Pattern.compile("staleFrames\\s*\\+|staleFrames\\s*=\\s*staleFrames\\s*\\+"))
                       && (sourceContains(ctx, Pattern.compile("getTx\\s*\\("))
                           || sourceContains(ctx, Pattern.compile("getTy\\s*\\("))
                           || sourceContains(ctx, Pattern.compile("getCaptureLatency\\s*\\("))))
        );
    }

    /** Challenge 41 — AprilTag fiducial extraction. */
    private static List<RubricRule> challenge41() {
        return Rules.of(
            Rules.required("Fiducial results retrieved",
                "Iterate the tag list from the Limelight result.",
                "List<...> tags = result.getFiducialResults();",
                ctx -> callsMethod(ctx, "getFiducialResults")),
            Rules.required("Tag ID filter",
                "Match a specific AprilTag by getFiducialId().",
                "if (tag.getFiducialId() == expectedTagId) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("getFiducialId\\s*\\("))),
            Rules.required("Horizontal offset extracted",
                "Read tx from the matched fiducial.",
                "tx = tag.getTargetXDegrees();",
                ctx -> sourceContains(ctx, Pattern.compile("getTargetXDegrees\\s*\\(")))
        );
    }

    /** Challenge 42 — tx-based turret correction. */
    private static List<RubricRule> challenge42() {
        return Rules.of(
            Rules.required("tx read from Limelight",
                "Horizontal error drives the correction.",
                "tx = result.getTx();",
                ctx -> callsMethod(ctx, "getTx")),
            Rules.required("Proportional correction",
                "Scale tx by Kp to produce motor power.",
                "correctionPower = Kp * tx;",
                ctx -> sourceContains(ctx, Pattern.compile("Kp\\s*\\*\\s*tx|tx\\s*\\*\\s*Kp"))),
            Rules.required("Turret motor powered",
                "Apply the correction to the turret motor.",
                "turretMotor.setPower(correctionPower);",
                ctx -> callsMethod(ctx, "setPower"))
        );
    }

    /** Challenge 43 — Poll Rate Cycling. */
    private static List<RubricRule> challenge43() {
        return Rules.of(
            Rules.required("Poll rate array defined",
                "Rates {100, 50, 25, 10} Hz available for cycling.",
                "int[] rates = {100, 50, 25, 10};",
                ctx -> sourceContains(ctx, Pattern.compile("\\{\\s*100\\s*,\\s*50\\s*,\\s*25\\s*,\\s*10\\s*\\}"))),
            Rules.required("setPollRateHz called",
                "Apply the selected rate to the Limelight.",
                "limelight.setPollRateHz(rates[rateIdx]);",
                ctx -> callsMethod(ctx, "setPollRateHz")),
            Rules.required("Y button cycles rate",
                "Rising edge on Y advances to the next rate.",
                "if (gamepad1.y && !lastY) rateIdx = (rateIdx + 1) % rates.length;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.y"))
                       && sourceContains(ctx, Pattern.compile("setPollRateHz\\s*\\(")))
        );
    }

    /** Challenge 44 — Pose Construction & Heading. */
    private static List<RubricRule> challenge44() {
        return Rules.of(
            Rules.required("Pose objects constructed",
                "Team field positions stored as Pose instances.",
                "Pose startPose = new Pose(64, 8.35, Math.toRadians(180));",
                ctx -> instantiates(ctx, "Pose")),
            Rules.required("Heading in radians",
                "Convert degrees to radians for the Pose constructor.",
                "Math.toRadians(180)",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.toRadians\\s*\\("))),
            Rules.required("Degrees display",
                "Show heading in human-readable degrees.",
                "Math.toDegrees(pose.getHeading())",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.toDegrees\\s*\\("))
                       && sourceContains(ctx, Pattern.compile("getHeading\\s*\\(")))
        );
    }

    /** Challenge 45 — BezierLine path follow. */
    private static List<RubricRule> challenge45() {
        return Rules.of(
            Rules.required("Follower used",
                "Pedro Follower drives the path.",
                "Follower follower = new Follower(hardwareMap);",
                ctx -> instantiates(ctx, "Follower")),
            Rules.required("BezierLine used",
                "Single straight segment uses BezierLine.",
                "new BezierLine(new Point(...), new Point(...))",
                ctx -> instantiates(ctx, "BezierLine")),
            Rules.required("Constant heading interpolation",
                "Heading held constant along the segment.",
                ".setConstantHeadingInterpolation(startPose.getHeading())",
                ctx -> callsMethod(ctx, "setConstantHeadingInterpolation")),
            Rules.required("followPath + update loop",
                "Path execution requires followPath() and update() while busy.",
                "follower.followPath(path); while (follower.isBusy()) { follower.update(); }",
                ctx -> callsMethod(ctx, "followPath") && callsMethodInsideWhileLoop(ctx, "update"))
        );
    }

    /** Challenge 46 — BezierCurve tape detour. */
    private static List<RubricRule> challenge46() {
        return Rules.of(
            Rules.required("BezierCurve used",
                "Curved detour uses a BezierCurve with control points.",
                "new BezierCurve(new Point(...), new Point(...), new Point(...))",
                ctx -> instantiates(ctx, "BezierCurve")),
            Rules.required("Tangent heading interpolation set",
                "Path follows tangent of the curve.",
                ".setTangentHeadingInterpolation()",
                ctx -> callsMethod(ctx, "setTangentHeadingInterpolation")),
            Rules.required("Follower updates inside loop",
                "Follower must tick every iteration while moving.",
                "follower.update() inside the while loop.",
                ctx -> callsMethodInsideWhileLoop(ctx, "update"))
        );
    }

    /** Challenge 47 — Reversed path. */
    private static List<RubricRule> challenge47() {
        return Rules.of(
            Rules.required("BezierLine used",
                "Return path built as a straight segment.",
                "new BezierLine(new Point(...), new Point(...))",
                ctx -> instantiates(ctx, "BezierLine")),
            Rules.required("Path reversed",
                "Robot drives backward along the segment.",
                ".setReversed(true)",
                ctx -> callsMethod(ctx, "setReversed")),
            Rules.required("Linear heading interpolation",
                "Heading blends between start and end.",
                ".setLinearHeadingInterpolation(startHeading, endHeading)",
                ctx -> callsMethod(ctx, "setLinearHeadingInterpolation"))
        );
    }

    /** Challenge 48 — Dynamic Path Building. */
    private static List<RubricRule> challenge48() {
        return Rules.of(
            Rules.required("Dynamic path helper",
                "Helper builds a path from the follower's current pose.",
                "private PathChain buildPathTo(Pose target, boolean reversed) { ... }",
                ctx -> (declaresMethod(ctx, "buildPathTo") || declaresMethod(ctx, "followTo"))
                       && sourceContains(ctx, Pattern.compile("getPose\\s*\\("))),
            Rules.required("BezierLine in helper",
                "Segment connects current position to the target.",
                "new BezierLine(new Point(current, Point.POSE), new Point(target, Point.POSE))",
                ctx -> instantiates(ctx, "BezierLine")),
            Rules.required("Multiple path segments",
                "Chain at least three waypoint moves.",
                "Call the helper (or followPath) for each leg of the route.",
                ctx -> TreeHelpers.countMethodCalls(ctx, "followPath") >= 3
                       || TreeHelpers.countMethodCalls(ctx, "followTo") >= 3)
        );
    }

    /** Challenge 49 — Unit Conversion. */
    private static List<RubricRule> challenge49() {
        return Rules.of(
            Rules.required("inchesToMm implemented",
                "Multiply inches by 25.4 to convert to millimeters.",
                "return inches * 25.4;",
                ctx -> declaresMethod(ctx, "inchesToMm")
                       && sourceContains(ctx, Pattern.compile("inchesToMm[^{]*\\{[^}]*25\\.4"))
                       && !sourceContains(ctx, Pattern.compile("inchesToMm[^{]*\\{\\s*return\\s+0\\s*;"))),
            Rules.required("mmToInches implemented",
                "Divide millimeters by 25.4 to convert to inches.",
                "return mm / 25.4;",
                ctx -> declaresMethod(ctx, "mmToInches")
                       && sourceContains(ctx, Pattern.compile("mmToInches[^{]*\\{[^}]*\\/\\s*25\\.4"))
                       && !sourceContains(ctx, Pattern.compile("mmToInches[^{]*\\{\\s*return\\s+0\\s*;"))),
            Rules.improvement("Conversion helpers called in loop",
                "Apply helpers to field dimensions in telemetry.",
                "double fieldMm = inchesToMm(FIELD_INCHES);",
                ctx -> callsMethod(ctx, "inchesToMm") && callsMethod(ctx, "mmToInches"))
        );
    }

    /** Challenge 50 — Vector dot product. */
    private static List<RubricRule> challenge50() {
        return Rules.of(
            Rules.required("dot() helper implemented",
                "2D dot product: ax*bx + ay*by.",
                "return ax * bx + ay * by;",
                ctx -> declaresMethod(ctx, "dot")
                       && sourceContains(ctx, Pattern.compile("dot[^{]*\\{[^}]*\\*[^}]*\\+"))
                       && !sourceContains(ctx, Pattern.compile("dot[^{]*\\{\\s*return\\s+0\\s*;"))),
            Rules.required("dot() used in runOpMode",
                "Compute alignment from drive and reference vectors.",
                "double dotProduct = dot(driveX, driveY, refX, refY);",
                ctx -> callsMethod(ctx, "dot"))
        );
    }

    /** Challenge 51 — Linear Interpolation. */
    private static List<RubricRule> challenge51() {
        return Rules.of(
            Rules.required("lerp() helper implemented",
                "Linear blend: a + t * (b - a).",
                "return a + t * (b - a);",
                ctx -> declaresMethod(ctx, "lerp")
                       && sourceContains(ctx, Pattern.compile("lerp[^{]*\\{[^}]*\\+[^}]*\\*"))
                       && !sourceContains(ctx, Pattern.compile("lerp[^{]*\\{\\s*return\\s+0\\s*;"))),
            Rules.required("ElapsedTime drives ramp",
                "Timer computes t over the ramp duration.",
                "ElapsedTime timer = new ElapsedTime(); double t = elapsed / RAMP_DURATION;",
                ctx -> instantiates(ctx, "ElapsedTime") && callsMethod(ctx, "lerp"))
        );
    }

    /** Challenge 52 — Projectile Distance from TPS. */
    private static List<RubricRule> challenge52() {
        return Rules.of(
            Rules.required("tpsToDistance() helper",
                "Inverse lookup maps TPS back to distance.",
                "private double tpsToDistance(double tps) { ... }",
                ctx -> declaresMethod(ctx, "tpsToDistance")),
            Rules.required("Calibration tables used",
                "Search TPS_TABLE brackets and interpolate DIST_TABLE.",
                "for (int i = 0; i < TPS_TABLE.length - 1; i++) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("TPS_TABLE"))
                       && sourceContains(ctx, Pattern.compile("DIST_TABLE"))),
            Rules.required("Bracket interpolation",
                "Linearly interpolate between bracketing distances.",
                "double t = (tps - TPS_TABLE[i]) / (TPS_TABLE[i+1] - TPS_TABLE[i]);",
                ctx -> sourceContains(ctx, Pattern.compile("TPS_TABLE\\s*\\[\\s*i\\s*\\+\\s*1\\s*\\]"))
                       && !sourceContains(ctx, Pattern.compile("tpsToDistance[^{]*\\{\\s*return\\s+0\\s*;")))
        );
    }

    /** Challenge 53 — Robot velocity magnitude. */
    private static List<RubricRule> challenge53() {
        return Rules.of(
            Rules.required("DcMotorEx declared",
                "Velocity APIs require DcMotorEx.",
                "DcMotorEx forwardMotor = hardwareMap.get(DcMotorEx.class, ...);",
                ctx -> declaresField(ctx, "DcMotorEx")),
            Rules.required("getVelocity() called",
                "Read forward and strafe wheel speeds.",
                "double fwdTPS = forwardMotor.getVelocity();",
                ctx -> callsMethod(ctx, "getVelocity")),
            Rules.required("Speed magnitude computed",
                "Combine vx and vy with sqrt or hypot.",
                "double speed = Math.sqrt(vxMMs * vxMMs + vyMMs * vyMMs);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.sqrt\\s*\\(|Math\\.hypot\\s*\\(")))
        );
    }
}

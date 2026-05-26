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

    /** Challenge 5 — Pedro Pathing Multi-leg Path. */
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

    /** Challenge 6 — Tank Drive. */
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

    /** Challenge 7 — Servo Sweep. */
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

    /** Challenge 8 — CRServo Continuous Rotation. */
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

    /** Challenge 9 — IMU heading. */
    private static List<RubricRule> challenge9() {
        return Rules.of(
            Rules.required("IMU field declared",
                "An IMU instance is declared.",
                "IMU imu = hardwareMap.get(IMU.class, \"imu\");",
                ctx -> declaresField(ctx, "IMU")),
            Rules.required("IMU initialised",
                "imu.initialize(...) called before reading.",
                "imu.initialize(new IMU.Parameters(orientation));",
                ctx -> callsMethod(ctx, "initialize")),
            Rules.improvement("Heading telemetry",
                "Heading shown on the Driver Station for debugging.",
                "telemetry.addData(\"Heading\", heading);",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 10 — Strafing on Mecanum. */
    private static List<RubricRule> challenge10() {
        return Rules.of(
            Rules.required("Four DcMotor fields declared",
                "Mecanum drive needs four motors (FL, FR, BL, BR).",
                "Declare four DcMotor (or DcMotorEx) fields for the wheels.",
                ctx -> TreeHelpers.countMethodCalls(ctx, "get") >= 4
                       && (declaresField(ctx, "DcMotor") || declaresField(ctx, "DcMotorEx"))),
            Rules.required("All three sticks read",
                "x and y axes for translation, right_stick_x for rotation.",
                "Read gamepad1.left_stick_x, gamepad1.left_stick_y, gamepad1.right_stick_x.",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.left_stick_x"))
                       && sourceContains(ctx, Pattern.compile("gamepad1\\.left_stick_y"))
                       && sourceContains(ctx, Pattern.compile("gamepad1\\.right_stick_x"))),
            Rules.required("Four setPower() calls",
                "Each wheel is powered independently.",
                "fl.setPower(...); fr.setPower(...); bl.setPower(...); br.setPower(...);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "setPower") >= 4),
            Rules.improvement("Power normalisation",
                "Normalise wheel powers so the largest absolute value is 1.0.",
                "double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr), ...));",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max|Math\\.abs")))
        );
    }

    /** Challenge 11 — Button toggle with edge detection. */
    private static List<RubricRule> challenge11() {
        return Rules.of(
            Rules.required("Edge-detection boolean tracked",
                "A boolean (e.g. lastA) holds the previous button state.",
                "boolean lastA = false; if (gamepad1.a && !lastA) toggle();",
                ctx -> sourceContains(ctx, Pattern.compile("boolean\\s+\\w+\\s*="))
                       && sourceContains(ctx, Pattern.compile("&&\\s*!\\w+|!\\w+\\s*&&"))),
            Rules.required("Edge-detection variable updated at the END of the loop",
                "Update lastA = gamepad1.a after the check, not before.",
                "Place `lastA = gamepad1.a;` as the LAST line of the while body.",
                ctx -> {
                    // Best-effort: the assignment must appear AFTER the if-check line.
                    long ifLine = TreeHelpers.firstIdentifierLine(ctx, "gamepad1");
                    var updates = TreeHelpers.lineNumbersMatching(ctx,
                            Pattern.compile("\\w+\\s*=\\s*gamepad1\\.[abxy]"));
                    return ifLine < 0 || updates.isEmpty() || updates.get(updates.size() - 1) > ifLine;
                }),
            Rules.improvement("Toggle state stored",
                "A separate boolean (e.g. intakeRunning) flips on each press.",
                "if (gamepad1.a && !lastA) { intakeRunning = !intakeRunning; }",
                ctx -> sourceContains(ctx, Pattern.compile("=\\s*!\\w+")))
        );
    }

    /** Challenge 12 — Trigger-driven analog power. */
    private static List<RubricRule> challenge12() {
        return Rules.of(
            Rules.required("Trigger value read",
                "gamepad1.right_trigger or left_trigger used.",
                "double power = gamepad1.right_trigger;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.(?:left|right)_trigger"))),
            Rules.required("Trigger comparison uses a threshold (not == 1.0)",
                "Triggers are floats — `== 1.0` almost never fires.",
                "Use `gamepad1.right_trigger > 0.05` to detect any meaningful press.",
                ctx -> !sourceContains(ctx, Pattern.compile("trigger\\s*==\\s*1"))),
            Rules.improvement("Power passed to setPower()",
                "Trigger value drives motor power.",
                "motor.setPower(gamepad1.right_trigger);",
                ctx -> callsMethod(ctx, "setPower"))
        );
    }

    /** Challenge 13 — Telemetry dashboard. */
    private static List<RubricRule> challenge13() {
        return Rules.of(
            Rules.required("addData() called at least 3 times",
                "Multiple values shown for a useful dashboard.",
                "telemetry.addData(\"Power\", ...); telemetry.addData(\"Position\", ...);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 3),
            Rules.required("telemetry.update() called",
                "Without update() nothing is flushed to the screen.",
                "telemetry.update();",
                ctx -> callsMethod(ctx, "update")),
            Rules.improvement("Update inside the loop",
                "Refresh every iteration to see live values.",
                "Call telemetry.update() inside while(opModeIsActive()).",
                ctx -> callsMethodInsideWhileLoop(ctx, "update"))
        );
    }

    /** Challenge 14 — Field-centric driving (IMU). */
    private static List<RubricRule> challenge14() {
        return Rules.of(
            Rules.required("IMU declared and initialised",
                "Field-centric needs current heading from the IMU.",
                "IMU imu = hardwareMap.get(IMU.class, \"imu\");",
                ctx -> declaresField(ctx, "IMU") && callsMethod(ctx, "initialize")),
            Rules.required("Heading rotation applied",
                "Translate joystick vector by -heading using sin/cos.",
                "double rotX = x * Math.cos(-heading) - y * Math.sin(-heading);",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.(sin|cos)"))),
            Rules.improvement("Reset-yaw button",
                "Button (often start) resets the IMU yaw mid-match.",
                "if (gamepad1.options) imu.resetYaw();",
                ctx -> callsMethod(ctx, "resetYaw"))
        );
    }

    /** Challenge 15 — Drive distance with encoders. */
    private static List<RubricRule> challenge15() {
        return Rules.of(
            Rules.required("Encoder constants defined",
                "Ticks-per-rev and wheel diameter declared as constants.",
                "static final double TICKS_PER_REV = 537.7;",
                ctx -> sourceContains(ctx, Pattern.compile("static\\s+final\\s+(?:double|int)"))),
            Rules.required("RUN_TO_POSITION used",
                "Encoder-driven move requires RUN_TO_POSITION.",
                "motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);",
                ctx -> sourceContains(ctx, Pattern.compile("RUN_TO_POSITION"))),
            Rules.required("setTargetPosition() called",
                "Target tick count specified.",
                "motor.setTargetPosition(targetTicks);",
                ctx -> callsMethod(ctx, "setTargetPosition")),
            Rules.improvement("isBusy() wait loop",
                "Block until target reached.",
                "while (motor.isBusy() && opModeIsActive()) { idle(); }",
                ctx -> sourceContains(ctx, Pattern.compile("\\.isBusy\\s*\\(")))
        );
    }

    /** Challenge 16 — Servo claw open/close. */
    private static List<RubricRule> challenge16() {
        return Rules.of(
            Rules.required("Servo declared",
                "Claw uses a Servo (not CRServo).",
                "private Servo claw;",
                ctx -> declaresField(ctx, "Servo")),
            Rules.required("Two distinct setPosition values",
                "Open and close use different position values.",
                "claw.setPosition(OPEN); claw.setPosition(CLOSE);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "setPosition") >= 2),
            Rules.required("Button-driven open and close",
                "Two buttons (or one toggle) trigger open/close.",
                "if (gamepad1.a) claw.setPosition(OPEN); else if (gamepad1.b) claw.setPosition(CLOSE);",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.[abxy]")))
        );
    }

    /** Challenge 17 — Two timed segments (forward + reverse). */
    private static List<RubricRule> challenge17() {
        return Rules.of(
            Rules.required("ElapsedTime used",
                "Timer drives both segments.",
                "ElapsedTime timer = new ElapsedTime();",
                ctx -> instantiates(ctx, "ElapsedTime")),
            Rules.required("timer.reset() called between segments",
                "Without reset() the second segment uses time from the start of the OpMode.",
                "Call timer.reset() between segments.",
                ctx -> callsMethod(ctx, "reset")),
            Rules.required("Both forward and reverse power used",
                "Forward and reverse setPower values.",
                "setPower(0.5); ... setPower(-0.5);",
                ctx -> sourceContains(ctx, Pattern.compile("setPower\\(\\s*-\\s*\\d"))
                       && sourceContains(ctx, NON_ZERO_POWER)),
            Rules.required("Motors stopped between segments",
                "setPower(0) between forward and reverse halts the bot cleanly.",
                "setPower(0); timer.reset();",
                ctx -> sourceContains(ctx, ZERO_POWER))
        );
    }

    /** Challenge 18 — Touch-sensor-bounded arm. */
    private static List<RubricRule> challenge18() {
        return Rules.of(
            Rules.required("TouchSensor declared",
                "TouchSensor field is declared.",
                "TouchSensor limitSwitch = hardwareMap.get(TouchSensor.class, \"limit\");",
                ctx -> declaresField(ctx, "TouchSensor")),
            Rules.required("isPressed() consulted",
                "Sensor state checked before commanding motion.",
                "if (!limitSwitch.isPressed()) motor.setPower(0.5);",
                ctx -> callsMethod(ctx, "isPressed")),
            Rules.improvement("Telemetry shows sensor state",
                "Sensor reading shown on the Driver Station.",
                "telemetry.addData(\"Switch\", limitSwitch.isPressed());",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 19 — Color sensor. */
    private static List<RubricRule> challenge19() {
        return Rules.of(
            Rules.required("ColorSensor declared",
                "ColorSensor field is declared.",
                "ColorSensor color = hardwareMap.get(ColorSensor.class, \"color\");",
                ctx -> declaresField(ctx, "ColorSensor")),
            Rules.required("Color components read",
                "Read at least red/green/blue values.",
                "int r = color.red(); int g = color.green(); int b = color.blue();",
                ctx -> callsMethod(ctx, "red") || callsMethod(ctx, "green") || callsMethod(ctx, "blue"))
        );
    }

    /** Challenge 20 — Distance sensor + telemetry. */
    private static List<RubricRule> challenge20() {
        return Rules.of(
            Rules.required("DistanceSensor declared",
                "DistanceSensor field is declared.",
                "DistanceSensor dist = hardwareMap.get(DistanceSensor.class, \"dist\");",
                ctx -> declaresField(ctx, "DistanceSensor")),
            Rules.required("getDistance() called",
                "Distance read each loop.",
                "double cm = dist.getDistance(DistanceUnit.CM);",
                ctx -> callsMethod(ctx, "getDistance")),
            Rules.improvement("Distance shown via telemetry",
                "Sensor value surfaced on the dashboard.",
                "telemetry.addData(\"Dist\", cm);",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 21 — Two-button stateful intake. */
    private static List<RubricRule> challenge21() {
        return Rules.of(
            Rules.required("Two gamepad buttons read",
                "Different buttons control intake on / off.",
                "if (gamepad1.a) ...; if (gamepad1.b) ...;",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad1\\.a"))
                       && sourceContains(ctx, Pattern.compile("gamepad1\\.b"))),
            Rules.required("Intake motor or servo controlled",
                "setPower() commands the intake.",
                "intake.setPower(1.0); ... intake.setPower(0);",
                ctx -> callsMethod(ctx, "setPower"))
        );
    }

    /** Challenge 22 — Velocity-controlled shooter (DcMotorEx). */
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
                "shooter.setMode(DcMotor.RunMode.RUN_USING_ENCODER); before setVelocity(...).",
                ctx -> sourceContains(ctx, RUN_USING_ENCODER)),
            Rules.improvement("getVelocity() shown in telemetry",
                "Current velocity displayed for tuning.",
                "telemetry.addData(\"Vel\", shooter.getVelocity());",
                ctx -> callsMethod(ctx, "getVelocity"))
        );
    }

    /** Challenge 23 — Simple P-controller. */
    private static List<RubricRule> challenge23() {
        return Rules.of(
            Rules.required("Error term computed (target - current)",
                "Sign convention matters — error must be target - current.",
                "double error = target - current;",
                ctx -> sourceContains(ctx, Pattern.compile("(?:target|setpoint|goal)\\s*-\\s*(?:current|measured|actual|pos)"))),
            Rules.required("Proportional gain applied",
                "Multiply error by Kp.",
                "double power = Kp * error;",
                ctx -> sourceContains(ctx, Pattern.compile("\\bKp\\b\\s*\\*\\s*error|\\berror\\b\\s*\\*\\s*Kp"))),
            Rules.required("Output clamped to [-1, 1]",
                "Math.max/Math.min keep power within motor range.",
                "power = Math.max(-1.0, Math.min(1.0, power));",
                ctx -> sourceContains(ctx, Pattern.compile("Math\\.max[\\s\\S]*Math\\.min|Range\\.clip"))),
            Rules.improvement("Telemetry shows error and power",
                "Tuning a P-controller needs live values.",
                "telemetry.addData(\"err\", error); telemetry.addData(\"power\", power);",
                ctx -> TreeHelpers.countMethodCalls(ctx, "addData") >= 2)
        );
    }

    /** Challenge 24 — Spline + waypoint Road Runner auto. */
    private static List<RubricRule> challenge24() {
        return Rules.of(
            Rules.required("Trajectory built with splineTo()",
                "splineTo() creates curved segments.",
                ".splineTo(new Vector2d(36, 36), Math.PI / 2)",
                ctx -> callsMethod(ctx, "splineTo")),
            Rules.required("Multiple segments (>=2 splineTo)",
                "A waypoint path needs at least two segments.",
                "Chain at least two splineTo() calls.",
                ctx -> TreeHelpers.countMethodCalls(ctx, "splineTo") >= 2),
            Rules.required("Trajectory executed",
                "followTrajectorySequence() or Actions.runBlocking() runs the path.",
                "drive.followTrajectorySequence(seq); or Actions.runBlocking(action);",
                ctx -> callsMethod(ctx, "followTrajectorySequence") || callsMethod(ctx, "runBlocking"))
        );
    }

    /** Challenge 25 — Sleep-free wait via ElapsedTime. */
    private static List<RubricRule> challenge25() {
        return Rules.of(
            Rules.required("ElapsedTime drives the wait",
                "Wait implemented with timer.seconds(), not sleep().",
                "while (timer.seconds() < 1.0 && opModeIsActive()) { idle(); }",
                ctx -> instantiates(ctx, "ElapsedTime") && sourceContains(ctx, TIMER_SECONDS_CMP)),
            Rules.required("No sleep() used",
                "Replaces sleep() — the whole point of the challenge.",
                "Use the timer-based wait instead of sleep(ms).",
                ctx -> !callsMethod(ctx, "sleep"))
        );
    }

    /** Challenge 26 — Brake vs Float. */
    private static List<RubricRule> challenge26() {
        return Rules.of(
            Rules.required("setZeroPowerBehavior() called",
                "Explicit brake/float choice.",
                "motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
                ctx -> callsMethod(ctx, "setZeroPowerBehavior")),
            Rules.required("BRAKE value used",
                "Brake mode holds position when power is zero.",
                "DcMotor.ZeroPowerBehavior.BRAKE",
                ctx -> sourceContains(ctx, BRAKE_BEHAVIOR))
        );
    }

    /** Challenge 27 — Encoder-based velocity. */
    private static List<RubricRule> challenge27() {
        return Rules.of(
            Rules.required("DcMotorEx used for velocity",
                "DcMotor lacks getVelocity().",
                "DcMotorEx shooter = ...",
                ctx -> declaresField(ctx, "DcMotorEx")),
            Rules.required("getVelocity() called",
                "Measured velocity read each loop.",
                "double v = shooter.getVelocity();",
                ctx -> callsMethod(ctx, "getVelocity")),
            Rules.improvement("Telemetry shows velocity",
                "Live velocity helps tune.",
                "telemetry.addData(\"vel\", v);",
                ctx -> callsMethod(ctx, "addData"))
        );
    }

    /** Challenge 28 — Hardware initialisation pattern. */
    private static List<RubricRule> challenge28() {
        return Rules.of(
            Rules.required("hardwareMap.get() called BEFORE waitForStart()",
                "Hardware initialisation must happen before waitForStart().",
                "Move all hardwareMap.get(...) calls above waitForStart().",
                ctx -> {
                    long wait = TreeHelpers.firstCallLine(ctx, "waitForStart");
                    long get  = TreeHelpers.firstCallLine(ctx, "get");
                    return wait < 0 || get < 0 || get < wait;
                }),
            Rules.required("Status telemetry before waitForStart()",
                "An init telemetry message confirms the OpMode initialised.",
                "telemetry.addData(\"Status\", \"Ready\"); telemetry.update(); before waitForStart().",
                ctx -> {
                    long wait = TreeHelpers.firstCallLine(ctx, "waitForStart");
                    long upd  = TreeHelpers.firstCallLine(ctx, "update");
                    return wait < 0 || (upd > 0 && upd < wait);
                })
        );
    }

    /** Challenge 29 — Servo position presets. */
    private static List<RubricRule> challenge29() {
        return Rules.of(
            Rules.required("Servo declared",
                "Standard Servo type.",
                "private Servo arm;",
                ctx -> declaresField(ctx, "Servo")),
            Rules.required("Position constants declared",
                "Named constants (e.g. OPEN, CLOSE) for the preset positions.",
                "static final double OPEN = 0.0, CLOSE = 1.0;",
                ctx -> sourceContains(ctx, Pattern.compile("static\\s+final\\s+double")))
        );
    }

    /** Challenge 30 — Rumble feedback. */
    private static List<RubricRule> challenge30() {
        return Rules.of(
            Rules.required("rumble() called on a gamepad",
                "Force feedback via the gamepad.rumble API.",
                "gamepad1.rumble(500);",
                ctx -> callsMethod(ctx, "rumble"))
        );
    }

    /** Challenge 31 — Sequence of timed actions. */
    private static List<RubricRule> challenge31() {
        return Rules.of(
            Rules.required("ElapsedTime used",
                "Timer drives the sequence.",
                "ElapsedTime timer = new ElapsedTime();",
                ctx -> instantiates(ctx, "ElapsedTime")),
            Rules.required("Multiple timer.seconds() comparisons",
                "Each action segment uses its own time threshold.",
                "Chain `if (timer.seconds() < ...)` blocks or call timer.reset() between segments.",
                ctx -> TreeHelpers.lineNumbersMatching(ctx, TIMER_SECONDS_CMP).size() >= 2)
        );
    }

    /** Challenge 32 — Autonomous routine — no gamepad. */
    private static List<RubricRule> challenge32() {
        return Rules.of(
            Rules.required("@Autonomous annotation",
                "OpMode must be registered as Autonomous.",
                "@Autonomous(name = \"My Auto\")",
                ctx -> TreeHelpers.hasAnnotation(ctx, "Autonomous")),
            Rules.required("No gamepad reads",
                "Autonomous OpModes must not depend on driver input.",
                "Remove any gamepad1.* references — use timers, sensors, or encoders instead.",
                ctx -> !sourceContains(ctx, Pattern.compile("gamepad[12]\\."))),
            Rules.required("Either timer or encoder-based motion",
                "Autonomous needs deterministic motion.",
                "Use ElapsedTime, encoders, or sensors to control the path.",
                ctx -> instantiates(ctx, "ElapsedTime")
                       || sourceContains(ctx, Pattern.compile("RUN_TO_POSITION|RUN_USING_ENCODER"))
                       || callsMethod(ctx, "followTrajectorySequence")
                       || callsMethod(ctx, "followPath"))
        );
    }

    /** Challenge 33 — Loop safety: opModeIsActive(). */
    private static List<RubricRule> challenge33() {
        return Rules.of(
            Rules.required("while(opModeIsActive())",
                "Main loop condition must be opModeIsActive().",
                "while (opModeIsActive()) { ... }",
                TreeHelpers::hasOpModeIsActiveWhile),
            Rules.required("No while(true)",
                "while(true) makes the OpMode unstoppable.",
                "Use while(opModeIsActive()).",
                ctx -> !sourceContains(ctx, Pattern.compile("while\\s*\\(\\s*true\\s*\\)")))
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Generic rubrics for previously-uncovered challenges (34–48, 50, 52)
    // ──────────────────────────────────────────────────────────────────────

    /** Challenge 34 — TeleOp + Telemetry combo (basic). */
    private static List<RubricRule> challenge34() {
        return Rules.of(
            Rules.required("Gamepad read present",
                "Driver controls motors via the gamepad.",
                "Read gamepad1 stick or button values.",
                ctx -> sourceContains(ctx, Pattern.compile("gamepad[12]\\."))),
            Rules.required("Telemetry data sent",
                "Driver-station telemetry shows live status.",
                "telemetry.addData(...); telemetry.update();",
                ctx -> callsMethod(ctx, "addData") && callsMethod(ctx, "update"))
        );
    }

    /** Challenge 35 — Sleep helper for short auto. */
    private static List<RubricRule> challenge35() {
        return Rules.of(
            Rules.required("LinearOpMode sleep() used",
                "Use sleep(ms) — never Thread.sleep().",
                "sleep(500);",
                ctx -> callsMethod(ctx, "sleep")),
            Rules.required("Motor commands before sleep",
                "Set power, sleep to let the move happen, then stop.",
                "motor.setPower(0.5); sleep(800); motor.setPower(0);",
                ctx -> callsMethod(ctx, "setPower"))
        );
    }

    /** Challenge 36 — Multiple LED / digital outputs. */
    private static List<RubricRule> challenge36() {
        return Rules.of(
            Rules.required("Hardware get() calls present",
                "Outputs configured from hardwareMap.",
                "hardwareMap.get(...)",
                ctx -> callsMethod(ctx, "get"))
        );
    }

    /** Challenge 37 — REV Color/Range fusion. */
    private static List<RubricRule> challenge37() {
        return Rules.of(
            Rules.required("ColorSensor declared",
                "Sensor field configured.",
                "ColorSensor color = hardwareMap.get(...)",
                ctx -> declaresField(ctx, "ColorSensor") || declaresField(ctx, "DistanceSensor"))
        );
    }

    /** Challenge 38 — Use IMU for heading-hold. */
    private static List<RubricRule> challenge38() {
        return Rules.of(
            Rules.required("IMU declared",
                "IMU is the source of heading feedback.",
                "IMU imu = hardwareMap.get(IMU.class, \"imu\");",
                ctx -> declaresField(ctx, "IMU")),
            Rules.required("Heading polled each iteration",
                "Some method called inside the main loop produces heading.",
                "Call imu.getRobotYawPitchRollAngles() inside while(opModeIsActive()).",
                ctx -> callsMethodInsideWhileLoop(ctx, "getRobotYawPitchRollAngles")
                       || callsMethodInsideWhileLoop(ctx, "getAngularOrientation"))
        );
    }

    /** Challenge 39 — Custom subsystem class. */
    private static List<RubricRule> challenge39() {
        return Rules.of(
            Rules.required("Helper method declared",
                "Encapsulate behaviour in a method.",
                "private void driveForward(double power) { ... }",
                ctx -> sourceContains(ctx, Pattern.compile("(?m)^\\s*(?:private|public|protected)?\\s*\\w+\\s+\\w+\\s*\\([^)]*\\)\\s*\\{")))
        );
    }

    /** Challenge 40 — Stale frame detection (Limelight diagnostics). */
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

    /** Challenge 43 — Limelight poll rate cycling. */
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

    /** Challenge 44 — Pose construction and heading conversion. */
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

    /** Challenge 48 — Dynamic path building helper. */
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

    /** Challenge 49 — Unit conversion (inches ↔ mm). */
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

    /** Challenge 51 — Linear interpolation (lerp) ramp. */
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

    /** Challenge 52 — Projectile distance from TPS (inverse lookup). */
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

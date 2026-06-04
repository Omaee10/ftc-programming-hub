package com.ftchub.grader.rubric.universal;

import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.Rules;
import com.ftchub.grader.rubric.TreeHelpers;

import java.util.List;
import java.util.regex.Pattern;

import static com.ftchub.grader.rubric.TreeHelpers.callsMethod;
import static com.ftchub.grader.rubric.TreeHelpers.countMethodCalls;
import static com.ftchub.grader.rubric.TreeHelpers.extendsClass;
import static com.ftchub.grader.rubric.TreeHelpers.firstCallLine;
import static com.ftchub.grader.rubric.TreeHelpers.hasAnnotation;
import static com.ftchub.grader.rubric.TreeHelpers.hasOpModeIsActiveWhile;

/**
 * Checks applied to every submission, regardless of which challenge it
 * belongs to. These are the type-aware replacements for the {@code UNIVERSAL}
 * array in the legacy {@code codeValidator.ts}.
 */
public final class UniversalRules {

    private UniversalRules() {}

    private static final Pattern THREAD_SLEEP = Pattern.compile("Thread\\s*\\.\\s*sleep\\s*\\(");
    private static final Pattern WHILE_TRUE   = Pattern.compile("while\\s*\\(\\s*true\\s*\\)");
    private static final Pattern TODO_RX      = Pattern.compile("//\\s*TODO", Pattern.CASE_INSENSITIVE);
    private static final Pattern UPPERCASE_HW_NAME =
            Pattern.compile("hardwareMap\\.get\\(\\s*\\w+\\.class\\s*,\\s*\"[^\"]*[A-Z][^\"]*\"");
    private static final Pattern STICK_INPUT =
            Pattern.compile("gamepad1\\.(?:left|right)_stick_[xy]");
    private static final Pattern STICK_DEADZONE =
            Pattern.compile("(?i)deadband|deadzone|stickdeadzone|Math\\.abs\\s*\\([^)]+\\)\\s*[<>]=?\\s*0\\.|Range\\.clip");

    public static final List<RubricRule> ALL = List.of(

        // ── Required ──────────────────────────────────────────────────────
        Rules.required(
            "Extends LinearOpMode or OpMode",
            "Class declaration extends LinearOpMode or OpMode.",
            "Every FTC OpMode must extend LinearOpMode (sequential) or OpMode (iterative init/loop).",
            ctx -> extendsClass(ctx, "LinearOpMode") || extendsClass(ctx, "OpMode")
        ),

        Rules.required(
            "runOpMode() or init()/loop() defined",
            "LinearOpMode requires runOpMode(); iterative OpMode requires init() and loop().",
            "Add `public void runOpMode()` (LinearOpMode) or both `init()` and `loop()` (OpMode).",
            ctx -> {
                boolean linear = extendsClass(ctx, "LinearOpMode");
                boolean iter   = extendsClass(ctx, "OpMode") && !linear;
                if (linear) return TreeHelpers.declaresMethod(ctx, "runOpMode");
                if (iter)   return TreeHelpers.declaresMethod(ctx, "init") && TreeHelpers.declaresMethod(ctx, "loop");
                return TreeHelpers.declaresMethod(ctx, "runOpMode");
            }
        ),

        Rules.required(
            "waitForStart() called",
            "waitForStart() pauses execution until the driver presses Start.",
            "LinearOpMode: call waitForStart() once before your main loop.",
            ctx -> {
                // Iterative OpMode does not use waitForStart — exempt.
                if (extendsClass(ctx, "OpMode") && !extendsClass(ctx, "LinearOpMode")) return true;
                return callsMethod(ctx, "waitForStart");
            }
        ),

        Rules.requiredAbsent(
            "No while(true) loop",
            "while(true) prevents the FTC app from stopping the robot.",
            "Replace with `while (opModeIsActive())` so Stop actually stops the robot.",
            WHILE_TRUE
        ),

        Rules.requiredAbsent(
            "No Thread.sleep()",
            "Thread.sleep() ignores FTC stop requests; LinearOpMode.sleep() respects them.",
            "Use `sleep(ms)` from LinearOpMode instead of `Thread.sleep(ms)`.",
            THREAD_SLEEP
        ),

        Rules.required(
            "telemetry.update() in main loop",
            "telemetry.addData() inside while(opModeIsActive()) must call telemetry.update() in the same loop.",
            "Add telemetry.update() at the end of each loop iteration — an update before waitForStart() does not refresh loop data.",
            ctx -> {
                if (TreeHelpers.countTelemetryOutputsInsideWhileLoop(ctx) == 0) return true;
                return TreeHelpers.countMethodCallsInsideWhileLoop(ctx, "update") > 0;
            }
        ),

        Rules.requiredAbsent(
            "Lowercase hardware config names",
            "Robot configuration names in hardwareMap.get() are case-sensitive.",
            "Use lowercase snake_case like \"left_motor\" — \"Left_Motor\" will not match the config and returns null.",
            UPPERCASE_HW_NAME
        ),

        // ── Improvement ───────────────────────────────────────────────────
        Rules.improvement(
            "@TeleOp or @Autonomous annotation",
            "OpMode registered with @TeleOp or @Autonomous so it appears on the Driver Station.",
            "Add @TeleOp(name = \"My TeleOp\") or @Autonomous(name = \"My Auto\") above the class.",
            ctx -> hasAnnotation(ctx, "TeleOp") || hasAnnotation(ctx, "Autonomous")
        ),

        Rules.improvement(
            "opModeIsActive() guards the main loop",
            "while(opModeIsActive()) lets the referee stop the robot at any time.",
            "Wrap your driving code in `while (opModeIsActive()) { ... }`.",
            ctx -> hasOpModeIsActiveWhile(ctx) || !TreeHelpers.sourceContains(ctx, Pattern.compile("\\bwhile\\s*\\("))
        ),

        Rules.improvement(
            "telemetry.update() called",
            "telemetry.update() flushes buffered lines to the Driver Station.",
            "Call telemetry.update() after addData() — without it the screen never refreshes.",
            ctx -> {
                if (countMethodCalls(ctx, "addData") == 0
                    && countMethodCalls(ctx, "addLine") == 0) return true;
                return countMethodCalls(ctx, "update") > 0;
            }
        ),

        Rules.improvement(
            "Y-axis negated for drive",
            "FTC gamepad Y-axes are inverted — forward stick input must be negated.",
            "Use `-gamepad1.left_stick_y` so pushing forward gives positive motor power.",
            ctx -> {
                if (!TreeHelpers.sourceContains(ctx, Pattern.compile("gamepad1\\.left_stick_y"))) return true;
                if (!callsMethod(ctx, "setPower")) return true;
                return TreeHelpers.negatesStickAxis(ctx, "left_stick_y");
            }
        ),

        Rules.improvement(
            "Gamepad axis re-read every frame",
            "Gamepad axis (stick / trigger) must be read inside the main loop so the motor responds to each new input.",
            "Move the gamepad read (e.g. `double power = -gamepad1.left_stick_y;`) inside `while (opModeIsActive())`. "
                + "Reading it before the loop captures one snapshot — moving the joystick afterwards has no effect.",
            ctx -> !TreeHelpers.hasSetAndForgetPower(ctx)
        ),

        Rules.improvement(
            "Joystick deadzone applied",
            "Worn sticks can rest at 0.02 instead of 0.0 and creep the robot forward.",
            "Zero motor power when Math.abs(stick) is below a threshold (e.g. 0.05), or use a DEADBAND constant.",
            ctx -> {
                if (!TreeHelpers.sourceContains(ctx, STICK_INPUT)) return true;
                if (!callsMethod(ctx, "setPower")) return true;
                return TreeHelpers.sourceContains(ctx, STICK_DEADZONE);
            }
        ),

        Rules.improvement(
            "hardwareMap accessed inside runOpMode()",
            "Hardware devices must be retrieved from hardwareMap after the runtime initialises it.",
            "Move hardwareMap.get(...) calls inside runOpMode() — they crash if used at field-init time.",
            ctx -> {
                if (!callsMethod(ctx, "get")) return true; // nothing to check
                long runOpModeLine = TreeHelpers.firstIdentifierLine(ctx, "runOpMode");
                if (runOpModeLine < 0) return true;
                long firstGet = firstCallLine(ctx, "get");
                return firstGet < 0 || firstGet >= runOpModeLine;
            }
        ),

        Rules.improvementAbsent(
            "No leftover TODO comments",
            "Unresolved // TODO markers mean parts of the starter code haven't been filled in.",
            "Replace each // TODO comment with the actual implementation.",
            TODO_RX
        ),

        // ── Style ─────────────────────────────────────────────────────────
        Rules.style(
            "Motors explicitly stopped on exit",
            "setPower(0) at the end signals intent even though the runtime stops motors automatically.",
            "Add `motor.setPower(0)` after your main loop for clarity.",
            ctx -> {
                if (!callsMethod(ctx, "setPower")) return true;
                return TreeHelpers.sourceContains(ctx, Pattern.compile("\\.setPower\\s*\\(\\s*0(?:\\.0*)?\\s*\\)"));
            }
        )
    );
}

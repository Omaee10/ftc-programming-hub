package com.ftchub.grader.rubric.universal;

import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.Rules;
import com.ftchub.grader.rubric.TreeHelpers;

import java.util.List;
import java.util.regex.Pattern;

import static com.ftchub.grader.rubric.TreeHelpers.callsMethod;
import static com.ftchub.grader.rubric.TreeHelpers.callsMethodInsideWhileLoop;
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
                if (countMethodCalls(ctx, "addData") == 0) return true;
                return countMethodCalls(ctx, "update") > 0;
            }
        ),

        Rules.improvement(
            "hardwareMap accessed inside runOpMode()",
            "Hardware devices must be retrieved from hardwareMap after the runtime initialises it.",
            "Move hardwareMap.get(...) calls inside runOpMode() — they crash if used at field-init time.",
            ctx -> {
                if (!callsMethod(ctx, "get")) return true; // nothing to check
                // If there's a runOpMode body, the call must be inside it. We check
                // by line ordering: any hardwareMap.get call should appear AFTER
                // the runOpMode declaration line.
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

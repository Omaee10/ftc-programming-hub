package com.ftchub.grader;

import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.behavior.BehaviorRunner;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.compile.StubLoader;
import com.ftchub.grader.grade.Grader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end coverage for the behaviour tier: these actually fork a JVM and run
 * the submission, so they exercise codegen, the sandbox, and the collation back
 * into {@link GradedResultJson}.
 *
 * The point of the tier is catching code that has the right <em>shape</em> but
 * the wrong <em>arithmetic</em>, so most of these submissions are ones the AST
 * rubric alone would wave through.
 */
class BehaviorGradingTest {

    private static Grader grader;

    @BeforeAll
    static void setUp() throws Exception {
        StubLoader stubs = new StubLoader();
        stubs.compile();
        grader = new Grader(new InMemoryCompiler(stubs), new BehaviorRunner(stubs.compiledStubs()));
    }

    // ── Challenge 35 — mirrorX ────────────────────────────────────────────

    private static String coordinateMirror(String mirrorBody) {
        return """
                package org.firstinspires.ftc.teamcode;

                import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
                import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

                @TeleOp(name = "Coordinate Mirror", group = "Challenge 35")
                public class CoordinateMirror extends LinearOpMode {

                    private static final double FIELD_MM = 144.0 * 25.4;
                    private static final double BLUE_SHOT_X = 46.5 * 25.4;

                    @Override
                    public void runOpMode() {
                        waitForStart();
                        while (opModeIsActive()) {
                            double redShotX = mirrorX(BLUE_SHOT_X);
                            telemetry.addData("Shot X", redShotX);
                            telemetry.update();
                        }
                    }

                    private double mirrorX(double x) {
                        %s
                    }
                }
                """.formatted(mirrorBody);
    }

    private static List<GradedResultJson.CheckResultJson> behaviorOf(String code, int challengeId) {
        GradedResultJson result = grader.grade(new CompileRequest(code, challengeId, List.of()));
        return result.behaviorResults();
    }

    @Test
    void correctMirrorX_passesBehaviorTier() {
        var behavior = behaviorOf(coordinateMirror("return FIELD_MM - x;"), 35);
        assertEquals(1, behavior.size(), "expected one behaviour check for challenge 35");
        assertTrue(behavior.get(0).pass(),
                "correct mirrorX should pass, got: " + behavior.get(0).description());
    }

    @Test
    void negatedMirrorX_failsBehaviorTier() {
        // Compiles, has the method, has the right shape — only the math is wrong.
        var behavior = behaviorOf(coordinateMirror("return -x;"), 35);
        assertEquals(1, behavior.size());
        assertFalse(behavior.get(0).pass(), "negation is not a mirror — should fail");
        assertTrue(behavior.get(0).description().contains("mirrorX(0)"),
                "failure should quote the first failing case, got: " + behavior.get(0).description());
    }

    @Test
    void behaviorFailure_forcesWrongGrade() {
        GradedResultJson result = grader.grade(
                new CompileRequest(coordinateMirror("return -x;"), 35, List.of()));
        assertEquals("wrong", result.grade(),
                "a failed behaviour test must force grade=wrong");
    }

    @Test
    void hardCodedReturn_failsRemainingCases() {
        // The value quoted in the challenge instructions, returned unconditionally.
        var behavior = behaviorOf(coordinateMirror("return 3657.6;"), 35);
        assertFalse(behavior.get(0).pass(),
                "hard-coding the documented answer must not pass — that is why each spec has several cases");
    }

    @Test
    void renamedMethod_reportsMissing() {
        String code = coordinateMirror("return FIELD_MM - x;")
                .replace("private double mirrorX(double x)", "private double mirrorx(double x)")
                .replace("mirrorX(BLUE_SHOT_X)", "mirrorx(BLUE_SHOT_X)");
        var behavior = behaviorOf(code, 35);
        assertFalse(behavior.get(0).pass());
        assertTrue(behavior.get(0).description().contains("No method mirrorX(double)"),
                "should name the missing signature, got: " + behavior.get(0).description());
    }

    @Test
    void infiniteLoopInHelper_isKilledAndFails() {
        var behavior = behaviorOf(
                coordinateMirror("while (true) { x += 1; } "), 35);
        assertFalse(behavior.get(0).pass(), "a helper that never returns must fail");
        assertTrue(behavior.get(0).description().toLowerCase().contains("return"),
                "should explain the timeout, got: " + behavior.get(0).description());
    }

    // ── Challenge 36 — toRadians / toDegrees ──────────────────────────────

    private static String angleConversion(String toRad, String toDeg) {
        return """
                package org.firstinspires.ftc.teamcode;

                import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
                import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

                @TeleOp(name = "Angle Conversion", group = "Challenge 36")
                public class AngleConversion extends LinearOpMode {

                    @Override
                    public void runOpMode() {
                        waitForStart();
                        while (opModeIsActive()) {
                            double rad = toRadians(180);
                            telemetry.addData("rad", rad);
                            telemetry.addData("deg", toDegrees(rad));
                            telemetry.update();
                        }
                    }

                    private double toRadians(double degrees) {
                        %s
                    }

                    private double toDegrees(double radians) {
                        %s
                    }
                }
                """.formatted(toRad, toDeg);
    }

    @Test
    void twoSpecsAreReportedIndependently() {
        // toRadians correct, toDegrees inverted — only the second should fail.
        var behavior = behaviorOf(angleConversion(
                "return degrees * Math.PI / 180.0;",
                "return radians * Math.PI / 180.0;"), 36);
        assertEquals(2, behavior.size(), "challenge 36 has one check per method");
        assertTrue(behavior.get(0).pass(), "toRadians was correct: " + behavior.get(0).description());
        assertFalse(behavior.get(1).pass(), "toDegrees was inverted and should fail");
    }

    @Test
    void bothConversionsCorrect_passBehaviorTier() {
        var behavior = behaviorOf(angleConversion(
                "return degrees * Math.PI / 180.0;",
                "return radians * 180.0 / Math.PI;"), 36);
        assertTrue(behavior.stream().allMatch(GradedResultJson.CheckResultJson::pass),
                "both conversions were correct: " + behavior);
    }

    // ── Challenge 18 — normalize() returning double[] ──────────────────────

    private static String normalizeDemo(String body) {
        return """
                package org.firstinspires.ftc.teamcode;

                import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
                import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
                import com.qualcomm.robotcore.hardware.DcMotor;

                @TeleOp(name = "Normalize Demo", group = "Challenge 18")
                public class NormalizeDemo extends LinearOpMode {

                    private DcMotor frontLeft, frontRight, backLeft, backRight;

                    @Override
                    public void runOpMode() {
                        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
                        frontRight = hardwareMap.get(DcMotor.class, "front_right");
                        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
                        backRight  = hardwareMap.get(DcMotor.class, "back_right");
                        waitForStart();
                        while (opModeIsActive()) {
                            double[] n = normalize(1.0, 1.0, 1.0, 1.0);
                            frontLeft.setPower(n[0]);
                            frontRight.setPower(n[1]);
                            backLeft.setPower(n[2]);
                            backRight.setPower(n[3]);
                            telemetry.update();
                        }
                    }

                    private double[] normalize(double fl, double fr, double bl, double br) {
                        %s
                    }
                }
                """.formatted(body);
    }

    @Test
    void correctNormalize_passesArrayComparison() {
        var behavior = behaviorOf(normalizeDemo("""
                        double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr),
                                     Math.max(Math.abs(bl), Math.abs(br))));
                        if (max > 1.0) { fl /= max; fr /= max; bl /= max; br /= max; }
                        return new double[]{fl, fr, bl, br};
                """), 18);
        assertTrue(behavior.get(0).pass(), "reference normalize should pass: " + behavior.get(0).description());
    }

    @Test
    void normalizeWithoutAbs_failsOnNegativeMax() {
        // Forgetting Math.abs() looks right until a wheel power goes negative.
        var behavior = behaviorOf(normalizeDemo("""
                        double max = Math.max(fl, Math.max(fr, Math.max(bl, br)));
                        if (max > 1.0) { fl /= max; fr /= max; bl /= max; br /= max; }
                        return new double[]{fl, fr, bl, br};
                """), 18);
        assertFalse(behavior.get(0).pass(), "missing Math.abs() should be caught by the negative case");
    }

    @Test
    void normalizeDividingUnconditionally_failsUnderLimitCase() {
        // No `if (max > 1.0)` guard — scales down even when it shouldn't.
        var behavior = behaviorOf(normalizeDemo("""
                        double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr),
                                     Math.max(Math.abs(bl), Math.abs(br))));
                        return new double[]{fl / max, fr / max, bl / max, br / max};
                """), 18);
        assertFalse(behavior.get(0).pass(), "unconditional division should fail the max<=1 case");
    }

    // ── Challenges without behaviour coverage ─────────────────────────────

    @Test
    void challengeWithoutBehaviorSuite_returnsNoBehaviorResults() {
        String code = """
                package org.firstinspires.ftc.teamcode;

                import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
                import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
                import com.qualcomm.robotcore.hardware.DcMotor;

                @TeleOp(name = "Basic TeleOp", group = "Challenge 1")
                public class BasicTeleOp extends LinearOpMode {
                    private DcMotor leftMotor;

                    @Override
                    public void runOpMode() {
                        leftMotor = hardwareMap.get(DcMotor.class, "left_motor");
                        waitForStart();
                        while (opModeIsActive()) {
                            leftMotor.setPower(-gamepad1.left_stick_y);
                            telemetry.update();
                        }
                    }
                }
                """;
        GradedResultJson result = grader.grade(new CompileRequest(code, 1, List.of()));
        assertTrue(result.behaviorResults().isEmpty(),
                "challenge 1 has no behaviour suite — the tier must stay empty and cost nothing");
    }

    @Test
    void codeThatDoesNotCompile_skipsBehaviorTier() {
        var behavior = behaviorOf(coordinateMirror("return FIELD_MM - x"), 35); // missing semicolon
        assertTrue(behavior.isEmpty(),
                "a submission that never compiled has no bytecode to run");
    }
}

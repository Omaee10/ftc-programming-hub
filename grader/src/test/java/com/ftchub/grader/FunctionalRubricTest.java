package com.ftchub.grader;

import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.compile.StubLoader;
import com.ftchub.grader.grade.Grader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression tests for functional rubric rules — catches Broken Motor TeleOp
 * bugs on Challenge 1 and verifies a complete solution grades "good".
 */
class FunctionalRubricTest {

    private static Grader grader;

    @BeforeAll
    static void setUp() {
        grader = new Grader(new InMemoryCompiler(new StubLoader()));
    }

    private static final String BROKEN_MOTOR_TELEOP = """
            package org.firstinspires.ftc.teamcode;

            import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
            import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
            import com.qualcomm.robotcore.hardware.DcMotor;

            @TeleOp(name = "Broken Motor TeleOp", group = "Linear OpMode")
            public class BrokenMotorTeleOp extends LinearOpMode {

                private DcMotor leftMotor = null;

                @Override
                public void runOpMode() {
                    leftMotor = hardwareMap.get(DcMotor.class, "Left_Motor");

                    telemetry.addData("Status", "Initialized");
                    telemetry.update();

                    waitForStart();

                    while (opModeIsActive()) {
                        double motorPower = -gamepad1.left_stick_y;
                        leftMotor.setPower(motorPower);
                        telemetry.addData("Target Power", motorPower);
                    }
                }
            }
            """;

    private static final String GOOD_CHALLENGE_1 = """
            package org.firstinspires.ftc.teamcode;

            import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
            import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
            import com.qualcomm.robotcore.hardware.DcMotor;
            import com.qualcomm.robotcore.hardware.DcMotorSimple;

            @TeleOp(name = "Basic TeleOp", group = "Challenge 1")
            public class BasicTeleOp extends LinearOpMode {

                private DcMotor leftMotor;

                @Override
                public void runOpMode() {
                    leftMotor = hardwareMap.get(DcMotor.class, "left_motor");
                    leftMotor.setDirection(DcMotorSimple.Direction.FORWARD);

                    telemetry.addData("Status", "Ready");
                    telemetry.update();

                    waitForStart();

                    while (opModeIsActive()) {
                        double stick = gamepad1.left_stick_y;
                        double power = 0;
                        if (Math.abs(stick) >= 0.05) {
                            power = -stick;
                        }
                        leftMotor.setPower(power);
                        telemetry.addData("Power", power);
                        telemetry.update();
                    }
                }
            }
            """;

    @Test
    void brokenMotorTeleOp_gradesWrong_withExpectedRequiredFailures() {
        GradedResultJson result = grader.grade(new CompileRequest(BROKEN_MOTOR_TELEOP, 1, List.of()));
        assertEquals("wrong", result.grade());

        Set<String> failedRequired = failedLabels(result, "required");
        Set<String> failedChallengeRequired = result.requiredResults().stream()
                .filter(r -> !r.pass())
                .map(GradedResultJson.CheckResultJson::label)
                .collect(Collectors.toSet());
        assertTrue(
                failedRequired.contains("Lowercase hardware config names")
                        || failedChallengeRequired.contains("Hardware name \"left_motor\""),
                "Expected motor name failure, got universal=" + failedRequired + " challenge=" + failedChallengeRequired);
        assertTrue(
                failedRequired.contains("telemetry.update() in main loop"),
                "Expected loop telemetry failure, got: " + failedRequired);
    }

    @Test
    void brokenMotorTeleOp_failsDeadzoneImprovement() {
        GradedResultJson result = grader.grade(new CompileRequest(BROKEN_MOTOR_TELEOP, 1, List.of()));

        Set<String> failedImprovement = failedLabels(result, "improvement");
        assertTrue(
                failedImprovement.contains("Joystick deadzone applied"),
                "Expected deadzone suggestion failure, got: " + failedImprovement);
    }

    @Test
    void goodChallenge1Solution_gradesGood() {
        GradedResultJson result = grader.grade(new CompileRequest(GOOD_CHALLENGE_1, 1, List.of()));
        assertEquals("good", result.grade(), "Unexpected failures: " + allFailed(result));
    }

    private static Set<String> failedLabels(GradedResultJson result, String tier) {
        return result.universalResults().stream()
                .filter(r -> tier.equals(r.tier()) && !r.pass())
                .map(GradedResultJson.CheckResultJson::label)
                .collect(Collectors.toSet());
    }

    private static List<String> allFailed(GradedResultJson result) {
        List<String> out = result.universalResults().stream()
                .filter(r -> !r.pass())
                .map(r -> "universal/" + r.tier() + ": " + r.label())
                .collect(Collectors.toList());
        result.requiredResults().stream()
                .filter(r -> !r.pass())
                .forEach(r -> out.add("required: " + r.label()));
        result.improvementResults().stream()
                .filter(r -> !r.pass())
                .forEach(r -> out.add("improvement: " + r.label()));
        return out;
    }
}

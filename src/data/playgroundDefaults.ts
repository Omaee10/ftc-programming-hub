/**
 * Defaults for the free-form Code Playground — no challenge rubric, just a
 * blank OpMode scaffold and the full FTC Blocks toolbox.
 */

import type { JavaFrame } from "@/lib/blockly/javaGenerator";
import type { WorkspaceState } from "@/data/blockChallenges";

/** Draft key used by challengeCodeDrafts / challengeBlockDrafts for the playground. */
export const PLAYGROUND_DRAFT_ID = 9001;

export const PLAYGROUND_STARTER_JAVA = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Playground", group = "Sandbox")
public class Playground extends LinearOpMode {

    @Override
    public void runOpMode() {
        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            // Write your code here

            telemetry.update();
        }
    }
}
`;

const PLAYGROUND_IMPORTS: string[] = [
  "import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;",
  "import com.qualcomm.robotcore.eventloop.opmode.TeleOp;",
  "import com.qualcomm.robotcore.eventloop.opmode.Autonomous;",
  "import com.qualcomm.robotcore.hardware.DcMotor;",
  "import com.qualcomm.robotcore.hardware.DcMotorEx;",
  "import com.qualcomm.robotcore.hardware.DcMotorSimple;",
  "import com.qualcomm.robotcore.hardware.Servo;",
  "import com.qualcomm.robotcore.hardware.CRServo;",
  "import com.qualcomm.robotcore.hardware.TouchSensor;",
  "import com.qualcomm.robotcore.util.ElapsedTime;",
  "import com.qualcomm.robotcore.util.Range;",
];

export const PLAYGROUND_JAVA_FRAME: JavaFrame = {
  className: "Playground",
  annotation: '@TeleOp(name = "Playground (Blocks)", group = "Sandbox")',
  imports: PLAYGROUND_IMPORTS,
};

export const PLAYGROUND_STARTER_BLOCKS: WorkspaceState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "ftc_runopmode",
        x: 24,
        y: 24,
        deletable: false,
        inputs: {
          BODY: {
            block: {
              type: "ftc_init_telemetry",
              fields: { MSG: "Ready" },
              next: {
                block: {
                  type: "ftc_wait_for_start",
                  next: {
                    block: {
                      type: "ftc_while_active",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};

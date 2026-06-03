import type { BlocklyChallengeMeta } from "@/lib/blockly/types";

const BASE_IMPORTS = [
  "com.qualcomm.robotcore.eventloop.opmode.LinearOpMode",
  "com.qualcomm.robotcore.eventloop.opmode.TeleOp",
  "com.qualcomm.robotcore.eventloop.opmode.Autonomous",
  "com.qualcomm.robotcore.hardware.DcMotor",
  "com.qualcomm.robotcore.hardware.DcMotorEx",
  "com.qualcomm.robotcore.hardware.DcMotorSimple",
  "com.qualcomm.robotcore.hardware.Servo",
  "com.qualcomm.robotcore.hardware.CRServo",
  "com.qualcomm.robotcore.util.ElapsedTime",
];

const EXTRA_IMPORTS: Record<string, string[]> = {
  roadRunner: [
    "com.acmerobotics.roadrunner.Action",
    "com.acmerobotics.roadrunner.Actions",
    "com.acmerobotics.roadrunner.Pose2d",
    "com.acmerobotics.roadrunner.Trajectory",
  ],
  pedro: [
    "com.pedropathing.follower.Follower",
    "com.pedropathing.geometry.BezierLine",
    "com.pedropathing.geometry.BezierCurve",
    "com.pedropathing.geometry.Pose",
    "com.pedropathing.paths.PathChain",
  ],
  limelight: [
    "com.qualcomm.hardware.limelightvision.Limelight3A",
    "com.qualcomm.hardware.limelightvision.LLResult",
  ],
  imu: ["org.firstinspires.ftc.robotcore.external.navigation.AngleUnit"],
};

export function collectImports(
  meta: BlocklyChallengeMeta,
  sourceHints: string
): string[] {
  const imports = new Set(BASE_IMPORTS);
  const tagStr = meta.tags.join(" ").toLowerCase();
  const hint = sourceHints.toLowerCase();

  if (tagStr.includes("road runner") || hint.includes("trajectory")) {
    EXTRA_IMPORTS.roadRunner.forEach((i) => imports.add(i));
  }
  if (tagStr.includes("pedro") || hint.includes("follower")) {
    EXTRA_IMPORTS.pedro.forEach((i) => imports.add(i));
  }
  if (tagStr.includes("limelight") || tagStr.includes("vision") || hint.includes("limelight")) {
    EXTRA_IMPORTS.limelight.forEach((i) => imports.add(i));
  }
  if (tagStr.includes("imu") || tagStr.includes("field-relative") || hint.includes("imu")) {
    EXTRA_IMPORTS.imu.forEach((i) => imports.add(i));
  }

  return Array.from(imports).sort();
}

export function wrapOpModeSkeleton(
  meta: BlocklyChallengeMeta,
  fields: string,
  methods: string,
  init: string,
  loop: string,
  extraImports = ""
): string {
  const annotation = meta.isAutonomous ? "Autonomous" : "TeleOp";
  const imports = collectImports(meta, fields + methods + init + loop + extraImports);
  const importLines = imports.map((i) => `import ${i};`).join("\n");

  const indent = (code: string, spaces: number) =>
    code
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => " ".repeat(spaces) + l)
      .join("\n");

  const fieldBlock = fields.trim() ? indent(fields, 4) + "\n\n" : "";
  const methodBlock = methods.trim() ? indent(methods, 4) + "\n\n" : "";
  const initBlock = init.trim() ? indent(init, 8) + "\n\n        " : "";
  const loopBody = loop.trim() ? indent(loop, 12) : "";
  const loopTelemetry =
    loop.includes("addData") && !loop.includes("telemetry.update()")
      ? "\n            telemetry.update();"
      : "";

  return `package org.firstinspires.ftc.teamcode;

${importLines}

@${annotation}(name = "${meta.opModeName}", group = "Challenge ${meta.challengeId}")
public class ${meta.className} extends LinearOpMode {

${fieldBlock}${methodBlock}    @Override
    public void runOpMode() {

        ${initBlock}telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

${loopBody}${loopTelemetry}
        }
    }
}
`;
}

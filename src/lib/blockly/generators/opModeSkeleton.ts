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

const SENSOR_IMPORTS: Record<string, string> = {
  touch: "com.qualcomm.robotcore.hardware.TouchSensor",
  distance: "com.qualcomm.robotcore.hardware.DistanceSensor",
  color: "com.qualcomm.robotcore.hardware.ColorSensor",
  imu: "com.qualcomm.robotcore.hardware.IMU",
  angleUnit: "org.firstinspires.ftc.robotcore.external.navigation.AngleUnit",
  distanceUnit: "org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit",
};

const EXTRA_IMPORTS: Record<string, string[]> = {
  limelight: [
    "com.qualcomm.hardware.limelightvision.Limelight3A",
    "com.qualcomm.hardware.limelightvision.LLResult",
  ],
};

export function collectImports(
  meta: BlocklyChallengeMeta,
  sourceHints: string
): string[] {
  const imports = new Set(BASE_IMPORTS);
  const tagStr = meta.tags.join(" ").toLowerCase();
  const hint = sourceHints.toLowerCase();
  if (tagStr.includes("limelight") || tagStr.includes("vision") || hint.includes("limelight")) {
    EXTRA_IMPORTS.limelight.forEach((i) => imports.add(i));
  }
  if (hint.includes("touchsensor") || hint.includes("touch_sensor")) {
    imports.add(SENSOR_IMPORTS.touch);
  }
  if (hint.includes("distancesensor") || hint.includes("distance_sensor")) {
    imports.add(SENSOR_IMPORTS.distance);
    imports.add(SENSOR_IMPORTS.distanceUnit);
  }
  if (hint.includes("colorsensor") || hint.includes("color_sensor")) {
    imports.add(SENSOR_IMPORTS.color);
  }
  if (hint.includes("imu") || tagStr.includes("imu")) {
    imports.add(SENSOR_IMPORTS.imu);
    imports.add(SENSOR_IMPORTS.angleUnit);
  }
  return Array.from(imports).sort();
}

/** Wrap generated runOpMode body — no hidden waitForStart/loop injection. */
export function wrapOpModeSkeleton(
  meta: BlocklyChallengeMeta,
  fields: string,
  body: string
): string {
  const annotation = meta.isAutonomous ? "Autonomous" : "TeleOp";
  const imports = collectImports(meta, fields + body);
  const importLines = imports.map((i) => `import ${i};`).join("\n");

  const indentBody = body
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => (l.startsWith("    ") ? l : `        ${l.trim()}`))
    .join("\n");

  return `package org.firstinspires.ftc.teamcode;

${importLines}

@${annotation}(name = "${meta.opModeName}", group = "Challenge ${meta.challengeId}")
public class ${meta.className} extends LinearOpMode {

${fields}    @Override
    public void runOpMode() {

${indentBody || "        // Drag blocks into runOpMode"}
    }
}
`;
}

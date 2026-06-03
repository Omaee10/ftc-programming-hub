import * as Blockly from "blockly/core";
import { CodeGenerator } from "blockly/core";
import type { Block } from "blockly/core";
import type { BlocklyChallengeMeta } from "@/lib/blockly/types";
import { wrapOpModeSkeleton } from "@/lib/blockly/generators/opModeSkeleton";
import { registerFtcBlocks } from "@/lib/blockly/blocks/ftcBlocks";

let javaGenerator: JavaGenerator | null = null;

class JavaGenerator extends CodeGenerator {
  constructor() {
    super("Java");
    this.INDENT = "    ";
    this.addReservedWords(
      "package,import,public,private,class,void,extends,while,if,else,new,double,boolean,int,true,false,null"
    );
  }

  /** Blockly 11+ does not auto-chain stack statements; walk next links explicitly. */
  override statementToCode(block: Block, name: string): string {
    let code = "";
    let current = block.getInputTargetBlock(name);
    while (current) {
      const chunk = this.blockToCode(current);
      if (typeof chunk === "string") code += chunk;
      else if (Array.isArray(chunk)) code += chunk[0];
      current = current.getNextBlock();
    }
    return code;
  }
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "") || "device";
}

function registerBlockGenerators(gen: JavaGenerator): void {
  const stmt = (code: string) => code + "\n";

  gen.forBlock["ftc_declare_dc_motor"] = (block) =>
    stmt(`private DcMotor ${sanitizeId(block.getFieldValue("NAME"))};`);

  gen.forBlock["ftc_declare_dc_motor_ex"] = (block) =>
    stmt(`private DcMotorEx ${sanitizeId(block.getFieldValue("NAME"))};`);

  gen.forBlock["ftc_declare_servo"] = (block) =>
    stmt(`private Servo ${sanitizeId(block.getFieldValue("NAME"))};`);

  gen.forBlock["ftc_declare_cr_servo"] = (block) =>
    stmt(`private CRServo ${sanitizeId(block.getFieldValue("NAME"))};`);

  gen.forBlock["ftc_declare_elapsed_time"] = (block) =>
    stmt(`private ElapsedTime ${sanitizeId(block.getFieldValue("NAME"))};`);

  gen.forBlock["ftc_declare_boolean"] = (block) =>
    stmt(
      `private boolean ${sanitizeId(block.getFieldValue("NAME"))} = ${block.getFieldValue("VALUE") === "TRUE" ? "true" : "false"};`
    );

  gen.forBlock["ftc_declare_int"] = (block) =>
    stmt(
      `private int ${sanitizeId(block.getFieldValue("NAME"))} = ${Number(block.getFieldValue("VALUE"))};`
    );

  gen.forBlock["ftc_declare_double"] = (block) =>
    stmt(
      `private double ${sanitizeId(block.getFieldValue("NAME"))} = ${Number(block.getFieldValue("VALUE"))};`
    );

  gen.forBlock["ftc_private_double_method"] = (block) => {
    const name = sanitizeId(block.getFieldValue("NAME"));
    const body = block.getFieldValue("BODY") || "-gamepad1.left_stick_y";
    return stmt(`private double ${name}() {\n        return ${body};\n    }`);
  };

  gen.forBlock["ftc_hw_get_dc_motor"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("VAR"))} = hardwareMap.get(DcMotor.class, "${block.getFieldValue("HW")}");`
    );

  gen.forBlock["ftc_hw_get_dc_motor_ex"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("VAR"))} = hardwareMap.get(DcMotorEx.class, "${block.getFieldValue("HW")}");`
    );

  gen.forBlock["ftc_hw_get_servo"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("VAR"))} = hardwareMap.get(Servo.class, "${block.getFieldValue("HW")}");`
    );

  gen.forBlock["ftc_hw_get_cr_servo"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("VAR"))} = hardwareMap.get(CRServo.class, "${block.getFieldValue("HW")}");`
    );

  gen.forBlock["ftc_set_direction"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setDirection(DcMotorSimple.Direction.${block.getFieldValue("DIR")});`
    );

  gen.forBlock["ftc_set_zero_power_behavior"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.${block.getFieldValue("MODE")});`
    );

  gen.forBlock["ftc_motor_set_power"] = (block, generator) => {
    const power =
      generator.valueToCode(block, "POWER", Order.ATOMIC) || "0";
    return stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setPower(${power});`
    );
  };

  gen.forBlock["ftc_motor_set_power_negated_stick"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setPower(-gamepad1.left_stick_y);`
    );

  gen.forBlock["ftc_motor_set_power_helper"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setPower(${sanitizeId(block.getFieldValue("HELPER"))}());`
    );

  gen.forBlock["ftc_motor_set_power_stick_boost"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setPower(-gamepad1.left_stick_y * ${sanitizeId(block.getFieldValue("BOOST"))});`
    );

  gen.forBlock["ftc_cr_servo_set_power"] = (block, generator) => {
    const power =
      generator.valueToCode(block, "POWER", Order.ATOMIC) || "0";
    return stmt(
      `${sanitizeId(block.getFieldValue("SERVO"))}.setPower(${power});`
    );
  };

  gen.forBlock["ftc_cr_servo_set_power_trigger"] = (block) =>
    stmt(
      `if (gamepad1.right_trigger > 0.05) {\n            ${sanitizeId(block.getFieldValue("SERVO"))}.setPower(gamepad1.right_trigger);\n        }`
    );

  gen.forBlock["ftc_servo_set_position"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("SERVO"))}.setPosition(${Number(block.getFieldValue("POS"))});`
    );

  gen.forBlock["ftc_servo_set_position_button"] = (block) =>
    stmt(
      `if (gamepad1.${block.getFieldValue("BTN")}) {\n            ${sanitizeId(block.getFieldValue("SERVO"))}.setPosition(${Number(block.getFieldValue("POS"))});\n        }`
    );

  gen.forBlock["ftc_sleep_after_servo"] = (block) =>
    stmt(`sleep(${Number(block.getFieldValue("MS"))});`);

  gen.forBlock["ftc_encoder_move"] = (block) => {
    const m = sanitizeId(block.getFieldValue("MOTOR"));
    const ticks = Number(block.getFieldValue("TICKS"));
    const power = Number(block.getFieldValue("POWER"));
    return stmt(
      `${m}.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);\n` +
        `        ${m}.setTargetPosition(${ticks});\n` +
        `        ${m}.setMode(DcMotor.RunMode.RUN_TO_POSITION);\n` +
        `        ${m}.setPower(${power});\n` +
        `        while (${m}.isBusy() && opModeIsActive()) {\n` +
        `            idle();\n` +
        `        }\n` +
        `        ${m}.setPower(0);`
    );
  };

  gen.forBlock["ftc_run_using_encoder"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setMode(DcMotor.RunMode.RUN_USING_ENCODER);`
    );

  gen.forBlock["ftc_set_velocity"] = (block) =>
    stmt(
      `${sanitizeId(block.getFieldValue("MOTOR"))}.setVelocity(${Number(block.getFieldValue("TPS"))});`
    );

  gen.forBlock["ftc_elapsed_time_new"] = (block) =>
    stmt(`${sanitizeId(block.getFieldValue("NAME"))} = new ElapsedTime();`);

  gen.forBlock["ftc_timer_reset"] = (block) =>
    stmt(`${sanitizeId(block.getFieldValue("NAME"))}.reset();`);

  gen.forBlock["ftc_while_timer_seconds"] = (block, generator) => {
    const timer = sanitizeId(block.getFieldValue("TIMER"));
    const sec = Number(block.getFieldValue("SECONDS"));
    const body =
      generator.statementToCode(block, "BODY") || "";
    return stmt(
      `while (${timer}.seconds() < ${sec} && opModeIsActive()) {\n${body}        }`
    );
  };

  gen.forBlock["ftc_motors_stop_zero"] = (block) => {
    const motors = block
      .getFieldValue("MOTORS")
      .split(",")
      .map((s: string) => sanitizeId(s.trim()))
      .filter(Boolean);
    return stmt(motors.map((m: string) => `${m}.setPower(0);`).join("\n"));
  };

  gen.forBlock["ftc_sleep"] = (block) =>
    stmt(`sleep(${Number(block.getFieldValue("MS"))});`);

  gen.forBlock["ftc_telemetry_ready"] = () =>
    stmt(`telemetry.addData("Status", "Ready");\n        telemetry.update();`);

  gen.forBlock["ftc_telemetry_add"] = (block) =>
    stmt(
      `telemetry.addData("${block.getFieldValue("KEY")}", ${block.getFieldValue("VAL")});`
    );

  gen.forBlock["ftc_telemetry_update"] = () => stmt("telemetry.update();");

  gen.forBlock["ftc_button_toggle"] = (block) => {
    const flag = sanitizeId(block.getFieldValue("FLAG"));
    const last = sanitizeId(block.getFieldValue("LAST"));
    return stmt(
      `if (gamepad1.a && !${last}) {\n            ${flag} = !${flag};\n        }\n        ${last} = gamepad1.a;`
    );
  };

  gen.forBlock["ftc_if_button"] = (block, generator) => {
    const btn = block.getFieldValue("BTN");
    const body = generator.statementToCode(block, "BODY") || "";
    return stmt(`if (gamepad1.${btn}) {\n${body}        }`);
  };

  gen.forBlock["ftc_declare_boost_if_bumper"] = (block) => {
    const v = sanitizeId(block.getFieldValue("VAR"));
    const ifV = Number(block.getFieldValue("IF_VAL"));
    const elseV = Number(block.getFieldValue("ELSE_VAL"));
    return stmt(
      `double ${v} = 1.0;\n        if (gamepad1.right_bumper) {\n            ${v} = ${ifV};\n        } else {\n            ${v} = ${elseV};\n        }`
    );
  };

  gen.forBlock["ftc_loop_count_increment"] = () => stmt("loopCount++;");

  gen.forBlock["ftc_mecanum_teleop"] = (block) => {
    const fl = sanitizeId(block.getFieldValue("FL"));
    const fr = sanitizeId(block.getFieldValue("FR"));
    const bl = sanitizeId(block.getFieldValue("BL"));
    const br = sanitizeId(block.getFieldValue("BR"));
    return stmt(
      `double y = -gamepad1.left_stick_y;\n` +
        `        double x = gamepad1.left_stick_x;\n` +
        `        double rx = gamepad1.right_stick_x;\n` +
        `        double flP = y + x + rx;\n` +
        `        double frP = y - x - rx;\n` +
        `        double blP = y - x + rx;\n` +
        `        double brP = y + x - rx;\n` +
        `        double max = Math.max(Math.max(Math.abs(flP), Math.abs(frP)), Math.max(Math.abs(blP), Math.abs(brP)));\n` +
        `        if (max > 1.0) { flP /= max; frP /= max; blP /= max; brP /= max; }\n` +
        `        ${fl}.setPower(flP);\n` +
        `        ${fr}.setPower(frP);\n` +
        `        ${bl}.setPower(blP);\n` +
        `        ${br}.setPower(brP);`
    );
  };

  gen.forBlock["ftc_pid_p_loop"] = (block) => {
    const m = sanitizeId(block.getFieldValue("MOTOR"));
    const target = Number(block.getFieldValue("TARGET"));
    const kp = Number(block.getFieldValue("KP"));
    return stmt(
      `int error = ${target} - ${m}.getCurrentPosition();\n` +
        `        double power = ${kp} * error;\n` +
        `        power = Math.max(-1.0, Math.min(1.0, power));\n` +
        `        ${m}.setPower(power);`
    );
  };

  gen.forBlock["ftc_road_runner_trajectory"] = (block) => {
    const drive = sanitizeId(block.getFieldValue("DRIVE"));
    return stmt(
      `Pose2d startPose = new Pose2d(0, 0, 0);\n` +
        `        Trajectory traj = ${drive}.trajectoryBuilder(startPose)\n` +
        `                .forward(24)\n` +
        `                .build();\n` +
        `        Actions.runBlocking(${drive}.followTrajectory(traj));`
    );
  };

  gen.forBlock["ftc_pedro_follow_path"] = (block) => {
    const follower = sanitizeId(block.getFieldValue("FOLLOWER"));
    return stmt(
      `Pose start = new Pose(0, 0, 0);\n` +
        `        BezierLine line = new BezierLine(start, new Pose(24, 0, 0));\n` +
        `        PathChain chain = ${follower}.pathBuilder().addPath(line).build();\n` +
        `        ${follower}.followPath(chain, true);\n` +
        `        while (!${follower}.atParametricEnd() && opModeIsActive()) {\n` +
        `            ${follower}.update();\n` +
        `            telemetry.update();\n` +
        `        }`
    );
  };

  gen.forBlock["ftc_limelight_poll"] = (block) => {
    const ll = sanitizeId(block.getFieldValue("LL"));
    return stmt(
      `LLResult result = ${ll}.getLatestResult();\n` +
        `        if (result != null && result.isValid()) {\n` +
        `            telemetry.addData("Tag", result.getFiducialResults().get(0).getFiducialId());\n` +
        `        }`
    );
  };

  gen.forBlock["ftc_number"] = (block) => {
    const n = Number(block.getFieldValue("NUM"));
    return [String(n), Order.ATOMIC];
  };

  gen.forBlock["ftc_comment"] = (block) =>
    stmt(`// ${block.getFieldValue("TEXT")}`);
}

const Order = {
  ATOMIC: 0,
};

export function getJavaGenerator(): JavaGenerator {
  if (!javaGenerator) {
    registerFtcBlocks();
    javaGenerator = new JavaGenerator();
    registerBlockGenerators(javaGenerator);
  }
  return javaGenerator;
}

export function generateJavaFromWorkspace(
  workspace: Blockly.Workspace,
  meta: BlocklyChallengeMeta
): string {
  const gen = getJavaGenerator();
  const top = workspace.getTopBlocks(true).find((b) => b.type === "ftc_program");
  if (!top) {
    return wrapOpModeSkeleton(meta, "", "", "", "");
  }

  const fields = gen.statementToCode(top, "FIELD_STACK");
  const methods = gen.statementToCode(top, "METHOD_STACK");
  const init = gen.statementToCode(top, "INIT_STACK");
  const loop = gen.statementToCode(top, "LOOP_STACK");

  return wrapOpModeSkeleton(meta, fields, methods, init, loop);
}

export function initBlocklyOnce(): void {
  registerFtcBlocks();
  getJavaGenerator();
}

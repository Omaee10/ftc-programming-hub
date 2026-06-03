import * as Blockly from "blockly/core";
import { CodeGenerator } from "blockly/core";
import { Order } from "blockly/javascript";
import type { Block } from "blockly/core";
import type { BlocklyChallengeMeta } from "@/lib/blockly/types";
import { wrapOpModeSkeleton, collectImports } from "@/lib/blockly/generators/opModeSkeleton";
import {
  getDeviceHwName,
  getDeviceVarName,
} from "@/lib/blockly/blocks/deviceFields";
import { registerAllBlocks } from "@/lib/blockly/blocks/registerBlocks";

let javaGenerator: JavaGenerator | null = null;

class JavaGenerator extends CodeGenerator {
  constructor() {
    super("Java");
    this.INDENT = "    ";
    this.addReservedWords(
      "package,import,public,private,class,void,extends,while,if,else,new,double,boolean,int,true,false,null,return"
    );
  }

  override statementToCode(block: Block, name: string): string {
    let code = "";
    let current = block.getInputTargetBlock(name);
    while (current) {
      if (current.type === "ftc_comment") {
        current = current.getNextBlock();
        continue;
      }
      const chunk = this.blockToCode(current);
      if (typeof chunk === "string") code += chunk;
      else if (Array.isArray(chunk)) code += chunk[0];
      current = current.getNextBlock();
    }
    return code;
  }

}

function sanitizeVar(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9_]/g, "");
  return s && /^[a-zA-Z_]/.test(s) ? s : `v_${s || "x"}`;
}

function stmt(code: string): string {
  const lines = code.split("\n").filter((l) => l.trim());
  return (
    lines
      .map((l) => {
        const t = l.trim();
        if (t.endsWith(";") || t.endsWith("{") || t.endsWith("}")) return l;
        return `${l};`;
      })
      .join("\n") + "\n"
  );
}

interface DeviceDecl {
  javaType: string;
  varName: string;
  hwName: string;
  kind:
    | "DcMotor"
    | "DcMotorEx"
    | "Servo"
    | "CRServo"
    | "ElapsedTime"
    | "TouchSensor"
    | "DistanceSensor"
    | "ColorSensor"
    | "IMU";
}

function collectDevices(workspace: Blockly.Workspace): Map<string, DeviceDecl> {
  const map = new Map<string, DeviceDecl>();
  const all = workspace.getAllBlocks(false);
  for (const block of all) {
    if (block.type === "ftc_dc_motor_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      const hw = getDeviceHwName(block);
      map.set(varName, {
        javaType: "DcMotor",
        varName,
        hwName: hw,
        kind: "DcMotor",
      });
    }
    if (block.type === "ftc_dc_motor_ex_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "DcMotorEx",
        varName,
        hwName: getDeviceHwName(block),
        kind: "DcMotorEx",
      });
    }
    if (block.type === "ftc_servo_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "Servo",
        varName,
        hwName: getDeviceHwName(block),
        kind: "Servo",
      });
    }
    if (block.type === "ftc_cr_servo_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "CRServo",
        varName,
        hwName: getDeviceHwName(block),
        kind: "CRServo",
      });
    }
    if (block.type === "ftc_elapsed_time_new") {
      const varName = sanitizeVar(block.getFieldValue("NAME"));
      map.set(varName, {
        javaType: "ElapsedTime",
        varName,
        hwName: "",
        kind: "ElapsedTime",
      });
    }
    if (block.type === "ftc_touch_sensor_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      const hw = getDeviceHwName(block);
      map.set(varName, {
        javaType: "TouchSensor",
        varName,
        hwName: hw,
        kind: "TouchSensor",
      });
    }
    if (block.type === "ftc_distance_sensor_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "DistanceSensor",
        varName,
        hwName: getDeviceHwName(block),
        kind: "DistanceSensor",
      });
    }
    if (block.type === "ftc_color_sensor_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "ColorSensor",
        varName,
        hwName: getDeviceHwName(block),
        kind: "ColorSensor",
      });
    }
    if (block.type === "ftc_imu_hw_get") {
      const varName = sanitizeVar(getDeviceVarName(block));
      map.set(varName, {
        javaType: "IMU",
        varName,
        hwName: getDeviceHwName(block),
        kind: "IMU",
      });
    }
    if (block.getField("DEVICE") && block.type.startsWith("ftc_dc_motor")) {
      const v = sanitizeVar(getDeviceVarName(block));
      const hw = getDeviceHwName(block);
      if (v && !map.has(v)) {
        map.set(v, {
          javaType: block.type.includes("ex") ? "DcMotorEx" : "DcMotor",
          varName: v,
          hwName: hw,
          kind: block.type.includes("ex") ? "DcMotorEx" : "DcMotor",
        });
      }
    }
    if (block.getField("DEVICE") && block.type.startsWith("ftc_servo")) {
      const v = sanitizeVar(getDeviceVarName(block));
      if (v && !map.has(v)) {
        map.set(v, {
          javaType: block.type.startsWith("ftc_cr") ? "CRServo" : "Servo",
          varName: v,
          hwName: getDeviceHwName(block),
          kind: block.type.startsWith("ftc_cr") ? "CRServo" : "Servo",
        });
      }
    }
  }
  return map;
}

function registerBlockGenerators(gen: JavaGenerator): void {
  gen.forBlock["procedures_defnoreturn"] = (block, generator) => {
    const name = block.getFieldValue("NAME");
    if (name !== "runOpMode") return "";
    const body = generator.statementToCode(block, "STACK");
    return body;
  };

  gen.forBlock["procedures_defreturn"] = () => "";
  gen.forBlock["procedures_callnoreturn"] = () => "";
  gen.forBlock["procedures_callreturn"] = () => "";

  gen.forBlock["controls_whileUntil"] = (block, generator) => {
    const mode = block.getFieldValue("MODE");
    const cond =
      generator.valueToCode(block, "BOOL", Order.NONE) || "false";
    const body = generator.statementToCode(block, "DO");
    if (mode === "UNTIL") {
      return stmt(`while (!(${cond}) && opModeIsActive()) {\n${body}        }`);
    }
    return stmt(`while (${cond} && opModeIsActive()) {\n${body}        }`);
  };

  gen.forBlock["controls_repeat_ext"] = (block, generator) => {
    const mode = block.getFieldValue("MODE");
    if (mode === "TIMES") {
      const times =
        generator.valueToCode(block, "TIMES", Order.NONE) || "0";
      const body = generator.statementToCode(block, "DO");
      return stmt(`for (int i = 0; i < ${times} && opModeIsActive(); i++) {\n${body}        }`);
    }
    const cond =
      generator.valueToCode(block, "BOOL", Order.NONE) || "false";
    const body = generator.statementToCode(block, "DO");
    return stmt(`while (${cond} && opModeIsActive()) {\n${body}        }`);
  };

  gen.forBlock["controls_if"] = (block, generator) => {
    let code = "";
    for (let i = 0; block.getInput(`IF${i}`); i++) {
      const clause = i === 0 ? "if" : "else if";
      const cond =
        generator.valueToCode(block, `IF${i}`, Order.NONE) || "false";
      const branch = generator.statementToCode(block, `DO${i}`);
      code += `${clause} (${cond}) {\n${branch}        } else `;
    }
    if (block.getInput("ELSE")) {
      const branch = generator.statementToCode(block, "ELSE");
      code = code.replace(/ else $/, "") + `else {\n${branch}        }`;
    } else {
      code = code.replace(/ else $/, "");
    }
    return stmt(code);
  };

  gen.forBlock["logic_compare"] = (block, generator) => {
    const op = block.getFieldValue("OP");
    const a = generator.valueToCode(block, "A", Order.EQUALITY) || "0";
    const b = generator.valueToCode(block, "B", Order.EQUALITY) || "0";
    const ops: Record<string, string> = {
      EQ: "==",
      NEQ: "!=",
      LT: "<",
      LTE: "<=",
      GT: ">",
      GTE: ">=",
    };
    return [`${a} ${ops[op] || "=="} ${b}`, Order.EQUALITY];
  };

  gen.forBlock["logic_operation"] = (block, generator) => {
    const op = block.getFieldValue("OP");
    const a = generator.valueToCode(block, "A", Order.LOGICAL_AND) || "false";
    const b = generator.valueToCode(block, "B", Order.LOGICAL_AND) || "false";
    return [
      op === "AND" ? `${a} && ${b}` : `${a} || ${b}`,
      Order.LOGICAL_AND,
    ];
  };

  gen.forBlock["logic_negate"] = (block, generator) => {
    const a = generator.valueToCode(block, "BOOL", Order.LOGICAL_NOT) || "true";
    return [`!${a}`, Order.LOGICAL_NOT];
  };

  gen.forBlock["logic_boolean"] = (block) => {
    return [
      block.getFieldValue("BOOL") === "TRUE" ? "true" : "false",
      Order.ATOMIC,
    ];
  };

  gen.forBlock["math_number"] = (block) => {
    return [String(Number(block.getFieldValue("NUM"))), Order.ATOMIC];
  };

  gen.forBlock["math_arithmetic"] = (block, generator) => {
    const op = block.getFieldValue("OP");
    const a = generator.valueToCode(block, "A", Order.ADDITION) || "0";
    const b = generator.valueToCode(block, "B", Order.ADDITION) || "0";
    const ops: Record<string, string> = {
      ADD: "+",
      MINUS: "-",
      MULTIPLY: "*",
      DIVIDE: "/",
      POWER: "*",
    };
    return [`${a} ${ops[op] || "+"} ${b}`, Order.ADDITION];
  };

  gen.forBlock["math_single"] = (block, generator) => {
    const op = block.getFieldValue("OP");
    const a = generator.valueToCode(block, "NUM", Order.FUNCTION_CALL) || "0";
    if (op === "NEG") return [`-${a}`, Order.UNARY_NEGATION];
    if (op === "ABS") return [`Math.abs(${a})`, Order.FUNCTION_CALL];
    return [a, Order.ATOMIC];
  };

  gen.forBlock["variables_get"] = (block) => {
    const name = sanitizeVar(block.getFieldValue("VAR"));
    return [name, Order.ATOMIC];
  };

  gen.forBlock["variables_set"] = (block, generator) => {
    const name = sanitizeVar(block.getFieldValue("VAR"));
    const val =
      generator.valueToCode(block, "VALUE", Order.ASSIGNMENT) || "0";
    return stmt(`${name} = ${val}`);
  };

  gen.forBlock["ftc_comment"] = () => "";

  gen.forBlock["ftc_call_wait_for_start"] = () => stmt("waitForStart()");
  gen.forBlock["ftc_call_sleep"] = (block) =>
    stmt(`sleep(${Number(block.getFieldValue("MS"))})`);
  gen.forBlock["ftc_call_idle"] = () => stmt("idle()");
  gen.forBlock["ftc_call_telemetry_update"] = () => stmt("telemetry.update()");
  gen.forBlock["ftc_call_telemetry_add_data"] = (block, generator) => {
    const key = block.getFieldValue("KEY");
    const val =
      generator.valueToCode(block, "VALUE", Order.NONE) || '""';
    return stmt(`telemetry.addData("${key}", ${val})`);
  };
  gen.forBlock["ftc_reporter_op_mode_is_active"] = () => ["opModeIsActive()", Order.ATOMIC];
  gen.forBlock["ftc_reporter_is_active"] = () => ["isStarted()", Order.ATOMIC];
  gen.forBlock["ftc_if_is_active"] = (block, generator) => {
    const body = generator.statementToCode(block, "DO");
    return stmt(`if (isStarted()) {\n${body}        }`);
  };
  gen.forBlock["ftc_repeat_while_op_mode"] = (block, generator) => {
    const body = generator.statementToCode(block, "DO");
    return stmt(`while (opModeIsActive()) {\n${body}        }`);
  };

  gen.forBlock["ftc_gamepad_stick_y"] = (block) => {
    const stick = block.getFieldValue("STICK");
    return [`gamepad1.${stick}`, Order.ATOMIC];
  };
  gen.forBlock["ftc_gamepad_stick_y_drive"] = (block) => {
    const stick = block.getFieldValue("STICK");
    return [`-gamepad1.${stick}`, Order.UNARY_NEGATION];
  };
  gen.forBlock["ftc_set_power_zero"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    return stmt(`${v}.setPower(0)`);
  };
  gen.forBlock["ftc_encoder_run_to_position"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const ticks = generator.valueToCode(block, "TICKS", Order.NONE) || "0";
    const power = generator.valueToCode(block, "POWER", Order.NONE) || "0.6";
    return (
      stmt(`${v}.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER)`) +
      stmt(`${v}.setTargetPosition((int) ${ticks})`) +
      stmt(`${v}.setMode(DcMotor.RunMode.RUN_TO_POSITION)`) +
      stmt(`${v}.setPower(${power})`) +
      stmt(
        `while (${v}.isBusy() && opModeIsActive()) {\n            idle();\n        }`
      ) +
      stmt(`${v}.setPower(0)`)
    );
  };
  gen.forBlock["ftc_gamepad_button"] = (block) => {
    return [`gamepad1.${block.getFieldValue("BTN")}`, Order.ATOMIC];
  };
  gen.forBlock["ftc_gamepad_trigger"] = (block) => {
    return [`gamepad1.${block.getFieldValue("TR")}`, Order.ATOMIC];
  };

  gen.forBlock["ftc_dc_motor_set_power"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const p = generator.valueToCode(block, "POWER", Order.NONE) || "0";
    return stmt(`${v}.setPower(${p})`);
  };
  gen.forBlock["ftc_dc_motor_get_power"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.getPower()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_dc_motor_set_mode"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const mode = block.getFieldValue("MODE");
    return stmt(`${v}.setMode(DcMotor.RunMode.${mode})`);
  };
  gen.forBlock["ftc_dc_motor_set_target_position"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const t = generator.valueToCode(block, "TICKS", Order.NONE) || "0";
    return stmt(`${v}.setTargetPosition((int) ${t})`);
  };
  gen.forBlock["ftc_dc_motor_set_direction"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    return stmt(
      `${v}.setDirection(DcMotorSimple.Direction.${block.getFieldValue("DIR")})`
    );
  };
  gen.forBlock["ftc_dc_motor_set_zero_power"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    return stmt(
      `${v}.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.${block.getFieldValue("ZPB")})`
    );
  };
  gen.forBlock["ftc_dc_motor_get_position"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.getCurrentPosition()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_dc_motor_is_busy"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.isBusy()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_dc_motor_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(DcMotor.class, "${hw}")`);
  };
  gen.forBlock["ftc_dc_motor_ex_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(DcMotorEx.class, "${hw}")`);
  };
  gen.forBlock["ftc_dc_motor_ex_set_velocity"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const tps = generator.valueToCode(block, "TPS", Order.NONE) || "0";
    return stmt(`${v}.setVelocity(${tps})`);
  };
  gen.forBlock["ftc_servo_set_position"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const p = generator.valueToCode(block, "POS", Order.NONE) || "0";
    return stmt(`${v}.setPosition(${p})`);
  };
  gen.forBlock["ftc_servo_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(Servo.class, "${hw}")`);
  };
  gen.forBlock["ftc_cr_servo_set_power"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const p = generator.valueToCode(block, "POWER", Order.NONE) || "0";
    return stmt(`${v}.setPower(${p})`);
  };
  gen.forBlock["ftc_cr_servo_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(CRServo.class, "${hw}")`);
  };
  gen.forBlock["ftc_elapsed_time_new"] = (block) => {
    const n = sanitizeVar(block.getFieldValue("NAME"));
    return stmt(`${n} = new ElapsedTime()`);
  };
  gen.forBlock["ftc_elapsed_time_reset"] = (block) =>
    stmt(`${sanitizeVar(block.getFieldValue("NAME"))}.reset()`);
  gen.forBlock["ftc_elapsed_time_seconds"] = (block) => [
    `${sanitizeVar(block.getFieldValue("NAME"))}.seconds()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_while_is_busy"] = (block, generator) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const body = generator.statementToCode(block, "DO");
    return stmt(
      `while (${v}.isBusy() && opModeIsActive()) {\n${body}            idle();\n        }`
    );
  };

  gen.forBlock["ftc_touch_sensor_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(TouchSensor.class, "${hw}")`);
  };
  gen.forBlock["ftc_touch_sensor_is_pressed"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.isPressed()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_distance_sensor_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(DistanceSensor.class, "${hw}")`);
  };
  gen.forBlock["ftc_distance_sensor_cm"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.getDistance(DistanceUnit.CM)`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_color_sensor_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(ColorSensor.class, "${hw}")`);
  };
  gen.forBlock["ftc_color_sensor_red"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.red()`,
    Order.ATOMIC,
  ];
  gen.forBlock["ftc_imu_hw_get"] = (block) => {
    const v = sanitizeVar(getDeviceVarName(block));
    const hw = getDeviceHwName(block);
    return stmt(`${v} = hardwareMap.get(IMU.class, "${hw}")`);
  };
  gen.forBlock["ftc_imu_yaw_degrees"] = (block) => [
    `${sanitizeVar(getDeviceVarName(block))}.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES)`,
    Order.ATOMIC,
  ];
}

export function getJavaGenerator(): JavaGenerator {
  if (!javaGenerator) {
    registerAllBlocks();
    javaGenerator = new JavaGenerator();
    registerBlockGenerators(javaGenerator);
  }
  return javaGenerator;
}

export function initBlocklyOnce(): void {
  registerAllBlocks();
  getJavaGenerator();
}

function findRunOpModeBlock(workspace: Blockly.Workspace): Block | null {
  for (const block of workspace.getTopBlocks(true)) {
    if (
      block.type === "procedures_defnoreturn" &&
      block.getFieldValue("NAME") === "runOpMode"
    ) {
      return block;
    }
  }
  return null;
}

function emitFields(
  workspace: Blockly.Workspace,
  devices: Map<string, DeviceDecl>
): string {
  const lines: string[] = [];
  const vars = workspace.getVariableMap()?.getAllVariables() ?? [];
  for (const v of vars) {
    const name = sanitizeVar(v.name);
    const type = v.type;
    const javaType =
      type === "Boolean"
        ? "boolean"
        : type === "String"
          ? "String"
          : "double";
    lines.push(`    private ${javaType} ${name};`);
  }
  for (const d of devices.values()) {
    lines.push(`    private ${d.javaType} ${d.varName};`);
  }
  return lines.length ? `${lines.join("\n")}\n\n` : "";
}

export function generateJavaFromWorkspace(
  workspace: Blockly.Workspace,
  meta: BlocklyChallengeMeta
): string {
  const gen = getJavaGenerator();
  const runBlock = findRunOpModeBlock(workspace);
  if (!runBlock) {
    return wrapOpModeSkeleton(meta, "", "        // Add a runOpMode block\n");
  }

  const devices = collectDevices(workspace);
  const fields = emitFields(workspace, devices);
  const body = gen.statementToCode(runBlock, "STACK");
  const sourceHint = body + fields;
  collectImports(meta, sourceHint);

  return wrapOpModeSkeleton(meta, fields, body);
}

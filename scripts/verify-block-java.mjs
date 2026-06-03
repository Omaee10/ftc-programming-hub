// Headless verification: build full solution workspaces for each in-scope
// Blocks challenge, generate Java via the real generator, and assert the output
// satisfies the universal + per-challenge rubric patterns the grader enforces.
//
// Run: node scripts/verify-block-java.mjs

import { generateJava } from "../src/lib/blockly/javaGenerator.ts";

// ── tiny serialization builders (mirror src/data/blockChallenges.ts) ─────────
function chain(nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = { block: nodes[i + 1] };
  return nodes[0];
}
function root(body) {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: "ftc_runopmode", inputs: { BODY: { block: chain(body) } } }],
    },
  };
}
const dev = (TYPE, CONFIG, VAR) => ({ type: "ftc_get_hardware", fields: { TYPE, CONFIG, VAR } });
const num = (NUM) => ({ block: { type: "ftc_number", fields: { NUM: String(NUM) } } });
const axis = (AXIS) => ({ block: { type: "ftc_gamepad_axis", fields: { AXIS } } });
const button = (BTN) => ({ block: { type: "ftc_gamepad_button", fields: { BTN } } });
const trigger = (TRIG) => ({ block: { type: "ftc_gamepad_trigger", fields: { TRIG } } });
const getv = (NAME) => ({ block: { type: "ftc_var_get", fields: { NAME } } });
const negate = (inner) => ({ block: { type: "ftc_negate", inputs: { VALUE: inner } } });
const deadzone = (inner, THRESH = "0.05") => ({
  block: { type: "ftc_deadzone", fields: { THRESH }, inputs: { VALUE: inner } },
});
const arith = (a, OP, b) => ({ block: { type: "ftc_arith", fields: { OP }, inputs: { A: a, B: b } } });
const mbin = (FN, a, b) => ({ block: { type: "ftc_math_binary", fields: { FN }, inputs: { A: a, B: b } } });
const compare = (a, OP, b) => ({ block: { type: "ftc_compare", fields: { OP }, inputs: { A: a, B: b } } });
const and = (a, b) => ({ block: { type: "ftc_and", inputs: { A: a, B: b } } });
const not = (v) => ({ block: { type: "ftc_not", inputs: { VALUE: v } } });
const motorPos = (VAR) => ({ block: { type: "ftc_motor_position", fields: { VAR } } });
const motorVel = (VAR) => ({ block: { type: "ftc_motor_velocity", fields: { VAR } } });
const isBusy = (VAR) => ({ block: { type: "ftc_motor_isbusy", fields: { VAR } } });
const timerSec = (NAME) => ({ block: { type: "ftc_timer_seconds", fields: { NAME } } });
const touchPressed = (VAR) => ({ block: { type: "ftc_touch_pressed", fields: { VAR } } });
const ternary = (c, a, b) => ({ block: { type: "ftc_ternary", inputs: { COND: c, A: a, B: b } } });
const callTtd = (t) => ({ block: { type: "ftc_call_tickstodeg", inputs: { TICKS: t } } });
const boolLit = (B) => ({ block: { type: "ftc_boolean", fields: { BOOL: B } } });

const setPower = (VAR, val) => ({ type: "ftc_set_power", fields: { VAR }, inputs: { VALUE: val } });
const setPos = (VAR, val) => ({ type: "ftc_set_position", fields: { VAR }, inputs: { VALUE: val } });
const setVel = (VAR, val) => ({ type: "ftc_set_velocity", fields: { VAR }, inputs: { VALUE: val } });
const setDir = (VAR, DIR) => ({ type: "ftc_set_direction", fields: { VAR, DIR } });
const setZero = (VAR, MODE) => ({ type: "ftc_set_zeropower", fields: { VAR, MODE } });
const resetEncoder = (VAR) => ({ type: "ftc_reset_encoder", fields: { VAR } });
const runToPos = (VAR, target, power) => ({
  type: "ftc_run_to_position",
  fields: { VAR },
  inputs: { VALUE: target, POWER: power },
});
const setTarget = (VAR, val) => ({ type: "ftc_set_target", fields: { VAR }, inputs: { VALUE: val } });
const declVar = (VTYPE, NAME, init) => ({ type: "ftc_declare_var", fields: { VTYPE, NAME }, inputs: { INIT: init } });
const declConst = (VTYPE, NAME, init) => ({ type: "ftc_declare_const", fields: { VTYPE, NAME }, inputs: { INIT: init } });
const assign = (NAME, val) => ({ type: "ftc_assign", fields: { NAME }, inputs: { VALUE: val } });
const incr = (NAME) => ({ type: "ftc_increment", fields: { NAME } });
const newTimer = (NAME) => ({ type: "ftc_new_timer", fields: { NAME } });
const resetTimer = (NAME) => ({ type: "ftc_timer_reset", fields: { NAME } });
const teleAdd = (CAPTION, val) => ({ type: "ftc_telemetry_add", fields: { CAPTION }, inputs: { VALUE: val } });
const teleLine = (TEXT) => ({ type: "ftc_telemetry_addline", fields: { TEXT } });
const teleUpd = () => ({ type: "ftc_telemetry_update" });
const wait = () => ({ type: "ftc_wait_for_start" });
const idle = () => ({ type: "ftc_idle" });
const sleep = (ms) => ({ type: "ftc_sleep", inputs: { MS: num(ms) } });
const whileActive = (body) => ({ type: "ftc_while_active", inputs: { DO: { block: chain(body) } } });
const whileCond = (cond, body) => ({ type: "ftc_while_condition", inputs: { COND: cond, DO: { block: chain(body) } } });
const whileInit = (body) => ({ type: "ftc_while_init", inputs: { DO: { block: chain(body) } } });
const ifDo = (cond, body, elseBody) => {
  const b = { type: "ftc_if", inputs: { COND: cond, DO: { block: chain(body) } } };
  if (elseBody) b.inputs.ELSE = { block: chain(elseBody) };
  return b;
};
const defNorm = () => ({ type: "ftc_def_normalize" });
const callNorm = (fl, fr, bl, br, M0, M1, M2, M3) => ({
  type: "ftc_call_normalize",
  fields: { M0, M1, M2, M3 },
  inputs: { FL: fl, FR: fr, BL: bl, BR: br },
});
const defTtd = () => ({ type: "ftc_def_tickstodeg" });

const TELE = "import com.qualcomm.robotcore.eventloop.opmode.TeleOp;";
const AUTO = "import com.qualcomm.robotcore.eventloop.opmode.Autonomous;";
const IMPORTS = [
  "import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;",
  TELE,
  AUTO,
  "import com.qualcomm.robotcore.hardware.DcMotor;",
  "import com.qualcomm.robotcore.hardware.DcMotorEx;",
  "import com.qualcomm.robotcore.hardware.DcMotorSimple;",
  "import com.qualcomm.robotcore.hardware.Servo;",
  "import com.qualcomm.robotcore.hardware.CRServo;",
  "import com.qualcomm.robotcore.hardware.TouchSensor;",
  "import com.qualcomm.robotcore.util.ElapsedTime;",
  "import com.qualcomm.robotcore.util.Range;",
];
const frame = (className, kind = "TeleOp") => ({
  className,
  annotation: kind === "Autonomous" ? `@Autonomous(name = "x")` : `@TeleOp(name = "x")`,
  imports: IMPORTS,
});

// Fresh device nodes each call — chain() mutates `.next`, so a shared array
// would let later solutions overwrite earlier ones.
const mec = () => [
  dev("DcMotorEx", "front_left", "frontLeft"),
  dev("DcMotorEx", "front_right", "frontRight"),
  dev("DcMotorEx", "back_left", "backLeft"),
  dev("DcMotorEx", "back_right", "backRight"),
];

// ── Full solution workspaces per challenge ───────────────────────────────────
const SOLUTIONS = {
  1: root([
    dev("DcMotorEx", "left_motor", "leftMotor"),
    setDir("leftMotor", "REVERSE"),
    wait(),
    whileActive([
      declVar("double", "power", deadzone(negate(axis("left_stick_y")))),
      setPower("leftMotor", getv("power")),
      teleAdd("Power", getv("power")),
      teleUpd(),
    ]),
  ]),
  2: root([
    dev("DcMotorEx", "drive_motor", "driveMotor"),
    wait(),
    resetEncoder("driveMotor"),
    runToPos("driveMotor", num(1000), num(0.6)),
    whileCond(isBusy("driveMotor"), [
      teleAdd("Pos", motorPos("driveMotor")),
      teleUpd(),
      idle(),
    ]),
    setPower("driveMotor", num(0)),
  ]),
  3: root([
    dev("DcMotorEx", "left_motor", "leftMotor"),
    dev("DcMotorEx", "right_motor", "rightMotor"),
    setDir("rightMotor", "REVERSE"),
    newTimer("timer"),
    wait(),
    resetTimer("timer"),
    whileCond(compare(timerSec("timer"), "<", num(2.0)), [
      setPower("leftMotor", num(0.5)),
      setPower("rightMotor", num(0.5)),
      teleAdd("Time", timerSec("timer")),
      teleUpd(),
    ]),
    setPower("leftMotor", num(0)),
    setPower("rightMotor", num(0)),
  ]),
  6: root([
    dev("DcMotorEx", "left_drive", "leftMotor"),
    dev("DcMotorEx", "right_drive", "rightMotor"),
    setDir("rightMotor", "REVERSE"),
    wait(),
    whileActive([
      declVar("double", "leftPower", deadzone(negate(axis("left_stick_y")))),
      declVar("double", "rightPower", deadzone(negate(axis("right_stick_y")))),
      setPower("leftMotor", getv("leftPower")),
      setPower("rightMotor", getv("rightPower")),
      teleAdd("L", getv("leftPower")),
      teleUpd(),
    ]),
  ]),
  7: root([
    dev("Servo", "blocker_servo", "blockerServo"),
    wait(),
    whileActive([
      ifDo(button("a"), [setPos("blockerServo", num(1.0))], [setPos("blockerServo", num(0.0))]),
      teleAdd("Pos", num(0)),
      teleUpd(),
    ]),
  ]),
  8: root([
    dev("CRServo", "intake_servo", "intakeServo"),
    wait(),
    whileActive([
      setPower("intakeServo", trigger("right_trigger")),
      teleAdd("Intake", trigger("right_trigger")),
      teleUpd(),
    ]),
  ]),
  9: root([
    dev("DcMotorEx", "drive_motor", "driveMotor"),
    newTimer("runtime"),
    declVar("double", "loopCount", num(0)),
    wait(),
    whileActive([
      incr("loopCount"),
      teleLine("--- Dashboard ---"),
      teleAdd("Loops", getv("loopCount")),
      teleAdd("Runtime", timerSec("runtime")),
      teleAdd("Pos", motorPos("driveMotor")),
      teleAdd("Status", boolLit("true")),
      teleUpd(),
    ]),
  ]),
  10: root([
    dev("CRServo", "intake_servo", "intakeServo"),
    declVar("boolean", "lastAButton", boolLit("false")),
    declVar("boolean", "intakeRunning", boolLit("false")),
    wait(),
    whileActive([
      ifDo(and(button("a"), not(getv("lastAButton"))), [
        assign("intakeRunning", not(getv("intakeRunning"))),
      ]),
      setPower("intakeServo", ternary(getv("intakeRunning"), num(1.0), num(0.0))),
      assign("lastAButton", button("a")),
      teleAdd("Running", getv("intakeRunning")),
      teleUpd(),
    ]),
  ]),
  11: root([
    dev("DcMotorEx", "drive_motor", "driveMotor"),
    newTimer("timer"),
    wait(),
    resetTimer("timer"),
    whileCond(compare(timerSec("timer"), "<", num(2.0)), [
      setPower("driveMotor", num(0.5)),
      teleAdd("Time", timerSec("timer")),
      teleUpd(),
    ]),
    setPower("driveMotor", num(0)),
  ]),
  12: root([
    dev("DcMotorEx", "drive_motor", "driveMotor"),
    wait(),
    whileActive([
      ifDo(button("x"), [setZero("driveMotor", "BRAKE")], [setZero("driveMotor", "FLOAT")]),
      setPower("driveMotor", num(0)),
      teleAdd("Mode", num(0)),
      teleUpd(),
    ]),
  ]),
  13: root([
    declVar("boolean", "isRedAlliance", boolLit("true")),
    whileInit([
      ifDo(button("b"), [assign("isRedAlliance", boolLit("true"))]),
      ifDo(button("x"), [assign("isRedAlliance", boolLit("false"))]),
      teleAdd("Alliance", getv("isRedAlliance")),
      teleUpd(),
    ]),
    wait(),
    whileActive([teleAdd("Alliance", getv("isRedAlliance")), teleUpd()]),
  ]),
  14: root([
    dev("DcMotorEx", "drive_motor", "driveMotor"),
    wait(),
    resetEncoder("driveMotor"),
    runToPos("driveMotor", num(2000), num(0.5)),
    whileCond(isBusy("driveMotor"), [teleAdd("Pos", motorPos("driveMotor")), teleUpd(), idle()]),
    setPower("driveMotor", num(0)),
  ]),
  16: root([
    dev("DcMotorEx", "turret_motor", "turretMotor"),
    dev("TouchSensor", "touch_sensor", "touchSensor"),
    wait(),
    whileCond(not(touchPressed("touchSensor")), [
      setPower("turretMotor", num(-0.3)),
      teleAdd("Homing", num(0)),
      teleUpd(),
      idle(),
    ]),
    setPower("turretMotor", num(0)),
    resetEncoder("turretMotor"),
  ]),
  17: root([
    ...mec(),
    setDir("frontLeft", "REVERSE"),
    setDir("backLeft", "REVERSE"),
    defNorm(),
    wait(),
    whileActive([
      declVar("double", "drive", deadzone(negate(axis("left_stick_y")))),
      declVar("double", "strafe", axis("left_stick_x")),
      declVar("double", "turn", axis("right_stick_x")),
      callNorm(
        arith(arith(getv("drive"), "+", getv("strafe")), "+", getv("turn")),
        arith(arith(getv("drive"), "-", getv("strafe")), "-", getv("turn")),
        arith(arith(getv("drive"), "-", getv("strafe")), "+", getv("turn")),
        arith(arith(getv("drive"), "+", getv("strafe")), "-", getv("turn")),
        "frontLeft", "frontRight", "backLeft", "backRight"
      ),
      teleUpd(),
    ]),
  ]),
  18: root([
    ...mec(),
    setDir("frontLeft", "REVERSE"),
    setDir("backLeft", "REVERSE"),
    defNorm(),
    wait(),
    whileActive([
      declVar("double", "drive", negate(axis("left_stick_y"))),
      declVar("double", "strafe", axis("left_stick_x")),
      declVar("double", "turn", axis("right_stick_x")),
      callNorm(
        arith(arith(getv("drive"), "+", getv("strafe")), "+", getv("turn")),
        arith(arith(getv("drive"), "-", getv("strafe")), "-", getv("turn")),
        arith(arith(getv("drive"), "-", getv("strafe")), "+", getv("turn")),
        arith(arith(getv("drive"), "+", getv("strafe")), "-", getv("turn")),
        "frontLeft", "frontRight", "backLeft", "backRight"
      ),
      teleUpd(),
    ]),
  ]),
  20: root([
    ...mec(),
    setDir("frontLeft", "REVERSE"),
    setDir("backLeft", "REVERSE"),
    wait(),
    declVar("double", "strafe", num(0.6)),
    setPower("frontLeft", getv("strafe")),
    setPower("frontRight", getv("strafe")),
    setPower("backLeft", getv("strafe")),
    setPower("backRight", getv("strafe")),
    sleep(1000),
    setPower("frontLeft", num(0)),
    setPower("frontRight", num(0)),
    setPower("backLeft", num(0)),
    setPower("backRight", num(0)),
    sleep(500),
    teleAdd("Done", num(0)),
    teleUpd(),
  ]),
  21: root([
    ...mec(),
    declConst("double", "DEADBAND", num(0.05)),
    wait(),
    whileActive([
      declVar("double", "drive", negate(axis("left_stick_y"))),
      declVar("double", "strafe", axis("left_stick_x")),
      declVar("double", "magnitude", mbin("hypot", getv("drive"), getv("strafe"))),
      ifDo(
        compare(getv("magnitude"), "<", getv("DEADBAND")),
        [
          setPower("frontLeft", num(0)),
          setPower("frontRight", num(0)),
          setPower("backLeft", num(0)),
          setPower("backRight", num(0)),
        ],
        [
          setPower("frontLeft", getv("drive")),
          setPower("frontRight", getv("drive")),
          setPower("backLeft", getv("drive")),
          setPower("backRight", getv("drive")),
        ]
      ),
      teleAdd("Magnitude", getv("magnitude")),
      teleUpd(),
    ]),
  ]),
  22: root([
    dev("DcMotorEx", "shooter_motor", "shooterMotor"),
    resetEncoder("shooterMotor"),
    wait(),
    whileActive([
      setVel("shooterMotor", num(1500)),
      teleAdd("Velocity", motorVel("shooterMotor")),
      teleUpd(),
    ]),
  ]),
  23: root([
    dev("DcMotorEx", "turret_motor", "turretMotor"),
    declConst("double", "Kp", num(0.01)),
    declVar("double", "targetPosition", num(500)),
    wait(),
    whileActive([
      declVar("double", "currentPosition", motorPos("turretMotor")),
      declVar("double", "error", arith(getv("targetPosition"), "-", getv("currentPosition"))),
      declVar("double", "power", mbin("max", num(-0.8), mbin("min", num(0.8), arith(getv("Kp"), "*", getv("error"))))),
      setPower("turretMotor", getv("power")),
      teleAdd("error", getv("error")),
      teleAdd("power", getv("power")),
      teleUpd(),
    ]),
  ]),
  24: root([
    dev("DcMotorEx", "turret_motor", "turretMotor"),
    declConst("double", "TICKS_PER_REV", num(537.7)),
    declConst("double", "GEAR_RATIO", num(1.0)),
    defTtd(),
    wait(),
    whileActive([
      declVar("double", "ticks", motorPos("turretMotor")),
      declVar("double", "degrees", callTtd(getv("ticks"))),
      teleAdd("Ticks", getv("ticks")),
      teleAdd("Degrees", getv("degrees")),
      teleUpd(),
    ]),
  ]),
};

const KINDS = { 2: "Autonomous", 3: "Autonomous", 14: "Autonomous", 20: "Autonomous" };

// ── Rubric assertions per challenge (universal + per-challenge) ──────────────
const re = (p) => (s) => p.test(s);
const has = (sub) => (s) => s.includes(sub);

const UNIVERSAL = [
  ["extends LinearOpMode", has("extends LinearOpMode")],
  ["runOpMode()", re(/public\s+void\s+runOpMode\s*\(/)],
  ["waitForStart()", has("waitForStart()")],
  ["no while(true)", (s) => !/while\s*\(\s*true\s*\)/.test(s)],
  ["no Thread.sleep", (s) => !/Thread\.sleep/.test(s)],
  ["@TeleOp or @Autonomous", re(/@(TeleOp|Autonomous)/)],
  ["balanced braces", (s) => (s.match(/{/g) || []).length === (s.match(/}/g) || []).length],
  ["balanced parens", (s) => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length],
];

const CHK = {
  1: [["DcMotor field", re(/private\s+DcMotorEx\s/)], ["neg left_stick_y", re(/-\s*gamepad1\.left_stick_y/)], ["setPower in loop", has(".setPower(")], ["setDirection", has(".setDirection(")], ["deadzone", re(/Math\.abs\([^)]+\)\s*<\s*0\./)]],
  2: [["reset->target->run order", re(/STOP_AND_RESET_ENCODER[\s\S]*setTargetPosition[\s\S]*RUN_TO_POSITION/)], ["nonzero power", re(/setPower\(\s*0?\.[1-9]/)], ["isBusy while+active", re(/while\s*\([^)]*isBusy\(\)[^)]*opModeIsActive/)], ["getCurrentPosition", has("getCurrentPosition(")]],
  3: [["ElapsedTime", has("new ElapsedTime()")], ["seconds compare", re(/\.seconds\(\)\s*<\s*\d/)], ["opModeIsActive loop", has("opModeIsActive()")], ["reverse one side", has(".setDirection(")], ["setPower 0 after", re(/setPower\(0\)/)]],
  6: [["two motors", (s) => (s.match(/private\s+DcMotorEx\s/g) || []).length >= 2], ["left stick y neg", re(/-\s*gamepad1\.left_stick_y/)], ["right stick y", has("gamepad1.right_stick_y")], ["2 setPower", (s) => (s.match(/\.setPower\(/g) || []).length >= 2], ["setDirection", has(".setDirection(")]],
  7: [["Servo from hardwareMap", re(/hardwareMap\.get\(\s*Servo/)], ["setPosition", has(".setPosition(")], ["no setPower on servo", (s) => !/blockerServo\.setPower/.test(s)], ["gamepad button", re(/gamepad1\.(a|b|x|y)/)]],
  8: [["CRServo", re(/private\s+CRServo\s/)], ["setPower", has(".setPower(")], ["no setPosition", (s) => !/intakeServo\.setPosition/.test(s)], ["trigger", has("gamepad1.right_trigger")]],
  9: [["ElapsedTime", has("new ElapsedTime()")], ["counter ++", has("++")], ["getCurrentPosition", has("getCurrentPosition(")], ["addLine", has(".addLine(")], [">=4 addData", (s) => (s.match(/\.addData\(/g) || []).length >= 4], ["update in loop", has("telemetry.update()")]],
  10: [["boolean field", re(/boolean\s+\w+/)], ["edge && !", re(/&&\s*!\w+/)], ["toggle var", re(/intakeRunning|toggle|running/)], ["CRServo + setPower", (s) => /CRServo/.test(s) && /\.setPower\(/.test(s)], ["= gamepad1.a", re(/=\s*gamepad1\.a/)]],
  11: [["ElapsedTime", has("new ElapsedTime()")], ["seconds in while", re(/while\s*\([^)]*\.seconds\(\)/)], ["reset", has(".reset()")], ["setPower 0", re(/setPower\(0\)/)]],
  12: [["setZeroPowerBehavior", has(".setZeroPowerBehavior(")], ["BRAKE", has("BRAKE")], ["FLOAT", has("FLOAT")], ["gamepad x", has("gamepad1.x")]],
  13: [["boolean alliance", re(/boolean\s+\w*[Aa]lliance|isRedAlliance/)], ["init loop", re(/while\s*\(\s*!isStarted/)], ["gamepad b", has("gamepad1.b")], ["gamepad x", has("gamepad1.x")], ["opModeIsActive while", re(/while\s*\(\s*opModeIsActive/)]],
  14: [["reset->target->run", re(/STOP_AND_RESET_ENCODER[\s\S]*setTargetPosition[\s\S]*RUN_TO_POSITION/)], ["isBusy while+active", re(/while\s*\([^)]*isBusy\(\)[^)]*opModeIsActive/)], ["setPower 0", re(/setPower\(0\)/)], ["RUN_USING_ENCODER", has("RUN_USING_ENCODER")]],
  16: [["TouchSensor", re(/private\s+TouchSensor\s/)], ["isPressed", has(".isPressed()")], ["while + active", re(/while\s*\([^)]*isPressed\(\)[^)]*opModeIsActive/)], ["STOP_AND_RESET_ENCODER", has("STOP_AND_RESET_ENCODER")], ["setPower 0", re(/setPower\(0\)/)]],
  17: [["4 motors", (s) => (s.match(/private\s+DcMotorEx\s/g) || []).length >= 4], ["left_stick_y", has("left_stick_y")], ["left_stick_x", has("left_stick_x")], ["right_stick_x", has("right_stick_x")], ["4 setPower", (s) => (s.match(/\.setPower\(/g) || []).length >= 4], ["Math.max/abs", re(/Math\.(max|abs)/)]],
  18: [["4 motors", (s) => (s.match(/private\s+DcMotorEx\s/g) || []).length >= 4], ["normalize defined", has("normalize(")], ["max>1", re(/max\s*>\s*1/)], ["Math.max", has("Math.max")], ["Math.abs", has("Math.abs")]],
  20: [["4 motors", (s) => (s.match(/private\s+DcMotorEx\s/g) || []).length >= 4], ["strafe", re(/strafe|left_stick_x/)], [">=2 sleep", (s) => (s.match(/sleep\(/g) || []).length >= 2], ["setPower 0 end", re(/setPower\(0\)/)]],
  21: [["4 motors", (s) => (s.match(/private\s+DcMotorEx\s/g) || []).length >= 4], ["hypot/sqrt", re(/Math\.(hypot|sqrt)/)], ["deadband", re(/0\.05|DEADBAND|deadband/)], ["magnitude addData", re(/addData\([^)]*[Mm]agnitude/)]],
  22: [["DcMotorEx", re(/private\s+DcMotorEx\s/)], ["setVelocity", has(".setVelocity(")], ["RUN_USING_ENCODER", has("RUN_USING_ENCODER")], ["getVelocity", has(".getVelocity()")]],
  23: [["error target-current", re(/(target|setpoint|goal)\w*\s*-\s*(current\w*|measured\w*|actual\w*|pos\b)/)], ["Kp*error", re(/Kp\s*\*\s*error|error\s*\*\s*Kp/)], ["clamp max..min", re(/Math\.max[\s\S]*Math\.min/)], [">=2 addData", (s) => (s.match(/\.addData\(/g) || []).length >= 2]],
  24: [["ticksToDegrees defined", re(/double\s+ticksToDegrees\s*\(/)], ["TICKS_PER_REV or 537.7", re(/TICKS_PER_REV|537\.7/)], ["ticksToDegrees called", re(/=\s*ticksToDegrees\(/)], ["getCurrentPosition", has("getCurrentPosition(")], ["addData", has(".addData(")]],
};

// ── Run ─────────────────────────────────────────────────────────────────────
let totalFail = 0;
const ids = Object.keys(SOLUTIONS).map(Number).sort((a, b) => a - b);
for (const id of ids) {
  const kind = KINDS[id] || "TeleOp";
  const java = generateJava(SOLUTIONS[id], frame(`Challenge${id}Blocks`, kind));
  const checks = [...UNIVERSAL, ...(CHK[id] || [])];
  const fails = checks.filter(([, fn]) => !fn(java)).map(([label]) => label);
  if (fails.length) {
    totalFail += fails.length;
    console.log(`\n❌ Challenge ${id}: ${fails.length} failing checks: ${fails.join(", ")}`);
    console.log("──── generated Java ────");
    console.log(java);
  } else {
    console.log(`✅ Challenge ${id}: all ${checks.length} checks pass`);
  }
}
console.log(`\n${totalFail === 0 ? "ALL GOOD" : "TOTAL FAILS: " + totalFail}`);
process.exit(totalFail === 0 ? 0 : 1);

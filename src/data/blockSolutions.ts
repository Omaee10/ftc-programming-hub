/**
 * Completed FTC Blocks workspaces for the mentor "Answer Key".
 *
 * These are the full solution layouts for every Blocks-enabled challenge
 * (the same 20 ids listed in `blockChallenges.ts`). They are rendered, locked,
 * inside the read-only Blockly canvas on the answer-key page so mentors can see
 * exactly how each challenge is solved with blocks.
 *
 * The serialization format mirrors the builders in `blockChallenges.ts` and
 * `scripts/verify-block-java.mjs` — plain Blockly workspace JSON that
 * `Blockly.serialization.workspaces.load()` understands.
 */

export type WorkspaceState = Record<string, unknown>;

interface SNode {
  type: string;
  fields?: Record<string, string>;
  inputs?: Record<string, VWrap>;
  next?: VWrap;
}
interface VWrap {
  block: SNode;
}

// ─── Serialization builders (typed port of verify-block-java.mjs) ────────────

function chain(nodes: SNode[]): SNode {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = { block: nodes[i + 1] };
  return nodes[0];
}
function root(body: SNode[]): WorkspaceState {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: "ftc_runopmode", inputs: { BODY: { block: chain(body) } } }],
    },
  };
}

const dev = (TYPE: string, CONFIG: string, VAR: string): SNode => ({
  type: "ftc_get_hardware",
  fields: { TYPE, CONFIG, VAR },
});
const num = (n: number): VWrap => ({ block: { type: "ftc_number", fields: { NUM: String(n) } } });
const axis = (AXIS: string): VWrap => ({ block: { type: "ftc_gamepad_axis", fields: { AXIS } } });
const button = (BTN: string): VWrap => ({ block: { type: "ftc_gamepad_button", fields: { BTN } } });
const trigger = (TRIG: string): VWrap => ({ block: { type: "ftc_gamepad_trigger", fields: { TRIG } } });
const getv = (NAME: string): VWrap => ({ block: { type: "ftc_var_get", fields: { NAME } } });
const negate = (inner: VWrap): VWrap => ({ block: { type: "ftc_negate", inputs: { VALUE: inner } } });
const deadzone = (inner: VWrap, THRESH = "0.05"): VWrap => ({
  block: { type: "ftc_deadzone", fields: { THRESH }, inputs: { VALUE: inner } },
});
const arith = (a: VWrap, OP: string, b: VWrap): VWrap => ({
  block: { type: "ftc_arith", fields: { OP }, inputs: { A: a, B: b } },
});
const mbin = (FN: string, a: VWrap, b: VWrap): VWrap => ({
  block: { type: "ftc_math_binary", fields: { FN }, inputs: { A: a, B: b } },
});
const compare = (a: VWrap, OP: string, b: VWrap): VWrap => ({
  block: { type: "ftc_compare", fields: { OP }, inputs: { A: a, B: b } },
});
const and = (a: VWrap, b: VWrap): VWrap => ({ block: { type: "ftc_and", inputs: { A: a, B: b } } });
const not = (v: VWrap): VWrap => ({ block: { type: "ftc_not", inputs: { VALUE: v } } });
const motorPos = (VAR: string): VWrap => ({ block: { type: "ftc_motor_position", fields: { VAR } } });
const servoPos = (VAR: string): VWrap => ({ block: { type: "ftc_servo_position", fields: { VAR } } });
const motorVel = (VAR: string): VWrap => ({ block: { type: "ftc_motor_velocity", fields: { VAR } } });
const isBusy = (VAR: string): VWrap => ({ block: { type: "ftc_motor_isbusy", fields: { VAR } } });
const timerSec = (NAME: string): VWrap => ({ block: { type: "ftc_timer_seconds", fields: { NAME } } });
const touchPressed = (VAR: string): VWrap => ({ block: { type: "ftc_touch_pressed", fields: { VAR } } });
const ternary = (c: VWrap, a: VWrap, b: VWrap): VWrap => ({
  block: { type: "ftc_ternary", inputs: { COND: c, A: a, B: b } },
});
const callTtd = (t: VWrap): VWrap => ({ block: { type: "ftc_call_tickstodeg", inputs: { TICKS: t } } });
const boolLit = (B: string): VWrap => ({ block: { type: "ftc_boolean", fields: { BOOL: B } } });

const setPower = (VAR: string, val: VWrap): SNode => ({
  type: "ftc_set_power",
  fields: { VAR },
  inputs: { VALUE: val },
});
const setPos = (VAR: string, val: VWrap): SNode => ({
  type: "ftc_set_position",
  fields: { VAR },
  inputs: { VALUE: val },
});
const setVel = (VAR: string, val: VWrap): SNode => ({
  type: "ftc_set_velocity",
  fields: { VAR },
  inputs: { VALUE: val },
});
const setDir = (VAR: string, DIR: string): SNode => ({ type: "ftc_set_direction", fields: { VAR, DIR } });
const setZero = (VAR: string, MODE: string): SNode => ({ type: "ftc_set_zeropower", fields: { VAR, MODE } });
const resetEncoder = (VAR: string): SNode => ({ type: "ftc_reset_encoder", fields: { VAR } });
const runToPos = (VAR: string, target: VWrap, power: VWrap): SNode => ({
  type: "ftc_run_to_position",
  fields: { VAR },
  inputs: { VALUE: target, POWER: power },
});
const declVar = (VTYPE: string, NAME: string, init: VWrap): SNode => ({
  type: "ftc_declare_var",
  fields: { VTYPE, NAME },
  inputs: { INIT: init },
});
const declConst = (VTYPE: string, NAME: string, init: VWrap): SNode => ({
  type: "ftc_declare_const",
  fields: { VTYPE, NAME },
  inputs: { INIT: init },
});
const assign = (NAME: string, val: VWrap): SNode => ({
  type: "ftc_assign",
  fields: { NAME },
  inputs: { VALUE: val },
});
const incr = (NAME: string): SNode => ({ type: "ftc_increment", fields: { NAME } });
const newTimer = (NAME: string): SNode => ({ type: "ftc_new_timer", fields: { NAME } });
const resetTimer = (NAME: string): SNode => ({ type: "ftc_timer_reset", fields: { NAME } });
const teleAdd = (CAPTION: string, val: VWrap): SNode => ({
  type: "ftc_telemetry_add",
  fields: { CAPTION },
  inputs: { VALUE: val },
});
const teleLine = (TEXT: string): SNode => ({ type: "ftc_telemetry_addline", fields: { TEXT } });
const teleUpd = (): SNode => ({ type: "ftc_telemetry_update" });
const wait = (): SNode => ({ type: "ftc_wait_for_start" });
const idle = (): SNode => ({ type: "ftc_idle" });
const sleep = (ms: number): SNode => ({ type: "ftc_sleep", inputs: { MS: num(ms) } });
const whileActive = (body: SNode[]): SNode => ({
  type: "ftc_while_active",
  inputs: { DO: { block: chain(body) } },
});
const whileCond = (cond: VWrap, body: SNode[]): SNode => ({
  type: "ftc_while_condition",
  inputs: { COND: cond, DO: { block: chain(body) } },
});
const whileInit = (body: SNode[]): SNode => ({
  type: "ftc_while_init",
  inputs: { DO: { block: chain(body) } },
});
const ifDo = (cond: VWrap, body: SNode[], elseBody?: SNode[]): SNode => {
  const b: SNode = { type: "ftc_if", inputs: { COND: cond, DO: { block: chain(body) } } };
  if (elseBody) b.inputs!.ELSE = { block: chain(elseBody) };
  return b;
};
const defNorm = (): SNode => ({ type: "ftc_def_normalize" });
const callNorm = (
  fl: VWrap,
  fr: VWrap,
  bl: VWrap,
  br: VWrap,
  M0: string,
  M1: string,
  M2: string,
  M3: string
): SNode => ({
  type: "ftc_call_normalize",
  fields: { M0, M1, M2, M3 },
  inputs: { FL: fl, FR: fr, BL: bl, BR: br },
});
const defTtd = (): SNode => ({ type: "ftc_def_tickstodeg" });

// Fresh device nodes each call — chain() mutates `.next`, so a shared array
// would let later solutions overwrite earlier ones.
const mec = (): SNode[] => [
  dev("DcMotorEx", "front_left", "frontLeft"),
  dev("DcMotorEx", "front_right", "frontRight"),
  dev("DcMotorEx", "back_left", "backLeft"),
  dev("DcMotorEx", "back_right", "backRight"),
];

// ─── Full solution workspaces per Blocks-enabled challenge ───────────────────

export const BLOCK_SOLUTIONS: Record<number, WorkspaceState> = {
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
    runToPos("driveMotor", num(500), num(0.6)),
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
      ifDo(button("a"), [setPos("blockerServo", num(0.0))]),
      ifDo(button("b"), [setPos("blockerServo", num(1.0))]),
      ifDo(button("x"), [setPos("blockerServo", num(0.5))]),
      teleAdd("Position", servoPos("blockerServo")),
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
        "frontLeft",
        "frontRight",
        "backLeft",
        "backRight"
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
        "frontLeft",
        "frontRight",
        "backLeft",
        "backRight"
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
      declVar(
        "double",
        "power",
        mbin("max", num(-0.8), mbin("min", num(0.8), arith(getv("Kp"), "*", getv("error"))))
      ),
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

export function getBlockSolution(id: number): WorkspaceState | undefined {
  return BLOCK_SOLUTIONS[id];
}

import * as Blockly from "blockly/core";

let registered = false;

const CALL = "ftc_call_blocks";
const SET = "ftc_setter_blocks";
const GET = "ftc_getter_blocks";
const PAD = "ftc_gamepad_blocks";
const COMMENT = "comment_blocks";
const LOOP = "loop_blocks";

export function registerFtcPrimitiveBlocks(): void {
  if (registered) return;
  registered = true;

  Blockly.common.defineBlocksWithJsonArray([
    {
      type: "ftc_comment",
      message0: "%1",
      args0: [
        {
          type: "field_input",
          name: "TEXT",
          text: "Put blocks here",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: COMMENT,
      tooltip: "Comment for you — the robot ignores this.",
    },
    {
      type: "ftc_call_wait_for_start",
      message0: "call waitForStart",
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_call_sleep",
      message0: "call sleep %1 ms",
      args0: [{ type: "field_number", name: "MS", value: 1000, min: 0 }],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_call_idle",
      message0: "call idle",
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_call_telemetry_update",
      message0: "call telemetry.update",
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_call_telemetry_add_data",
      message0: "call telemetry.addData %1 %2",
      args0: [
        { type: "field_input", name: "KEY", text: "Status" },
        { type: "input_value", name: "VALUE", check: ["Number", "String"] },
      ],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_reporter_op_mode_is_active",
      message0: "call opModeIsActive",
      output: "Boolean",
      style: CALL,
    },
    {
      type: "ftc_reporter_is_active",
      message0: "call isActive",
      output: "Boolean",
      style: CALL,
    },
    {
      type: "ftc_if_is_active",
      message0: "if call isActive %1",
      args0: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_gamepad_stick_y",
      message0: "gamepad1.%1",
      args0: [
        {
          type: "field_dropdown",
          name: "STICK",
          options: [
            ["LeftStickY", "left_stick_y"],
            ["LeftStickX", "left_stick_x"],
            ["RightStickY", "right_stick_y"],
            ["RightStickX", "right_stick_x"],
          ],
        },
      ],
      output: "Number",
      style: PAD,
    },
    {
      type: "ftc_gamepad_button",
      message0: "gamepad1.%1",
      args0: [
        {
          type: "field_dropdown",
          name: "BTN",
          options: [
            ["A", "a"],
            ["B", "b"],
            ["X", "x"],
            ["Y", "y"],
            ["left_bumper", "left_bumper"],
            ["right_bumper", "right_bumper"],
          ],
        },
      ],
      output: "Boolean",
      style: PAD,
    },
    {
      type: "ftc_gamepad_trigger",
      message0: "gamepad1.%1",
      args0: [
        {
          type: "field_dropdown",
          name: "TR",
          options: [
            ["left_trigger", "left_trigger"],
            ["right_trigger", "right_trigger"],
          ],
        },
      ],
      output: "Number",
      style: PAD,
    },
    {
      type: "ftc_dc_motor_set_power",
      message0: "set %1.Power to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        { type: "input_value", name: "POWER", check: "Number" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_get_power",
      message0: "%1.Power",
      args0: [{ type: "field_input", name: "VAR", text: "motor" }],
      output: "Number",
      style: GET,
    },
    {
      type: "ftc_dc_motor_set_mode",
      message0: "set %1.Mode to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["RUN_USING_ENCODER", "RUN_USING_ENCODER"],
            ["STOP_AND_RESET_ENCODER", "STOP_AND_RESET_ENCODER"],
            ["RUN_TO_POSITION", "RUN_TO_POSITION"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_set_target_position",
      message0: "set %1.TargetPosition to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        { type: "input_value", name: "TICKS", check: "Number" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_set_direction",
      message0: "set %1.Direction to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        {
          type: "field_dropdown",
          name: "DIR",
          options: [
            ["FORWARD", "FORWARD"],
            ["REVERSE", "REVERSE"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_set_zero_power",
      message0: "set %1.ZeroPowerBehavior to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        {
          type: "field_dropdown",
          name: "ZPB",
          options: [
            ["BRAKE", "BRAKE"],
            ["FLOAT", "FLOAT"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_get_position",
      message0: "%1.CurrentPosition",
      args0: [{ type: "field_input", name: "VAR", text: "motor" }],
      output: "Number",
      style: GET,
    },
    {
      type: "ftc_dc_motor_is_busy",
      message0: "%1.isBusy",
      args0: [{ type: "field_input", name: "VAR", text: "motor" }],
      output: "Boolean",
      style: GET,
    },
    {
      type: "ftc_dc_motor_hw_get",
      message0: "get %1 from hardwareMap DcMotor %2",
      args0: [
        { type: "field_input", name: "VAR", text: "leftMotor" },
        { type: "field_input", name: "HW", text: "left_motor" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_ex_hw_get",
      message0: "get %1 from hardwareMap DcMotorEx %2",
      args0: [
        { type: "field_input", name: "VAR", text: "shooterMotor" },
        { type: "field_input", name: "HW", text: "shooter_motor" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_dc_motor_ex_set_velocity",
      message0: "set %1.Velocity to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "shooterMotor" },
        { type: "input_value", name: "TPS", check: "Number" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_servo_set_position",
      message0: "set %1.Position to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "servo" },
        { type: "input_value", name: "POS", check: "Number" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_servo_hw_get",
      message0: "get %1 from hardwareMap Servo %2",
      args0: [
        { type: "field_input", name: "VAR", text: "blockerServo" },
        { type: "field_input", name: "HW", text: "blocker_servo" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_cr_servo_set_power",
      message0: "set %1.Power to %2",
      args0: [
        { type: "field_input", name: "VAR", text: "intakeServo" },
        { type: "input_value", name: "POWER", check: "Number" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_cr_servo_hw_get",
      message0: "get %1 from hardwareMap CRServo %2",
      args0: [
        { type: "field_input", name: "VAR", text: "intakeServo" },
        { type: "field_input", name: "HW", text: "intake_servo" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
    },
    {
      type: "ftc_elapsed_time_new",
      message0: "create ElapsedTime %1",
      args0: [{ type: "field_input", name: "NAME", text: "timer" }],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_elapsed_time_reset",
      message0: "%1.reset",
      args0: [{ type: "field_input", name: "NAME", text: "timer" }],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_elapsed_time_seconds",
      message0: "%1.seconds",
      args0: [{ type: "field_input", name: "NAME", text: "timer" }],
      output: "Number",
      style: GET,
    },
    {
      type: "ftc_while_is_busy",
      message0: "while %1.isBusy and opModeIsActive %2",
      args0: [
        { type: "field_input", name: "VAR", text: "motor" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: LOOP,
    },
  ]);
}

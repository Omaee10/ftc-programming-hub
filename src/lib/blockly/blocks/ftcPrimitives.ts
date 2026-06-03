import * as Blockly from "blockly/core";

let registered = false;

const CALL = "ftc_call_blocks";
const SET = "ftc_setter_blocks";
const GET = "ftc_getter_blocks";
const PAD = "ftc_gamepad_blocks";
const COMMENT = "comment_blocks";
const LOOP = "loop_blocks";

const DC_DEVICE = {
  type: "field_dropdown",
  name: "DEVICE",
  options: [["driveMotor", "drive_motor"]],
} as const;

const SERVO_DEVICE = {
  type: "field_dropdown",
  name: "DEVICE",
  options: [["blockerServo", "blocker_servo"]],
} as const;

const CR_DEVICE = {
  type: "field_dropdown",
  name: "DEVICE",
  options: [["intakeServo", "intake_servo"]],
} as const;

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
      message0: "call telemetry.addData  key %1  value %2",
      args0: [
        { type: "field_input", name: "KEY", text: "Status" },
        { type: "input_value", name: "VALUE", check: ["Number", "String"] },
      ],
      inputsInline: false,
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
      message0: "if call isActive  %1",
      args0: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: CALL,
    },
    {
      type: "ftc_repeat_while_op_mode",
      message0: "repeat while call opModeIsActive  %1",
      args0: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: LOOP,
    },
    {
      type: "ftc_gamepad_stick_y",
      message0: "gamepad1 %1",
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
      message0: "set %1 power to %2",
      args0: [DC_DEVICE, { type: "input_value", name: "POWER", check: "Number" }],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_get_power",
      message0: "%1 power",
      args0: [DC_DEVICE],
      output: "Number",
      style: GET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_set_mode",
      message0: "set %1 mode to %2",
      args0: [
        DC_DEVICE,
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
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_set_target_position",
      message0: "set %1 target position to %2",
      args0: [
        DC_DEVICE,
        { type: "input_value", name: "TICKS", check: "Number" },
      ],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_set_direction",
      message0: "set %1 direction to %2",
      args0: [
        DC_DEVICE,
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
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_set_zero_power",
      message0: "set %1 zero power behavior to %2",
      args0: [
        DC_DEVICE,
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
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_get_position",
      message0: "%1 current position",
      args0: [DC_DEVICE],
      output: "Number",
      style: GET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_is_busy",
      message0: "%1 isBusy",
      args0: [DC_DEVICE],
      output: "Boolean",
      style: GET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_hw_get",
      message0: "get %1 from hardwareMap DcMotor",
      args0: [{ ...DC_DEVICE, options: [["leftMotor", "left_motor"]] }],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_ex_hw_get",
      message0: "get %1 from hardwareMap DcMotorEx",
      args0: [{ ...DC_DEVICE, options: [["shooterMotor", "shooter_motor"]] }],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_dc_motor_ex_set_velocity",
      message0: "set %1 velocity to %2",
      args0: [
        { ...DC_DEVICE, options: [["shooterMotor", "shooter_motor"]] },
        { type: "input_value", name: "TPS", check: "Number" },
      ],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_servo_set_position",
      message0: "set %1 position to %2",
      args0: [
        SERVO_DEVICE,
        { type: "input_value", name: "POS", check: "Number" },
      ],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_servo_device_init"],
    },
    {
      type: "ftc_servo_hw_get",
      message0: "get %1 from hardwareMap Servo",
      args0: [SERVO_DEVICE],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_servo_device_init"],
    },
    {
      type: "ftc_cr_servo_set_power",
      message0: "set %1 power to %2",
      args0: [
        CR_DEVICE,
        { type: "input_value", name: "POWER", check: "Number" },
      ],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_cr_servo_device_init"],
    },
    {
      type: "ftc_cr_servo_hw_get",
      message0: "get %1 from hardwareMap CRServo",
      args0: [CR_DEVICE],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_cr_servo_device_init"],
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
      message0: "while %1 isBusy and opModeIsActive  %2",
      args0: [DC_DEVICE, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: LOOP,
      extensions: ["ftc_dc_device_init"],
    },
    {
      type: "ftc_touch_sensor_hw_get",
      message0: "get %1 from hardwareMap TouchSensor",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["touchSensor", "touch_sensor"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_touch_device_init"],
    },
    {
      type: "ftc_touch_sensor_is_pressed",
      message0: "%1 isPressed",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["touchSensor", "touch_sensor"]],
        },
      ],
      output: "Boolean",
      style: GET,
      extensions: ["ftc_touch_device_init"],
    },
    {
      type: "ftc_distance_sensor_hw_get",
      message0: "get %1 from hardwareMap DistanceSensor",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["distanceSensor", "distance_sensor"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_distance_device_init"],
    },
    {
      type: "ftc_distance_sensor_cm",
      message0: "%1 distance (cm)",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["distanceSensor", "distance_sensor"]],
        },
      ],
      output: "Number",
      style: GET,
      extensions: ["ftc_distance_device_init"],
    },
    {
      type: "ftc_color_sensor_hw_get",
      message0: "get %1 from hardwareMap ColorSensor",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["colorSensor", "color_sensor"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_color_device_init"],
    },
    {
      type: "ftc_color_sensor_red",
      message0: "%1 red channel",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["colorSensor", "color_sensor"]],
        },
      ],
      output: "Number",
      style: GET,
      extensions: ["ftc_color_device_init"],
    },
    {
      type: "ftc_imu_yaw_degrees",
      message0: "%1 yaw (degrees)",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["imu", "imu"]],
        },
      ],
      output: "Number",
      style: GET,
      extensions: ["ftc_imu_device_init"],
    },
    {
      type: "ftc_imu_hw_get",
      message0: "get %1 from hardwareMap IMU",
      args0: [
        {
          type: "field_dropdown",
          name: "HW",
          options: [["imu", "imu"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: SET,
      extensions: ["ftc_imu_device_init"],
    },
  ]);
}

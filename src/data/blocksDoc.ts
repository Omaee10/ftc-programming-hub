/**
 * Quick-reference documentation for FTC Blocks categories shown in the
 * ChallengeWorkspace "Docs" left-panel tab.
 *
 * Each category maps to one accordion section. Colours mirror CATEGORY_COLOUR
 * in ftcBlocks.ts so the panel visually matches the Blockly toolbox.
 */

export interface BlockDoc {
  /** Display name shown as the entry heading. */
  name: string;
  /** Short explanation of what the block does. */
  description: string;
  /** Optional Java equivalent shown in a code chip. */
  example?: string;
}

export interface DocCategory {
  id: string;
  label: string;
  /** Hex colour used for the left-border accent. */
  colour: string;
  blocks: BlockDoc[];
}

export const BLOCKS_DOC: DocCategory[] = [
  {
    id: "motors",
    label: "Motors",
    colour: "#5ba55b",
    blocks: [
      {
        name: "Set Power",
        description:
          "Sets how fast and in which direction a motor spins. Use a value from −1.0 (full reverse) to 1.0 (full forward). 0.0 stops the motor.",
        example: "motor.setPower(0.8);",
      },
      {
        name: "Set Direction",
        description:
          "Flips the motor's positive direction between FORWARD and REVERSE. Useful when two motors face opposite ways on a drive train.",
        example: "motor.setDirection(DcMotorSimple.Direction.REVERSE);",
      },
      {
        name: "Set Zero Power Behavior",
        description:
          "Controls what happens when power is set to 0. BRAKE locks the shaft in place; FLOAT lets it spin freely.",
        example: "motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
      },
      {
        name: "Reset Encoder",
        description:
          "Zeroes the encoder tick counter. Always reset before starting an encoder-based move so the target position is calculated from a known starting point.",
        example: "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
      },
      {
        name: "Set Target Position",
        description:
          "Tells the motor how many encoder ticks to travel. Call this after resetting the encoder and before switching to RUN_TO_POSITION mode.",
        example: "motor.setTargetPosition(1000);",
      },
      {
        name: "Run to Position",
        description:
          "Switches the motor into RUN_TO_POSITION mode so it drives toward the target set by Set Target Position. You still need to apply a non-zero power after calling this.",
        example: "motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);\nmotor.setPower(0.6);",
      },
      {
        name: "Is Busy",
        description:
          "Returns true while the motor is still traveling toward its target position. Use this inside a while loop to wait until the motor arrives, then set power to 0.",
        example: "while (motor.isBusy() && opModeIsActive()) { idle(); }\nmotor.setPower(0);",
      },
      {
        name: "Get Position",
        description:
          "Reads the current encoder tick count. Positive ticks move forward; the value is cumulative until you reset the encoder.",
        example: "int ticks = motor.getCurrentPosition();",
      },
      {
        name: "Set Velocity",
        description:
          "Sets the motor speed in encoder ticks per second using the built-in PID controller. Requires DcMotorEx and RUN_USING_ENCODER mode.",
        example: "motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);\n((DcMotorEx) motor).setVelocity(1500);",
      },
    ],
  },
  {
    id: "servos",
    label: "Servos",
    colour: "#a5825b",
    blocks: [
      {
        name: "Set Position (Servo)",
        description:
          "Moves a standard servo to an angle. The value is a fraction from 0.0 (one end) to 1.0 (the other end). 0.5 is the midpoint.",
        example: "servo.setPosition(0.5);",
      },
      {
        name: "Set Power (CRServo)",
        description:
          "Spins a continuous-rotation servo like a motor. Use 1.0 for full forward, −1.0 for full reverse, and 0.0 to stop. CRServos do not have position control.",
        example: "crServo.setPower(1.0);",
      },
    ],
  },
  {
    id: "gamepad",
    label: "Gamepad",
    colour: "#a5a55b",
    blocks: [
      {
        name: "Left Stick Y",
        description:
          "The up/down value of the left joystick on a range of −1.0 to 1.0. FTC inverts this axis, so pushing up returns a negative value — negate it for forward drive.",
        example: "double power = -gamepad1.left_stick_y;",
      },
      {
        name: "Left Stick X",
        description:
          "The left/right value of the left joystick on a range of −1.0 to 1.0. Negative is left, positive is right.",
        example: "double strafe = gamepad1.left_stick_x;",
      },
      {
        name: "Right Stick Y",
        description:
          "The up/down value of the right joystick, same inversion as the left stick.",
        example: "double power = -gamepad1.right_stick_y;",
      },
      {
        name: "Right Stick X",
        description:
          "The left/right value of the right joystick, useful for turning in tank drive setups.",
        example: "double turn = gamepad1.right_stick_x;",
      },
      {
        name: "Left Trigger / Right Trigger",
        description:
          "Analog trigger values from 0.0 (released) to 1.0 (fully pressed). Compare with a threshold like > 0.05 rather than == 1.0.",
        example: "if (gamepad1.right_trigger > 0.05) { intake.setPower(gamepad1.right_trigger); }",
      },
      {
        name: "Buttons (A / B / X / Y)",
        description:
          "Boolean values — true while the button is held. For one-shot toggles, use edge detection: check that the button is pressed AND was not pressed last loop.",
        example: "if (gamepad1.a && !lastA) { toggle = !toggle; }\nlastA = gamepad1.a;",
      },
      {
        name: "Bumpers (LB / RB)",
        description:
          "Boolean values for the left and right shoulder bumpers. Same usage as face buttons.",
        example: "if (gamepad1.left_bumper) { clawServo.setPosition(0.0); }",
      },
      {
        name: "D-Pad",
        description:
          "Four boolean values — dpad_up, dpad_down, dpad_left, dpad_right — for the directional pad.",
        example: "if (gamepad1.dpad_up) { armMotor.setPower(0.5); }",
      },
    ],
  },
  {
    id: "telemetry",
    label: "Telemetry",
    colour: "#5ba5a5",
    blocks: [
      {
        name: "Add Data",
        description:
          "Queues a key/value line to the Driver Station screen. Nothing appears until you call Update. Call this inside the loop for live data.",
        example: 'telemetry.addData("Power", motor.getPower());',
      },
      {
        name: "Add Line",
        description:
          "Queues a plain text line with no label. Useful for section headers or status messages.",
        example: 'telemetry.addLine("-- Drive Status --");',
      },
      {
        name: "Update",
        description:
          "Flushes all queued lines to the Driver Station screen. Call once at the end of every loop iteration. Without this, addData has no visible effect.",
        example: "telemetry.update();",
      },
    ],
  },
  {
    id: "sensors",
    label: "Sensors",
    colour: "#5b80a5",
    blocks: [
      {
        name: "Touch Sensor — Is Pressed",
        description:
          "Returns true when the digital touch sensor button is physically pressed. Use in an if block to trigger actions on contact.",
        example: "if (touchSensor.isPressed()) { motor.setPower(0); }",
      },
      {
        name: "Color Sensor — ARGB",
        description:
          "Returns the alpha, red, green, and blue channel values (0–255 each) from a REV color sensor. Compare channels to detect specific colors.",
        example: "int red = colorSensor.red();\nint blue = colorSensor.blue();",
      },
      {
        name: "Color Sensor — LED",
        description:
          "Turns the color sensor's built-in LED on or off. The LED must be on to reflect light off a surface for accurate color readings.",
        example: "colorSensor.enableLed(true);",
      },
      {
        name: "IMU — Heading (Yaw)",
        description:
          "Reads the robot's current yaw angle in degrees from the REV IMU (built into the Control Hub). Positive values are counter-clockwise.",
        example:
          "YawPitchRollAngles angles = imu.getRobotYawPitchRollAngles();\ndouble heading = angles.getYaw(AngleUnit.DEGREES);",
      },
    ],
  },
  {
    id: "math",
    label: "Math",
    colour: "#a55b5b",
    blocks: [
      {
        name: "Number",
        description:
          "A literal numeric value used as an input to other blocks. You can type any integer or decimal.",
        example: "double speed = 0.8;",
      },
      {
        name: "Arithmetic",
        description:
          "Adds, subtracts, multiplies, or divides two numbers. Choose the operator from the dropdown on the block.",
        example: "double result = a + b;\ndouble product = a * b;",
      },
      {
        name: "Negate",
        description:
          "Flips the sign of a number — positive becomes negative and vice versa. Use this to reverse a gamepad axis or motor direction.",
        example: "double power = -gamepad1.left_stick_y;",
      },
      {
        name: "Math Function (Unary)",
        description:
          "Applies a single-input math function to a value. Available functions: abs (absolute value), sqrt (square root), floor, ceil, round.",
        example: "double a = Math.abs(-0.5);  // → 0.5\ndouble b = Math.sqrt(9.0); // → 3.0",
      },
      {
        name: "Math Function (Binary)",
        description:
          "Applies a two-input math function. Available functions: max (larger of two), min (smaller of two), pow (raise to a power).",
        example: "double clamped = Math.max(-1.0, Math.min(1.0, power));",
      },
      {
        name: "Deadzone",
        description:
          "Returns 0 if the input is within ±threshold of zero, otherwise passes the value through unchanged. Prevents motors from creeping when a joystick is resting at a non-zero idle position.",
        example: "double out = Math.abs(x) > 0.05 ? x : 0.0;",
      },
      {
        name: "Ternary",
        description:
          "Returns one of two values based on a condition — a compact single-line if/else. If the condition is true the first value is used; otherwise the second.",
        example: "double power = triggered ? 0.8 : 0.0;",
      },
    ],
  },
];

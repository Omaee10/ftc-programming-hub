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
  /** Key into MINI_WORKSPACES for the inline block visual shown below the Java example. */
  miniWorkspaceKey?: string;
}

export interface DocQuestion {
  prompt: string;
  options: string[];
  /** Zero-based index of the correct option. */
  correctIndex: number;
  /** Short explanation shown after an answer is selected. */
  explanation: string;
}

export interface DocCategory {
  id: string;
  label: string;
  /** Hex colour used for the left-border accent. */
  colour: string;
  blocks: BlockDoc[];
  /** Two review questions shown at the bottom of the category panel. */
  questions: DocQuestion[];
}

export const BLOCKS_DOC: DocCategory[] = [
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
        miniWorkspaceKey: "math_number",
      },
      {
        name: "Arithmetic",
        description:
          "Adds, subtracts, multiplies, or divides two numbers. Choose the operator from the dropdown on the block.",
        example: "double result = a + b;\ndouble product = a * b;",
        miniWorkspaceKey: "math_arith",
      },
      {
        name: "Negate",
        description:
          "Flips the sign of a number — positive becomes negative and vice versa. Use this to reverse a gamepad axis or motor direction.",
        example: "double power = -gamepad1.left_stick_y;",
        miniWorkspaceKey: "math_negate",
      },
      {
        name: "Math Function (Unary)",
        description:
          "Applies a single-input math function to a value. Available functions: abs (absolute value), sqrt (square root), floor, ceil, round.",
        example: "double a = Math.abs(-0.5);  // → 0.5\ndouble b = Math.sqrt(9.0); // → 3.0",
        miniWorkspaceKey: "math_unary",
      },
      {
        name: "Math Function (Binary)",
        description:
          "Applies a two-input math function. Available functions: max (larger of two), min (smaller of two), pow (raise to a power).",
        example: "double clamped = Math.max(-1.0, Math.min(1.0, power));",
        miniWorkspaceKey: "math_binary",
      },
      {
        name: "Deadzone",
        description:
          "Returns 0 if the input is within ±threshold of zero, otherwise passes the value through unchanged. Prevents motors from creeping when a joystick is resting at a non-zero idle position.",
        example: "double out = Math.abs(x) > 0.05 ? x : 0.0;",
        miniWorkspaceKey: "math_deadzone",
      },
      {
        name: "Ternary",
        description:
          "Returns one of two values based on a condition — a compact single-line if/else. If the condition is true the first value is used; otherwise the second.",
        example: "double power = triggered ? 0.8 : 0.0;",
        miniWorkspaceKey: "math_ternary",
      },
    ],
    questions: [
      {
        prompt:
          "The left stick Y axis returns −0.9 when pushed forward. What block fixes this so the motor drives forward?",
        options: ["Arithmetic", "Negate", "Deadzone", "Ternary"],
        correctIndex: 1,
        explanation:
          "Negate flips the sign: −(−0.9) = 0.9, giving positive (forward) power. FTC inverts all Y-axes, so Negate is always needed on stick Y values.",
      },
      {
        prompt:
          "A joystick sitting at rest reads 0.03 instead of 0.0, causing the motor to creep. Which block eliminates this?",
        options: ["Negate", "Arithmetic", "Ternary", "Deadzone"],
        correctIndex: 3,
        explanation:
          "Deadzone returns 0 when the input is within ±threshold of zero. Setting the threshold to 0.05 means tiny resting drift values are treated as zero, stopping the creep.",
      },
    ],
  },
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
        miniWorkspaceKey: "motor_set_power",
      },
      {
        name: "Set Direction",
        description:
          "Flips the motor's positive direction between FORWARD and REVERSE. Useful when two motors face opposite ways on a drive train.",
        example: "motor.setDirection(DcMotorSimple.Direction.REVERSE);",
        miniWorkspaceKey: "motor_set_direction",
      },
      {
        name: "Set Zero Power Behavior",
        description:
          "Controls what happens when power is set to 0. BRAKE locks the shaft in place; FLOAT lets it spin freely.",
        example: "motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);",
        miniWorkspaceKey: "motor_set_zeropower",
      },
      {
        name: "Reset Encoder",
        description:
          "Zeroes the encoder tick counter. Always reset before starting an encoder-based move so the target position is calculated from a known starting point.",
        example: "motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);",
        miniWorkspaceKey: "motor_reset_encoder",
      },
      {
        name: "Set Target Position",
        description:
          "Tells the motor how many encoder ticks to travel. Call this after resetting the encoder and before switching to RUN_TO_POSITION mode.",
        example: "motor.setTargetPosition(1000);",
        miniWorkspaceKey: "motor_set_target",
      },
      {
        name: "Run to Position",
        description:
          "Switches the motor into RUN_TO_POSITION mode so it drives toward the target set by Set Target Position. You still need to apply a non-zero power after calling this.",
        example: "motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);\nmotor.setPower(0.6);",
        miniWorkspaceKey: "motor_run_to_position",
      },
      {
        name: "Is Busy",
        description:
          "Returns true while the motor is still traveling toward its target position. Use this inside a while loop to wait until the motor arrives, then set power to 0.",
        example: "while (motor.isBusy() && opModeIsActive()) { idle(); }\nmotor.setPower(0);",
        miniWorkspaceKey: "motor_isbusy",
      },
      {
        name: "Get Position",
        description:
          "Reads the current encoder tick count. Positive ticks move forward; the value is cumulative until you reset the encoder.",
        example: "int ticks = motor.getCurrentPosition();",
        miniWorkspaceKey: "motor_get_position",
      },
      {
        name: "Set Velocity",
        description:
          "Sets the motor speed in encoder ticks per second using the built-in PID controller. Requires DcMotorEx and RUN_USING_ENCODER mode.",
        example: "motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);\n((DcMotorEx) motor).setVelocity(1500);",
        miniWorkspaceKey: "motor_set_velocity",
      },
    ],
    questions: [
      {
        prompt:
          "A student puts hardwareMap.get() inside the while(opModeIsActive()) loop. What is wrong?",
        options: [
          "Nothing — it works fine anywhere",
          "It wastes time re-mapping hardware every frame instead of once during init",
          "hardwareMap only works after waitForStart()",
          "The motor name must be uppercase",
        ],
        correctIndex: 1,
        explanation:
          "Hardware should be mapped once during initialization (before waitForStart). Doing it every loop wastes time and is not how the FTC SDK is designed — map it once, then use it throughout the match.",
      },
      {
        prompt:
          "After a Run to Position move finishes (isBusy returns false), what must you do next?",
        options: [
          "Call resetEncoder() immediately",
          "Call waitForStart() again",
          "Set motor power to 0",
          "Nothing — the motor stops itself",
        ],
        correctIndex: 2,
        explanation:
          "After the motor reaches its target, you must call setPower(0). Without it the motor stays energized against the end stop, drawing excess current and potentially overheating.",
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
        miniWorkspaceKey: "servo_set_position",
      },
      {
        name: "Set Power (CRServo)",
        description:
          "Spins a continuous-rotation servo like a motor. Use 1.0 for full forward, −1.0 for full reverse, and 0.0 to stop. CRServos do not have position control.",
        example: "crServo.setPower(1.0);",
        miniWorkspaceKey: "servo_set_power",
      },
    ],
    questions: [
      {
        prompt: "A student calls servo.setPosition(180) expecting 180°. What actually happens?",
        options: [
          "The servo moves to 180 degrees",
          "The SDK clamps it to 1.0 (full range end) silently",
          "A runtime error is thrown",
          "The servo moves to the midpoint (0.5)",
        ],
        correctIndex: 1,
        explanation:
          "setPosition() accepts values from 0.0 to 1.0 — not degrees. Values above 1.0 are silently clamped to 1.0, so the servo moves to its maximum position rather than 180° of rotation.",
      },
      {
        prompt: "You want to spin an intake continuously. Which servo type and method is correct?",
        options: [
          "Servo — setPosition(0.5)",
          "Servo — setPower(1.0)",
          "CRServo — setPosition(0.5)",
          "CRServo — setPower(1.0)",
        ],
        correctIndex: 3,
        explanation:
          "CRServo (continuous rotation servo) spins like a motor and is controlled with setPower(). Standard Servo uses setPosition() for fixed angles. Using the wrong type or method will cause a compile error.",
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
        miniWorkspaceKey: "gamepad_left_stick_y",
      },
      {
        name: "Left Stick X",
        description:
          "The left/right value of the left joystick on a range of −1.0 to 1.0. Negative is left, positive is right.",
        example: "double strafe = gamepad1.left_stick_x;",
        miniWorkspaceKey: "gamepad_left_stick_x",
      },
      {
        name: "Right Stick Y",
        description:
          "The up/down value of the right joystick, same inversion as the left stick.",
        example: "double power = -gamepad1.right_stick_y;",
        miniWorkspaceKey: "gamepad_right_stick_y",
      },
      {
        name: "Right Stick X",
        description:
          "The left/right value of the right joystick, useful for turning in tank drive setups.",
        example: "double turn = gamepad1.right_stick_x;",
        miniWorkspaceKey: "gamepad_right_stick_x",
      },
      {
        name: "Left Trigger / Right Trigger",
        description:
          "Analog trigger values from 0.0 (released) to 1.0 (fully pressed). Compare with a threshold like > 0.05 rather than == 1.0.",
        example: "if (gamepad1.right_trigger > 0.05) { intake.setPower(gamepad1.right_trigger); }",
        miniWorkspaceKey: "gamepad_trigger",
      },
      {
        name: "Buttons (A / B / X / Y)",
        description:
          "Boolean values — true while the button is held. For one-shot toggles, use edge detection: check that the button is pressed AND was not pressed last loop.",
        example: "if (gamepad1.a && !lastA) { toggle = !toggle; }\nlastA = gamepad1.a;",
        miniWorkspaceKey: "gamepad_button",
      },
      {
        name: "Bumpers (LB / RB)",
        description:
          "Boolean values for the left and right shoulder bumpers. Same usage as face buttons.",
        example: "if (gamepad1.left_bumper) { clawServo.setPosition(0.0); }",
        miniWorkspaceKey: "gamepad_bumper",
      },
      {
        name: "D-Pad",
        description:
          "Four boolean values — dpad_up, dpad_down, dpad_left, dpad_right — for the directional pad.",
        example: "if (gamepad1.dpad_up) { armMotor.setPower(0.5); }",
        miniWorkspaceKey: "gamepad_dpad",
      },
    ],
    questions: [
      {
        prompt:
          "A student checks `if (gamepad1.a)` to toggle an intake on/off. The intake flickers rapidly when A is held. What is missing?",
        options: [
          "The button should use gamepad2 instead",
          "Edge detection — toggle only when A is newly pressed, not every frame",
          "A sleep(500) call after the toggle",
          "The intake variable should be declared inside the loop",
        ],
        correctIndex: 1,
        explanation:
          "Without edge detection, the toggle fires ~50 times per second while the button is held. Fix: check `gamepad1.a && !lastA` (rising edge only) and update `lastA = gamepad1.a` at the end of each loop.",
      },
      {
        prompt:
          "A student writes `if (gamepad1.right_trigger == 1.0)` to run the intake. The intake almost never activates. Why?",
        options: [
          "Triggers are boolean, not float",
          "Triggers return a float 0.0–1.0; == 1.0 rarely matches due to floating-point imprecision",
          "right_trigger is spelled wrong",
          "Triggers only work on gamepad2",
        ],
        correctIndex: 1,
        explanation:
          "Analog triggers return a float between 0.0 and 1.0. Comparing with == 1.0 requires an exact full press with no floating-point tolerance. Use > 0.05 (or similar threshold) to detect any meaningful press.",
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
        miniWorkspaceKey: "telemetry_add",
      },
      {
        name: "Add Line",
        description:
          "Queues a plain text line with no label. Useful for section headers or status messages.",
        example: 'telemetry.addLine("-- Drive Status --");',
        miniWorkspaceKey: "telemetry_addline",
      },
      {
        name: "Update",
        description:
          "Flushes all queued lines to the Driver Station screen. Call once at the end of every loop iteration. Without this, addData has no visible effect.",
        example: "telemetry.update();",
        miniWorkspaceKey: "telemetry_update",
      },
    ],
    questions: [
      {
        prompt:
          "A student calls telemetry.addData(\"Speed\", power) inside the loop but the Driver Station screen stays blank. What is missing?",
        options: [
          "The label \"Speed\" must be uppercase",
          "telemetry.update() is never called, so the buffer is never flushed",
          "addData must be called before waitForStart()",
          "power must be cast to String first",
        ],
        correctIndex: 1,
        explanation:
          "addData() only buffers lines — nothing appears on the Driver Station until telemetry.update() is called. Always end each loop iteration with telemetry.update().",
      },
      {
        prompt: "Where should telemetry.update() be placed for live match data?",
        options: [
          "Once after the while loop ends",
          "Before waitForStart()",
          "At the end of every while(opModeIsActive()) iteration",
          "At the very top of runOpMode()",
        ],
        correctIndex: 2,
        explanation:
          "Calling update() inside the loop refreshes the Driver Station screen every frame. Calling it after the loop means the screen only updates once — after the match is already over.",
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
        miniWorkspaceKey: "sensor_touch",
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
    questions: [
      {
        prompt:
          "A student checks `if (touchSensor.isPressed())` once outside the loop. It works once but never updates. What is wrong?",
        options: [
          "isPressed() can only be called during init",
          "Sensor reads must be inside the while(opModeIsActive()) loop to update every frame",
          "The sensor variable must be re-initialized each loop",
          "touchSensor requires DcMotorEx to work",
        ],
        correctIndex: 1,
        explanation:
          "Sensor reads are live values — they must be inside the loop to reflect the current state every frame. Reading outside the loop captures a single snapshot that never changes.",
      },
      {
        prompt:
          "The color sensor returns wrong values even though it is wired correctly. What should you check first?",
        options: [
          "Whether the sensor's LED is enabled",
          "Whether the motor is braking",
          "Whether waitForStart() was called twice",
          "Whether telemetry.update() is missing",
        ],
        correctIndex: 0,
        explanation:
          "The REV color sensor measures reflected light. If the built-in LED is off, the sensor has no light source and will return inaccurate or near-zero readings. Call colorSensor.enableLed(true) during initialization.",
      },
    ],
  },
];

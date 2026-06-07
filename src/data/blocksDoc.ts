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

export interface DocChallenge {
  /** Short task description shown above the workspace. */
  prompt: string;
  /** Optional hint shown in a collapsed section. */
  hint?: string;
  /** Blockly workspace JSON that the student starts from. */
  starterWorkspace: object;
}

export interface DocCategory {
  id: string;
  label: string;
  /** Hex colour used for the left-border accent. */
  colour: string;
  blocks: BlockDoc[];
  /** Two mini coding challenges shown at the bottom of the category panel. */
  challenges: DocChallenge[];
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
    challenges: [
      {
        prompt:
          "Set motor power to the left stick Y — but negate it first so pushing forward drives the motor forward.",
        hint: "Wrap the Gamepad Axis block inside a Negate block, then plug it into Set Power.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "motor", VAR: "motor" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: {
                                      block: {
                                        type: "ftc_set_power",
                                        fields: { VAR: "motor" },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Apply a deadzone of 0.05 to the left stick Y (negated) before setting motor power, so the motor stays still when the joystick rests near zero.",
        hint: "Wrap the Negate block inside a Deadzone block with threshold 0.05, then connect it to Set Power.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "motor", VAR: "motor" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: {
                                      block: {
                                        type: "ftc_set_power",
                                        fields: { VAR: "motor" },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ],
  },
  {
    id: "logic",
    label: "Logic",
    colour: "#5b80a5",
    blocks: [
      {
        name: "If / Else",
        description:
          "Runs the DO branch when the condition is true, and the ELSE branch when it is false. Leave the else branch empty if you only need one path.",
        example: "if (gamepad1.a) {\n  motor.setPower(0.5);\n} else {\n  motor.setPower(0.0);\n}",
        miniWorkspaceKey: "logic_if",
      },
      {
        name: "While (Custom Condition)",
        description:
          "Repeats a block of code as long as a condition AND opModeIsActive() are both true. Use this to wait for an encoder move to finish or a sensor threshold to be reached.",
        example: "while (motor.isBusy() && opModeIsActive()) {\n  idle();\n}",
        miniWorkspaceKey: "logic_while",
      },
      {
        name: "Compare",
        description:
          "Compares two values and returns true or false. Operators: < (less than), > (greater than), ≤, ≥, = (equal), ≠ (not equal). Use inside If conditions or While loops.",
        example: "if (motor.getCurrentPosition() > 500) { ... }",
        miniWorkspaceKey: "logic_compare",
      },
      {
        name: "And",
        description:
          "Returns true only when both connected conditions are true. Useful for requiring multiple buttons pressed simultaneously or combining a sensor check with a button.",
        example: "if (gamepad1.a && touchSensor.isPressed()) { ... }",
        miniWorkspaceKey: "logic_and",
      },
      {
        name: "Not",
        description:
          "Inverts a boolean — true becomes false and false becomes true. Use to wait until a condition is no longer true, e.g. while the motor is NOT busy.",
        example: "if (!motor.isBusy()) { motor.setPower(0); }",
        miniWorkspaceKey: "logic_not",
      },
    ],
    challenges: [
      {
        prompt:
          "Use an If/Else block to set the arm motor to 0.6 power when button A is pressed and 0.0 otherwise. Run this inside the main loop.",
        hint: "If block: condition = Gamepad Button A, DO = Set Power 0.6, ELSE = Set Power 0.0. Nest everything inside while active.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "arm", VAR: "arm" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: { block: { type: "ftc_if" } },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Drive the arm motor to position 800 using Run to Position, then use a While (Custom Condition) loop with isBusy to wait until it arrives. Cut power to 0 after.",
        hint: "Run to Position → While Condition (isBusy in the condition, idle inside) → Set Power 0.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "arm", VAR: "arm" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: { type: "ftc_wait_for_start" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
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
    challenges: [
      {
        prompt:
          "Get a motor named \"drive\" from hardwareMap, set it to BRAKE on zero power, then drive it forward at 0.7 power inside the loop.",
        hint: "Use Get Hardware → Set Zero Power Behavior (BRAKE) → Wait for Start → while active → Set Power with a Number block of 0.7.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "drive", VAR: "drive" },
                      next: {
                        block: {
                          type: "ftc_wait_for_start",
                          next: {
                            block: { type: "ftc_while_active" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Drive the motor \"arm\" to position 800 using Run to Position at power 0.5, wait until it arrives, then cut power to 0.",
        hint: "Use Run to Position (fills target + mode + power in one block), then a while isBusy loop with idle inside, then Set Power 0.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "arm", VAR: "arm" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: { type: "ftc_wait_for_start" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
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
        name: "Position of (Servo)",
        description:
          "Reads the servo's last commanded position (0.0–1.0) via getPosition(). Plug into Telemetry Add to display it on the Driver Station — it is not a physical sensor.",
        example: "telemetry.addData(\"Position\", servo.getPosition());",
        miniWorkspaceKey: "servo_get_position",
      },
      {
        name: "Set Power (CRServo)",
        description:
          "Spins a continuous-rotation servo like a motor. Use 1.0 for full forward, −1.0 for full reverse, and 0.0 to stop. CRServos do not have position control.",
        example: "crServo.setPower(1.0);",
        miniWorkspaceKey: "servo_set_power",
      },
    ],
    challenges: [
      {
        prompt:
          "When gamepad A is pressed move the claw servo to 0.1 (open). When B is pressed move it to 0.9 (closed).",
        hint: "Use an If block with Gamepad Button A in the condition → Set Position 0.1, then chain another If for button B → Set Position 0.9.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "Servo", CONFIG: "claw", VAR: "claw" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: { type: "ftc_while_active" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Spin the intake CRServo forward (1.0) while the right trigger is pressed, and stop it (0.0) otherwise. Use a Ternary block.",
        hint: "Ternary: condition = Gamepad Trigger right_trigger pressed (> 0), A = Number 1.0, B = Number 0.0. Plug into Set Power on the CRServo.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "CRServo", CONFIG: "intake", VAR: "intake" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: {
                                      block: {
                                        type: "ftc_set_power",
                                        fields: { VAR: "intake" },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
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
    challenges: [
      {
        prompt:
          "Build a tank drive: left motor power = negated left stick Y, right motor power = negated right stick Y. Add telemetry showing both stick values and update each loop.",
        hint: "Two Set Power blocks inside while active, each with a Negate wrapping the matching Gamepad Axis. Then Telemetry Add × 2 and Telemetry Update.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "left_motor", VAR: "leftMotor" },
                      next: {
                        block: {
                          type: "ftc_get_hardware",
                          fields: { TYPE: "DcMotorEx", CONFIG: "right_motor", VAR: "rightMotor" },
                          next: {
                            block: {
                              type: "ftc_init_telemetry",
                              fields: { MSG: "Ready" },
                              next: {
                                block: {
                                  type: "ftc_wait_for_start",
                                  next: {
                                    block: { type: "ftc_while_active" },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Use the right trigger to control intake power directly (0.0–1.0). When the left bumper is pressed, reverse the intake (−1.0). Use a Ternary block.",
        hint: "Ternary: condition = Left Bumper pressed, A = Number −1.0, B = Right Trigger value. Plug the whole thing into Set Power on the intake motor.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "intake", VAR: "intake" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: {
                                      block: {
                                        type: "ftc_set_power",
                                        fields: { VAR: "intake" },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
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
    challenges: [
      {
        prompt:
          "Display a section header line \"-- Motor Status --\", then show the motor's current position labelled \"Ticks\", and flush to the screen every loop.",
        hint: "Telemetry Line → Telemetry Add (Ticks, Motor Position block) → Telemetry Update, all inside while active.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "motor", VAR: "motor" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: { type: "ftc_while_active" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Show the left stick Y value labelled \"Stick\" and the motor power labelled \"Power\" every loop frame. Make sure both appear on the Driver Station.",
        hint: "Two Telemetry Add blocks inside the loop — one with Gamepad Axis left_stick_y, one with a Number or motor power — then Telemetry Update at the end.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "motor", VAR: "motor" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: {
                                  type: "ftc_while_active",
                                  inputs: {
                                    DO: {
                                      block: {
                                        type: "ftc_set_power",
                                        fields: { VAR: "motor" },
                                        inputs: {
                                          VALUE: {
                                            block: {
                                              type: "ftc_negate",
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: "ftc_gamepad_axis",
                                                    fields: { PAD: "gamepad1", AXIS: "left_stick_y" },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
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
    challenges: [
      {
        prompt:
          "Stop the arm motor when the touch sensor is pressed, and let the driver control it with the left stick Y when it is not pressed. Use an If/Else block.",
        hint: "If (touch sensor is pressed) → Set Power 0. Else → Set Power (negate left stick Y). Put both inside while active.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "DcMotorEx", CONFIG: "arm", VAR: "arm" },
                      next: {
                        block: {
                          type: "ftc_get_hardware",
                          fields: { TYPE: "TouchSensor", CONFIG: "limit_switch", VAR: "limitSwitch" },
                          next: {
                            block: {
                              type: "ftc_init_telemetry",
                              fields: { MSG: "Ready" },
                              next: {
                                block: {
                                  type: "ftc_wait_for_start",
                                  next: {
                                    block: { type: "ftc_while_active" },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        prompt:
          "Show whether the touch sensor is pressed (true/false) labelled \"Limit Hit\" in telemetry every loop frame.",
        hint: "Inside while active: Telemetry Add with caption \"Limit Hit\" and the Touch Sensor Is Pressed block as the value, then Telemetry Update.",
        starterWorkspace: {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: "ftc_runopmode",
                x: 24, y: 24, deletable: false,
                inputs: {
                  BODY: {
                    block: {
                      type: "ftc_get_hardware",
                      fields: { TYPE: "TouchSensor", CONFIG: "limit_switch", VAR: "limitSwitch" },
                      next: {
                        block: {
                          type: "ftc_init_telemetry",
                          fields: { MSG: "Ready" },
                          next: {
                            block: {
                              type: "ftc_wait_for_start",
                              next: {
                                block: { type: "ftc_while_active" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ],
  },
];

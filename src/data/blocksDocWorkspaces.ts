/**
 * Pre-built read-only Blockly workspace states for the FTC Blocks documentation
 * page. Each entry corresponds to one documentation category and shows a
 * realistic example of that category's blocks in a complete OpMode.
 *
 * The format is standard Blockly v10 workspace serialization JSON — the same
 * format used for starter states in blockChallenges.ts.
 */

import type { WorkspaceState } from "@/data/blockChallenges";

export const DOC_WORKSPACES: Record<string, WorkspaceState> = {

  // ── Motors ────────────────────────────────────────────────────────────────
  // Tank drive: two motors, set direction, BRAKE, encoder telemetry
  motors: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
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
                        type: "ftc_set_direction",
                        fields: { VAR: "rightMotor", DIR: "REVERSE" },
                        next: {
                          block: {
                            type: "ftc_set_zeropower",
                            fields: { VAR: "leftMotor", MODE: "BRAKE" },
                            next: {
                              block: {
                                type: "ftc_set_zeropower",
                                fields: { VAR: "rightMotor", MODE: "BRAKE" },
                                next: {
                                  block: {
                                    type: "ftc_init_telemetry",
                                    fields: { MSG: "Motors Ready" },
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
                                                  fields: { VAR: "leftMotor" },
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
                                                  next: {
                                                    block: {
                                                      type: "ftc_set_power",
                                                      fields: { VAR: "rightMotor" },
                                                      inputs: {
                                                        VALUE: {
                                                          block: {
                                                            type: "ftc_negate",
                                                            inputs: {
                                                              VALUE: {
                                                                block: {
                                                                  type: "ftc_gamepad_axis",
                                                                  fields: { PAD: "gamepad1", AXIS: "right_stick_y" },
                                                                },
                                                              },
                                                            },
                                                          },
                                                        },
                                                      },
                                                      next: {
                                                        block: {
                                                          type: "ftc_telemetry_add",
                                                          fields: { CAPTION: "Left ticks" },
                                                          inputs: {
                                                            VALUE: {
                                                              block: {
                                                                type: "ftc_motor_position",
                                                                fields: { VAR: "leftMotor" },
                                                              },
                                                            },
                                                          },
                                                          next: {
                                                            block: {
                                                              type: "ftc_telemetry_update",
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

  // ── Servos ────────────────────────────────────────────────────────────────
  // Standard servo preset + CRServo intake via trigger
  servos: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
          inputs: {
            BODY: {
              block: {
                type: "ftc_get_hardware",
                fields: { TYPE: "Servo", CONFIG: "claw_servo", VAR: "claw" },
                next: {
                  block: {
                    type: "ftc_get_hardware",
                    fields: { TYPE: "CRServo", CONFIG: "intake_servo", VAR: "intake" },
                    next: {
                      block: {
                        type: "ftc_init_telemetry",
                        fields: { MSG: "Servos Ready" },
                        next: {
                          block: {
                            type: "ftc_wait_for_start",
                            next: {
                              block: {
                                type: "ftc_while_active",
                                inputs: {
                                  DO: {
                                    block: {
                                      type: "ftc_if",
                                      inputs: {
                                        COND: {
                                          block: {
                                            type: "ftc_gamepad_button",
                                            fields: { PAD: "gamepad1", BTN: "a" },
                                          },
                                        },
                                        DO: {
                                          block: {
                                            type: "ftc_set_position",
                                            fields: { VAR: "claw" },
                                            inputs: {
                                              VALUE: {
                                                block: {
                                                  type: "ftc_number",
                                                  fields: { NUM: "0.1" },
                                                },
                                              },
                                            },
                                          },
                                        },
                                        ELSE: {
                                          block: {
                                            type: "ftc_if",
                                            inputs: {
                                              COND: {
                                                block: {
                                                  type: "ftc_gamepad_button",
                                                  fields: { PAD: "gamepad1", BTN: "b" },
                                                },
                                              },
                                              DO: {
                                                block: {
                                                  type: "ftc_set_position",
                                                  fields: { VAR: "claw" },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: "ftc_number",
                                                        fields: { NUM: "0.9" },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                      next: {
                                        block: {
                                          type: "ftc_set_power",
                                          fields: { VAR: "intake" },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: "ftc_gamepad_trigger",
                                                fields: { PAD: "gamepad1", TRIG: "right_trigger" },
                                              },
                                            },
                                          },
                                          next: {
                                            block: {
                                              type: "ftc_telemetry_update",
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

  // ── Gamepad ───────────────────────────────────────────────────────────────
  // Tank drive with deadzone + trigger intake + button toggle
  gamepad: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
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
                        fields: { MSG: "Gamepad Ready" },
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
                                      fields: { VAR: "leftMotor" },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: "ftc_deadzone",
                                            fields: { THRESH: "0.05" },
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
                                      next: {
                                        block: {
                                          type: "ftc_set_power",
                                          fields: { VAR: "rightMotor" },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: "ftc_deadzone",
                                                fields: { THRESH: "0.05" },
                                                inputs: {
                                                  VALUE: {
                                                    block: {
                                                      type: "ftc_negate",
                                                      inputs: {
                                                        VALUE: {
                                                          block: {
                                                            type: "ftc_gamepad_axis",
                                                            fields: { PAD: "gamepad1", AXIS: "right_stick_y" },
                                                          },
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                          next: {
                                            block: {
                                              type: "ftc_telemetry_add",
                                              fields: { CAPTION: "Trigger" },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: "ftc_gamepad_trigger",
                                                    fields: { PAD: "gamepad1", TRIG: "right_trigger" },
                                                  },
                                                },
                                              },
                                              next: {
                                                block: {
                                                  type: "ftc_telemetry_add",
                                                  fields: { CAPTION: "A pressed" },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: "ftc_gamepad_button",
                                                        fields: { PAD: "gamepad1", BTN: "a" },
                                                      },
                                                    },
                                                  },
                                                  next: {
                                                    block: {
                                                      type: "ftc_telemetry_update",
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
              },
            },
          },
        },
      ],
    },
  },

  // ── Telemetry ─────────────────────────────────────────────────────────────
  // Full telemetry dashboard: addLine, addData (position + velocity), update
  telemetry: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
          inputs: {
            BODY: {
              block: {
                type: "ftc_get_hardware",
                fields: { TYPE: "DcMotorEx", CONFIG: "drive_motor", VAR: "motor" },
                next: {
                  block: {
                    type: "ftc_init_telemetry",
                    fields: { MSG: "Ready — press START" },
                    next: {
                      block: {
                        type: "ftc_wait_for_start",
                        next: {
                          block: {
                            type: "ftc_while_active",
                            inputs: {
                              DO: {
                                block: {
                                  type: "ftc_telemetry_addline",
                                  fields: { TEXT: "--- Drive Status ---" },
                                  next: {
                                    block: {
                                      type: "ftc_telemetry_add",
                                      fields: { CAPTION: "Position" },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: "ftc_motor_position",
                                            fields: { VAR: "motor" },
                                          },
                                        },
                                      },
                                      next: {
                                        block: {
                                          type: "ftc_telemetry_add",
                                          fields: { CAPTION: "Velocity" },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: "ftc_motor_velocity",
                                                fields: { VAR: "motor" },
                                              },
                                            },
                                          },
                                          next: {
                                            block: {
                                              type: "ftc_telemetry_add",
                                              fields: { CAPTION: "Left stick Y" },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: "ftc_gamepad_axis",
                                                    fields: { PAD: "gamepad1", AXIS: "left_stick_y" },
                                                  },
                                                },
                                              },
                                              next: {
                                                block: {
                                                  type: "ftc_telemetry_update",
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
          },
        },
      ],
    },
  },

  // ── Sensors ───────────────────────────────────────────────────────────────
  // Touch sensor limit switch + color sensor red/blue detection
  sensors: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
          inputs: {
            BODY: {
              block: {
                type: "ftc_get_hardware",
                fields: { TYPE: "TouchSensor", CONFIG: "limit_switch", VAR: "limitSwitch" },
                next: {
                  block: {
                    type: "ftc_get_hardware",
                    fields: { TYPE: "DcMotorEx", CONFIG: "arm_motor", VAR: "arm" },
                    next: {
                      block: {
                        type: "ftc_init_telemetry",
                        fields: { MSG: "Sensors Ready" },
                        next: {
                          block: {
                            type: "ftc_wait_for_start",
                            next: {
                              block: {
                                type: "ftc_while_active",
                                inputs: {
                                  DO: {
                                    block: {
                                      type: "ftc_if",
                                      inputs: {
                                        COND: {
                                          block: {
                                            type: "ftc_touch_pressed",
                                            fields: { VAR: "limitSwitch" },
                                          },
                                        },
                                        DO: {
                                          block: {
                                            type: "ftc_set_power",
                                            fields: { VAR: "arm" },
                                            inputs: {
                                              VALUE: {
                                                block: {
                                                  type: "ftc_number",
                                                  fields: { NUM: "0" },
                                                },
                                              },
                                            },
                                          },
                                        },
                                        ELSE: {
                                          block: {
                                            type: "ftc_set_power",
                                            fields: { VAR: "arm" },
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
                                      next: {
                                        block: {
                                          type: "ftc_telemetry_add",
                                          fields: { CAPTION: "Limit hit" },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: "ftc_touch_pressed",
                                                fields: { VAR: "limitSwitch" },
                                              },
                                            },
                                          },
                                          next: {
                                            block: {
                                              type: "ftc_telemetry_update",
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

  // ── Math ──────────────────────────────────────────────────────────────────
  // Deadzone on both axes + clamp via max/min + ternary for slow mode
  math: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "ftc_runopmode",
          x: 24,
          y: 24,
          deletable: false,
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
                        fields: { MSG: "Math Example Ready" },
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
                                      fields: { VAR: "leftMotor" },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: "ftc_deadzone",
                                            fields: { THRESH: "0.05" },
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
                                      next: {
                                        block: {
                                          type: "ftc_set_power",
                                          fields: { VAR: "rightMotor" },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: "ftc_ternary",
                                                inputs: {
                                                  COND: {
                                                    block: {
                                                      type: "ftc_gamepad_button",
                                                      fields: { PAD: "gamepad1", BTN: "right_bumper" },
                                                    },
                                                  },
                                                  A: {
                                                    block: {
                                                      type: "ftc_deadzone",
                                                      fields: { THRESH: "0.05" },
                                                      inputs: {
                                                        VALUE: {
                                                          block: {
                                                            type: "ftc_negate",
                                                            inputs: {
                                                              VALUE: {
                                                                block: {
                                                                  type: "ftc_gamepad_axis",
                                                                  fields: { PAD: "gamepad1", AXIS: "right_stick_y" },
                                                                },
                                                              },
                                                            },
                                                          },
                                                        },
                                                      },
                                                    },
                                                  },
                                                  B: {
                                                    block: {
                                                      type: "ftc_math_binary",
                                                      fields: { FN: "max" },
                                                      inputs: {
                                                        A: {
                                                          block: {
                                                            type: "ftc_number",
                                                            fields: { NUM: "-0.4" },
                                                          },
                                                        },
                                                        B: {
                                                          block: {
                                                            type: "ftc_math_binary",
                                                            fields: { FN: "min" },
                                                            inputs: {
                                                              A: {
                                                                block: {
                                                                  type: "ftc_number",
                                                                  fields: { NUM: "0.4" },
                                                                },
                                                              },
                                                              B: {
                                                                block: {
                                                                  type: "ftc_negate",
                                                                  inputs: {
                                                                    VALUE: {
                                                                      block: {
                                                                        type: "ftc_gamepad_axis",
                                                                        fields: { PAD: "gamepad1", AXIS: "right_stick_y" },
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
                                          next: {
                                            block: {
                                              type: "ftc_telemetry_update",
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
};

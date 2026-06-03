/**
 * Per-challenge Blockly workspace XML (sidecar — does not modify challenges.ts copy).
 * Statement stacks chain blocks with <next> per Blockly XML rules.
 */

function chain(blocks: string[]): string {
  if (blocks.length === 0) return "";
  let result = blocks[0].trim();
  for (let i = 1; i < blocks.length; i++) {
    const nextBlock = blocks[i].trim();
    const closeIdx = result.lastIndexOf("</block>");
    if (closeIdx === -1) {
      result += nextBlock;
      continue;
    }
    result =
      result.slice(0, closeIdx) + `<next>${nextBlock}</next></block>`;
  }
  return result;
}

function programXml(
  fields: string[],
  methods: string[],
  init: string[],
  loop: string[]
): string {
  const f = chain(fields);
  const m = chain(methods);
  const i = chain(init);
  const l = chain(loop);
  return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="ftc_program" x="24" y="24">
    <statement name="FIELD_STACK">${f}</statement>
    <statement name="METHOD_STACK">${m}</statement>
    <statement name="INIT_STACK">${i}</statement>
    <statement name="LOOP_STACK">${l}</statement>
  </block>
</xml>`;
}

function blockDeclareMotor(name: string): string {
  return `<block type="ftc_declare_dc_motor">
      <field name="NAME">${name}</field>
    </block>`;
}

function blockHwMotor(varName: string, hw: string): string {
  return `<block type="ftc_hw_get_dc_motor">
      <field name="VAR">${varName}</field>
      <field name="HW">${hw}</field>
    </block>`;
}

function blockDeclareServo(name: string): string {
  return `<block type="ftc_declare_servo">
      <field name="NAME">${name}</field>
    </block>`;
}

function blockHwServo(varName: string, hw: string): string {
  return `<block type="ftc_hw_get_servo">
      <field name="VAR">${varName}</field>
      <field name="HW">${hw}</field>
    </block>`;
}

function blockStickPower(motor: string): string {
  return `<block type="ftc_motor_set_power_negated_stick">
      <field name="MOTOR">${motor}</field>
    </block>`;
}

function blockTelemetryUpdate(): string {
  return `<block type="ftc_telemetry_update"></block>`;
}

const DEFAULT = programXml(
  [],
  [],
  [],
  [
    `<block type="ftc_comment">
      <field name="TEXT">Add blocks from the toolbox</field>
    </block>`,
  ]
);

/** Challenge-specific Blockly starters for built-in ids 1–56. */
export const BLOCK_STARTERS: Record<number, string> = {
  1: programXml(
    [blockDeclareMotor("leftMotor")],
    [],
    [
      blockHwMotor("leftMotor", "left_motor"),
      `<block type="ftc_set_direction">
        <field name="MOTOR">leftMotor</field>
        <field name="DIR">FORWARD</field>
      </block>`,
    ],
    [blockStickPower("leftMotor"), blockTelemetryUpdate()]
  ),
  2: programXml(
    [blockDeclareMotor("driveMotor")],
    [],
    [blockHwMotor("driveMotor", "drive_motor")],
    [
      `<block type="ftc_encoder_move">
        <field name="MOTOR">driveMotor</field>
        <field name="TICKS">500</field>
        <field name="POWER">0.6</field>
      </block>`,
    ]
  ),
  3: programXml(
    [
      blockDeclareMotor("leftMotor"),
      blockDeclareMotor("rightMotor"),
      `<block type="ftc_declare_elapsed_time">
        <field name="NAME">timer</field>
      </block>`,
    ],
    [],
    [
      `<block type="ftc_elapsed_time_new">
        <field name="NAME">timer</field>
      </block>`,
      blockHwMotor("leftMotor", "left_motor"),
      blockHwMotor("rightMotor", "right_motor"),
    ],
    [
      `<block type="ftc_while_timer_seconds">
        <field name="TIMER">timer</field>
        <field name="SECONDS">2</field>
        <statement name="BODY">
          <block type="ftc_motor_set_power">
            <field name="MOTOR">leftMotor</field>
            <value name="POWER">
              <block type="ftc_number"><field name="NUM">0.5</field></block>
            </value>
            <next>
              <block type="ftc_motor_set_power">
                <field name="MOTOR">rightMotor</field>
                <value name="POWER">
                  <block type="ftc_number"><field name="NUM">0.5</field></block>
                </value>
              </block>
            </next>
          </block>
        </statement>
      </block>`,
      `<block type="ftc_motors_stop_zero">
        <field name="MOTORS">leftMotor, rightMotor</field>
      </block>`,
    ]
  ),
  4: programXml([], [], [], [
    `<block type="ftc_road_runner_trajectory">
      <field name="DRIVE">drive</field>
    </block>`,
  ]),
  5: programXml([], [], [], [
    `<block type="ftc_pedro_follow_path">
      <field name="FOLLOWER">follower</field>
    </block>`,
  ]),
  6: programXml(
    [blockDeclareMotor("leftDrive"), blockDeclareMotor("rightDrive")],
    [],
    [
      blockHwMotor("leftDrive", "left_drive"),
      blockHwMotor("rightDrive", "right_drive"),
    ],
    [blockStickPower("leftDrive"), blockStickPower("rightDrive"), blockTelemetryUpdate()]
  ),
  7: programXml(
    [blockDeclareServo("blockerServo")],
    [],
    [blockHwServo("blockerServo", "blocker_servo")],
    [
      `<block type="ftc_servo_set_position_button">
        <field name="BTN">a</field>
        <field name="SERVO">blockerServo</field>
        <field name="POS">1</field>
      </block>`,
      blockTelemetryUpdate(),
    ]
  ),
  8: programXml(
    [
      `<block type="ftc_declare_cr_servo">
        <field name="NAME">intakeServo</field>
      </block>`,
    ],
    [],
    [
      `<block type="ftc_hw_get_cr_servo">
        <field name="VAR">intakeServo</field>
        <field name="HW">intake_servo</field>
      </block>`,
    ],
    [
      `<block type="ftc_cr_servo_set_power_trigger">
        <field name="SERVO">intakeServo</field>
      </block>`,
      blockTelemetryUpdate(),
    ]
  ),
};

for (let id = 9; id <= 56; id++) {
  if (BLOCK_STARTERS[id]) continue;

  if ([17, 18, 19, 21, 30, 31, 32].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [
        blockDeclareMotor("frontLeft"),
        blockDeclareMotor("frontRight"),
        blockDeclareMotor("backLeft"),
        blockDeclareMotor("backRight"),
      ],
      [],
      [
        blockHwMotor("frontLeft", "front_left"),
        blockHwMotor("frontRight", "front_right"),
        blockHwMotor("backLeft", "back_left"),
        blockHwMotor("backRight", "back_right"),
      ],
      [
        `<block type="ftc_mecanum_teleop">
          <field name="FL">frontLeft</field>
          <field name="FR">frontRight</field>
          <field name="BL">backLeft</field>
          <field name="BR">backRight</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([22, 26, 41, 53].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [
        `<block type="ftc_declare_dc_motor_ex">
          <field name="NAME">shooterMotor</field>
        </block>`,
      ],
      [],
      [
        `<block type="ftc_hw_get_dc_motor_ex">
          <field name="VAR">shooterMotor</field>
          <field name="HW">shooter_motor</field>
        </block>`,
        `<block type="ftc_run_using_encoder">
          <field name="MOTOR">shooterMotor</field>
        </block>`,
      ],
      [
        `<block type="ftc_set_velocity">
          <field name="MOTOR">shooterMotor</field>
          <field name="TPS">1500</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([23, 24, 42].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [blockDeclareMotor("turretMotor")],
      [],
      [blockHwMotor("turretMotor", "turret_motor")],
      [
        `<block type="ftc_pid_p_loop">
          <field name="MOTOR">turretMotor</field>
          <field name="TARGET">500</field>
          <field name="KP">0.01</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([39, 40, 41, 43].includes(id)) {
    BLOCK_STARTERS[id] = programXml([], [], [], [
      `<block type="ftc_limelight_poll">
        <field name="LL">limelight</field>
      </block>`,
      blockTelemetryUpdate(),
    ]);
    continue;
  }

  if ([37, 38].includes(id)) {
    BLOCK_STARTERS[id] = programXml([], [], [], [
      `<block type="ftc_pedro_follow_path">
        <field name="FOLLOWER">follower</field>
      </block>`,
    ]);
    continue;
  }

  if ([54].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [
        blockDeclareMotor("driveMotor"),
        `<block type="ftc_declare_int">
          <field name="NAME">loopCount</field>
          <field name="VALUE">0</field>
        </block>`,
      ],
      [],
      [blockHwMotor("driveMotor", "drive_motor")],
      [
        blockStickPower("driveMotor"),
        `<block type="ftc_loop_count_increment"></block>`,
        `<block type="ftc_telemetry_add">
          <field name="KEY">Loop Count</field>
          <field name="VAL">loopCount</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([55].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [blockDeclareMotor("driveMotor")],
      [
        `<block type="ftc_private_double_method">
          <field name="NAME">getForwardPower</field>
          <field name="BODY">-gamepad1.left_stick_y</field>
        </block>`,
      ],
      [blockHwMotor("driveMotor", "drive_motor")],
      [
        `<block type="ftc_motor_set_power_helper">
          <field name="MOTOR">driveMotor</field>
          <field name="HELPER">getForwardPower</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([56].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [blockDeclareMotor("driveMotor")],
      [],
      [blockHwMotor("driveMotor", "drive_motor")],
      [
        `<block type="ftc_declare_boost_if_bumper">
          <field name="VAR">boostMultiplier</field>
          <field name="IF_VAL">1</field>
          <field name="ELSE_VAL">0.5</field>
        </block>`,
        `<block type="ftc_motor_set_power_stick_boost">
          <field name="MOTOR">driveMotor</field>
          <field name="BOOST">boostMultiplier</field>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  if ([12].includes(id)) {
    BLOCK_STARTERS[id] = programXml(
      [
        blockDeclareMotor("driveMotor"),
        `<block type="ftc_declare_boolean">
          <field name="NAME">lastA</field>
        </block>`,
      ],
      [],
      [blockHwMotor("driveMotor", "drive_motor")],
      [
        `<block type="ftc_if_button">
          <field name="BTN">a</field>
          <statement name="BODY">
            <block type="ftc_motor_set_power">
              <field name="MOTOR">driveMotor</field>
              <value name="POWER">
                <block type="ftc_number"><field name="NUM">0.5</field></block>
              </value>
            </block>
          </statement>
        </block>`,
        blockTelemetryUpdate(),
      ]
    );
    continue;
  }

  BLOCK_STARTERS[id] = programXml(
    [blockDeclareMotor("driveMotor")],
    [],
    [blockHwMotor("driveMotor", "drive_motor")],
    [blockStickPower("driveMotor"), blockTelemetryUpdate()]
  );
}

export function getBlockStarterXml(challengeId: number): string {
  return BLOCK_STARTERS[challengeId] ?? DEFAULT;
}

export const GENERIC_BLOCK_STARTER = DEFAULT;

import type { StarterArchetype } from "@/data/challengeBlocksMeta";
import { getChallengeHardware } from "@/lib/challengeHardware";
import {
  buildRunOpModeXml,
  chainBlocks,
  comment,
  dcDirection,
  elapsedTimeNew,
  hwCrServo,
  hwMotor,
  hwMotorEx,
  hwServo,
  mathNum,
  negatedStickY,
  setPower,
  stickY,
  telemetryUpdate,
  varGet,
  varSet,
} from "@/lib/blockly/starters/xmlUtils";

function primaryMotor(challengeId: number): string {
  const hw = getChallengeHardware(challengeId);
  return hw.find((n) => n.includes("motor") && !n.includes("servo")) ?? hw[0] ?? "drive_motor";
}

export function buildArchetypeStarter(
  archetype: StarterArchetype,
  challengeId: number
): string {
  const motor = primaryMotor(challengeId);
  const hw = getChallengeHardware(challengeId);

  switch (archetype) {
    case "teleop_single_drive":
      return buildRunOpModeXml({
        initBlocks: [hwMotor(motor), dcDirection(motor, "FORWARD")],
        loopBlocks: [
          varSet("tgtPower", negatedStickY()),
          setPower(motor, varGet("tgtPower")),
          `<block type="ftc_call_telemetry_add_data">
        <field name="KEY">Power</field>
        <value name="VALUE">${varGet("tgtPower")}</value>
      </block>`,
        ],
        variableNames: ["tgtPower"],
      });

    case "teleop_dual_tank": {
      const left = hw[0] ?? "left_drive";
      const right = hw[1] ?? "right_drive";
      return buildRunOpModeXml({
        initBlocks: [
          hwMotor(left),
          hwMotor(right),
          dcDirection(left, "FORWARD"),
          dcDirection(right, "FORWARD"),
        ],
        loopBlocks: [
          setPower(left, negatedStickY("left_stick_y")),
          setPower(right, negatedStickY("right_stick_y")),
        ],
      });
    }

    case "teleop_mecanum_4": {
      const [fl, fr, bl, br] =
        hw.length >= 4
          ? hw
          : ["front_left", "front_right", "back_left", "back_right"];
      return buildRunOpModeXml({
        initBlocks: [
          hwMotor(fl),
          hwMotor(fr),
          hwMotor(bl),
          hwMotor(br),
          comment("Set directions and add mecanum math here."),
        ],
        loopBlocks: [
          comment("Read sticks, normalize, set four motor powers."),
          setPower(fl, negatedStickY()),
        ],
      });
    }

    case "autonomous_encoder_move": {
      const m = motor;
      return buildRunOpModeXml({
        autonomous: true,
        initBlocks: [hwMotor(m)],
        loopBlocks: [
          `<block type="ftc_dc_motor_set_mode">
        <field name="DEVICE">${m}</field>
        <field name="MODE">STOP_AND_RESET_ENCODER</field>
      </block>`,
          `<block type="ftc_dc_motor_set_target_position">
        <field name="DEVICE">${m}</field>
        <value name="TICKS">${mathNum(1000)}</value>
      </block>`,
          `<block type="ftc_dc_motor_set_mode">
        <field name="DEVICE">${m}</field>
        <field name="MODE">RUN_TO_POSITION</field>
      </block>`,
          setPower(m, mathNum(0.6)),
          `<block type="ftc_while_is_busy">
        <field name="DEVICE">${m}</field>
        <statement name="DO"></statement>
      </block>`,
          setPower(m, mathNum(0)),
        ],
        skipTelemetry: true,
      });
    }

    case "autonomous_elapsed_time":
      return buildRunOpModeXml({
        autonomous: true,
        initBlocks: [
          elapsedTimeNew("timer"),
          hwMotor(motor),
        ],
        loopBlocks: [
          comment("Use timer.seconds() for timed segments."),
          setPower(motor, mathNum(0.5)),
        ],
        skipTelemetry: true,
      });

    case "autonomous_sleep_sequence": {
      const motors = hw.filter((n) => n.includes("motor") || n.includes("drive"));
      const m = motors[0] ?? motor;
      return buildRunOpModeXml({
        autonomous: true,
        initBlocks: motors.slice(0, 4).map((name) => hwMotor(name)),
        loopBlocks: [
          setPower(m, mathNum(0.5)),
          `<block type="ftc_call_sleep"><field name="MS">1000</field></block>`,
          setPower(m, mathNum(0)),
          `<block type="ftc_call_sleep"><field name="MS">500</field></block>`,
        ],
        skipTelemetry: true,
      });
    }

    case "autonomous_init_config":
      return buildRunOpModeXml({
        initBlocks: [
          comment("Read alliance / config before waitForStart."),
          hwMotor(motor),
        ],
        loopBlocks: [comment("Match loop after start.")],
      });

    case "servo_gamepad": {
      const servo = hw.find((n) => n.includes("servo")) ?? "blocker_servo";
      return buildRunOpModeXml({
        initBlocks: [hwServo(servo)],
        loopBlocks: [
          comment("Use button edge detection to setPosition."),
          `<block type="ftc_servo_set_position">
        <field name="DEVICE">${servo}</field>
        <value name="POS">${mathNum(0.5)}</value>
      </block>`,
        ],
      });
    }

    case "crservo_trigger": {
      const cr = hw.find((n) => n.includes("servo") || n.includes("intake")) ?? "intake_servo";
      return buildRunOpModeXml({
        initBlocks: [hwCrServo(cr)],
        loopBlocks: [
          comment("Compare trigger > 0.05, then setPower."),
          `<block type="ftc_cr_servo_set_power">
        <field name="DEVICE">${cr}</field>
        <value name="POWER">${mathNum(1)}</value>
      </block>`,
        ],
      });
    }

    case "debounce_toggle": {
      const cr = hw[0] ?? "intake_servo";
      return buildRunOpModeXml({
        initBlocks: [hwCrServo(cr), varSet("intakeRunning", mathNum(0))],
        loopBlocks: [
          comment("if (gamepad1.a && !lastA) toggle intakeRunning"),
          comment("Update lastA at end of loop."),
        ],
        variableNames: ["intakeRunning", "lastA"],
      });
    }

    case "telemetry_dashboard":
      return buildRunOpModeXml({
        initBlocks: [hwMotor(motor)],
        loopBlocks: [
          setPower(motor, negatedStickY()),
          `<block type="ftc_call_telemetry_add_data">
        <field name="KEY">Stick</field>
        <value name="VALUE">${stickY("left_stick_y")}</value>
      </block>`,
          `<block type="ftc_call_telemetry_add_data">
        <field name="KEY">Power</field>
        <value name="VALUE">${varGet("motorPower")}</value>
      </block>`,
        ],
        variableNames: ["motorPower"],
      });

    case "dcmotorex_velocity": {
      const ex = hw.find((n) => n.includes("shooter") || n.includes("motor")) ?? "shooter_motor";
      return buildRunOpModeXml({
        initBlocks: [
          hwMotorEx(ex),
          `<block type="ftc_dc_motor_set_mode">
        <field name="DEVICE">${ex}</field>
        <field name="MODE">RUN_USING_ENCODER</field>
      </block>`,
        ],
        loopBlocks: [
          `<block type="ftc_dc_motor_ex_set_velocity">
        <field name="DEVICE">${ex}</field>
        <value name="TPS">${mathNum(1500)}</value>
      </block>`,
        ],
      });
    }

    case "pid_proportional": {
      const turret = hw[0] ?? "turret_motor";
      return buildRunOpModeXml({
        initBlocks: [hwMotor(turret)],
        loopBlocks: [
          comment("error = target - current; power = Kp * error"),
          varSet("error", mathNum(0)),
          setPower(turret, varGet("error")),
        ],
        variableNames: ["error", "target", "current"],
      });
    }

    case "encoder_math":
      return buildRunOpModeXml({
        initBlocks: [hwMotor(motor)],
        loopBlocks: [
          comment("Convert ticks to degrees with gear ratio."),
          `<block type="ftc_call_telemetry_add_data">
        <field name="KEY">Position</field>
        <value name="VALUE">
          <block type="ftc_dc_motor_get_position">
            <field name="DEVICE">${motor}</field>
          </block>
        </value>
      </block>`,
        ],
      });

    case "state_machine_auto":
      return buildRunOpModeXml({
        autonomous: true,
        initBlocks: [
          elapsedTimeNew("timer"),
          ...hw.slice(0, 3).map((n) =>
            n.includes("servo") ? hwCrServo(n) : hwMotor(n)
          ),
        ],
        loopBlocks: [comment("Switch on state; use timer for transitions.")],
        skipTelemetry: true,
      });

    case "state_machine_teleop":
      return buildRunOpModeXml({
        initBlocks: [
          hwMotor(motor),
          elapsedTimeNew("timer"),
          comment("Declare homing / state variables."),
        ],
        loopBlocks: [comment("Run state machine in loop.")],
      });

    case "math_generic":
      return buildRunOpModeXml({
        initBlocks: [comment("Declare constants and variables.")],
        loopBlocks: [
          comment("Use math blocks for calculations."),
          telemetryUpdate(),
        ],
        skipTelemetry: true,
      });

    case "sensor_touch_homing": {
      const turret = hw.find((n) => n.includes("motor")) ?? motor;
      const touch = hw.find((n) => n.includes("touch")) ?? "touch_sensor";
      return buildRunOpModeXml({
        autonomous: true,
        initBlocks: [
          hwMotor(turret),
          `<block type="ftc_touch_sensor_hw_get"><field name="HW">${touch}</field></block>`,
        ],
        loopBlocks: [
          comment("Drive until touch sensor pressed, then reset encoder."),
          setPower(turret, mathNum(0.3)),
          `<block type="controls_if">
        <value name="IF0">
          <block type="ftc_touch_sensor_is_pressed">
            <field name="HW">${touch}</field>
          </block>
        </value>
        <statement name="DO0">${setPower(turret, mathNum(0))}</statement>
      </block>`,
        ],
        skipTelemetry: true,
      });
    }

    case "scope_basics":
      return buildRunOpModeXml({
        initBlocks: [hwMotor(motor), comment("Variables used in init stay in scope.")],
        loopBlocks: [
          varSet("boost", mathNum(1)),
          setPower(motor, negatedStickY()),
        ],
        variableNames: ["boost"],
      });

    default:
      return buildRunOpModeXml({
        initBlocks: [hwMotor(motor)],
        loopBlocks: [setPower(motor, negatedStickY())],
      });
  }
}

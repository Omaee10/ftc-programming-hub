/**
 * Per-challenge Blockly XML — FTC tutorial layout (runOpMode hat).
 */

/** Index of the closing tag for the outermost <block> in a fragment. */
function rootBlockCloseIndex(xml: string): number {
  const start = xml.indexOf("<block");
  if (start === -1) return xml.length;
  let depth = 0;
  for (let i = start; i < xml.length; i++) {
    if (xml.slice(i, i + 6) === "<block") depth++;
    if (xml.slice(i, i + 8) === "</block>") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return xml.length;
}

/** Link statement blocks with <next> at the root block of each fragment. */
function chainBlocks(blocks: string[]): string {
  const parts = blocks.map((b) => b.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  let chain = parts[parts.length - 1];
  for (let i = parts.length - 2; i >= 0; i--) {
    const closeIdx = rootBlockCloseIndex(parts[i]);
    chain =
      parts[i].slice(0, closeIdx) + `<next>${chain}</next>` + parts[i].slice(closeIdx);
  }
  return chain;
}

function comment(text: string): string {
  return `<block type="ftc_comment"><field name="TEXT">${text}</field></block>`;
}

function waitForStart(): string {
  return `<block type="ftc_call_wait_for_start"></block>`;
}

function repeatWhileOpMode(loopBody: string): string {
  const body = loopBody.trim() || comment("Put loop blocks here.");
  return `<block type="controls_whileUntil">
    <field name="MODE">WHILE</field>
    <value name="BOOL">
      <block type="ftc_reporter_op_mode_is_active"></block>
    </value>
    <statement name="DO">${body}</statement>
  </block>`;
}

function ifIsActiveWithLoop(loopBody: string): string {
  return `<block type="ftc_if_is_active"><statement name="DO">${chainBlocks([
    comment("Put run blocks here."),
    repeatWhileOpMode(loopBody),
  ])}</statement></block>`;
}

function hwMotor(hw: string): string {
  return `<block type="ftc_dc_motor_hw_get"><field name="DEVICE">${hw}</field></block>`;
}

function setPower(hw: string, powerXml: string): string {
  return `<block type="ftc_dc_motor_set_power">
    <field name="DEVICE">${hw}</field>
    <value name="POWER">${powerXml}</value>
  </block>`;
}

function dcDirection(hw: string, dir: string): string {
  return `<block type="ftc_dc_motor_set_direction">
    <field name="DEVICE">${hw}</field>
    <field name="DIR">${dir}</field>
  </block>`;
}

function negatedStickY(): string {
  return `<block type="math_single">
    <field name="OP">NEG</field>
    <value name="NUM">
      <block type="ftc_gamepad_stick_y">
        <field name="STICK">left_stick_y</field>
      </block>
    </value>
  </block>`;
}

function telemetryUpdate(): string {
  return `<block type="ftc_call_telemetry_update"></block>`;
}

function varSet(name: string, valueXml: string): string {
  return `<block type="variables_set">
    <field name="VAR" id="${name}Var">${name}</field>
    <value name="VALUE">${valueXml}</value>
  </block>`;
}

function varGet(name: string): string {
  return `<block type="variables_get">
    <field name="VAR" id="${name}Var">${name}</field>
  </block>`;
}

/** Standard FTC tutorial skeleton (see ftc-docs Blocks tutorial). */
export function buildRunOpModeXml(initBlocks: string[], loopBlocks: string[]): string {
  const loopChain = chainBlocks([...loopBlocks, telemetryUpdate()]);

  const stack = chainBlocks([
    comment("Put initialization blocks here."),
    ...initBlocks,
    waitForStart(),
    ifIsActiveWithLoop(loopChain),
  ]);

  const needsTgtPower =
    loopBlocks.some((b) => b.includes("tgtPower")) ||
    initBlocks.some((b) => b.includes("tgtPower"));
  const variablesXml = needsTgtPower
    ? `<variables><variable id="tgtPowerVar">tgtPower</variable></variables>`
    : "";

  return `<xml xmlns="https://developers.google.com/blockly/xml">
  ${variablesXml}
  <block type="procedures_defnoreturn" x="48" y="48">
    <field name="NAME">runOpMode</field>
    <statement name="STACK">${stack}</statement>
  </block>
</xml>`;
}

const DEFAULT = buildRunOpModeXml([], []);

const CHALLENGE_HARDWARE_REF: Record<number, string[]> = {
  1: ["left_motor"],
  2: ["drive_motor"],
  3: ["left_motor", "right_motor"],
  6: ["left_drive", "right_drive"],
  7: ["blocker_servo"],
  8: ["intake_servo"],
  9: ["drive_motor"],
  10: ["intake_servo"],
  17: ["front_left"],
  22: ["shooter_motor"],
  54: ["drive_motor"],
  55: ["drive_motor"],
  56: ["drive_motor"],
};

export const BLOCK_STARTERS: Record<number, string> = {
  1: buildRunOpModeXml(
    [hwMotor("left_motor"), dcDirection("left_motor", "FORWARD")],
    [
      varSet("tgtPower", negatedStickY()),
      setPower("left_motor", varGet("tgtPower")),
      `<block type="ftc_call_telemetry_add_data">
        <field name="KEY">Target Power</field>
        <value name="VALUE">${varGet("tgtPower")}</value>
      </block>`,
    ]
  ),
  2: buildRunOpModeXml(
    [hwMotor("drive_motor")],
    [
      `<block type="ftc_dc_motor_set_mode">
        <field name="DEVICE">drive_motor</field>
        <field name="MODE">STOP_AND_RESET_ENCODER</field>
      </block>`,
      `<block type="ftc_dc_motor_set_target_position">
        <field name="DEVICE">drive_motor</field>
        <value name="VALUE"><block type="math_number"><field name="NUM">500</field></block></value>
      </block>`,
      `<block type="ftc_dc_motor_set_mode">
        <field name="DEVICE">drive_motor</field>
        <field name="MODE">RUN_TO_POSITION</field>
      </block>`,
      setPower("drive_motor", `<block type="math_number"><field name="NUM">0.6</field></block>`),
      `<block type="ftc_while_is_busy">
        <field name="DEVICE">drive_motor</field>
        <statement name="DO"></statement>
      </block>`,
      setPower("drive_motor", `<block type="math_number"><field name="NUM">0</field></block>`),
    ]
  ),
};

for (let id = 3; id <= 56; id++) {
  if (BLOCK_STARTERS[id]) continue;
  const hw = CHALLENGE_HARDWARE_REF[id];
  const motor = hw?.[0] ?? "drive_motor";
  BLOCK_STARTERS[id] = buildRunOpModeXml(
    [hwMotor(motor)],
    [setPower(motor, negatedStickY())]
  );
}

export function getBlockStarterXml(challengeId: number): string {
  return BLOCK_STARTERS[challengeId] ?? DEFAULT;
}

export function isLegacyBlockXml(xml: string): boolean {
  return xml.includes('type="ftc_program"');
}

export const GENERIC_BLOCK_STARTER = DEFAULT;

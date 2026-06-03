/** Blockly XML helpers for runOpMode starters. */

export function rootBlockCloseIndex(xml: string): number {
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

export function chainBlocks(blocks: string[]): string {
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

export function comment(text: string): string {
  return `<block type="ftc_comment"><field name="TEXT">${text}</field></block>`;
}

export function waitForStart(): string {
  return `<block type="ftc_call_wait_for_start"></block>`;
}

export function repeatWhileOpMode(loopBody: string): string {
  const body = loopBody.trim() || comment("Put loop blocks here.");
  return `<block type="ftc_repeat_while_op_mode"><statement name="DO">${body}</statement></block>`;
}

export function ifIsActiveWithLoop(loopBody: string): string {
  return `<block type="ftc_if_is_active"><statement name="DO">${chainBlocks([
    comment("Put run blocks here."),
    repeatWhileOpMode(loopBody),
  ])}</statement></block>`;
}

export function hwMotor(hw: string): string {
  return `<block type="ftc_dc_motor_hw_get"><field name="DEVICE">${hw}</field></block>`;
}

export function hwMotorEx(hw: string): string {
  return `<block type="ftc_dc_motor_ex_hw_get"><field name="DEVICE">${hw}</field></block>`;
}

export function hwServo(hw: string): string {
  return `<block type="ftc_servo_hw_get"><field name="DEVICE">${hw}</field></block>`;
}

export function hwCrServo(hw: string): string {
  return `<block type="ftc_cr_servo_hw_get"><field name="DEVICE">${hw}</field></block>`;
}

export function setPower(hw: string, powerXml: string): string {
  return `<block type="ftc_dc_motor_set_power">
    <field name="DEVICE">${hw}</field>
    <value name="POWER">${powerXml}</value>
  </block>`;
}

export function dcDirection(hw: string, dir: string): string {
  return `<block type="ftc_dc_motor_set_direction">
    <field name="DEVICE">${hw}</field>
    <field name="DIR">${dir}</field>
  </block>`;
}

export function negatedStickY(stick = "left_stick_y"): string {
  return `<block type="math_single">
    <field name="OP">NEG</field>
    <value name="NUM">
      <block type="ftc_gamepad_stick_y">
        <field name="STICK">${stick}</field>
      </block>
    </value>
  </block>`;
}

export function stickY(stick: string): string {
  return `<block type="ftc_gamepad_stick_y"><field name="STICK">${stick}</field></block>`;
}

export function telemetryUpdate(): string {
  return `<block type="ftc_call_telemetry_update"></block>`;
}

export function varSet(name: string, valueXml: string): string {
  return `<block type="variables_set">
    <field name="VAR" id="${name}Var">${name}</field>
    <value name="VALUE">${valueXml}</value>
  </block>`;
}

export function varGet(name: string): string {
  return `<block type="variables_get">
    <field name="VAR" id="${name}Var">${name}</field>
  </block>`;
}

export function mathNum(n: number): string {
  return `<block type="math_number"><field name="NUM">${n}</field></block>`;
}

export function elapsedTimeNew(name: string): string {
  return `<block type="ftc_elapsed_time_new"><field name="NAME">${name}</field></block>`;
}

export interface RunOpModeOptions {
  initBlocks: string[];
  loopBlocks: string[];
  /** Autonomous: no if-isActive wrapper, run init+loop after waitForStart once or with repeat */
  autonomous?: boolean;
  /** Skip telemetry.update in loop */
  skipTelemetry?: boolean;
  variableNames?: string[];
}

export function buildRunOpModeXml(opts: RunOpModeOptions): string {
  const loopChain = chainBlocks(
    opts.skipTelemetry
      ? opts.loopBlocks
      : [...opts.loopBlocks, telemetryUpdate()]
  );

  let runSection: string;
  if (opts.autonomous) {
    runSection = chainBlocks([
      comment("Autonomous run sequence."),
      ...opts.loopBlocks,
    ]);
  } else {
    runSection = ifIsActiveWithLoop(loopChain);
  }

  const stack = chainBlocks([
    comment("Put initialization blocks here."),
    ...opts.initBlocks,
    waitForStart(),
    runSection,
  ]);

  const varNames = new Set(opts.variableNames ?? []);
  if (
    opts.loopBlocks.some((b) => b.includes("tgtPower")) ||
    opts.initBlocks.some((b) => b.includes("tgtPower"))
  ) {
    varNames.add("tgtPower");
  }
  if (opts.loopBlocks.concat(opts.initBlocks).some((b) => b.includes("lastA"))) {
    varNames.add("lastA");
  }
  if (opts.loopBlocks.concat(opts.initBlocks).some((b) => b.includes("intakeRunning"))) {
    varNames.add("intakeRunning");
  }

  const variablesXml =
    varNames.size > 0
      ? `<variables>${[...varNames]
          .map((n) => `<variable id="${n}Var">${n}</variable>`)
          .join("")}</variables>`
      : "";

  return `<xml xmlns="https://developers.google.com/blockly/xml">
  ${variablesXml}
  <block type="procedures_defnoreturn" x="48" y="48">
    <field name="NAME">runOpMode</field>
    <statement name="STACK">${stack}</statement>
  </block>
</xml>`;
}

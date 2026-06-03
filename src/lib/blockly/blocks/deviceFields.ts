import * as Blockly from "blockly/core";
import {
  deviceDropdownOptions,
  getCrServoHardware,
  getDcMotorHardware,
  getServoHardware,
  hwToVar,
} from "@/lib/blockly/deviceNames";

let challengeId = 1;
let dcOptions: [string, string][] = deviceDropdownOptions(["drive_motor"]);
let servoOptions: [string, string][] = deviceDropdownOptions(["blocker_servo"]);
let crServoOptions: [string, string][] = deviceDropdownOptions(["intake_servo"]);

export function configureDeviceFieldsForChallenge(id: number): void {
  challengeId = id;
  dcOptions = deviceDropdownOptions(getDcMotorHardware(id));
  servoOptions = deviceDropdownOptions(getServoHardware(id));
  crServoOptions = deviceDropdownOptions(getCrServoHardware(id));
  if (servoOptions.length === 0 && crServoOptions.length === 0) {
    servoOptions = deviceDropdownOptions(["blocker_servo"]);
  }
  if (crServoOptions.length === 0) {
    crServoOptions = deviceDropdownOptions(["intake_servo"]);
  }
}

function optionsForBlockType(type: string): [string, string][] {
  if (type.startsWith("ftc_cr_servo")) return crServoOptions;
  if (type.startsWith("ftc_servo")) return servoOptions;
  return dcOptions;
}

function applyDeviceField(block: Blockly.Block): void {
  const deviceField = block.getField("DEVICE");
  if (!(deviceField instanceof Blockly.FieldDropdown)) return;

  const opts = optionsForBlockType(block.type);
  // Blockly 11: refresh dropdown options via menuGenerator_ (protected).
  (deviceField as Blockly.FieldDropdown & { menuGenerator_: typeof opts }).menuGenerator_ =
    opts;
  const current = deviceField.getValue();
  if (!opts.some(([, v]) => v === current)) {
    deviceField.setValue(opts[0]?.[1] ?? current);
  } else {
    deviceField.setValue(current);
  }
}

export function refreshDeviceFieldsInWorkspace(workspace: Blockly.Workspace): void {
  configureDeviceFieldsForChallenge(challengeId);
  for (const block of workspace.getAllBlocks(false)) {
    if (
      block.type.startsWith("ftc_dc_motor") ||
      block.type.startsWith("ftc_dc_motor_ex") ||
      block.type.startsWith("ftc_servo") ||
      block.type.startsWith("ftc_cr_servo")
    ) {
      applyDeviceField(block);
    }
  }
}

function registerDeviceExtension(name: string, predicate: (type: string) => boolean): void {
  if (Blockly.Extensions.isRegistered(name)) return;
  Blockly.Extensions.register(name, function (this: Blockly.Block) {
    if (!predicate(this.type)) return;
    applyDeviceField(this);
  });
}

let extensionsRegistered = false;

export function registerDeviceFieldExtensions(): void {
  if (extensionsRegistered) return;
  extensionsRegistered = true;
  configureDeviceFieldsForChallenge(1);

  registerDeviceExtension("ftc_dc_device_init", (t) =>
    t.startsWith("ftc_dc_motor")
  );
  registerDeviceExtension("ftc_servo_device_init", (t) => t.startsWith("ftc_servo"));
  registerDeviceExtension("ftc_cr_servo_device_init", (t) =>
    t.startsWith("ftc_cr_servo")
  );
}

/** Resolve Java variable name from a block's device field(s). */
export function getDeviceVarName(block: Blockly.Block): string {
  const device = block.getFieldValue("DEVICE");
  if (device) return hwToVar(String(device));
  const hw = block.getFieldValue("HW");
  if (hw) return hwToVar(String(hw));
  const v = block.getFieldValue("VAR");
  return v ? String(v) : "device";
}

export function getDeviceHwName(block: Blockly.Block): string {
  const device = block.getFieldValue("DEVICE");
  if (device) return String(device);
  const hw = block.getFieldValue("HW");
  if (hw) return String(hw);
  const v = block.getFieldValue("VAR");
  return v
    ? String(v)
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "")
    : "drive_motor";
}

import * as Blockly from "blockly/core";
import {
  deviceDropdownOptions,
  getColorSensorHardware,
  getCrServoHardware,
  getDcMotorHardware,
  getDistanceSensorHardware,
  getImuHardware,
  getServoHardware,
  getTouchSensorHardware,
  hwToVar,
} from "@/lib/blockly/deviceNames";

let challengeId = 1;
let dcOptions: [string, string][] = deviceDropdownOptions(["drive_motor"]);
let servoOptions: [string, string][] = deviceDropdownOptions(["blocker_servo"]);
let crServoOptions: [string, string][] = deviceDropdownOptions(["intake_servo"]);
let touchOptions: [string, string][] = deviceDropdownOptions(["touch_sensor"]);
let distanceOptions: [string, string][] = deviceDropdownOptions(["distance_sensor"]);
let colorOptions: [string, string][] = deviceDropdownOptions(["color_sensor"]);
let imuOptions: [string, string][] = deviceDropdownOptions(["imu"]);

export function configureDeviceFieldsForChallenge(id: number): void {
  challengeId = id;
  dcOptions = deviceDropdownOptions(getDcMotorHardware(id));
  servoOptions = deviceDropdownOptions(getServoHardware(id));
  crServoOptions = deviceDropdownOptions(getCrServoHardware(id));
  touchOptions = deviceDropdownOptions(getTouchSensorHardware(id));
  distanceOptions = deviceDropdownOptions(getDistanceSensorHardware(id));
  colorOptions = deviceDropdownOptions(getColorSensorHardware(id));
  imuOptions = deviceDropdownOptions(getImuHardware(id));
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
  if (type.startsWith("ftc_touch")) return touchOptions;
  if (type.startsWith("ftc_distance")) return distanceOptions;
  if (type.startsWith("ftc_color")) return colorOptions;
  if (type.startsWith("ftc_imu")) return imuOptions;
  return dcOptions;
}

function applyDeviceField(block: Blockly.Block): void {
  const deviceField = block.getField("DEVICE") ?? block.getField("HW");
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
      block.type.startsWith("ftc_servo") ||
      block.type.startsWith("ftc_cr_servo") ||
      block.type.startsWith("ftc_touch") ||
      block.type.startsWith("ftc_distance") ||
      block.type.startsWith("ftc_color") ||
      block.type.startsWith("ftc_imu")
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
  registerDeviceExtension("ftc_touch_device_init", (t) => t.startsWith("ftc_touch"));
  registerDeviceExtension("ftc_distance_device_init", (t) =>
    t.startsWith("ftc_distance")
  );
  registerDeviceExtension("ftc_color_device_init", (t) => t.startsWith("ftc_color"));
  registerDeviceExtension("ftc_imu_device_init", (t) => t.startsWith("ftc_imu"));
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

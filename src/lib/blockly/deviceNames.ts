import { CHALLENGE_HARDWARE } from "@/lib/blockly/toolbox/challengeBlockAllowlist";

/** hardwareMap name → Java field name (left_motor → leftMotor). */
export function hwToVar(hw: string): string {
  const parts = hw.split("_").filter(Boolean);
  if (parts.length === 0) return "device";
  return parts
    .map((p, i) =>
      i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    )
    .join("");
}

export function getChallengeHardware(challengeId: number): string[] {
  return CHALLENGE_HARDWARE[challengeId] ?? ["drive_motor"];
}

export function getDcMotorHardware(challengeId: number): string[] {
  const motors = getChallengeHardware(challengeId).filter((h) => !h.includes("servo"));
  return motors.length ? motors : ["drive_motor"];
}

export function getServoHardware(challengeId: number): string[] {
  return getChallengeHardware(challengeId).filter(
    (h) => h.includes("servo") && !h.includes("intake")
  );
}

export function getCrServoHardware(challengeId: number): string[] {
  return getChallengeHardware(challengeId).filter((h) => h.includes("intake"));
}

/** Blockly dropdown: [display label, stored hardware config name]. */
export function deviceDropdownOptions(
  hardware: string[]
): [string, string][] {
  if (hardware.length === 0) {
    return [["driveMotor", "drive_motor"]];
  }
  return hardware.map((hw) => [hwToVar(hw), hw] as [string, string]);
}

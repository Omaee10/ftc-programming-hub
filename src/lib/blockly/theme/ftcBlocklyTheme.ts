import * as Blockly from "blockly/core";

/** Dark Blockly theme aligned with FTC Hub editor chrome. */
export const FTC_BLOCKLY_THEME = Blockly.Theme.defineTheme("ftc_dark", {
  name: "ftc_dark",
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "#18181f",
    toolboxBackgroundColour: "#18181b",
    toolboxForegroundColour: "#a1a1aa",
    flyoutBackgroundColour: "#22222a",
    flyoutForegroundColour: "#e4e4e7",
    flyoutOpacity: 0.98,
    scrollbarColour: "#3f3f46",
    insertionMarkerColour: "#f59e0b",
    insertionMarkerOpacity: 0.35,
    scrollbarOpacity: 0.5,
    cursorColour: "#f59e0b",
  },
  fontStyle: {
    family: "var(--font-geist-sans), system-ui, sans-serif",
    weight: "500",
    size: 11,
  },
  blockStyles: {
    structure_blocks: { colourPrimary: "#6366f1", colourSecondary: "#4f46e5", colourTertiary: "#4338ca" },
    motor_blocks: { colourPrimary: "#0ea5e9", colourSecondary: "#0284c7", colourTertiary: "#0369a1" },
    servo_blocks: { colourPrimary: "#14b8a6", colourSecondary: "#0d9488", colourTertiary: "#0f766e" },
    gamepad_blocks: { colourPrimary: "#f59e0b", colourSecondary: "#d97706", colourTertiary: "#b45309" },
    timing_blocks: { colourPrimary: "#a855f7", colourSecondary: "#9333ea", colourTertiary: "#7e22ce" },
    telemetry_blocks: { colourPrimary: "#22c55e", colourSecondary: "#16a34a", colourTertiary: "#15803d" },
    control_blocks: { colourPrimary: "#ec4899", colourSecondary: "#db2777", colourTertiary: "#be185d" },
    advanced_blocks: { colourPrimary: "#ef4444", colourSecondary: "#dc2626", colourTertiary: "#b91c1c" },
    math_blocks: { colourPrimary: "#64748b", colourSecondary: "#475569", colourTertiary: "#334155" },
  },
  categoryStyles: {
    structure_category: { colour: "#6366f1" },
    motor_category: { colour: "#0ea5e9" },
    servo_category: { colour: "#14b8a6" },
    gamepad_category: { colour: "#f59e0b" },
    timing_category: { colour: "#a855f7" },
    telemetry_category: { colour: "#22c55e" },
    control_category: { colour: "#ec4899" },
    advanced_category: { colour: "#ef4444" },
    math_category: { colour: "#64748b" },
  },
});

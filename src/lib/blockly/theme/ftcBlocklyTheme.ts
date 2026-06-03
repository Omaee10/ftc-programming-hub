import * as Blockly from "blockly/core";

/** FTC OnBot-style colors on Blockly Zelos renderer. */
export const FTC_BLOCKLY_THEME = Blockly.Theme.defineTheme("ftc_blocks", {
  name: "ftc_blocks",
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: "#1e1e1e",
    toolboxBackgroundColour: "#2d2d2d",
    toolboxForegroundColour: "#cccccc",
    flyoutBackgroundColour: "#303030",
    flyoutForegroundColour: "#e0e0e0",
    flyoutOpacity: 0.98,
    scrollbarColour: "#5a5a5a",
    insertionMarkerColour: "#f59e0b",
    insertionMarkerOpacity: 0.4,
    scrollbarOpacity: 0.6,
    cursorColour: "#f59e0b",
  },
  fontStyle: {
    family: "var(--font-geist-sans), system-ui, sans-serif",
    weight: "500",
    size: 12,
  },
  blockStyles: {
    procedure_blocks: {
      colourPrimary: "#995ba5",
      colourSecondary: "#7a4a85",
      colourTertiary: "#5c3a66",
    },
    loop_blocks: {
      colourPrimary: "#5ba55b",
      colourSecondary: "#4a8a4a",
      colourTertiary: "#3a6f3a",
    },
    logic_blocks: {
      colourPrimary: "#5b80a5",
      colourSecondary: "#4a6a85",
      colourTertiary: "#3a5566",
    },
    math_blocks: {
      colourPrimary: "#5b67a5",
      colourSecondary: "#4a5585",
      colourTertiary: "#3a4466",
    },
    text_blocks: {
      colourPrimary: "#5ba58c",
      colourSecondary: "#4a8570",
      colourTertiary: "#3a6654",
    },
    variable_blocks: {
      colourPrimary: "#a55b80",
      colourSecondary: "#854a66",
      colourTertiary: "#663a4d",
    },
    variable_dynamic_blocks: {
      colourPrimary: "#a55b80",
      colourSecondary: "#854a66",
      colourTertiary: "#663a4d",
    },
    ftc_call_blocks: {
      colourPrimary: "#995ba5",
      colourSecondary: "#7a4a85",
      colourTertiary: "#5c3a66",
    },
    ftc_setter_blocks: {
      colourPrimary: "#5ba55b",
      colourSecondary: "#4a8a4a",
      colourTertiary: "#3a6f3a",
    },
    ftc_getter_blocks: {
      colourPrimary: "#6db56d",
      colourSecondary: "#569156",
      colourTertiary: "#427042",
    },
    ftc_gamepad_blocks: {
      colourPrimary: "#cf8b49",
      colourSecondary: "#a6703a",
      colourTertiary: "#80562d",
    },
    comment_blocks: {
      colourPrimary: "#5ba5c6",
      colourSecondary: "#4a859e",
      colourTertiary: "#3a6677",
    },
  },
  categoryStyles: {
    linear_opmode_category: { colour: "#995ba5" },
    gamepad_category: { colour: "#cf8b49" },
    actuators_category: { colour: "#5ba55b" },
    utilities_category: { colour: "#5ba5c6" },
    logic_category: { colour: "#5b80a5" },
    loops_category: { colour: "#5ba55b" },
    math_category: { colour: "#5b67a5" },
    variables_category: { colour: "#a55b80" },
    misc_category: { colour: "#5ba5c6" },
  },
});

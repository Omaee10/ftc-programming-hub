# FTC Sim ↔ FTC Programming Hub — Blocks Parity Checklist

Reference: [FTC Sim](https://ftcsim.org/) block + OnBot Java workflow (no 3D simulator in the hub).

**Hub differentiator:** generated Java is graded with real `javac` + rubrics (`POST /api/grade`), not a virtual field run.

## How to use this doc

1. Open the same lesson type on FTC Sim (Intro / Movement) and in the hub challenge with matching `courseTrack`.
2. For each row, confirm block label, generated Java, and grader outcome.
3. Mark: ✅ parity | ⚠️ partial | ❌ gap

---

## Workspace UX

| FTC Sim | Hub | Status |
|---------|-----|--------|
| Blocks + generated Java visible together | Split view: Blockly + read-only **Generated Java** (default on) | ✅ |
| Switch Blocks ↔ OnBot Java | **FTC Blocks** / **OnBot Java** tabs | ✅ |
| Translate blocks to text | Live `javaGenerator.ts` on workspace change | ✅ |
| Run / test program | **Run** grades **Generated Java** (banner explains) | ✅ |
| First-time guide | `BlocksOnboarding` coach marks (localStorage) | ✅ |
| 3D field run | Not in scope | N/A (intentional) |

---

## Toolbox categories (order)

| Category | Hub block types | Grader notes |
|----------|-----------------|--------------|
| **LinearOpMode** | `ftc_call_wait_for_start`, `ftc_call_sleep`, `ftc_call_idle`, `ftc_call_telemetry_*`, `ftc_reporter_op_mode_is_active`, `ftc_reporter_is_started`, `ftc_if_is_started`, `ftc_repeat_while_op_mode`, `ftc_elapsed_time_*` | `waitForStart()` once before loop; no `Thread.sleep` |
| **Gamepad** | `ftc_gamepad_stick_y`, `ftc_gamepad_stick_y_drive`, `ftc_gamepad_button`, `ftc_gamepad_trigger` | Drive stick uses **negated Y** (`ftc_gamepad_stick_y_drive`); triggers use `> 0.05` in rubric-friendly patterns |
| **Actuators** | DcMotor get/set, `ftc_set_power_zero`, `ftc_encoder_run_to_position`, Servo, CRServo | Encoder macro: reset → target → `RUN_TO_POSITION` → power → `isBusy` → `setPower(0)` |
| **Sensors** | Touch, Distance, Color, IMU | Only on sensor-tagged challenges |
| **Utilities** | ElapsedTime helpers | Timer outside loop; `reset()` between segments |
| **Loops** | `ftc_repeat_while_op_mode`, `controls_*` | Prefer `opModeIsActive()` guard |
| **Logic / Math** | Blockly built-ins | |
| **Variables** | Blockly `VARIABLE` category | Counters before loop |

---

## Sample generated Java (hub)

| Block | Generated snippet | Rubric |
|-------|-------------------|--------|
| `ftc_gamepad_stick_y_drive` (LeftStickY) | `-gamepad1.left_stick_y` | Stick negation / drive |
| `ftc_encoder_run_to_position` | `STOP_AND_RESET_ENCODER` → `setTargetPosition` → `RUN_TO_POSITION` → `setPower` → `while (isBusy() && opModeIsActive())` → `setPower(0)` | Encoder order (#10–14) |
| `ftc_set_power_zero` | `motor.setPower(0)` | Post-move stop |
| `ftc_if_is_started` | `if (isStarted()) { ... }` | Init-phase loops (SDK `isStarted()`) |

---

## Manual spot-check lessons (team)

| FTC Sim course | Hub `courseTrack` | Suggested hub IDs |
|----------------|-------------------|-------------------|
| FTC Intro | `intro` | 1, 9, 54–56 |
| FTC Movement | `movement` | 2, 6, 14, 17–18, 50–51 |
| FTC Sensors | `sensors` | 16, 19, 29 |

---

## Automated gates

```bash
npm run test:blockly          # XML → Java + grader smoke (not "wrong")
cd grader && gradle test      # FunctionalRubricTest + BlockStarterGradeTest
```

---

## Out of scope

- Virtual field, multiplayer, world builder
- Java → Blocks reverse sync
- Blocks for Road Runner, Pedro, Limelight (java-only, 16 challenges)

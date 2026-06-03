# Blocks coverage (built-in challenges 1–56)

FTC Sim–style blocks layer ([parity checklist](./ftcsim-parity-checklist.md)). **Java `starterCode`, instructions, and grader rubrics are unchanged** — Blocks generates Java that is graded with real `javac` + rubrics.

| Metric | Count |
|--------|------:|
| Total challenges | 56 |
| Blocks **full** | 40 |
| **Java only** | 16 |

## Java-only challenges

Road Runner, Pedro Pathing, Limelight/vision, Lynx bulk cache, Pinpoint odometry, and related APIs have no Blockly primitives. The workspace disables the FTC Blocks tab for these ids:

4, 5, 15, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48

## Course tracks (FTC Sim–aligned catalog)

| Track | Label | Purpose |
|-------|-------|---------|
| `intro` | FTC Intro | Structure, telemetry, scope basics |
| `movement` | Movement | Motors, tank, mecanum, encoders |
| `sensors` | Sensors | Touch, IMU (field-relative) |
| `teleop` | TeleOp | Driver-controlled patterns |
| `autonomous` | Autonomous | Timers, encoders, state machines |
| `advanced` | Advanced (Java) | Java-only library challenges |

Filter chips on the challenge catalog use these tracks.

## Workspace UX

- Default **Generated Java** split pane in FTC Blocks mode (preference in `blocksPrefs.ts`).
- **FTC Blocks** / **OnBot Java** editor tabs; Run grades generated Java.
- First-run **Blocks onboarding** coach marks (`BlocksOnboarding.tsx`).

## Helper blocks (grader-friendly)

| Block | Purpose |
|-------|---------|
| `ftc_gamepad_stick_y_drive` | Negated stick for forward-positive drive |
| `ftc_encoder_run_to_position` | Full encoder move + `setPower(0)` |
| `ftc_set_power_zero` | Stop motor after a move |

## Starter archetypes

Each **full** challenge uses a template in [`src/lib/blockly/starters/archetypes.ts`](../src/lib/blockly/starters/archetypes.ts):

- `teleop_single_drive`, `teleop_dual_tank`, `teleop_mecanum_4`
- `autonomous_encoder_move`, `autonomous_elapsed_time`, `autonomous_sleep_sequence`
- `servo_gamepad`, `crservo_trigger`, `debounce_toggle`
- `telemetry_dashboard`, `dcmotorex_velocity`, `pid_proportional`, `encoder_math`
- `sensor_touch_homing`, `state_machine_auto`, `state_machine_teleop`, `math_generic`, `scope_basics`

`blocksGuideSteps` in [`challengeBlocksMeta.ts`](../src/data/challengeBlocksMeta.ts) cover all **intro** and **movement** full-support challenges.

## Sensor blocks

Toolbox category **Sensors** (when challenge tags require it):

- Touch, Distance, Color, IMU primitives (see [`blockCategories.ts`](../src/lib/blockly/toolbox/blockCategories.ts))

## Maintenance

- Audit table: `npx tsx scripts/classify-block-challenges.ts`
- Generator + grader smoke: `npm run test:blockly`
- Parity vs FTC Sim: [`ftcsim-parity-checklist.md`](./ftcsim-parity-checklist.md)
- Hardware names: [`src/lib/challengeHardware.ts`](../src/lib/challengeHardware.ts) (sync with Java `ChallengeRubrics.HARDWARE_NAMES`)
- Metadata: [`src/data/challengeBlocksMeta.ts`](../src/data/challengeBlocksMeta.ts)

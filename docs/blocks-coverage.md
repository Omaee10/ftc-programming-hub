# Blocks coverage (built-in challenges 1–56)

Pedagogy-only FTC Sim–style blocks layer. **Java `starterCode`, instructions, and grader rubrics are unchanged.**

| Metric | Count |
|--------|------:|
| Total challenges | 56 |
| Blocks **full** | 40 |
| **Java only** | 16 |

## Java-only challenges

Road Runner, Pedro Pathing, Limelight/vision, Lynx bulk cache, Pinpoint odometry, and related APIs have no Blockly primitives. The workspace disables the Blocks tab for these ids:

4, 5, 15, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48

## Course tracks

| Track | Label | Purpose |
|-------|-------|---------|
| `intro` | FTC Intro | Structure, telemetry, scope basics |
| `movement` | Movement | Motors, tank, mecanum, encoders |
| `sensors` | Sensors | Touch, IMU (field-relative) |
| `teleop` | TeleOp | Driver-controlled patterns |
| `autonomous` | Autonomous | Timers, encoders, state machines |
| `advanced` | Advanced (Java) | Java-only library challenges |

Filter chips on the challenge catalog use these tracks.

## Starter archetypes

Each **full** challenge uses a template in [`src/lib/blockly/starters/archetypes.ts`](../src/lib/blockly/starters/archetypes.ts):

- `teleop_single_drive`, `teleop_dual_tank`, `teleop_mecanum_4`
- `autonomous_encoder_move`, `autonomous_elapsed_time`, `autonomous_sleep_sequence`
- `servo_gamepad`, `crservo_trigger`, `debounce_toggle`
- `telemetry_dashboard`, `dcmotorex_velocity`, `pid_proportional`, `encoder_math`
- `sensor_touch_homing`, `state_machine_auto`, `state_machine_teleop`, `math_generic`, `scope_basics`

## Sensor blocks

Toolbox category **Sensors** (when challenge tags require it):

- Touch: `ftc_touch_sensor_hw_get`, `ftc_touch_sensor_is_pressed`
- Distance: `ftc_distance_sensor_hw_get`, `ftc_distance_sensor_cm`
- Color: `ftc_color_sensor_hw_get`, `ftc_color_sensor_red`
- IMU: `ftc_imu_hw_get`, `ftc_imu_yaw_degrees`

## Maintenance

- Audit table: `npx tsx scripts/classify-block-challenges.ts`
- Generator smoke: `npm run test:blockly`
- Hardware names: [`src/lib/challengeHardware.ts`](../src/lib/challengeHardware.ts) (sync with Java `ChallengeRubrics.HARDWARE_NAMES`)
- Metadata: [`src/data/challengeBlocksMeta.ts`](../src/data/challengeBlocksMeta.ts)

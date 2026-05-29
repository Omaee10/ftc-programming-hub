import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "PID & Control Loops – FTC Programming Hub" };

export default function PidControlPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/pid-control" },
        { label: "PID & Control Loops" },
      ]}
      title="PID & Control Loops"
      description="Control loops let mechanisms move quickly and precisely. This guide covers error, P/I/D terms, feedforward, gravity compensation, motion profiles, and finite state machines — all with FTC-specific examples."
      badge="Intermediate"
      badgeColor="amber"
      readingTime="16 min"
      sections={[
        {
          id: "what-is-error",
          title: "What is Error?",
          content: (
            <Prose>
              <p>
                Before understanding control loops you need to understand{" "}
                <strong>error</strong>. Error is the difference between where
                you are and where you want to be:
              </p>
              <CodeBlock
                filename="Error.java"
                code={`// Error = desired position − current position
int targetTicks  = 1500;
int currentTicks = motor.getCurrentPosition();
int error        = targetTicks - currentTicks;

// If the arm is at 1200 and target is 1500:
// error = 1500 - 1200 = 300 ticks — still needs to move forward

// If the arm overshot to 1600:
// error = 1500 - 1600 = -100 ticks — needs to move backward`}
              />
              <InfoGrid
                items={[
                  { label: "Error > 0", value: "Undershooting", sub: "Need to move forward" },
                  { label: "Error < 0", value: "Overshooting", sub: "Need to move backward" },
                  { label: "Error = 0", value: "At target", sub: "Stop (or hold)" },
                  { label: "Goal", value: "Drive error → 0", sub: "As fast as possible without oscillating" },
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "p-controller",
          title: "P Controller (Proportional)",
          content: (
            <Prose>
              <p>
                The simplest control loop: motor power is proportional to
                the error. Big error = high power, small error = low power.
                As the mechanism approaches the target, it automatically slows
                down.
              </p>
              <CodeBlock
                filename="PController.java"
                code={`double kP = 0.005; // start small, tune up

while (opModeIsActive() && !isAtTarget()) {
    int error = targetTicks - motor.getCurrentPosition();

    double power = kP * error;

    // Clamp to valid motor power range
    power = Math.max(-1.0, Math.min(1.0, power));

    motor.setPower(power);

    telemetry.addData("Error",  error);
    telemetry.addData("Power",  "%.3f", power);
    telemetry.update();
}
motor.setPower(0);

// ── Helper: check if within tolerance ────────────────────────────────────
boolean isAtTarget() {
    return Math.abs(motor.getCurrentPosition() - targetTicks) < 20;
}`}
              />
              <NoteBox type="tip">
                Start with a very small <code>kP</code> (e.g. 0.001–0.01 for
                encoder-based position) and increase until the mechanism moves
                briskly. If it oscillates back and forth past the target, add a
                D term (see below) or reduce <code>kP</code>.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "pid-terms",
          title: "Full PID — P, I, and D Terms",
          content: (
            <Prose>
              <SpecTable
                rows={[
                  {
                    label: "P (Proportional)",
                    value: "kP × error",
                    note: "Main driving force — larger error = more power",
                  },
                  {
                    label: "D (Derivative)",
                    value: "kD × (error − lastError) / dt",
                    note: "Resists rapid change in error — dampens oscillation",
                  },
                  {
                    label: "I (Integral)",
                    value: "kI × Σ(error × dt)",
                    note: "Accumulates error over time — corrects steady-state offset",
                  },
                ]}
              />
              <CodeBlock
                filename="PIDController.java"
                code={`// ── Full PID implementation for a lift or arm ────────────────────────────

double kP = 0.005;
double kI = 0.0001;
double kD = 0.0003;

double integralSum  = 0;
double lastError    = 0;
ElapsedTime timer   = new ElapsedTime();

while (opModeIsActive()) {
    double dt = timer.seconds();
    timer.reset();
    if (dt < 0.001) dt = 0.001; // avoid divide-by-zero when the loop is very fast

    int error = targetTicks - motor.getCurrentPosition();

    // ── P term ────────────────────────────────────────────────────────────
    double P = kP * error;

    // ── I term — accumulate error over time ───────────────────────────────
    integralSum += error * dt;

    // Cap integral to prevent windup (integral growing unbounded)
    double MAX_INTEGRAL = 300;
    integralSum = Math.max(-MAX_INTEGRAL, Math.min(MAX_INTEGRAL, integralSum));

    double I = kI * integralSum;

    // ── D term — rate of change of error ─────────────────────────────────
    double D = kD * (error - lastError) / dt;
    lastError = error;

    // ── Combined output ───────────────────────────────────────────────────
    double power = P + I + D;
    power = Math.max(-1.0, Math.min(1.0, power));

    motor.setPower(power);

    telemetry.addData("Error", error);
    telemetry.addData("P/I/D", "%.3f / %.3f / %.3f", P, I, D);
    telemetry.addData("Power", "%.3f", power);
    telemetry.update();
}`}
              />
              <NoteBox type="warning">
                Always guard <code>dt</code> before dividing for the D term.
                Fast loops can return <code>0.0</code> from{" "}
                <code>timer.seconds()</code>, which produces{" "}
                <code>NaN</code> power and kills the mechanism. Capping{" "}
                <code>dt</code> to at least 1&nbsp;ms (or using{" "}
                <code>timer.milliseconds()</code>) keeps the math stable.
              </NoteBox>
              <NoteBox type="info">
                For most FTC mechanisms, <strong>PD is enough</strong> — P
                drives to the target, D dampens the approach. Only add I if
                the mechanism consistently stops a few ticks short and won&apos;t
                quite reach the target. Always cap the integral sum to prevent
                &ldquo;windup&rdquo; where it grows so large it causes a violent
                overshoot.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "pid-tuning",
          title: "Tuning PID",
          content: (
            <Prose>
              <p>
                Tune gains in this order — never adjust all three at once:
              </p>
              <StepList
                steps={[
                  "Set kI and kD to zero. Increase kP until the mechanism moves toward the target. If it gets there but very slowly, increase kP more.",
                  "If kP causes oscillation (bouncing back and forth past the target), increase kD to dampen it. Increase D until the oscillation stops.",
                  "If the mechanism reliably stops a few ticks short of the target and won't reach it (usually due to friction), add a small kI. Increase carefully — too much I causes overshoot.",
                  "Test with the robot in a realistic state (battery at typical competition level, full mechanism weight). Gains that work at 100% battery may oscillate at 80%.",
                ]}
              />
              <SpecTable
                rows={[
                  { label: "Slow to reach target", value: "Increase kP" },
                  { label: "Oscillates past target", value: "Increase kD, or reduce kP" },
                  { label: "Stops just short, won't quite reach", value: "Add small kI" },
                  { label: "Huge overshoot on start", value: "Reduce kP significantly" },
                  { label: "Drifts slowly over time", value: "Increase kI slightly" },
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "builtin-pid",
          title: "Built-in PID (RUN_USING_ENCODER)",
          content: (
            <Prose>
              <p>
                The FTC SDK has a built-in PID velocity controller. Enable it
                by setting <code>RUN_USING_ENCODER</code> mode and use{" "}
                <code>setVelocity()</code> instead of <code>setPower()</code>:
              </p>
              <CodeBlock
                filename="BuiltInPID.java"
                code={`DcMotorEx motor = hardwareMap.get(DcMotorEx.class, "liftMotor");

motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER); // enables built-in velocity PID

// Use setVelocity() in ticks per second
motor.setVelocity(800);  // 800 ticks/sec forward
motor.setVelocity(-800); // 800 ticks/sec reverse
motor.setVelocity(0);    // stop

// ── RUN_TO_POSITION — built-in position control ───────────────────────────
motor.setTargetPosition(1500);
motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
motor.setPower(0.8); // power is the max power allowed, not the exact power
// motor.isBusy() returns true while still moving to target`}
              />
              <NoteBox type="warning">
                The built-in PID runs at a fixed <strong>20 Hz</strong> sample
                rate. For high-performance control (especially fast-moving
                lifts or arms), an external PID running in your own loop at
                80+ Hz gives significantly smoother results. Use{" "}
                <code>RUN_WITHOUT_ENCODER</code> mode when using an external
                PID so the internal controller doesn&apos;t interfere.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "feedforward",
          title: "Feedforward Control",
          content: (
            <Prose>
              <p>
                <strong>Feedforward</strong> is open-loop — it predicts the
                power needed based on a model instead of measuring error. Used
                alongside PID, it handles the &ldquo;expected&rdquo; effort so
                PID only needs to correct small errors.
              </p>
              <h3>Gravity Compensation (Arms)</h3>
              <p>
                An arm held horizontally needs more power to stay up than one
                held vertically. The force of gravity scales with{" "}
                <code>cos(angle)</code>:
              </p>
              <CodeBlock
                filename="GravityFeedforward.java"
                code={`double kF = 0.12; // tune empirically: increase until arm holds itself horizontal

while (opModeIsActive()) {
    int error = targetTicks - motor.getCurrentPosition();

    // Convert encoder ticks to angle (add offset so 0 rad = physical horizontal)
    double TICKS_PER_DEGREE = TICKS_PER_REV / 360.0;
    double HORIZONTAL_OFFSET_RAD = Math.toRadians(90); // tune to your zero position
    double angleRad = Math.toRadians(motor.getCurrentPosition() / TICKS_PER_DEGREE)
                    - HORIZONTAL_OFFSET_RAD;

    // Feedforward: cosine of current angle × kF
    // At horizontal: cos(0) = 1.0 → full gravity compensation
    // At vertical:   cos(±π/2) ≈ 0 → minimal compensation
    double feedforward = kF * Math.cos(angleRad);

    double power = kP * error + feedforward;
    power = Math.max(-1.0, Math.min(1.0, power));
    motor.setPower(power);
}`}
              />
              <NoteBox type="info">
                Encoder zero is wherever the arm sits at boot — usually tucked
                down, not horizontal. Add a calibration offset to{" "}
                <code>angleRad</code> so that <code>0</code> radians in your
                math matches the arm&apos;s actual horizontal pose. Without
                it, <code>cos(0)</code> may apply full holding power while
                the arm is resting vertically and kick it upward.
              </NoteBox>
              <NoteBox type="tip">
                To find <code>kF</code>: set all PID gains to zero, then
                increase <code>kF</code> until the arm can hold itself
                horizontal without sagging. If it drifts upward, reduce
                <code>kF</code>.
              </NoteBox>
              <h3>Velocity Feedforward (Drivetrain)</h3>
              <CodeBlock
                filename="VelocityFeedforward.java"
                code={`// Used by Road Runner internally — shown here for understanding
// output = Kv × targetVelocity + Ka × targetAcceleration + Ks × sign(velocity)
double Kv = 0.015;  // velocity gain
double Ka = 0.002;  // acceleration gain
double Ks = 0.1;    // static friction gain

double output = Ks * Math.signum(targetVelocity)
              + Kv * targetVelocity
              + Ka * targetAcceleration;`}
              />
            </Prose>
          ),
        },
        {
          id: "fsm",
          title: "Finite State Machines",
          content: (
            <Prose>
              <p>
                A <strong>Finite State Machine (FSM)</strong> lets a robot
                perform multiple tasks &ldquo;at the same time&rdquo; in a
                single-threaded loop. Instead of blocking with{" "}
                <code>sleep()</code> or nested while loops, the robot checks
                a state variable each loop and only does one step of work per
                iteration — keeping the drive and other systems responsive.
              </p>
              <p>
                The classic FTC use case: <strong>automate a mechanism in
                TeleOp</strong> while the driver keeps full control of the
                drivetrain.
              </p>
              <CodeBlock
                filename="FSMExample.java"
                code={`@TeleOp(name = "FSM TeleOp")
public class FSMTeleOp extends LinearOpMode {

    // ── Define all possible states with an enum ───────────────────────────
    public enum LiftState {
        IDLE,       // waiting for driver input
        EXTENDING,  // lift motor moving up
        DUMPING,    // waiting for dump servo to finish
        RETRACTING  // lift motor moving back down
    }

    LiftState liftState = LiftState.IDLE;

    DcMotorEx liftMotor;
    Servo     dumpServo;
    ElapsedTime liftTimer = new ElapsedTime();

    final int    LIFT_HIGH     = 2200;
    final int    LIFT_LOW      = 0;
    final double DUMP_OPEN     = 0.8;
    final double DUMP_IDLE_POS = 0.1;
    final double DUMP_WAIT_SEC = 0.8; // seconds to hold dump position

    @Override
    public void runOpMode() {
        liftMotor = hardwareMap.get(DcMotorEx.class, "liftMotor");
        dumpServo = hardwareMap.get(Servo.class, "dumpServo");

        liftMotor.setTargetPosition(LIFT_LOW);
        liftMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        liftMotor.setPower(1.0);

        waitForStart();

        while (opModeIsActive()) {
            // ── FSM: one step of work per iteration — never blocks ────────
            switch (liftState) {

                case IDLE:
                    if (gamepad1.x) {
                        liftMotor.setTargetPosition(LIFT_HIGH);
                        liftState = LiftState.EXTENDING;
                    }
                    break;

                case EXTENDING:
                    if (gamepad1.y) {
                        liftMotor.setTargetPosition(LIFT_LOW);
                        liftState = LiftState.RETRACTING;
                        break;
                    }
                    if (Math.abs(liftMotor.getCurrentPosition() - LIFT_HIGH) < 20) {
                        dumpServo.setPosition(DUMP_OPEN);
                        liftTimer.reset();
                        liftState = LiftState.DUMPING;
                    }
                    break;

                case DUMPING:
                    if (gamepad1.y) {
                        dumpServo.setPosition(DUMP_IDLE_POS);
                        liftMotor.setTargetPosition(LIFT_LOW);
                        liftState = LiftState.RETRACTING;
                        break;
                    }
                    if (liftTimer.seconds() >= DUMP_WAIT_SEC) {
                        dumpServo.setPosition(DUMP_IDLE_POS);
                        liftMotor.setTargetPosition(LIFT_LOW);
                        liftState = LiftState.RETRACTING;
                    }
                    break;

                case RETRACTING:
                    if (Math.abs(liftMotor.getCurrentPosition() - LIFT_LOW) < 20) {
                        liftState = LiftState.IDLE;
                    }
                    break;
            }

            // ── Drivetrain ALWAYS runs — the FSM never blocks it ──────────
            double y  = -gamepad1.left_stick_y;
            double x  =  gamepad1.left_stick_x * 1.1;
            double rx =  gamepad1.right_stick_x;
            // ... set motor powers ...

            telemetry.addData("Lift State", liftState);
            telemetry.addData("Lift Pos",   liftMotor.getCurrentPosition());
            telemetry.update();
        }
    }
}`}
              />
              <SpecTable
                rows={[
                  { label: "IDLE", value: "Waiting for driver input" },
                  { label: "EXTENDING", value: "Motor running, checking if target reached" },
                  { label: "DUMPING", value: "Waiting for timer (non-blocking sleep)" },
                  { label: "RETRACTING", value: "Motor running, checking if home reached" },
                ]}
              />
              <NoteBox type="info">
                Notice there are <strong>no</strong> <code>sleep()</code>{" "}
                calls, <strong>no</strong> blocking while loops, and the
                drivetrain code always executes. This is the key difference
                between an FSM and naive sequential code — the robot never
                freezes waiting for a mechanism.
              </NoteBox>
              <NoteBox type="tip">
                Draw a <strong>state diagram</strong> before writing code —
                boxes for each state, arrows for each transition condition.
                This makes it obvious which transitions you&apos;ve forgotten and
                can also be used for a Control Award submission.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "motion-profiles",
          title: "Motion Profiles",
          content: (
            <Prose>
              <p>
                A <strong>motion profile</strong> controls how fast a
                mechanism speeds up and slows down rather than jumping to full
                power instantly. This reduces wheel slip, protects gearboxes,
                and makes autonomous more consistent.
              </p>
              <p>
                The most common type for FTC is a{" "}
                <strong>trapezoidal profile</strong> — accelerate at a
                constant rate, cruise, then decelerate at a constant rate.
                Road Runner uses these internally for all trajectories.
              </p>
              <CodeBlock
                filename="TrapezoidProfile.java"
                code={`// ── Trapezoidal motion profile for a lift ─────────────────────────────────

double maxVel   = 1500; // ticks per second
double maxAccel = 3000; // ticks per second²

double currentVel = 0;
double lastTime   = 0;

ElapsedTime profileTimer = new ElapsedTime();

while (opModeIsActive()) {
    double dt = profileTimer.seconds() - lastTime;
    lastTime  = profileTimer.seconds();
    if (dt < 0.001) dt = 0.001;

    int error = targetTicks - motor.getCurrentPosition();

    // Deceleration cap: shrink desired speed as we approach the target
    // braking distance ≈ v² / (2a)
    double brakingDistance = (currentVel * currentVel) / (2 * maxAccel);
    double desiredVel;
    if (Math.abs(error) < brakingDistance) {
        desiredVel = Math.signum(error) * Math.sqrt(2 * maxAccel * Math.abs(error));
    } else {
        desiredVel = Math.signum(error) * maxVel;
    }

    // Ramp toward desired velocity — can't exceed maxAccel change per second
    double velChange = maxAccel * dt;
    if (desiredVel > currentVel) {
        currentVel = Math.min(currentVel + velChange, desiredVel);
    } else {
        currentVel = Math.max(currentVel - velChange, desiredVel);
    }

    // Use velocity feedforward to convert target velocity to power
    double power = currentVel / maxVel; // simplified — use kV for real tuning
    motor.setPower(power);
}`}
              />
              <NoteBox type="warning">
                A profile that commands full <code>maxVel</code> until the
                last tick will slam into the target. Always ramp velocity down
                using remaining distance — the braking-distance check above
                prevents an instant stop from cruise speed.
              </NoteBox>
              <NoteBox type="info">
                Road Runner and Pedro Pathing both implement motion profiles
                automatically for you — you specify max velocity and
                acceleration in their config, and they handle all the math.
                The code above shows the concept for custom mechanisms like
                lifts and arms.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

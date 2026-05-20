import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Motors & Servos – FTC Programming Hub" };

export default function MotorsServosPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/motors-servos" },
        { label: "Motors & Servos" },
      ]}
      title="Motors & Servos"
      description="Everything you need to control DC motors and servos in FTC — the Java API is identical regardless of which hardware vendor you buy from."
      badge="Programming"
      badgeColor="blue"
      readingTime="10 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                The FTC SDK abstracts all hardware behind a unified interface.
                Whether you use goBILDA, REV Robotics, Andymark, or any other
                vendor&apos;s motors and servos, the <code>DcMotor</code> and{" "}
                <code>Servo</code> interfaces remain identical. You never need
                vendor-specific code for basic control.
              </p>
              <InfoGrid
                items={[
                  { label: "SDK Class", value: "DcMotor", sub: "DC motor control" },
                  { label: "SDK Class", value: "Servo", sub: "Position servo" },
                  { label: "Config Name", value: "Driver Station", sub: "Set in DS app" },
                  { label: "Port", value: "0 – 3", sub: "REV Control Hub" },
                ]}
              />
              <NoteBox type="tip">
                Always configure your hardware names in the Driver Station app
                first, then match them <em>exactly</em> in your{" "}
                <code>hardwareMap.get()</code> calls. A single typo or
                capitalization difference will throw a{" "}
                <code>NullPointerException</code> at runtime.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "dc-motor-setup",
          title: "DC Motor Setup",
          content: (
            <Prose>
              <p>
                Retrieve a motor from <code>hardwareMap</code>, then configure
                its direction and zero-power behavior before the match starts.
                Every DC motor in FTC has four possible <code>RunMode</code>{" "}
                values that determine how the SDK interprets the power value you
                set. Choose the right mode for each use-case:
              </p>
              <SpecTable
                rows={[
                  {
                    label: "RUN_WITHOUT_ENCODER",
                    value: "Raw voltage, no feedback",
                    note: "Your code manages everything",
                  },
                  {
                    label: "RUN_USING_ENCODER",
                    value: "Velocity-regulated",
                    note: "SDK PID stabilizes speed",
                  },
                  {
                    label: "RUN_TO_POSITION",
                    value: "Closed-loop position",
                    note: "Drives to setTargetPosition()",
                  },
                  {
                    label: "STOP_AND_RESET_ENCODER",
                    value: "Zeroes encoder count",
                    note: "Blocking — use in init only",
                  },
                ]}
              />
              <p>
                <code>ZeroPowerBehavior</code> controls what happens when you
                call <code>setPower(0)</code>:
              </p>
              <SpecTable
                rows={[
                  {
                    label: "BRAKE",
                    value: "Motor actively resists movement",
                    note: "Use for lifts and arms",
                  },
                  {
                    label: "FLOAT",
                    value: "Motor coasts freely",
                    note: "Use for intake rollers",
                  },
                ]}
              />
              <CodeBlock
                filename="MotorSetup.java"
                code={`DcMotor leftMotor  = hardwareMap.get(DcMotor.class, "left_motor");
DcMotor rightMotor = hardwareMap.get(DcMotor.class, "right_motor");

// Right side physically spins the opposite direction
rightMotor.setDirection(DcMotorSimple.Direction.REVERSE);

// Hold position when driver releases the sticks
leftMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
rightMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

// Zero the encoder counters at the start of every match
leftMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
rightMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);`}
              />
              <NoteBox type="warning">
                <code>setMode(STOP_AND_RESET_ENCODER)</code> is blocking — it
                does not return until the encoder is zeroed. Never call it
                inside <code>loop()</code> or the TeleOp while-loop; it will
                freeze your robot mid-match. Always call it during init.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "run-without-encoder",
          title: "RUN_WITHOUT_ENCODER",
          content: (
            <Prose>
              <p>
                <code>RUN_WITHOUT_ENCODER</code> maps <code>setPower()</code>{" "}
                directly to a voltage fraction on the motor output. The SDK
                applies no feedback correction — whatever power you set is
                what the motor gets. This is the simplest mode and has the
                lowest overhead, making it the default choice for TeleOp
                drivetrains where the driver provides the feedback loop.
              </p>
              <p>
                Note that encoder readings are still available in this mode via{" "}
                <code>getCurrentPosition()</code> — the name means the encoder
                is not used for <em>control</em>, not that it is disabled.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Best for",
                    value: "TeleOp drivetrains, intake rollers",
                    note: "Driver corrects in real time",
                  },
                  {
                    label: "setPower() range",
                    value: "-1.0 to 1.0",
                    note: "Maps to full reverse / full forward",
                  },
                  {
                    label: "Encoder",
                    value: "Readable but unused",
                    note: "getCurrentPosition() still works",
                  },
                  {
                    label: "Battery sensitivity",
                    value: "High",
                    note: "Speed drops as battery drains",
                  },
                ]}
              />
              <CodeBlock
                filename="TankDriveTeleOp.java"
                code={`@TeleOp(name = "Tank Drive", group = "TeleOp")
public class TankDriveTeleOp extends LinearOpMode {

    private DcMotor leftMotor;
    private DcMotor rightMotor;

    @Override
    public void runOpMode() {
        leftMotor  = hardwareMap.get(DcMotor.class, "left_motor");
        rightMotor = hardwareMap.get(DcMotor.class, "right_motor");

        rightMotor.setDirection(DcMotorSimple.Direction.REVERSE);
        leftMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        rightMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        // No encoder needed — raw power is fine for TeleOp
        leftMotor.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);
        rightMotor.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

        waitForStart();

        while (opModeIsActive()) {
            double leftPower  = -gamepad1.left_stick_y;
            double rightPower = -gamepad1.right_stick_y;

            leftMotor.setPower(leftPower);
            rightMotor.setPower(rightPower);

            telemetry.addData("Left",  "%.2f", leftPower);
            telemetry.addData("Right", "%.2f", rightPower);
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="info">
                Even in <code>RUN_WITHOUT_ENCODER</code> mode you can read the
                encoder to implement soft limits:{" "}
                <code>if (motor.getCurrentPosition() &gt; MAX_TICKS) setPower(0)</code>.
                You get raw speed control with encoder safety guards.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "run-using-encoder",
          title: "RUN_USING_ENCODER",
          content: (
            <Prose>
              <p>
                <code>RUN_USING_ENCODER</code> activates the SDK&apos;s built-in
                velocity PIDF controller. Instead of a raw voltage fraction,{" "}
                <code>setPower()</code> now commands a fraction of the
                motor&apos;s maximum velocity — the SDK reads the encoder
                continuously and adjusts the output to maintain the target speed.
                The result is more consistent motion as the battery drains.
              </p>
              <p>
                With <code>DcMotorEx</code> (a subclass of <code>DcMotor</code>),
                you can also call <code>setVelocity(ticksPerSecond)</code> to
                command an exact speed rather than a fraction, which is useful
                for autonomous routines that need repeatable distances.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Best for",
                    value: "Autonomous straight drives, consistent speed",
                    note: "Battery-compensated",
                  },
                  {
                    label: "setPower() range",
                    value: "-1.0 to 1.0",
                    note: "Fraction of max velocity",
                  },
                  {
                    label: "setVelocity()",
                    value: "Ticks/second (DcMotorEx only)",
                    note: "Exact speed command",
                  },
                  {
                    label: "Battery sensitivity",
                    value: "Low",
                    note: "PIDF compensates automatically",
                  },
                ]}
              />
              <CodeBlock
                filename="RunUsingEncoderExample.java"
                code={`// DcMotorEx unlocks velocity commands and PIDF tuning
DcMotorEx driveLeft  = hardwareMap.get(DcMotorEx.class, "left_motor");
DcMotorEx driveRight = hardwareMap.get(DcMotorEx.class, "right_motor");

driveRight.setDirection(DcMotorSimple.Direction.REVERSE);

// Reset first, then enter velocity-regulated mode
driveLeft.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
driveRight.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

driveLeft.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
driveRight.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

waitForStart();

// ── Option A: setPower() as velocity fraction ─────────────────────────────
// 0.7 = 70% of maximum velocity — consistent across battery states
driveLeft.setPower(0.7);
driveRight.setPower(0.7);

sleep(1500); // Drive forward for 1.5 seconds at 70% velocity

driveLeft.setPower(0);
driveRight.setPower(0);

// ── Option B: setVelocity() for exact ticks/second (DcMotorEx only) ───────
// goBILDA 19.2:1 motor: max ~312 RPM → 312 × 537.7 / 60 ≈ 2796 ticks/s
double targetTicksPerSec = 1500; // roughly half speed

driveLeft.setVelocity(targetTicksPerSec);
driveRight.setVelocity(targetTicksPerSec);

sleep(2000);

driveLeft.setVelocity(0);
driveRight.setVelocity(0);

// ── Read actual velocity in loop ───────────────────────────────────────────
while (opModeIsActive()) {
    telemetry.addData("Left vel (ticks/s)",  "%.0f", driveLeft.getVelocity());
    telemetry.addData("Right vel (ticks/s)", "%.0f", driveRight.getVelocity());
    telemetry.update();
}`}
              />
              <NoteBox type="tip">
                If your motor overshoots or oscillates in{" "}
                <code>RUN_USING_ENCODER</code>, the SDK&apos;s default PIDF
                coefficients may not match your motor. You can tune them with{" "}
                <code>DcMotorEx.setPIDFCoefficients(RunMode.RUN_USING_ENCODER, pidf)</code>.
                Start by increasing the <strong>F</strong> (feedforward) term —
                it handles friction before the PID even kicks in.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "run-to-position",
          title: "RUN_TO_POSITION",
          content: (
            <Prose>
              <p>
                <code>RUN_TO_POSITION</code> is a closed-loop position mode.
                You set a target tick count with{" "}
                <code>setTargetPosition(int)</code>, switch the mode, then set
                a positive power. The SDK&apos;s built-in PID drives the motor
                to the target and holds it there — you do not need to manage
                direction manually. The key concept is{" "}
                <strong>ticks per revolution (TPR)</strong>: convert a real-world
                distance or angle to encoder ticks before commanding the motor.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Best for",
                    value: "Lifts, arms, preset positions",
                    note: "SDK holds position automatically",
                  },
                  {
                    label: "setPower() range",
                    value: "0.0 to 1.0",
                    note: "Magnitude only — PID sets direction",
                  },
                  {
                    label: "isBusy()",
                    value: "true while moving to target",
                    note: "false when within tolerance",
                  },
                  {
                    label: "goBILDA 19.2:1 TPR",
                    value: "537.7 ticks/rev",
                    note: "Output shaft" ,
                  },
                  {
                    label: "REV HD Hex 40:1 TPR",
                    value: "1120 ticks/rev",
                    note: "Output shaft",
                  },
                ]}
              />
              <CodeBlock
                filename="RunToPositionExample.java"
                code={`DcMotor liftMotor = hardwareMap.get(DcMotor.class, "lift_motor");

liftMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

// Step 1 — always zero the encoder at the starting position
liftMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

// Step 2 — set the target tick count
//   Example: goBILDA 19.2:1 motor, raise 2 full revolutions
//   targetTicks = revolutions × 537.7 = 2 × 537.7 ≈ 1075
int TARGET_TICKS = 1075;
liftMotor.setTargetPosition(TARGET_TICKS);

// Step 3 — switch to RUN_TO_POSITION BEFORE setting power
liftMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);

// Step 4 — set a positive power (PID handles direction)
liftMotor.setPower(0.8);

// Step 5 — wait until the motor arrives (include timeout for safety)
ElapsedTime timer = new ElapsedTime();
while (liftMotor.isBusy() && timer.seconds() < 3.0 && opModeIsActive()) {
    telemetry.addData("Current", liftMotor.getCurrentPosition());
    telemetry.addData("Target",  TARGET_TICKS);
    telemetry.update();
}

// Step 6 — zero power; BRAKE ZeroPowerBehavior holds the position
liftMotor.setPower(0.0);`}
              />
              <NoteBox type="info">
                Ticks-per-revolution varies by motor model — always confirm it
                from the motor&apos;s datasheet before calculating targets.
                Two common values: <strong>goBILDA 5202 19.2:1</strong> = 537.7
                ticks/rev, <strong>REV HD Hex 40:1</strong> = 1120 ticks/rev.
              </NoteBox>
              <p>
                For TeleOp use, the same approach works as a preset-position
                pattern — call <code>goToPosition()</code> when a button is
                pressed and let the PID handle the rest:
              </p>
              <CodeBlock
                filename="PresetPositions.java"
                code={`// Preset tick constants — tune these for your robot
private static final int POS_DOWN = 0;
private static final int POS_LOW  = 450;
private static final int POS_HIGH = 1650;

while (opModeIsActive()) {
    if (gamepad1.a) goToPosition(POS_DOWN);
    if (gamepad1.b) goToPosition(POS_LOW);
    if (gamepad1.y) goToPosition(POS_HIGH);

    telemetry.addData("Target",  liftMotor.getTargetPosition());
    telemetry.addData("Current", liftMotor.getCurrentPosition());
    telemetry.addData("Busy",    liftMotor.isBusy());
    telemetry.update();
}

private void goToPosition(int ticks) {
    liftMotor.setTargetPosition(ticks);
    liftMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
    liftMotor.setPower(0.85);
}`}
              />
              <NoteBox type="warning">
                Always clamp target positions between your minimum and maximum
                tick values before calling <code>setTargetPosition</code>. If
                the motor is commanded past a mechanical hard stop, it will
                continue applying power until the PID gives up — which can
                strip gears or break structural parts.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "servos",
          title: "Servos",
          content: (
            <Prose>
              <p>
                The <code>Servo</code> interface controls position-based servos.
                <code>setPosition(double)</code> accepts a value from{" "}
                <strong>0.0 to 1.0</strong>, which maps linearly to the
                servo&apos;s full physical travel (typically 0° – 270° for most
                FTC servos). The servo actively holds its commanded position —
                there is no <code>isBusy()</code>. Use <code>sleep()</code> or
                an <code>ElapsedTime</code> state machine to wait for travel to
                complete.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "setPosition(pos)",
                    value: "0.0 – 1.0",
                    note: "Maps to full travel range",
                  },
                  {
                    label: "getPosition()",
                    value: "double",
                    note: "Returns last commanded position",
                  },
                  {
                    label: "scaleRange(min, max)",
                    value: "0.0 – 1.0 each",
                    note: "Restricts usable travel",
                  },
                  {
                    label: "setDirection(dir)",
                    value: "FORWARD / REVERSE",
                    note: "Flips position mapping",
                  },
                ]}
              />
              <CodeBlock
                filename="ClawServo.java"
                code={`Servo clawServo = hardwareMap.get(Servo.class, "claw_servo");

// Flip direction if the servo is physically mounted in reverse
clawServo.setDirection(Servo.Direction.FORWARD);

// scaleRange limits travel to protect mechanism — here 10%–90% of 270°
clawServo.scaleRange(0.1, 0.9);

final double CLAW_OPEN   = 0.2;
final double CLAW_CLOSED = 0.8;

clawServo.setPosition(CLAW_OPEN); // Open on init

waitForStart();

while (opModeIsActive()) {
    if (gamepad1.a) clawServo.setPosition(CLAW_OPEN);
    if (gamepad1.b) clawServo.setPosition(CLAW_CLOSED);

    telemetry.addData("Claw position", "%.2f", clawServo.getPosition());
    telemetry.update();
}`}
              />
              <NoteBox type="tip">
                <code>scaleRange(min, max)</code> remaps the full 0.0–1.0 input
                to a sub-range of the physical travel. For example,{" "}
                <code>scaleRange(0.1, 0.9)</code> prevents the servo from ever
                reaching its mechanical endpoints, eliminating the grinding that
                damages gears and horns.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "continuous-servos",
          title: "Continuous Rotation Servos",
          content: (
            <Prose>
              <p>
                Continuous rotation (CR) servos spin indefinitely rather than
                moving to a position. In FTC, use the <code>CRServo</code>{" "}
                interface and <code>setPower(double)</code> with a range of{" "}
                <strong>-1.0 to 1.0</strong>. There is no position feedback —
                CR servos are best for intake rollers and turntables where
                continuous rotation matters and precise position does not.
              </p>
              <CodeBlock
                filename="IntakeRoller.java"
                code={`@TeleOp(name = "Intake Roller", group = "Mechanism")
public class IntakeRoller extends LinearOpMode {

    private CRServo intakeRoller;

    @Override
    public void runOpMode() {
        intakeRoller = hardwareMap.get(CRServo.class, "intake_roller");
        intakeRoller.setDirection(DcMotorSimple.Direction.FORWARD);

        waitForStart();

        while (opModeIsActive()) {
            if (gamepad1.right_trigger > 0.1) {
                intakeRoller.setPower(gamepad1.right_trigger); // Intake
            } else if (gamepad1.left_trigger > 0.1) {
                intakeRoller.setPower(-gamepad1.left_trigger); // Eject
            } else {
                intakeRoller.setPower(0.0); // Stop
            }

            telemetry.addData("Intake power", intakeRoller.getPower());
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "encoder-reading",
          title: "Reading Encoders",
          content: (
            <Prose>
              <p>
                Any motor reports its current position via{" "}
                <code>motor.getCurrentPosition()</code>, which returns a signed
                integer tick count regardless of which <code>RunMode</code> is
                active. Positive ticks indicate forward rotation; negative ticks
                indicate reverse. Use this value for autonomous positioning,
                telemetry dashboards, or soft limit guards.
              </p>
              <CodeBlock
                filename="EncoderReadingExample.java"
                code={`DcMotor armMotor = hardwareMap.get(DcMotor.class, "arm_motor");

// Encoder works in any RunMode — RUN_WITHOUT_ENCODER just means
// the encoder is not used for feedback, not that it is turned off.
armMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
armMotor.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

// Soft limit — stop upward motion past 2000 ticks
final int MAX_TICKS = 2000;

waitForStart();

while (opModeIsActive()) {
    int currentTicks = armMotor.getCurrentPosition();

    double power = -gamepad2.left_stick_y;

    // Guard against driving into hard stop
    if (currentTicks >= MAX_TICKS && power > 0) {
        power = 0;
    }
    if (currentTicks <= 0 && power < 0) {
        power = 0;
    }

    armMotor.setPower(power);

    telemetry.addData("Arm ticks",    currentTicks);
    telemetry.addData("Motor power",  "%.2f", power);
    telemetry.update();
}`}
              />
              <NoteBox type="info">
                To convert ticks to real-world distance, divide by the
                motor&apos;s ticks-per-revolution and multiply by the
                mechanism&apos;s circumference or lead. For a 32 mm spool with
                a goBILDA 19.2:1 motor:{" "}
                <code>mm = (ticks / 537.7) × (π × 32)</code>.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

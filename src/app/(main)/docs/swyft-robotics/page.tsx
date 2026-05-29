import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = {
  title: "Swyft Robotics – FTC Programming Hub",
  description: "Swyft Robotics hardware guide for FTC — linear actuators, structural components, and FTC SDK integration.",
};

export default function SwyftRoboticsPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/swyft-robotics" },
        { label: "Swyft Robotics" },
      ]}
      title="Swyft Robotics"
      description="A practical guide to Swyft Robotics hardware for FTC — covering linear actuators, structural integration, and full FTC SDK wiring from config name to code."
      badge="Hardware"
      badgeColor="amber"
      readingTime="10 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                Swyft Robotics produces a line of competition-ready FTC components
                focused on high-speed linear motion and rigid structural systems.
                Their hardware is designed to pair directly with REV Control Hub
                and Expansion Hub motor and servo ports using standard XT30 / JST
                connectors.
              </p>
              <InfoGrid
                items={[
                  { label: "Primary Product", value: "Linear Actuator", sub: "12 V DC" },
                  { label: "Interface", value: "DcMotor / Servo", sub: "FTC SDK native" },
                  { label: "Encoder", value: "Built-in Quad", sub: "On-shaft" },
                  { label: "Connector", value: "XT30 + JST-PH", sub: "REV compatible" },
                ]}
              />
              <NoteBox type="tip">
                Swyft hardware uses the same <strong>hardwareMap</strong> API as
                every other FTC device. No third-party library is required — wire
                it into a motor port and reference it by its config name.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "linear-actuator",
          title: "Swyft Linear Actuator",
          content: (
            <Prose>
              <p>
                The <strong>Swyft Linear Actuator</strong> is a brushed DC linear
                actuator with a built-in quadrature encoder. It connects directly
                to any REV Control Hub or Expansion Hub motor port. The encoder
                wires share the same JST-PH connector used by goBILDA Yellow Jacket
                motors, so the pinout is identical.
              </p>
              <SpecTable
                rows={[
                  { label: "Voltage", value: "12 V nominal", note: "8–13.5 V range" },
                  { label: "No-load speed", value: "Varies by ratio", note: "Check product page" },
                  { label: "Encoder type", value: "Quadrature", note: "Built-in on output shaft" },
                  { label: "Encoder resolution", value: "~28 PPR (pre-gearbox)", note: "Multiply by gear ratio" },
                  { label: "Connector — power", value: "XT30", note: "To REV motor port" },
                  { label: "Connector — encoder", value: "JST-PH 4-pin", note: "Standard REV pinout" },
                  { label: "Mounting", value: "M3 bolt pattern", note: "Compatible with 15 mm channel" },
                ]}
              />
              <NoteBox type="warning">
                Always confirm the encoder PPR for your specific actuator model
                on the Swyft Robotics product page. The value affects every
                encoder-based position calculation in your code.
              </NoteBox>
              <pre className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
{`  +-----------------------------------------------------------------+
  | [ Motor Core ] ---> [ Gearbox Ratio ] ---> [ Lead Screw ]        |
  |   28 PPR Quad          E.g., 5:1 Multiplier   Translates Rotary |
  |   Encoder Ticks        Amplifies Resolution   to Linear Travel  |
  +-----------------------------------------------------------------+
                                    |
                                    v
                [ Calculated Ticks per Millimeter Scale ]`}
              </pre>
              <p>
                <strong>Wiring steps:</strong>
              </p>
              <StepList
                steps={[
                  "Plug the XT30 power connector into a free motor port on the Control Hub or Expansion Hub.",
                  "Plug the JST-PH 4-pin encoder connector into the encoder port on the same motor slot.",
                  "Open the Driver Station app, navigate to Configure Robot → New Configuration, and add a DC Motor named swyft_linear (or your preferred name).",
                  "Save the configuration and reference the name in your code.",
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "sdk-initialization",
          title: "SDK Initialization",
          content: (
            <Prose>
              <p>
                Once the actuator is wired and named in the robot config, retrieve
                it through <code>hardwareMap</code> using <code>DcMotor.class</code>.
                The initialization pattern below applies to any OpMode type.
              </p>
              <CodeBlock
                
                filename="SwyftLinearInit.java"
                code={`import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

// ── Inside your OpMode's runOpMode() or init() ──────────────────────────────

DcMotor swyftLinear = hardwareMap.get(DcMotor.class, "swyft_linear");

// Direction — set FORWARD if the actuator extends on positive power,
// REVERSE if it retracts. Verify by running with a small power value first.
swyftLinear.setDirection(DcMotorSimple.Direction.FORWARD);

// BRAKE holds the actuator at its current position when power = 0.
// Use FLOAT only if your mechanism has a physical end-stop.
swyftLinear.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

// Reset the encoder so position 0 = wherever the actuator is at startup.
swyftLinear.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
swyftLinear.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

telemetry.addData("Swyft Linear", "Initialized");
telemetry.update();`}
              />
              <NoteBox type="tip">
                Call <code>STOP_AND_RESET_ENCODER</code> followed immediately by{" "}
                <code>RUN_USING_ENCODER</code> during init. Resetting at the start
                of every match ensures your position math is consistent run-to-run.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "position-control",
          title: "Position Control",
          content: (
            <Prose>
              <p>
                Use <code>RUN_TO_POSITION</code> mode to command the actuator to
                a specific encoder tick target. The SDK&apos;s built-in PID controller
                handles the ramp and hold automatically.
              </p>
              <CodeBlock
                
                filename="SwyftPositionControl.java"
                code={`// ── Extend actuator to a target tick position ────────────────────────────

// Ticks to extend — adjust based on your actuator's PPR × gear ratio.
// Example: 28 PPR × 5:1 ratio × N output revs = target ticks
int EXTENDED_TICKS = 1400;
int RETRACTED_TICKS = 0;

// ── Extend ───────────────────────────────────────────────────────────────
swyftLinear.setTargetPosition(EXTENDED_TICKS);
swyftLinear.setMode(DcMotor.RunMode.RUN_TO_POSITION);
swyftLinear.setPower(0.8); // Power sets speed, NOT direction in RTP mode

// Wait until the actuator reaches its target (or timeout for safety)
ElapsedTime timer = new ElapsedTime();
while (swyftLinear.isBusy() && timer.seconds() < 3.0 && opModeIsActive()) {
    telemetry.addData("Actuator ticks", swyftLinear.getCurrentPosition());
    telemetry.addData("Target", EXTENDED_TICKS);
    telemetry.update();
}

// Cut power after arriving — BRAKE ZeroPowerBehavior holds position
swyftLinear.setPower(0.0);

// ── Retract ───────────────────────────────────────────────────────────────
swyftLinear.setTargetPosition(RETRACTED_TICKS);
swyftLinear.setMode(DcMotor.RunMode.RUN_TO_POSITION);
swyftLinear.setPower(0.8);

ElapsedTime retractTimer = new ElapsedTime();
while (swyftLinear.isBusy() && retractTimer.seconds() < 3.0 && opModeIsActive()) {
    telemetry.addData("Actuator ticks", swyftLinear.getCurrentPosition());
    telemetry.addData("Target", RETRACTED_TICKS);
    telemetry.update();
}
swyftLinear.setPower(0.0);`}
              />
              <NoteBox type="warning">
                Always include a timeout on <strong>every</strong>{" "}
                <code>isBusy()</code> loop — extend and retract alike. A jam,
                gear slip, or disconnected encoder wire leaves{" "}
                <code>isBusy()</code> stuck at <code>true</code> and will burn
                your full autonomous period without a timer guard.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "teleop-integration",
          title: "TeleOp Integration",
          content: (
            <Prose>
              <p>
                For driver-controlled use, map the actuator to a gamepad button or
                trigger. The pattern below toggles between extended and retracted
                states on a single button press.
              </p>
              <CodeBlock
                
                filename="SwyftTeleOp.java"
                code={`// ── TeleOp toggle pattern ────────────────────────────────────────────────

boolean actuatorExtended = false;
boolean lastButtonState  = false;

while (opModeIsActive()) {
    boolean currentButton = gamepad2.a;

    // Rising-edge detection — only act on the press, not while held
    if (currentButton && !lastButtonState) {
        actuatorExtended = !actuatorExtended;

        int targetTicks = actuatorExtended ? 1400 : 0;
        swyftLinear.setTargetPosition(targetTicks);
        swyftLinear.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        swyftLinear.setPower(0.9);
    }

    // Do NOT call setPower(0.0) when !isBusy() — RUN_TO_POSITION holds
    // target with internal PID; cutting power causes sag/stutter under load.

    lastButtonState = currentButton;

    telemetry.addData("Actuator", actuatorExtended ? "EXTENDED" : "RETRACTED");
    telemetry.addData("Ticks", swyftLinear.getCurrentPosition());
    telemetry.update();
}`}
              />
              <NoteBox type="warning">
                Do not zero power each loop when <code>!isBusy()</code> in TeleOp.
                <code>RUN_TO_POSITION</code> plus{" "}
                <code>ZeroPowerBehavior.BRAKE</code> already applies holding
                torque — forcing <code>setPower(0.0)</code> lets heavy mechanisms
                sag, which re-triggers <code>isBusy()</code> and causes stutter.
              </NoteBox>
              <NoteBox type="tip">
                prevents the toggle from flickering while the driver holds the button
                down. Always store the previous button state at the end of the loop.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "tuning-tips",
          title: "Tuning Tips",
          content: (
            <Prose>
              <p>
                Getting reliable position control from any linear actuator requires
                a few calibration steps specific to your mechanism.
              </p>
              <StepList
                steps={[
                  "Determine ticks-per-mm: command a known distance using a ruler, read getCurrentPosition(), and divide. Use this ratio for all future targets.",
                  "Tune power level: start at 0.5 and increase until the actuator reaches its target consistently within your timeout window.",
                  "Check ZeroPowerBehavior: use BRAKE for mechanisms that need to hold position under load; use FLOAT for spring-assisted mechanisms to avoid motor burn.",
                  "Add a soft limit check: before commanding a new target, clamp it between 0 and MAX_TICKS to prevent driving into hard stops.",
                  "Log encoder ticks on telemetry during every match for debugging — they are your primary diagnostic signal.",
                ]}
              />
              <NoteBox type="info">
                If the actuator overshoots its target consistently, reduce the
                power level rather than adjusting the target. Overshooting in{" "}
                <code>RUN_TO_POSITION</code> mode usually means the power is higher
                than the built-in PID can compensate for at that speed.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "cr-servos",
          title: "Continuous Rotation Servos",
          content: (
            <Prose>
              <p>
                Swyft continuous rotation servos use position-mapped speed control
                through the standard <code>Servo</code> interface — not the{" "}
                <code>CRServo</code> <code>setPower()</code> API. In the Driver
                Station robot configuration, select <strong>Servo</strong> (not
                &quot;Continuous Rotation Servo&quot;) so the REV Hub maps PWM
                correctly for the <code>0.0 – 0.5 – 1.0</code> speed scale.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "setPosition(0.0)",
                    value: "Full speed — one direction",
                    note: "e.g. forward / intake",
                  },
                  {
                    label: "setPosition(0.5)",
                    value: "Stopped",
                    note: "Neutral / brake point",
                  },
                  {
                    label: "setPosition(1.0)",
                    value: "Full speed — opposite direction",
                    note: "e.g. reverse / eject",
                  },
                ]}
              />
              <NoteBox type="warning">
                Use <code>Servo.class</code> and <code>setPosition()</code> in
                code, and configure the port as a standard <strong>Servo</strong>{" "}
                in the Driver Station — not &quot;Continuous Rotation Servo.&quot;
                The CR servo hardware profile remaps PWM timing and breaks the
                0.0 / 0.5 / 1.0 speed mapping.
              </NoteBox>
              <CodeBlock
                filename="SwyftCRServo.java"
                code={`Servo swyftRoller = hardwareMap.get(Servo.class, "swyft_roller");

// Always start stopped — position 0.5 is the neutral/brake point
swyftRoller.setPosition(0.5);

waitForStart();

while (opModeIsActive()) {
    if (gamepad1.right_bumper) {
        // Spin one direction (e.g. intake)
        swyftRoller.setPosition(0.0);
    } else if (gamepad1.left_bumper) {
        // Spin opposite direction (e.g. eject)
        swyftRoller.setPosition(1.0);
    } else {
        // Stop
        swyftRoller.setPosition(0.5);
    }
}`}
              />
              <NoteBox type="tip">
                Values between 0.0–0.5 and 0.5–1.0 produce intermediate speeds,
                so you can use trigger axes for variable-speed control:{" "}
                <code>setPosition(0.5 - (gamepad1.right_trigger * 0.5))</code>{" "}
                for one direction and{" "}
                <code>setPosition(0.5 + (gamepad1.left_trigger * 0.5))</code>{" "}
                for the other.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

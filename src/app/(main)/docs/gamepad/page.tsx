import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Gamepad & Telemetry – FTC Programming Hub" };

export default function GamepadPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/gamepad" },
        { label: "Gamepad & Telemetry" },
      ]}
      title="Gamepad & Telemetry"
      description="How to read gamepad inputs reliably in FTC — button aliases, rising/falling edge detection, toggles, rumble feedback, and telemetry best practices."
      badge="TeleOp"
      badgeColor="blue"
      readingTime="10 min"
      sections={[
        {
          id: "gamepad-inputs",
          title: "Gamepad Input Reference",
          content: (
            <Prose>
              <p>
                FTC supports Logitech F310, Xbox One / Series X/S, and
                DualShock 4 (PS4) gamepads. The SDK maps both PS4 and Xbox
                button names to the same fields:
              </p>
              <SpecTable
                rows={[
                  { label: "left_stick_x / left_stick_y", value: "Left joystick — float [-1, 1]", note: "Y is inverted: up = negative" },
                  { label: "right_stick_x / right_stick_y", value: "Right joystick — float [-1, 1]" },
                  { label: "left_trigger / right_trigger", value: "Analog triggers — float [0, 1]" },
                  { label: "left_bumper / right_bumper", value: "Shoulder buttons — boolean" },
                  { label: "a / cross", value: "Bottom face button" },
                  { label: "b / circle", value: "Right face button" },
                  { label: "x / square", value: "Left face button" },
                  { label: "y / triangle", value: "Top face button" },
                  { label: "dpad_up/down/left/right", value: "D-pad — boolean" },
                  { label: "start / options", value: "Menu button — boolean" },
                  { label: "back / share", value: "Back button — boolean" },
                ]}
              />
              <InfoGrid
                items={[
                  { label: "gamepad1", value: "Driver 1", sub: "Primary driver" },
                  { label: "gamepad2", value: "Driver 2", sub: "Operator / mechanisms" },
                  { label: "Stick range", value: "[-1.0, 1.0]", sub: "Float" },
                  { label: "Trigger range", value: "[0.0, 1.0]", sub: "Float" },
                ]}
              />
              <NoteBox type="warning">
                The left stick Y axis is <strong>inverted</strong> — pushing
                the stick forward returns a <em>negative</em> value. Always
                negate <code>left_stick_y</code> when using it for forward
                drive: <code>double power = -gamepad1.left_stick_y;</code>
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "basic-input",
          title: "Basic Input Handling",
          content: (
            <Prose>
              <p>
                For <strong>held buttons</strong> (e.g. hold bumper to run
                intake), reading directly works fine since the SDK updates
                <code>gamepad1</code> every loop:
              </p>
              <CodeBlock
                filename="HeldButton.java"
                code={`while (opModeIsActive()) {
    // While right bumper is held: intake runs. When released: stops.
    if (gamepad1.right_bumper) {
        intake.setPower(1.0);
    } else {
        intake.setPower(0);
    }

    // Analog trigger: variable speed — squeeze more = faster
    double intakePower = gamepad1.right_trigger;
    intake.setPower(intakePower);
}`}
              />
              <p>
                For <strong>toggle buttons</strong> or <strong>one-shot actions</strong>{" "}
                (e.g. press once to increment servo position), reading directly{" "}
                <em>does not work</em> — the loop runs ~30 times per second,
                so one press fires the code 5–15 times:
              </p>
              <CodeBlock
                filename="BadButtonReading.java"
                code={`// ⚠️  DO NOT DO THIS — setPosition is called many times per press
if (gamepad1.a) {
    servo.setPosition(servo.getPosition() + 0.1); // fires 10+ times per press!
}`}
              />
            </Prose>
          ),
        },
        {
          id: "edge-detection",
          title: "Edge Detection (Press Once)",
          content: (
            <Prose>
              <p>
                To run code exactly <strong>once per button press</strong>,
                compare the current gamepad state to the previous loop&apos;s
                state. The FTC SDK provides <code>gamepad.copy()</code> to
                snapshot the entire gamepad state at once.
              </p>
              <CodeBlock
                filename="EdgeDetection.java"
                code={`@TeleOp(name = "Edge Detection Example")
public class EdgeDetectionExample extends LinearOpMode {

    @Override
    public void runOpMode() throws InterruptedException {
        // Declare snapshot objects — initialized to all-zero/false
        Gamepad currentGamepad1  = new Gamepad();
        Gamepad previousGamepad1 = new Gamepad();

        waitForStart();

        while (opModeIsActive()) {
            // ── 1. Snapshot states ────────────────────────────────────────
            // Copy previous BEFORE overwriting it with current
            previousGamepad1.copy(currentGamepad1);
            currentGamepad1.copy(gamepad1);

            // ── 2. Rising edge detector — fires on PRESS ──────────────────
            // "button is pressed NOW but was NOT pressed last loop"
            if (currentGamepad1.a && !previousGamepad1.a) {
                servo.setPosition(servo.getPosition() + 0.1); // fires exactly once
            }

            // ── 3. Falling edge detector — fires on RELEASE ───────────────
            // "button was pressed last loop but is NOT pressed now"
            if (!currentGamepad1.b && previousGamepad1.b) {
                servo.setPosition(servo.getPosition() - 0.1); // fires exactly once on release
            }
        }
    }
}`}
              />
              <NoteBox type="info">
                The <code>gamepad.copy()</code> approach is preferred over
                storing individual booleans like <code>boolean prevA</code>{" "}
                because it captures the entire gamepad state atomically. Since
                <code>gamepad1</code> updates on a separate thread in
                <code>LinearOpMode</code>, reading it twice could give
                different values — copying once per loop prevents this.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "toggles",
          title: "Toggle Buttons",
          content: (
            <Prose>
              <p>
                A <strong>toggle</strong> uses a rising edge detector to flip
                a boolean each press — press once to turn on, press again to
                turn off:
              </p>
              <CodeBlock
                filename="Toggle.java"
                code={`// ── Declare toggle state outside the loop ─────────────────────────────────
boolean intakeOn = false;
boolean clawOpen = false;

Gamepad currentGamepad1  = new Gamepad();
Gamepad previousGamepad1 = new Gamepad();

// ── Multi-state toggle (X cycles through 3 arm positions) ─────────────
// Declare state OUTSIDE the loop — inside the loop it resets every frame!
int armState = 0; // 0 = ground, 1 = mid, 2 = high
final double[] ARM_POSITIONS = { 0.0, 0.45, 0.9 };

while (opModeIsActive()) {
    previousGamepad1.copy(currentGamepad1);
    currentGamepad1.copy(gamepad1);

    // ── Intake toggle (A button) ──────────────────────────────────────────
    if (currentGamepad1.a && !previousGamepad1.a) {
        intakeOn = !intakeOn; // flip the boolean
    }
    intake.setPower(intakeOn ? 1.0 : 0.0);

    // ── Claw toggle (B button) ────────────────────────────────────────────
    if (currentGamepad1.b && !previousGamepad1.b) {
        clawOpen = !clawOpen;
        claw.setPosition(clawOpen ? CLAW_OPEN : CLAW_CLOSED);
    }

    if (currentGamepad1.x && !previousGamepad1.x) {
        armState = (armState + 1) % ARM_POSITIONS.length; // 0 → 1 → 2 → 0 → ...
        armServo.setPosition(ARM_POSITIONS[armState]);
    }
}`}
              />
              <NoteBox type="tip">
                Keep toggles simple — the fewer states a driver needs to
                track mentally, the fewer mistakes they&apos;ll make under
                pressure. If possible, use separate buttons for each state
                rather than cycling through them.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "gamepad-feedback",
          title: "Gamepad Feedback (Rumble & LED)",
          content: (
            <Prose>
              <p>
                The FTC SDK supports rumble and LED control on Xbox One /
                Series X/S and DualShock 4 controllers. Use this to communicate
                robot status to drivers without them needing to watch the Driver
                Station screen.
              </p>
              <SpecTable
                rows={[
                  { label: "Logitech F310", value: "No rumble, no LED" },
                  { label: "Xbox One / Series X/S", value: "Large + small rumble motors", note: "Native rumble on modern Control Hubs" },
                  { label: "Xbox 360", value: "Rumble unreliable", note: "Not recommended — poor support on current firmware" },
                  { label: "DualShock 4 (PS4)", value: "Large + small rumble + RGB lightbar" },
                  { label: "EtPark", value: "Small rumble only + small RGB LED" },
                ]}
              />
              <CodeBlock
                filename="GamepadFeedback.java"
                code={`// ── Rumble for 0.5 seconds ────────────────────────────────────────────────
// Parameters: leftMotor power, rightMotor power, duration ms
gamepad1.rumble(0.9, 0.9, 500);

// ── Single blip rumble ────────────────────────────────────────────────────
gamepad1.rumbleBlips(3); // 3 short buzzes

// ── Stop rumble immediately ───────────────────────────────────────────────
gamepad1.stopRumble();

// ── LED color (PS4 / EtPark only) ─────────────────────────────────────────
gamepad1.setLedColor(0, 255, 0, Gamepad.LED_DURATION_CONTINUOUS); // green
gamepad1.setLedColor(255, 0, 0, 1000); // red for 1 second

// ── Practical examples ────────────────────────────────────────────────────
// Alert driver when endgame starts (T-30s):
if (getRuntime() > 90 && !endgameAlerted) {
    gamepad1.rumble(1.0, 1.0, 1000);
    gamepad1.setLedColor(255, 165, 0, Gamepad.LED_DURATION_CONTINUOUS); // orange
    endgameAlerted = true;
}

// Alert when intake has a sample:
if (intakeSensor.isPressed()) {
    gamepad2.rumbleBlips(2);
}`}
              />
            </Prose>
          ),
        },
        {
          id: "telemetry",
          title: "Telemetry",
          content: (
            <Prose>
              <p>
                <code>telemetry</code> sends data to the Driver Station app
                so drivers and programmers can see the robot&apos;s state in
                real time. Always call <code>telemetry.update()</code> once
                per loop to actually push the data.
              </p>
              <CodeBlock
                filename="Telemetry.java"
                code={`while (opModeIsActive()) {
    // ── Key-value pairs ───────────────────────────────────────────────────
    telemetry.addData("Motor Power", "%.2f", leftMotor.getPower());
    telemetry.addData("Encoder Pos", leftMotor.getCurrentPosition());
    telemetry.addData("Arm State",   armState.toString());

    // ── Plain lines ───────────────────────────────────────────────────────
    telemetry.addLine("--- Drive Info ---");
    telemetry.addLine(String.format("X: %.1f  Y: %.1f", x, y));

    // ── Conditional messages ──────────────────────────────────────────────
    if (clawOpen) {
        telemetry.addLine("Claw: OPEN");
    } else {
        telemetry.addLine("Claw: CLOSED");
    }

    // ── MUST call update() once per loop — nothing shows without it ───────
    telemetry.update();
}

// ── Tip: set telemetry display format ─────────────────────────────────────
// HTML markup is supported on the Driver Station:
telemetry.setDisplayFormat(Telemetry.DisplayFormat.HTML);
telemetry.addData("Status", "<font color='green'>Running</font>");`}
              />
              <NoteBox type="tip">
                Use <code>"%.2f"</code> format specifiers to limit decimal
                places on floating-point values — <code>0.7499999999</code>{" "}
                is harder to read than <code>0.75</code> on a small phone
                screen mid-match.
              </NoteBox>
              <NoteBox type="info">
                <code>telemetry.addData()</code> and{" "}
                <code>telemetry.addLine()</code> buffer items each loop;{" "}
                <code>telemetry.update()</code> sends them to the Driver
                Station over Wi-Fi Direct. With{" "}
                <code>setAutoClear(true)</code> (the default), the previous
                frame&apos;s entries are cleared before the next batch — but
                calling <code>update()</code> <strong>more than once per
                loop</strong> still wastes time: each transmission is slow and
                can drop your loop rate (Hz). Call it exactly once at the end
                of the loop body.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

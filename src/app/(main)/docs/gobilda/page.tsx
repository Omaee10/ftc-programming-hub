import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "goBILDA – FTC Programming Hub" };

export default function GoBILDAPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/gobilda" },
        { label: "goBILDA" },
      ]}
      title="goBILDA Hardware"
      description="A complete guide to goBILDA's modular robot components — from the Strafer Chassis mecanum drivetrain to the Viper Slide linear extension system — with working FTC SDK code for every topic."
      badge="Hardware"
      badgeColor="amber"
      readingTime="12 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                goBILDA is a metric-based, modular robotics system widely adopted
                in FTC. Every component uses a <strong>4 mm pitch bolt pattern</strong>,
                making it easy to mix structural, mechanical, and electronics pieces
                without adapters.
              </p>
              <InfoGrid
                items={[
                  { label: "Build System", value: "Metric", sub: "4 mm pitch" },
                  { label: "Motor Class", value: "5202 Series", sub: "Yellow Jacket" },
                  { label: "Servo Class", value: "2000 Series", sub: "Dual Mode" },
                  { label: "Compatibility", value: "REV Ready", sub: "Direct mount" },
                ]}
              />
              <NoteBox type="tip">
                goBILDA components are fully compatible with REV Robotics hardware.
                You can mount a REV Control Hub directly to goBILDA channel using
                the official goHUB mount kit.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "strafer-chassis",
          title: "Strafer Chassis",
          content: (
            <Prose>
              <p>
                The <strong>goBILDA Strafer Chassis Kit</strong> is a ready-to-assemble
                mecanum drivetrain built around 4× 5202-0002-0019 (19.2:1) Yellow
                Jacket motors. The mecanum wheels allow omni-directional movement —
                critical for modern FTC scoring.
              </p>
              <SpecTable
                rows={[
                  { label: "Wheelbase", value: "≈ 216 mm", note: "center-to-center" },
                  { label: "Track Width", value: "≈ 295 mm", note: "center-to-center" },
                  { label: "Motor Gear Ratio", value: "19.2 : 1", note: "Yellow Jacket" },
                  { label: "Free Speed", value: "312 RPM", note: "at 12 V" },
                  { label: "Encoder CPR", value: "537.7 CPR", note: "output shaft" },
                  { label: "Wheel Diameter", value: "96 mm (3.78 in)", note: "goBILDA mecanum" },
                ]}
              />
              <p>
                Initialize all four drive motors from{" "}
                <code>hardwareMap</code>, then configure directions — the left side
                motors must run in reverse to produce forward motion:
              </p>
              <CodeBlock
                filename="MecanumDrive.java"
                code={`@TeleOp(name = "Mecanum Drive", group = "TeleOp")
public class MecanumDrive extends LinearOpMode {

    private DcMotorEx frontLeft, frontRight, backLeft, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotorEx.class, "front_left");
        frontRight = hardwareMap.get(DcMotorEx.class, "front_right");
        backLeft   = hardwareMap.get(DcMotorEx.class, "back_left");
        backRight  = hardwareMap.get(DcMotorEx.class, "back_right");

        // Left motors spin opposite to right motors
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);

        // Brake on zero power so robot holds position
        frontLeft.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        frontRight.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        backLeft.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        backRight.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        telemetry.addData("Status", "Initialized");
        telemetry.update();
        waitForStart();

        while (opModeIsActive()) {
            // Gamepad axes: left stick for translation, right stick for rotation
            double y  = -gamepad1.left_stick_y;   // forward/back (negated)
            double x  =  gamepad1.left_stick_x * 1.1; // strafe (×1.1 corrects imperfect strafing)
            double rx =  gamepad1.right_stick_x;   // rotation

            // Normalize so no value exceeds 1.0
            double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);

            frontLeft.setPower((y + x + rx) / denominator);
            backLeft.setPower((y - x + rx) / denominator);
            frontRight.setPower((y - x - rx) / denominator);
            backRight.setPower((y + x - rx) / denominator);
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "field-centric-drive",
          title: "Field-Centric Drive",
          content: (
            <Prose>
              <p>
                Robot-centric drive moves relative to the robot&apos;s front.
                <strong> Field-centric drive</strong> moves relative to the field —
                pushing the joystick &quot;up&quot; always moves the robot away from you,
                regardless of which way the robot is facing. This is achieved by
                rotating the joystick vector by the robot&apos;s IMU heading.
              </p>
              <NoteBox type="info">
                The Control Hub&apos;s built-in BHI260AP IMU is accessed via the
                <code>IMU</code> hardware device. Always call{" "}
                <code>imu.resetYaw()</code> at the start of the OpMode so heading
                is relative to your starting orientation.
              </NoteBox>
              <CodeBlock
                filename="FieldCentricDrive.java"
                code={`@TeleOp(name = "Field Centric Drive", group = "TeleOp")
public class FieldCentricDrive extends LinearOpMode {

    private DcMotorEx frontLeft, frontRight, backLeft, backRight;
    private IMU imu;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotorEx.class, "front_left");
        frontRight = hardwareMap.get(DcMotorEx.class, "front_right");
        backLeft   = hardwareMap.get(DcMotorEx.class, "back_left");
        backRight  = hardwareMap.get(DcMotorEx.class, "back_right");

        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);

        // Initialize the IMU with the hub's physical orientation on the robot
        imu = hardwareMap.get(IMU.class, "imu");
        imu.initialize(new IMU.Parameters(
            new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
            )
        ));

        waitForStart();
        imu.resetYaw(); // Zero heading at match start

        while (opModeIsActive()) {
            double y  = -gamepad1.left_stick_y;
            double x  =  gamepad1.left_stick_x;
            double rx =  gamepad1.right_stick_x;

            // Read current yaw angle in radians
            double heading = imu.getRobotYawPitchRollAngles()
                                .getYaw(AngleUnit.RADIANS);

            // Rotate the translation vector by -heading to convert to field frame
            double rotX = x * Math.cos(-heading) - y * Math.sin(-heading);
            double rotY = x * Math.sin(-heading) + y * Math.cos(-heading);

            double denominator = Math.max(Math.abs(rotY) + Math.abs(rotX) + Math.abs(rx), 1);
            frontLeft.setPower((rotY + rotX + rx) / denominator);
            backLeft.setPower((rotY - rotX + rx) / denominator);
            frontRight.setPower((rotY - rotX - rx) / denominator);
            backRight.setPower((rotY + rotX - rx) / denominator);

            telemetry.addData("Heading (°)", Math.toDegrees(heading));
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "viper-slide-intro",
          title: "Viper Slide Basics",
          content: (
            <Prose>
              <p>
                The <strong>goBILDA Viper Slide</strong> is a dual-stage linear
                extension system commonly used for FTC lift/arm mechanisms. It
                mounts to a goBILDA channel and extends via a string/spool driven
                by a 5202 motor.
              </p>
              <SpecTable
                rows={[
                  { label: "Max Extension", value: "≈ 525 mm", note: "per stage" },
                  { label: "Recommended Motor", value: "5202-0002-0019", note: "19.2:1 Yellow Jacket" },
                  { label: "Spool Diameter", value: "≈ 32 mm" },
                  { label: "Encoder CPR", value: "537.7 CPR" },
                ]}
              />
              <p>
                Run the motor in <code>RUN_TO_POSITION</code> mode for safe
                preset positions. Define your encoder tick targets for each
                height level.
              </p>
              <StepList
                steps={[
                  "Mount the Viper Slide and connect the motor to the Control Hub.",
                  'Configure the motor name in the Driver Station as "viper_slide".',
                  "Call STOP_AND_RESET_ENCODER once at init to zero the position.",
                  "Use RUN_TO_POSITION to move to preset heights.",
                  "Set ZeroPowerBehavior.BRAKE to hold position under load.",
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "viper-slide-code",
          title: "Viper Slide Programming",
          content: (
            <Prose>
              <p>
                The example below uses <code>RUN_TO_POSITION</code> for three
                preset heights and a manual override via the triggers for fine
                adjustment:
              </p>
              <CodeBlock
                filename="ViperSlideOp.java"
                code={`@TeleOp(name = "Viper Slide Control", group = "Mechanism")
public class ViperSlideOp extends LinearOpMode {

    // Encoder tick targets — tune these for your robot
    private static final int SLIDE_RETRACTED = 0;
    private static final int SLIDE_LOW_GOAL  = 450;
    private static final int SLIDE_HIGH_GOAL = 1650;

    // Max safe power for RUN_TO_POSITION
    private static final double SLIDE_POWER  = 0.85;

    private DcMotorEx viperSlide;

    @Override
    public void runOpMode() {
        viperSlide = hardwareMap.get(DcMotorEx.class, "viper_slide");

        // Always reset encoder at init so position 0 = fully retracted
        viperSlide.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        viperSlide.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        viperSlide.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        telemetry.addData("Status", "Ready");
        telemetry.update();
        waitForStart();

        while (opModeIsActive()) {

            // ── Preset positions ────────────────────────────────────
            if (gamepad1.a) goToPosition(SLIDE_RETRACTED);
            if (gamepad1.b) goToPosition(SLIDE_LOW_GOAL);
            if (gamepad1.y) goToPosition(SLIDE_HIGH_GOAL);

            // ── Manual fine-tuning with triggers ────────────────────
            double manualInput = gamepad1.right_trigger - gamepad1.left_trigger;
            if (Math.abs(manualInput) > 0.05) {
                viperSlide.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                viperSlide.setPower(manualInput * 0.5); // slower for precision
            }

            telemetry.addData("Target Position", viperSlide.getTargetPosition());
            telemetry.addData("Current Position", viperSlide.getCurrentPosition());
            telemetry.addData("Is Busy", viperSlide.isBusy());
            telemetry.update();
        }
    }

    /** Convenience method to set a target and switch to RUN_TO_POSITION. */
    private void goToPosition(int target) {
        viperSlide.setTargetPosition(target);
        viperSlide.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        viperSlide.setPower(SLIDE_POWER);
    }
}`}
              />
              <NoteBox type="warning">
                Always clamp the target position between your minimum and maximum
                encoder values before calling <code>setTargetPosition</code> to
                prevent mechanical over-extension damage.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "servos",
          title: "2000-Series Servos",
          content: (
            <Prose>
              <p>
                The <strong>goBILDA 2000-Series Dual-Mode Servo</strong> operates
                in either standard servo mode (position 0–270°) or continuous
                rotation mode, switchable via a programming button on the body.
                In standard mode it behaves like any FTC <code>Servo</code> with a
                0.0–1.0 range.
              </p>
              <SpecTable
                rows={[
                  { label: "Torque (5 V)", value: "13 kg·cm", note: "At 0.5 s/60°" },
                  { label: "Range (servo mode)", value: "270°", note: "Maps to 0.0–1.0" },
                  { label: "Connector", value: "JST-PH 3-pin", note: "Standard REV servo port" },
                  { label: "Modes", value: "Servo / CR", note: "Toggle via prog button" },
                  { label: "Control frequency", value: "50 Hz PWM", note: "SDK default" },
                ]}
              />
              <p>
                <strong>Servo vs CRServo — which interface to use:</strong>
              </p>
              <StepList
                steps={[
                  "Use Servo when you need precise position control (0.0–1.0 maps to 0–270°). The servo holds position with its internal gear and motor.",
                  "Use CRServo when the servo is in continuous rotation mode. Power is set with setPower(-1.0 to 1.0) — there is no position feedback.",
                  "To switch modes, press and hold the yellow button on the servo body for 3 seconds until the LED changes color.",
                ]}
              />
              <CodeBlock
                
                filename="GoBILDAServoExample.java"
                code={`import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.hardware.CRServo;

// ── Standard (position) mode ─────────────────────────────────────────────
Servo clawServo = hardwareMap.get(Servo.class, "claw_servo");

// Named position constants — easier to read than raw numbers
final double CLAW_OPEN   = 0.25;  // ~67°
final double CLAW_CLOSED = 0.75;  // ~202°

// Clamp positions to a safe sub-range to protect mechanism
clawServo.scaleRange(0.2, 0.8);   // Now 0.0 = 20% and 1.0 = 80% of 270°

clawServo.setPosition(CLAW_OPEN);    // Open on init

waitForStart();

while (opModeIsActive()) {
    if (gamepad1.a) clawServo.setPosition(CLAW_OPEN);
    if (gamepad1.b) clawServo.setPosition(CLAW_CLOSED);

    telemetry.addData("Claw position", "%.2f", clawServo.getPosition());
    telemetry.update();
}

// ── Continuous rotation mode (same hardware, different config) ───────────
CRServo intakeRoller = hardwareMap.get(CRServo.class, "intake_roller");

// Direction reversal for CRServos
intakeRoller.setDirection(DcMotorSimple.Direction.REVERSE);

while (opModeIsActive()) {
    if (gamepad1.right_bumper)       intakeRoller.setPower(1.0);   // Intake
    else if (gamepad1.left_bumper)   intakeRoller.setPower(-1.0);  // Eject
    else                             intakeRoller.setPower(0.0);   // Stop
}`}
              />
              <NoteBox type="tip">
                <code>scaleRange(min, max)</code> remaps the 0.0–1.0 input to a
                sub-range of the physical travel. Use it to prevent the servo
                from grinding against mechanical hard stops.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "encoders",
          title: "Encoders & Position Control",
          content: (
            <Prose>
              <p>
                Every goBILDA Yellow Jacket motor has a built-in quadrature
                encoder on the output shaft. The encoder wires share the same
                JST-PH 4-pin connector as the motor power; plug it into the
                matching encoder port on the Control Hub or Expansion Hub.
              </p>
              <SpecTable
                rows={[
                  { label: "Encoder type", value: "Quadrature (4× decoding)", note: "Built-in, on output shaft" },
                  { label: "PPR at output (19.2:1)", value: "537.6 PPR", note: "537.6 ticks / revolution" },
                  { label: "PPR at output (50.9:1)", value: "1425.1 PPR", note: "1425 ticks / revolution" },
                  { label: "PPR at output (84.1:1)", value: "2786.2 PPR", note: "2786 ticks / revolution" },
                  { label: "API method", value: "getCurrentPosition()", note: "Returns signed tick count" },
                ]}
              />
              <NoteBox type="info">
                The SDK performs 4× decoding automatically — you do not need to
                divide by 4. The PPR values above are already the final decoded
                ticks per output shaft revolution.
              </NoteBox>
              <CodeBlock
                
                filename="YellowJacketEncoders.java"
                code={`import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;

// Use DcMotorEx for access to velocity-based control
DcMotorEx liftMotor = hardwareMap.get(DcMotorEx.class, "lift_motor");

// ── Reset encoder on init ────────────────────────────────────────────────
liftMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

// ── Option A: RUN_USING_ENCODER — velocity-based feedforward control ────
liftMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
// setPower() now acts as a velocity fraction of MAX_RPM
liftMotor.setPower(0.6);

// Read the current encoder tick count
int currentTicks = liftMotor.getCurrentPosition();
telemetry.addData("Ticks", currentTicks);

// ── Option B: RUN_TO_POSITION — built-in PID position hold ──────────────
int TARGET_TICKS = 1000; // e.g. ~1.86 rotations on 19.2:1 motor

liftMotor.setTargetPosition(TARGET_TICKS);
liftMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
liftMotor.setPower(0.8); // magnitude only — PID sets direction

// Poll until the motor reaches the target
while (liftMotor.isBusy() && opModeIsActive()) {
    telemetry.addData("Position", liftMotor.getCurrentPosition());
    telemetry.addData("Target",   TARGET_TICKS);
    telemetry.update();
}

liftMotor.setPower(0.0); // Release — BRAKE holds if ZeroPowerBehavior is set

// ── Read instantaneous velocity (ticks/second) ───────────────────────────
double ticksPerSec = liftMotor.getVelocity();
telemetry.addData("Velocity (ticks/s)", "%.1f", ticksPerSec);`}
              />
              <NoteBox type="tip">
                To convert encoder ticks to real-world distance: divide ticks by
                the PPR for your gear ratio, then multiply by the mechanism&apos;s
                circumference or lead. For a 32 mm diameter spool:{" "}
                <code>mm = (ticks / 537.6) × (π × 32)</code>.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "sensors",
          title: "Magnetic Limit Switch",
          content: (
            <Prose>
              <p>
                The <strong>goBILDA Magnetic Limit Switch</strong> (with Hall-effect
                sensor) outputs a digital HIGH/LOW signal. Wire it to any digital
                I/O port on the Control Hub or Expansion Hub and read it with the
                <code>DigitalChannel</code> interface.
              </p>
              <SpecTable
                rows={[
                  { label: "Signal type", value: "Digital (Hall-effect)", note: "No contact bounce" },
                  { label: "Operating voltage", value: "3.3–5 V", note: "REV port safe" },
                  { label: "Connector", value: "JST-PH 4-pin", note: "Standard REV digital port" },
                  { label: "Sensing distance", value: "~5 mm", note: "Magnet-to-sensor gap" },
                  { label: "Output state (magnet near)", value: "LOW (false)", note: "Active-low by default" },
                ]}
              />
              <NoteBox type="warning">
                goBILDA magnetic switches are <strong>active-low</strong> —{" "}
                <code>getState()</code> returns <code>false</code> when the magnet
                is detected. Invert your logic accordingly.
              </NoteBox>
              <CodeBlock
                
                filename="MagneticLimitSwitch.java"
                code={`import com.qualcomm.robotcore.hardware.DigitalChannel;

// ── Init ─────────────────────────────────────────────────────────────────
DigitalChannel lowerLimit = hardwareMap.get(DigitalChannel.class, "lower_limit");
DigitalChannel upperLimit = hardwareMap.get(DigitalChannel.class, "upper_limit");

// Must set mode to INPUT before reading
lowerLimit.setMode(DigitalChannel.Mode.INPUT);
upperLimit.setMode(DigitalChannel.Mode.INPUT);

// ── In loop ──────────────────────────────────────────────────────────────
while (opModeIsActive()) {
    // Active-low: getState() == false means magnet is present (limit reached)
    boolean atBottom = !lowerLimit.getState();
    boolean atTop    = !upperLimit.getState();

    double liftPower = -gamepad2.left_stick_y;

    // Prevent driving into hard stops
    if (atBottom && liftPower < 0) liftPower = 0;
    if (atTop    && liftPower > 0) liftPower = 0;

    liftMotor.setPower(liftPower);

    telemetry.addData("At bottom", atBottom);
    telemetry.addData("At top",    atTop);
    telemetry.addData("Lift power", liftPower);
    telemetry.update();
}`}
              />
              <NoteBox type="tip">
                Attach the magnet to the moving part of your mechanism (e.g. the
                carriage) and the sensor to the fixed frame. Space them 3–5 mm
                apart at the intended limit position.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "yellow-jacket-motors",
          title: "Yellow Jacket Motor Reference",
          content: (
            <Prose>
              <p>
                Choose your gear ratio based on the mechanism — lower ratios are
                faster; higher ratios produce more torque and better position
                accuracy.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Gear Ratio</th>
                    <th>Free Speed</th>
                    <th>Stall Torque</th>
                    <th>Typical Use</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["5202-0002-0005", "5.2 : 1", "1150 RPM", "0.8 N·m", "Fast intake roller"],
                    ["5202-0002-0019", "19.2 : 1", "312 RPM", "3.2 N·m", "Mecanum drivetrain"],
                    ["5202-0002-0027", "26.9 : 1", "223 RPM", "4.2 N·m", "Light arm / slides"],
                    ["5202-0002-0051", "50.9 : 1", "117 RPM", "7.4 N·m", "Heavy lift / vipers"],
                    ["5202-0002-0084", "84.1 : 1", "71 RPM", "12 N·m", "Turret / heavy arm"],
                  ].map(([pn, ratio, rpm, torque, use]) => (
                    <tr key={pn}>
                      <td>{pn}</td>
                      <td>{ratio}</td>
                      <td>{rpm}</td>
                      <td>{torque}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(100 116 139)", fontSize: "0.75rem" }}>{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <NoteBox type="tip">
                For the Strafer Chassis, the <strong>19.2:1 ratio</strong> is the
                community standard. It provides ~90 cm/s top speed with standard
                mecanum wheels — fast enough for competitive play while retaining
                encoder resolution for odometry.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

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
                  { label: "Motor Part", value: "5202-2402-0019", note: "19.2:1 Yellow Jacket" },
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
                    ["5202-2402-0005", "5.2 : 1",  "1150 RPM", "7.9 kg·cm",  "Fast intake roller"],
                    ["5202-2402-0019", "19.2 : 1",  "312 RPM", "24.3 kg·cm", "Mecanum drivetrain"],
                    ["5202-2402-0027", "26.9 : 1",  "223 RPM", "38 kg·cm",   "Light arm / slides"],
                    ["5202-2402-0051", "50.9 : 1",  "117 RPM", "68.4 kg·cm", "Heavy lift / vipers"],
                    ["5202-2402-0071", "71.2 : 1",   "84 RPM", "93.6 kg·cm", "Turret / heavy arm"],
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
        {
          id: "led-lights",
          title: "LED Lights",
          content: (
            <Prose>
              <p>
                goBILDA LED lights are controlled through the standard{" "}
                <code>Servo</code> interface — plug the LED into any servo port
                on the Control Hub or Expansion Hub and retrieve it with{" "}
                <code>Servo.class</code>. Different <code>setPosition()</code>{" "}
                values select different colors. There is no separate LED driver
                class; the PWM signal that would normally move a servo instead
                selects the LED state.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Interface",
                    value: "Servo port (PWM)",
                    note: "Control Hub / Expansion Hub servo port",
                  },
                  {
                    label: "SDK class",
                    value: "Servo",
                    note: "Same as any position servo",
                  },
                  {
                    label: "Control method",
                    value: "setPosition(0.0 – 1.0)",
                    note: "Each value = a different color",
                  },
                ]}
              />
              <NoteBox type="warning">
                Do <strong>not</strong> use <code>CRServo</code> or any LED
                driver class for goBILDA LEDs. Always retrieve them as{" "}
                <code>Servo.class</code> and command them with{" "}
                <code>setPosition()</code>.
              </NoteBox>
              <p>
                Define named constants for each color position so your code
                stays readable. The exact position-to-color mapping depends on
                your specific LED model — run a calibration loop to discover
                the values for your hardware:
              </p>
              <CodeBlock
                filename="GoBILDALED.java"
                code={`Servo indicatorLED = hardwareMap.get(Servo.class, "indicator_led");

// Color position constants — tune these values for your specific LED model
final double LED_OFF    = 0.0;
final double LED_RED    = 0.3;
final double LED_BLUE   = 0.6;
final double LED_GREEN  = 0.75;
final double LED_WHITE  = 1.0;

// Set a color during init to confirm wiring
indicatorLED.setPosition(LED_WHITE);

waitForStart();

while (opModeIsActive()) {
    if (gamepad1.a) {
        indicatorLED.setPosition(LED_GREEN); // e.g. intake captured
    } else if (gamepad1.b) {
        indicatorLED.setPosition(LED_RED);   // e.g. arm at limit
    } else if (gamepad1.x) {
        indicatorLED.setPosition(LED_BLUE);  // e.g. scoring ready
    } else {
        indicatorLED.setPosition(LED_OFF);
    }
}`}
              />
              <NoteBox type="tip">
                To find the exact position values for your LED model, add a
                calibration OpMode that increments the position by 0.05 each
                time you press a button and logs the current value on telemetry.
                Record which value produces each color, then define your
                constants from those results.
              </NoteBox>
              <p>
                For autonomous routines, use the LED as a state indicator so
                you can debug from across the field without reading telemetry:
              </p>
              <CodeBlock
                filename="AutoLEDStates.java"
                code={`indicatorLED.setPosition(LED_WHITE);  // INIT — ready
waitForStart();

indicatorLED.setPosition(LED_BLUE);   // DRIVING
driveForward(1000);

indicatorLED.setPosition(LED_RED);    // SCORING
depositSample();

indicatorLED.setPosition(LED_GREEN);  // DONE`}
              />
            </Prose>
          ),
        },
        {
          id: "imu",
          title: "IMU",
          content: (
            <Prose>
              <p>
                goBILDA robots use the <strong>BHI260AP IMU</strong> built into
                the REV Control Hub. The IMU reports yaw (heading), pitch, and
                roll. The critical setup step is telling the SDK how the Control
                Hub is physically oriented on your robot — if you skip this, the
                heading will be wrong regardless of which way the robot is
                facing.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "SDK class",
                    value: "IMU",
                    note: "com.qualcomm.robotcore.hardware",
                  },
                  {
                    label: "Config name",
                    value: "imu",
                    note: "Built-in — always present",
                  },
                  {
                    label: "Orientation class",
                    value: "RevHubOrientationOnRobot",
                    note: "Describe logo & USB direction",
                  },
                  {
                    label: "Heading range",
                    value: "-180° to +180°",
                    note: "Yaw angle from reset point",
                  },
                ]}
              />
              <NoteBox type="info">
                Look at where the REV Control Hub is mounted on your goBILDA
                chassis and note two things: which direction the{" "}
                <strong>REV logo</strong> faces and which direction the{" "}
                <strong>USB port</strong> faces. Pass those as{" "}
                <code>LogoFacingDirection</code> and{" "}
                <code>UsbFacingDirection</code> into{" "}
                <code>RevHubOrientationOnRobot</code>.
              </NoteBox>
              <CodeBlock
                filename="GoBILDAImu.java"
                code={`import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import com.qualcomm.robotcore.hardware.IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;

@TeleOp(name = "IMU Demo", group = "TeleOp")
public class IMUDemo extends LinearOpMode {

    private IMU imu;

    @Override
    public void runOpMode() {
        imu = hardwareMap.get(IMU.class, "imu");

        // Tell the SDK how the Control Hub is mounted on the goBILDA chassis.
        // Adjust LogoFacingDirection and UsbFacingDirection to match your robot.
        imu.initialize(new IMU.Parameters(
            new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
            )
        ));

        waitForStart();

        // Zero the heading at the start of the match
        imu.resetYaw();

        while (opModeIsActive()) {
            double heading = imu.getRobotYawPitchRollAngles()
                               .getYaw(AngleUnit.DEGREES);
            double pitch   = imu.getRobotYawPitchRollAngles()
                               .getPitch(AngleUnit.DEGREES);
            double roll    = imu.getRobotYawPitchRollAngles()
                               .getRoll(AngleUnit.DEGREES);

            telemetry.addData("Heading (yaw)",  "%.1f°", heading);
            telemetry.addData("Pitch",          "%.1f°", pitch);
            telemetry.addData("Roll",           "%.1f°", roll);
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="tip">
                Call <code>imu.resetYaw()</code> immediately after{" "}
                <code>waitForStart()</code>, not during init. This zeros the
                heading relative to your robot&apos;s starting field position
                at the exact moment the match begins.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "odometry-pods",
          title: "Odometry Pods & Pinpoint",
          content: (
            <Prose>
              <p>
                goBILDA&apos;s <strong>Pinpoint Odometry Computer</strong> is
                a standalone I²C device that combines two dead-wheel encoder
                inputs with a built-in IMU to track the robot&apos;s X, Y, and
                heading continuously. It removes the need to wire dead-wheel
                encoders directly into motor ports and handles all the math
                internally — your code simply calls <code>update()</code> and
                reads the resulting pose.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Interface",
                    value: "I²C",
                    note: "Any I²C port on Control Hub",
                  },
                  {
                    label: "SDK class",
                    value: "GoBildaPinpointDriver",
                    note: "Included in FTC SDK",
                  },
                  {
                    label: "Encoder inputs",
                    value: "2 dead-wheel pods",
                    note: "X (forward) and Y (strafe)",
                  },
                  {
                    label: "Integrated IMU",
                    value: "Yes",
                    note: "Fuses with encoders for heading",
                  },
                  {
                    label: "Output",
                    value: "Pose2D (x, y, heading)",
                    note: "Millimeters and degrees",
                  },
                  {
                    label: "Encoder resolution",
                    value: "2000 ticks/rev",
                    note: "goBILDA odometry pods",
                  },
                ]}
              />
              <NoteBox type="info">
                You must tell the Pinpoint the physical offset of each pod from
                the robot&apos;s center of rotation (in mm), and the encoder
                resolution of the pods you are using. Measure these carefully
                from your CAD or physical robot — an incorrect offset produces
                a consistent drift error in autonomous.
              </NoteBox>
              <CodeBlock
                filename="PinpointOdometry.java"
                code={`import com.qualcomm.robotcore.hardware.DcMotorSimple;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import org.firstinspires.ftc.robotcore.external.navigation.Pose2D;

// GoBildaPinpointDriver is part of the FTC SDK — no extra library needed
GoBildaPinpointDriver pinpoint =
    hardwareMap.get(GoBildaPinpointDriver.class, "pinpoint");

// ── Configure pod offsets (mm from robot center of rotation) ─────────────
// xOffset: forward pod distance from center (positive = forward of center)
// yOffset: strafe pod distance from center (positive = left of center)
pinpoint.setOffsets(-84.0, -168.0); // tune for your robot's mounting

// Set the encoder resolution of your pods (ticks per mm)
// Use the built-in constant for goBILDA 4-Bar pods (32 mm wheel, 2000 CPR → 19.89 ticks/mm)
pinpoint.setEncoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD);

// Set encoder directions — reverse if the pod reads negative when driving forward/right
pinpoint.setEncoderDirections(
    GoBildaPinpointDriver.EncoderDirection.FORWARD,
    GoBildaPinpointDriver.EncoderDirection.FORWARD
);

// Zero the position and IMU heading at the starting position
pinpoint.resetPosAndIMU();

telemetry.addData("Pinpoint", "Initialized");
telemetry.update();

waitForStart();

while (opModeIsActive()) {
    // Must call update() every loop to refresh the pose estimate
    pinpoint.update();

    Pose2D pose = pinpoint.getPosition();

    double x       = pose.getX(DistanceUnit.MM);
    double y       = pose.getY(DistanceUnit.MM);
    double heading = pose.getHeading(AngleUnit.DEGREES);

    telemetry.addData("X (mm)",      "%.1f", x);
    telemetry.addData("Y (mm)",      "%.1f", y);
    telemetry.addData("Heading (°)", "%.1f", heading);
    telemetry.addData("Velocity",    pinpoint.getVelocity().toString());
    telemetry.update();
}`}
              />
              <NoteBox type="tip">
                To drive to a target position in autonomous, compare the
                current pose from <code>getPosition()</code> against your
                target coordinates and feed the error into a PID controller for
                each axis. Road Runner and Pedro Pathing both support the
                Pinpoint as a localizer — see their respective doc pages for
                drop-in integration.
              </NoteBox>
              <p>
                If you are not using the Pinpoint, individual goBILDA odometry
                pods can be wired directly into unused motor encoder ports and
                read as standard <code>DcMotor</code> instances in{" "}
                <code>RUN_WITHOUT_ENCODER</code> mode:
              </p>
              <CodeBlock
                filename="DeadWheelPods.java"
                code={`// Wire pods into motor encoder ports — no motor attached to these slots
DcMotor podForward = hardwareMap.get(DcMotor.class, "pod_forward");
DcMotor podStrafe  = hardwareMap.get(DcMotor.class, "pod_strafe");

podForward.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
podStrafe.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

// RUN_WITHOUT_ENCODER = read ticks only, no motor output
podForward.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);
podStrafe.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

while (opModeIsActive()) {
    int forwardTicks = podForward.getCurrentPosition();
    int strafeTicks  = podStrafe.getCurrentPosition();

    // Convert ticks to mm: goBILDA 4-Bar pod = 2000 CPR, 32 mm diameter wheel
    // circumference = π × 32 = 100.53 mm → 19.89 ticks/mm
    double forwardMM = (forwardTicks / 2000.0) * (Math.PI * 32);
    double strafeMM  = (strafeTicks  / 2000.0) * (Math.PI * 32);

    telemetry.addData("Forward (mm)", "%.1f", forwardMM);
    telemetry.addData("Strafe (mm)",  "%.1f", strafeMM);
    telemetry.update();
}`}
              />
            </Prose>
          ),
        },
      ]}
    />
  );
}

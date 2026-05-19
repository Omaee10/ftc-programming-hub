import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "REV Robotics – FTC Programming Hub" };

export default function REVRoboticsPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/rev-robotics" },
        { label: "REV Robotics" },
      ]}
      title="REV Robotics"
      description="Master the REV Control Hub, Expansion Hub, and the full REV sensor ecosystem. Covers touch sensors, color sensors, the BHI260AP IMU, and servo configuration — all with FTC SDK code examples."
      badge="Electronics"
      badgeColor="blue"
      readingTime="15 min"
      sections={[
        {
          id: "control-hub",
          title: "Control Hub",
          content: (
            <Prose>
              <p>
                The <strong>REV Control Hub (REV-31-1595)</strong> is the
                all-in-one robot controller for FTC. It runs the Robot Controller
                app directly on the device, eliminating the need for a separate
                phone.
              </p>
              <InfoGrid
                items={[
                  { label: "Processor", value: "Octa-core", sub: "Android 8.1" },
                  { label: "DC Motors", value: "4 ports", sub: "Encoder support" },
                  { label: "Servo Ports", value: "6 ports", sub: "5 V, 2 A max" },
                  { label: "I²C Ports", value: "4 buses", sub: "Sensors & IMU" },
                  { label: "Digital Ports", value: "8 channels", sub: "4 ports × 2" },
                  { label: "Analog Ports", value: "4 inputs", sub: "0–3.3 V" },
                  { label: "USB-A", value: "2 ports", sub: "Webcam / devices" },
                  { label: "RS485", value: "Expansion Hub", sub: "Daisy chain" },
                ]}
              />
              <NoteBox type="warning">
                FTC rules allow a maximum of <strong>one Control Hub</strong> and
                one Expansion Hub per robot. Budget your motor and servo ports
                carefully during robot design.
              </NoteBox>
              <p>
                Always power down the Control Hub before swapping motors or
                sensors. The 12 V bus can surge and damage electronics if a motor
                wire shorts while power is on.
              </p>
            </Prose>
          ),
        },
        {
          id: "expansion-hub",
          title: "Expansion Hub",
          content: (
            <Prose>
              <p>
                The <strong>REV Expansion Hub (REV-31-1153)</strong> doubles your
                port count. Connect it via RS485 to the Control Hub and the FTC
                SDK treats it as a second hardware bus, accessed through the same{" "}
                <code>hardwareMap</code> API.
              </p>
              <SpecTable
                rows={[
                  { label: "DC Motor Ports", value: "4", note: "With encoder input" },
                  { label: "Servo Ports", value: "6", note: "300 mA per port" },
                  { label: "I²C Buses", value: "4", note: "Each is independent" },
                  { label: "Digital Ports", value: "8 channels", note: "4 ports × 2 ch" },
                  { label: "Analog Ports", value: "4", note: "0 – 3.3 V" },
                  { label: "Connection", value: "RS485 or USB-C", note: "to Control Hub" },
                ]}
              />
              <NoteBox type="tip">
                When configuring hardware in the Driver Station, you assign a
                hub number (0 = Control Hub, 1 = Expansion Hub). Prefix device
                names to avoid confusion, e.g.{" "}
                <code>eh_left_front</code> for Expansion Hub ports.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "touch-sensor",
          title: "Touch Sensors (Digital)",
          content: (
            <Prose>
              <p>
                The <strong>REV Touch Sensor (REV-31-1425)</strong> is a simple
                digital push-button sensor. It outputs a logic HIGH when not
                pressed and logic LOW when pressed — the logic is inverted, so
                you must negate <code>getState()</code> in your code.
              </p>
              <NoteBox type="info">
                Touch sensors are wired into the <strong>Digital</strong> ports
                (not I²C). One port has two channels; configure each channel
                independently in the Driver Station app.
              </NoteBox>
              <CodeBlock
                filename="TouchSensorExample.java"
                code={`@TeleOp(name = "Touch Sensor Demo")
public class TouchSensorDemo extends LinearOpMode {

    private DigitalChannel touchLimit;

    @Override
    public void runOpMode() {
        // Configure digital channel as INPUT
        touchLimit = hardwareMap.get(DigitalChannel.class, "touch_limit");
        touchLimit.setMode(DigitalChannel.Mode.INPUT);

        waitForStart();

        while (opModeIsActive()) {
            // getState() returns TRUE when NOT pressed (active low)
            boolean isPressed = !touchLimit.getState();

            telemetry.addData("Touch Sensor", isPressed ? "PRESSED ✓" : "Not pressed");

            // Example: stop slide motor when touch sensor is triggered
            if (isPressed) {
                telemetry.addData("Action", "Limit hit — holding position");
            }

            telemetry.update();
        }
    }
}`}
              />
              <p>
                Touch sensors are ideal as limit switches at the top or bottom of
                a linear slide. When the sensor fires, switch the motor to{" "}
                <code>STOP_AND_RESET_ENCODER</code> to zero the position.
              </p>
            </Prose>
          ),
        },
        {
          id: "color-sensor",
          title: "Color / Distance Sensors (I²C)",
          content: (
            <Prose>
              <p>
                The <strong>REV Color Sensor v3 (REV-31-1557)</strong> is an I²C
                device that provides RGBC color readings, ambient light level,
                and a time-of-flight distance measurement. It&apos;s commonly used
                for game element detection and alliance-specific autonomous paths.
              </p>
              <SpecTable
                rows={[
                  { label: "Interface", value: "I²C (400 kHz)", note: "Address 0x52" },
                  { label: "Color Channels", value: "R, G, B, Clear" },
                  { label: "Distance Range", value: "1 – 10 cm", note: "Time-of-flight" },
                  { label: "LED", value: "Built-in white LED", note: "Software-controlled" },
                  { label: "Operating V", value: "3.3 V logic", note: "5 V tolerant via hub" },
                ]}
              />
              <CodeBlock
                filename="ColorSensorExample.java"
                code={`@Autonomous(name = "Color Detection Auto")
public class ColorDetectionAuto extends LinearOpMode {

    private ColorSensor     colorSensor;
    private DistanceSensor  distanceSensor;

    // Alliance color thresholds (tune on actual field)
    private static final int RED_THRESHOLD  = 200;
    private static final int BLUE_THRESHOLD = 200;

    @Override
    public void runOpMode() {
        // REV Color Sensor v3 implements both interfaces
        colorSensor    = hardwareMap.get(ColorSensor.class,    "intake_color");
        distanceSensor = hardwareMap.get(DistanceSensor.class, "intake_color");

        // Turn on the sensor LED for reflectance mode
        colorSensor.enableLed(true);

        waitForStart();

        while (opModeIsActive()) {
            int red   = colorSensor.red();
            int green = colorSensor.green();
            int blue  = colorSensor.blue();
            int alpha = colorSensor.alpha(); // combined / clear channel

            double distanceCm = distanceSensor.getDistance(DistanceUnit.CM);

            // Simple alliance detection
            String detected = "None";
            if (red > RED_THRESHOLD && red > blue)  detected = "RED";
            if (blue > BLUE_THRESHOLD && blue > red) detected = "BLUE";

            telemetry.addData("Color (R, G, B, A)", "(%d, %d, %d, %d)", red, green, blue, alpha);
            telemetry.addData("Detected Alliance", detected);
            telemetry.addData("Distance (cm)", "%.1f", distanceCm);
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="tip">
                For reliable detection, measure the sensor&apos;s output under your
                competition field&apos;s lighting conditions. Threshold values vary
                significantly between venues.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "imu",
          title: "IMU (BHI260AP)",
          content: (
            <Prose>
              <p>
                The Control Hub contains a built-in{" "}
                <strong>Bosch BHI260AP</strong> 6-axis IMU accessible via the
                standard FTC SDK <code>IMU</code> interface. Use it for
                heading-lock driving, auto-rotate, and gyro-corrected autonomous.
              </p>
              <StepList
                steps={[
                  "Physically note the orientation of the Control Hub on your robot (which way the logo faces, which way USB faces).",
                  "Pass a RevHubOrientationOnRobot object with those directions into imu.initialize().",
                  "Call imu.resetYaw() at the start of your OpMode to zero the heading.",
                  "Read yaw via imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES).",
                ]}
              />
              <CodeBlock
                filename="IMUHeadingLock.java"
                code={`@TeleOp(name = "IMU Heading Lock", group = "Advanced")
public class IMUHeadingLock extends LinearOpMode {

    private DcMotorEx frontLeft, frontRight, backLeft, backRight;
    private IMU imu;

    // PID gains for heading correction — tune for your robot
    private static final double Kp = 0.025;
    private static final double Ki = 0.000;
    private static final double Kd = 0.002;

    private double targetHeading = 0;
    private double lastError     = 0;
    private double integralSum   = 0;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotorEx.class, "front_left");
        frontRight = hardwareMap.get(DcMotorEx.class, "front_right");
        backLeft   = hardwareMap.get(DcMotorEx.class, "back_left");
        backRight  = hardwareMap.get(DcMotorEx.class, "back_right");

        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);

        imu = hardwareMap.get(IMU.class, "imu");
        imu.initialize(new IMU.Parameters(
            new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
            )
        ));

        waitForStart();
        imu.resetYaw();

        ElapsedTime timer = new ElapsedTime();

        while (opModeIsActive()) {
            double heading = imu.getRobotYawPitchRollAngles()
                                .getYaw(AngleUnit.DEGREES);

            // Update locked heading when driver rotates
            if (Math.abs(gamepad1.right_stick_x) > 0.05) {
                targetHeading = heading;
                integralSum   = 0;
            }

            // PID correction to maintain locked heading
            double error    = targetHeading - heading;
            // Wrap error to [-180, 180]
            while (error >  180) error -= 360;
            while (error < -180) error += 360;

            double dt        = timer.seconds();
            integralSum     += error * dt;
            double derivative = (error - lastError) / dt;
            double correction = Kp * error + Ki * integralSum + Kd * derivative;
            lastError = error;
            timer.reset();

            // Apply field-centric + heading correction
            double y  = -gamepad1.left_stick_y;
            double x  =  gamepad1.left_stick_x;
            double rx =  gamepad1.right_stick_x + correction; // add PID output

            double botHeadingRad = Math.toRadians(heading);
            double rotX = x * Math.cos(-botHeadingRad) - y * Math.sin(-botHeadingRad);
            double rotY = x * Math.sin(-botHeadingRad) + y * Math.cos(-botHeadingRad);

            double denom = Math.max(Math.abs(rotY) + Math.abs(rotX) + Math.abs(rx), 1);
            frontLeft.setPower((rotY + rotX + rx) / denom);
            backLeft.setPower((rotY - rotX + rx) / denom);
            frontRight.setPower((rotY - rotX - rx) / denom);
            backRight.setPower((rotY + rotX - rx) / denom);

            telemetry.addData("Heading", "%.1f°", heading);
            telemetry.addData("Target",  "%.1f°", targetHeading);
            telemetry.addData("Error",   "%.2f",  error);
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "motors",
          title: "REV Motors",
          content: (
            <Prose>
              <p>
                REV produces two brushed DC motors for FTC: the{" "}
                <strong>HD Hex Motor</strong> and the <strong>Core Hex Motor</strong>.
                Both plug directly into Control Hub or Expansion Hub motor ports via
                XT30, and both include built-in quadrature encoders with JST-PH
                connectors.
              </p>
              <SpecTable
                rows={[
                  { label: "HD Hex Motor free speed", value: "6000 RPM (bare shaft)", note: "~150 RPM at 40:1 output" },
                  { label: "HD Hex Motor stall torque", value: "3.2 N·m (at 40:1)", note: "Most common ratio" },
                  { label: "HD Hex encoder PPR (at output)", value: "1120 PPR (40:1)", note: "28 PPR × 40 gear stages" },
                  { label: "Core Hex Motor free speed", value: "125 RPM output", note: "72:1 integrated gearbox" },
                  { label: "Core Hex Motor stall torque", value: "3.6 N·m", note: "At nominal voltage" },
                  { label: "Core Hex encoder PPR", value: "288 PPR", note: "4 counts × 72:1 ratio" },
                ]}
              />
              <p>
                Use <code>DcMotorEx</code> (instead of <code>DcMotor</code>) to
                unlock velocity-based control and PIDF tuning via{" "}
                <code>setVelocity()</code>:
              </p>
              <CodeBlock
                
                filename="REVMotorExample.java"
                code={`import com.qualcomm.robotcore.hardware.DcMotorEx;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;

// ── Init ─────────────────────────────────────────────────────────────────
DcMotorEx hdHexMotor = hardwareMap.get(DcMotorEx.class, "hd_hex");

hdHexMotor.setDirection(DcMotorSimple.Direction.FORWARD);
hdHexMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
hdHexMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
hdHexMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

// ── setVelocity — run at exact ticks/second ───────────────────────────────
// HD Hex at 40:1 → 1120 PPR, 150 RPM max = 150 × 1120 / 60 = 2800 ticks/s
double targetRPM    = 100;
double ticksPerRev  = 1120;
double ticksPerSec  = targetRPM * ticksPerRev / 60.0;

hdHexMotor.setVelocity(ticksPerSec);   // in ticks/s
// Or pass directly in RPM using AngleUnit.DEGREES per second:
// hdHexMotor.setVelocity(100 * 360.0 / 60.0, AngleUnit.DEGREES);

// ── Read actual velocity ──────────────────────────────────────────────────
double actualVel = hdHexMotor.getVelocity(); // ticks/s
double actualRPM = actualVel * 60.0 / ticksPerRev;
telemetry.addData("Motor RPM", "%.1f", actualRPM);

// ── PIDF tuning (optional, for better velocity tracking) ─────────────────
// PIDFCoefficients pidf = hdHexMotor.getPIDFCoefficients(DcMotor.RunMode.RUN_USING_ENCODER);
// pidf.p = 12; pidf.i = 3; pidf.d = 0; pidf.f = 12;
// hdHexMotor.setPIDFCoefficients(DcMotor.RunMode.RUN_USING_ENCODER, pidf);`}
              />
              <NoteBox type="tip">
                <code>DcMotorEx.setVelocity()</code> uses the SDK&apos;s built-in
                velocity PIDF controller. If the motor struggles to hit its target
                speed, increase the <strong>F</strong> (feedforward) coefficient
                first — it compensates for friction and back-EMF before the PID
                even kicks in.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "rev-servos",
          title: "REV Smart Robot Servo",
          content: (
            <Prose>
              <p>
                The <strong>REV Smart Robot Servo (SRS)</strong> is a high-torque
                metal-gear servo available in standard and continuous rotation
                variants. It ships in <em>Servo mode</em> by default; use the{" "}
                <strong>REV SRS Programmer</strong> tool to switch modes and
                configure the PWM range.
              </p>
              <SpecTable
                rows={[
                  { label: "Torque (6 V)", value: "13.5 kg·cm", note: "Metal gear" },
                  { label: "Range (servo mode)", value: "270°", note: "Default: 0.0–1.0" },
                  { label: "Dead-band", value: "4 µs", note: "Minimum command change" },
                  { label: "Modes", value: "Servo / CR / Multi-Turn", note: "Set via SRS Programmer" },
                  { label: "Connector", value: "JST-PH 3-pin", note: "Standard REV servo port" },
                ]}
              />
              <CodeBlock
                
                filename="REVSmartServo.java"
                code={`import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.hardware.ServoController;

// ── Basic position control ────────────────────────────────────────────────
Servo wristServo = hardwareMap.get(Servo.class, "wrist");

// REVERSE flips 0.0 and 1.0 without changing the physical PWM range
wristServo.setDirection(Servo.Direction.REVERSE);

// scaleRange limits travel to protect mechanism — here 10%–90% of 270°
wristServo.scaleRange(0.1, 0.9);

final double WRIST_NEUTRAL = 0.5;
final double WRIST_PICKUP  = 0.1;
final double WRIST_DEPOSIT = 0.9;

wristServo.setPosition(WRIST_NEUTRAL);

waitForStart();

while (opModeIsActive()) {
    if      (gamepad2.dpad_down) wristServo.setPosition(WRIST_PICKUP);
    else if (gamepad2.dpad_up)   wristServo.setPosition(WRIST_DEPOSIT);
    else if (gamepad2.dpad_left) wristServo.setPosition(WRIST_NEUTRAL);

    // getPwmRange() — inspect the raw microsecond bounds the SDK is sending
    // Servo.PwmControl pwm = ((ServoControllerEx) wristServo.getController())
    //     .getServoRegisters(wristServo.getPortNumber());

    telemetry.addData("Wrist position", "%.2f", wristServo.getPosition());
    telemetry.update();
}`}
              />
              <NoteBox type="info">
                Servo commands are <strong>fire-and-forget</strong> — the SDK
                sends the PWM signal and the servo moves on its own. There is no
                <code>isBusy()</code> for servos. Use <code>sleep()</code> or a
                state machine with an <code>ElapsedTime</code> to wait for the
                servo to finish traveling before commanding the next action.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "sensors-deep-dive",
          title: "Sensors Deep-Dive",
          content: (
            <Prose>
              <p>
                REV&apos;s sensor ecosystem covers color/proximity detection,
                distance ranging, touch input, and 6-axis IMU. All sensors connect
                via I²C or digital ports and are retrieved through{" "}
                <code>hardwareMap</code>.
              </p>
              <p>
                <strong>REV Color Sensor V3</strong> — reports RGBA + proximity.
                Use <code>NormalizedColorSensor</code> for normalized 0.0–1.0
                channel values that are gain-adjusted automatically.
              </p>
              <CodeBlock
                
                filename="REVColorSensor.java"
                code={`import com.qualcomm.robotcore.hardware.NormalizedColorSensor;
import com.qualcomm.robotcore.hardware.NormalizedRGBA;
import com.qualcomm.robotcore.hardware.SwitchableLight;
import android.graphics.Color;

NormalizedColorSensor colorSensor =
    hardwareMap.get(NormalizedColorSensor.class, "color_sensor");

// Turn on the built-in LED for better detection in variable lighting
if (colorSensor instanceof SwitchableLight) {
    ((SwitchableLight) colorSensor).enableLight(true);
}

// Set gain — higher values amplify dim readings; lower prevents saturation
colorSensor.setGain(10);

while (opModeIsActive()) {
    NormalizedRGBA colors = colorSensor.getNormalizedColors();

    // Convert to HSV for reliable hue-based detection
    float[] hsv = new float[3];
    Color.colorToHSV(colors.toColor(), hsv);

    float hue        = hsv[0];   // 0–360°
    float saturation = hsv[1];   // 0.0–1.0
    float value      = hsv[2];   // 0.0–1.0 (brightness)

    // Simple hue-based alliance detection
    String detected;
    if      (hue > 340 || hue < 20)  detected = "RED";
    else if (hue > 200 && hue < 260) detected = "BLUE";
    else if (hue > 60  && hue < 160) detected = "YELLOW/GREEN";
    else                              detected = "UNKNOWN";

    telemetry.addData("Hue",      "%.0f°", hue);
    telemetry.addData("RGBA",     "%.2f / %.2f / %.2f / %.2f",
                      colors.red, colors.green, colors.blue, colors.alpha);
    telemetry.addData("Detected", detected);
    telemetry.addData("Proximity", colorSensor.getDistance(DistanceUnit.CM));
    telemetry.update();
}`}
              />
              <p>
                <strong>REV 2m Distance Sensor</strong> — time-of-flight ranging
                up to 2 meters.
              </p>
              <CodeBlock
                
                filename="REVDistanceSensor.java"
                code={`import com.qualcomm.robotcore.hardware.DistanceSensor;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

DistanceSensor frontRange = hardwareMap.get(DistanceSensor.class, "front_range");

while (opModeIsActive()) {
    double distCm = frontRange.getDistance(DistanceUnit.CM);
    double distIn = frontRange.getDistance(DistanceUnit.INCH);

    // Out-of-range reads return Double.MAX_VALUE — always guard against it
    if (!Double.isInfinite(distCm) && distCm < 200) {
        telemetry.addData("Distance (cm)", "%.1f", distCm);
        telemetry.addData("Distance (in)", "%.1f", distIn);
    } else {
        telemetry.addData("Distance", "Out of range");
    }
    telemetry.update();
}`}
              />
              <p>
                <strong>REV Touch Sensor</strong> — momentary digital switch with
                software debounce pattern.
              </p>
              <CodeBlock
                
                filename="REVTouchSensor.java"
                code={`import com.qualcomm.robotcore.hardware.TouchSensor;

TouchSensor intakeButton = hardwareMap.get(TouchSensor.class, "intake_button");

boolean lastPressed = false;
boolean toggleState = false;

while (opModeIsActive()) {
    boolean isPressed = intakeButton.isPressed();

    // Rising-edge toggle — only fires once per press
    if (isPressed && !lastPressed) {
        toggleState = !toggleState;
        telemetry.addData("Toggle", toggleState ? "ON" : "OFF");
    }

    lastPressed = isPressed;

    telemetry.addData("Button", isPressed ? "PRESSED" : "released");
    telemetry.update();
}`}
              />
              <p>
                <strong>IMU (BNO055)</strong> — integrated in the Control Hub;
                returns robot heading, pitch, and roll.
              </p>
              <CodeBlock
                
                filename="REVImu.java"
                code={`import com.qualcomm.hardware.bosch.BNO055IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.AxesOrder;
import org.firstinspires.ftc.robotcore.external.navigation.AxesReference;
import org.firstinspires.ftc.robotcore.external.navigation.Orientation;

// ── Init ─────────────────────────────────────────────────────────────────
BNO055IMU imu = hardwareMap.get(BNO055IMU.class, "imu");

BNO055IMU.Parameters params = new BNO055IMU.Parameters();
params.angleUnit = BNO055IMU.AngleUnit.DEGREES;
params.accelUnit = BNO055IMU.AccelUnit.METERS_PERSEC_PERSEC;
imu.initialize(params);

// ── In loop ──────────────────────────────────────────────────────────────
while (opModeIsActive()) {
    Orientation angles = imu.getAngularOrientation(
        AxesReference.INTRINSIC,
        AxesOrder.ZYX,
        AngleUnit.DEGREES
    );

    double heading = angles.firstAngle;   // Yaw  — robot heading (-180 to 180)
    double pitch   = angles.secondAngle;  // Pitch — front/back tilt
    double roll    = angles.thirdAngle;   // Roll  — side tilt

    telemetry.addData("Heading", "%.1f°", heading);
    telemetry.addData("Pitch",   "%.1f°", pitch);
    telemetry.addData("Roll",    "%.1f°", roll);
    telemetry.update();
}`}
              />
              <NoteBox type="warning">
                The IMU takes ~1 second to initialize. Call{" "}
                <code>imu.initialize(params)</code> during <code>init()</code> or
                early in <code>runOpMode()</code>, well before{" "}
                <code>waitForStart()</code>, so the sensor is ready when the match
                begins.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "encoders",
          title: "Encoders",
          content: (
            <Prose>
              <p>
                The Control Hub has <strong>4 built-in encoder ports</strong> (one
                per motor slot). The Expansion Hub adds 4 more. External
                through-bore encoders (e.g. REV Through-Bore Encoder) connect to
                the same JST-PH 4-pin ports and appear as additional motors in
                the config — even if no motor is attached to that slot.
              </p>
              <SpecTable
                rows={[
                  { label: "Control Hub encoder ports", value: "4 (motor ports 0–3)", note: "Also used for through-bore" },
                  { label: "Expansion Hub encoder ports", value: "4 (motor ports 0–3)", note: "Add via RS485" },
                  { label: "REV Through-Bore PPR", value: "8192 PPR", note: "High resolution odometry" },
                  { label: "REV HD Hex (40:1) PPR", value: "1120 PPR", note: "28 base × 40 stages" },
                  { label: "Encoding type", value: "Quadrature (4×)", note: "SDK decodes automatically" },
                ]}
              />
              <NoteBox type="info">
                Through-bore encoders used for odometry should be configured as{" "}
                <strong>motors</strong> in the Driver Station config, with a dummy
                name like <code>left_dead_wheel</code>. Set their run mode to{" "}
                <code>RUN_WITHOUT_ENCODER</code> and read position with{" "}
                <code>getCurrentPosition()</code>.
              </NoteBox>
              <CodeBlock
                
                filename="EncoderRunModes.java"
                code={`import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;

DcMotorEx driveMotor = hardwareMap.get(DcMotorEx.class, "front_left");

// ── RunMode state machine ─────────────────────────────────────────────────

// STOP_AND_RESET_ENCODER: zeroes the tick count; motor output is cut.
// Always call this first, then immediately set the desired run mode.
driveMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

// RUN_WITHOUT_ENCODER: power maps directly to voltage (0.0–1.0).
// Encoder ticks are still readable — the SDK just does not use them for
// feedback. Use for drivetrain TeleOp or when you manage PID yourself.
driveMotor.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

// RUN_USING_ENCODER: SDK's velocity PIDF governs output.
// setPower() becomes a fraction of max velocity. More consistent speed
// across changing battery levels. Preferred for autonomous straight moves.
driveMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

// RUN_TO_POSITION: SDK drives to a tick target and holds.
// Must set target BEFORE switching to this mode.
driveMotor.setTargetPosition(2800);
driveMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
driveMotor.setPower(0.7);

while (driveMotor.isBusy() && opModeIsActive()) {
    telemetry.addData("Pos", driveMotor.getCurrentPosition());
    telemetry.addData("Target", driveMotor.getTargetPosition());
    telemetry.update();
}
driveMotor.setPower(0);

// ── Through-bore odometry wheel (read-only) ───────────────────────────────
DcMotor leftOdo = hardwareMap.get(DcMotor.class, "left_dead_wheel");
leftOdo.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
leftOdo.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

// Read in loop — no motor output, purely for position tracking
int odoPodTicks = leftOdo.getCurrentPosition();`}
              />
            </Prose>
          ),
        },
        {
          id: "servo-programming",
          title: "Servo Programming",
          content: (
            <Prose>
              <p>
                REV Smart Robot Servos (SRS) and goBILDA 2000-Series Dual Mode
                servos are controlled the same way via the <code>Servo</code>{" "}
                interface. Positions range from <code>0.0</code> (0°) to{" "}
                <code>1.0</code> (180° for standard servos).
              </p>
              <CodeBlock
                filename="ServoExample.java"
                code={`// In your OpMode's runOpMode():

// Declare servos
Servo clawServo    = hardwareMap.get(Servo.class, "claw");
Servo wristServo   = hardwareMap.get(Servo.class, "wrist");

// Define named positions
final double CLAW_OPEN   = 0.2;
final double CLAW_CLOSED = 0.7;
final double WRIST_DOWN  = 0.1;
final double WRIST_UP    = 0.9;

waitForStart();

while (opModeIsActive()) {
    // Toggle claw with A/B buttons
    if (gamepad1.a) clawServo.setPosition(CLAW_OPEN);
    if (gamepad1.b) clawServo.setPosition(CLAW_CLOSED);

    // Wrist control with bumpers
    if (gamepad1.left_bumper)  wristServo.setPosition(WRIST_DOWN);
    if (gamepad1.right_bumper) wristServo.setPosition(WRIST_UP);

    telemetry.addData("Claw",  clawServo.getPosition());
    telemetry.addData("Wrist", wristServo.getPosition());
    telemetry.update();
}`}
              />
              <NoteBox type="info">
                Use <code>CRServo</code> instead of <code>Servo</code> for
                continuous-rotation servos. Power is controlled with{" "}
                <code>setPower(-1.0 to 1.0)</code> rather than position.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

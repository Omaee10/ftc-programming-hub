import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "REV Robotics – FTC Programming Hub" };

export default function REVRoboticsPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
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
              <DocVideo docSlug="rev-robotics" sectionId="control-hub" />
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
                  { label: "Analog Ports", value: "4 inputs", sub: "0–5 V input" },
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
                  { label: "Analog Ports", value: "4", note: "0 – 5 V input" },
                  { label: "Connection", value: "RS485 or USB Mini-B", note: "to Control Hub" },
                ]}
              />
              <NoteBox type="tip">
                When connecting multiple I²C devices across the Control Hub and
                Expansion Hub, spread them across separate hardware buses when
                possible. Overloading one bus increases read latency and can
                slow your main control loop.
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

    private NormalizedColorSensor intakeSensor;

    // Alliance color thresholds (tune on actual field)
    private static final int RED_THRESHOLD  = 200;
    private static final int BLUE_THRESHOLD = 200;

    @Override
    public void runOpMode() {
        // REV Color Sensor v3 implements NormalizedColorSensor and DistanceSensor
        intakeSensor = hardwareMap.get(NormalizedColorSensor.class, "intake_color");

        if (intakeSensor instanceof SwitchableLight) {
            ((SwitchableLight) intakeSensor).enableLight(true);
        }

        waitForStart();

        while (opModeIsActive()) {
            int red   = intakeSensor.red();
            int green = intakeSensor.green();
            int blue  = intakeSensor.blue();
            int alpha = intakeSensor.alpha();

            // DistanceSensor is implemented by the same physical device
            double distanceCm = ((DistanceSensor) intakeSensor).getDistance(DistanceUnit.CM);

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
              <NoteBox type="info">
                The REV Color Sensor v3 implements both{" "}
                <code>NormalizedColorSensor</code> and{" "}
                <code>DistanceSensor</code> on one I²C handle — you do not need
                two separate <code>hardwareMap.get()</code> calls for the same
                device name.
              </NoteBox>
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

            double dt = timer.seconds();
            timer.reset();
            if (dt < 0.001) dt = 0.001;

            integralSum     += error * dt;
            double derivative = (error - lastError) / dt;
            double correction = Kp * error + Ki * integralSum + Kd * derivative;
            lastError = error;

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
              <NoteBox type="warning">
                Always floor <code>dt</code> before dividing for the derivative
                term. Fast loop iterations can return <code>0.0</code> from{" "}
                <code>timer.seconds()</code>, which produces{" "}
                <code>NaN</code> correction power and kills drivetrain output.
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

    // Out-of-range ToF reads return NaN or infinity — guard before using the value
    if (!Double.isNaN(distCm) && !Double.isInfinite(distCm) && distCm < 200) {
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
                <strong>IMU (BHI260AP)</strong> — integrated in the Control Hub;
                use the modern <code>IMU</code> interface (available since SDK
                8.0). The legacy <code>BNO055IMU</code> API is deprecated and
                should not be used in new code.
              </p>
              <CodeBlock
                filename="REVImu.java"
                code={`import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import com.qualcomm.robotcore.hardware.IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;

// ── Init ─────────────────────────────────────────────────────────────────
IMU imu = hardwareMap.get(IMU.class, "imu");

// Describe how the Control Hub is physically mounted on the robot.
// Adjust LogoFacingDirection and UsbFacingDirection to match yours.
imu.initialize(new IMU.Parameters(
    new RevHubOrientationOnRobot(
        RevHubOrientationOnRobot.LogoFacingDirection.UP,
        RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
    )
));

// ── At match start — zero the heading ────────────────────────────────────
imu.resetYaw();

// ── In loop ──────────────────────────────────────────────────────────────
while (opModeIsActive()) {
    double heading = imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES);
    double pitch   = imu.getRobotYawPitchRollAngles().getPitch(AngleUnit.DEGREES);
    double roll    = imu.getRobotYawPitchRollAngles().getRoll(AngleUnit.DEGREES);

    telemetry.addData("Heading", "%.1f°", heading);
    telemetry.addData("Pitch",   "%.1f°", pitch);
    telemetry.addData("Roll",    "%.1f°", roll);
    telemetry.update();
}`}
              />
              <NoteBox type="warning">
                Call <code>imu.resetYaw()</code> after <code>waitForStart()</code>,
                not during init, so the heading is zeroed at the exact moment
                your match begins rather than during the pre-match setup period.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "goBILDA – FTC Programming Hub" };

export default function GoBILDAPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "goBILDA" },
      ]}
      title="goBILDA Hardware & Subsystems"
      description="Metric modular hardware for FTC — Strafer mecanum chassis, Viper Slide lifts, limit switches, LED indicators, and Pinpoint odometry with production-ready SDK examples."
      badge="Hardware"
      badgeColor="amber"
      readingTime="14 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                goBILDA is a metric-based, modular robotics system widely adopted
                in FTC. Every structural component uses a{" "}
                <strong>16 mm grid pattern with a 4 mm pitch bolt pattern</strong>,
                making it seamless to mix structural channels, mechanical
                linkages, and electronics without custom adapters.
              </p>
              <InfoGrid
                items={[
                  { label: "Build System", value: "Metric", sub: "16 mm grid, M4 hardware" },
                  { label: "Motor Standard", value: "5202 Series", sub: "Yellow Jacket planetary" },
                  { label: "Servo Standard", value: "2000 Series", sub: "Dual-mode programmable" },
                  { label: "Ecosystem", value: "REV compatible", sub: "goHUB adapter plates" },
                ]}
              />
              <NoteBox type="tip">
                Always configure hardware names in the Driver Station app first,
                then match them <em>exactly</em> in your{" "}
                <code>hardwareMap.get()</code> calls. A single typo or
                capitalization difference throws a{" "}
                <code>NullPointerException</code> at runtime.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "strafer-chassis",
          title: "The Strafer Chassis (Mecanum Drivetrain)",
          content: (
            <Prose>
              <p>
                The goBILDA Strafer Chassis Kit is a premium omnidirectional
                drivetrain built around four <strong>5202-series (19.2:1 ratio)
                Yellow Jacket</strong> motors.
              </p>
              <SpecTable
                rows={[
                  { label: "Wheelbase", value: "≈ 216 mm", note: "Center-to-center" },
                  { label: "Track Width", value: "≈ 295 mm", note: "Center-to-center" },
                  { label: "Motor Free Speed", value: "312 RPM", note: "At 12 V" },
                  { label: "Encoder Resolution", value: "537.7 TPR", note: "Output shaft" },
                  { label: "Wheel Diameter", value: "96 mm", note: "Premium mecanum wheels" },
                  { label: "Motor Part", value: "5202-0002-0019", note: "19.2:1 Yellow Jacket" },
                ]}
              />
              <NoteBox type="warning">
                When looking down from the <strong>top</strong>, mecanum rollers
                must form an <strong>O</strong> pattern (pointing inward toward
                the chassis center). From the <strong>bottom</strong>, they form
                an X. If left and right wheels are swapped or mounted as a
                top-down X, forward and rotate still work, but strafe commands
                jam the drivetrain or move in the wrong direction.
              </NoteBox>
              <p>
                Because drivetrain motors are mirrored across the chassis
                centerline, reversing the <strong>left side</strong> in software
                is standard so positive power moves the whole robot forward.
              </p>
              <CodeBlock
                filename="RobotCentricMecanum.java"
                code={`package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "goBILDA Robot-Centric Mecanum", group = "Drivetrain")
public class RobotCentricMecanum extends LinearOpMode {
    private DcMotorEx frontLeft, frontRight, backLeft, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotorEx.class, "front_left");
        frontRight = hardwareMap.get(DcMotorEx.class, "front_right");
        backLeft   = hardwareMap.get(DcMotorEx.class, "back_left");
        backRight  = hardwareMap.get(DcMotorEx.class, "back_right");

        // Left side reversed due to inward physical orientation
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);

        frontLeft.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        frontRight.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        backLeft.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        backRight.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        waitForStart();

        while (opModeIsActive()) {
            double y  = -gamepad1.left_stick_y;
            double x  =  gamepad1.left_stick_x * 1.1;
            double rx =  gamepad1.right_stick_x;

            double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1.0);

            frontLeft.setPower((y + x + rx) / denominator);
            backLeft.setPower((y - x + rx) / denominator);
            frontRight.setPower((y - x - rx) / denominator);
            backRight.setPower((y + x - rx) / denominator);
        }
    }
}`}
              />
              <NoteBox type="info">
                For field-centric control and full mecanum math, see the{" "}
                <a href="/docs/mecanum-drive" className="link-accent">Mecanum Drive</a>{" "}
                doc page.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "viper-slide",
          title: "Viper Slide Linear Extension Systems",
          content: (
            <Prose>
              <p>
                The goBILDA Viper Slide is a multi-stage linear ball-bearing
                extension driven by a precision string spool wrapped around a
                5202 planetary motor.
              </p>
              <SpecTable
                rows={[
                  { label: "Max Extension", value: "≈ 525 mm", note: "Per stage" },
                  { label: "Standard Spool Diameter", value: "≈ 32 mm" },
                  { label: "Community Standard Motor", value: "5202-0002-0019", note: "19.2:1, 537.7 TPR" },
                ]}
              />
              <p>
                To safely mix automatic presets (<code>RUN_TO_POSITION</code>)
                with manual trigger overrides, branch so manual input takes
                priority and releasing sticks returns to a stable hold state.
              </p>
              <CodeBlock
                filename="ViperSlideControl.java"
                code={`package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;

@TeleOp(name = "Viper Slide Master Control", group = "Mechanisms")
public class ViperSlideControl extends LinearOpMode {
    private static final int SLIDE_RETRACTED = 0;
    private static final int SLIDE_LOW_GOAL  = 450;
    private static final int SLIDE_HIGH_GOAL = 1650;
    private static final double MAX_AUTO_POWER = 0.85;

    private DcMotorEx viperSlide;

    @Override
    public void runOpMode() {
        viperSlide = hardwareMap.get(DcMotorEx.class, "viper_slide");

        viperSlide.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        viperSlide.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        viperSlide.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        waitForStart();

        while (opModeIsActive()) {
            double manualInput = gamepad1.right_trigger - gamepad1.left_trigger;

            if (Math.abs(manualInput) > 0.05) {
                // Pathway A: manual override takes absolute priority
                viperSlide.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                viperSlide.setPower(manualInput * 0.6);
            } else if (viperSlide.getMode() == DcMotor.RunMode.RUN_USING_ENCODER) {
                // Pathway B: no input and not on a preset — hold position
                viperSlide.setPower(0.0);
            }

            // Pathway C: preset triggers shift control mode
            if (gamepad1.a) goToPosition(SLIDE_RETRACTED);
            if (gamepad1.b) goToPosition(SLIDE_LOW_GOAL);
            if (gamepad1.y) goToPosition(SLIDE_HIGH_GOAL);

            telemetry.addData("Slide Mode", viperSlide.getMode());
            telemetry.addData("Current Ticks", viperSlide.getCurrentPosition());
            telemetry.update();
        }
    }

    private void goToPosition(int targetTicks) {
        int clampedTarget = Math.max(0, Math.min(targetTicks, 2100));
        viperSlide.setTargetPosition(clampedTarget);
        viperSlide.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        viperSlide.setPower(MAX_AUTO_POWER);
    }
}`}
              />
              <NoteBox type="warning">
                Always clamp targets before <code>setTargetPosition()</code> to
                prevent mechanical over-extension. After a preset move completes,
                switch out of <code>RUN_TO_POSITION</code> if you need manual
                control again — see the{" "}
                <a href="/docs/motors-servos" className="link-accent">Motors &amp; Servos</a>{" "}
                page.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "sensors",
          title: "Magnetic Limit Switches",
          content: (
            <Prose>
              <p>
                The goBILDA Magnetic Limit Switch uses an active-low Hall-effect
                sensor for clean digital state changes without contact bounce.
              </p>
              <SpecTable
                rows={[
                  { label: "Operating Voltage", value: "3.3 V – 5 V", note: "REV digital ports" },
                  { label: "Default Logic", value: "Active-low", note: "getState() == false when magnet present" },
                  { label: "Safe Init", value: "DigitalChannel.Mode.INPUT", note: "Stabilizes floating lines" },
                ]}
              />
              <CodeBlock
                filename="LimitSwitchOp.java"
                code={`package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DigitalChannel;

@TeleOp(name = "Limit Switch Guard", group = "Mechanisms")
public class LimitSwitchOp extends LinearOpMode {
    private DcMotor liftMotor;
    private DigitalChannel lowerLimit;

    @Override
    public void runOpMode() {
        liftMotor = hardwareMap.get(DcMotor.class, "lift_motor");
        lowerLimit = hardwareMap.get(DigitalChannel.class, "lower_limit");

        // CRITICAL: explicitly set channel to INPUT mode
        lowerLimit.setMode(DigitalChannel.Mode.INPUT);

        waitForStart();

        while (opModeIsActive()) {
            double power = -gamepad2.left_stick_y;

            boolean isAtBottomLimit = !lowerLimit.getState();

            if (isAtBottomLimit && power < 0) {
                power = 0.0;
            }

            liftMotor.setPower(power);
            telemetry.addData("Limit Tripped", isAtBottomLimit);
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "led-lights",
          title: "Intelligent LED Indicator Systems",
          content: (
            <Prose>
              <p>
                goBILDA LED strips are controlled through a standard PWM duty
                cycle. Configure them as <strong>position servos</strong> in the
                Robot Configuration and vary <code>setPosition()</code> from{" "}
                <code>0.0</code> to <code>1.0</code> to select colors and
                sequences — no separate LED driver class.
              </p>
              <SpecTable
                rows={[
                  { label: "0.00", value: "LED strips off" },
                  { label: "0.30", value: "Solid red" },
                  { label: "0.60", value: "Solid blue" },
                  { label: "0.75", value: "Solid green" },
                  { label: "1.00", value: "Solid white (init)" },
                ]}
              />
              <CodeBlock
                filename="StatusLED.java"
                code={`Servo statusLED = hardwareMap.get(Servo.class, "status_led");

// Set state markers throughout your OpMode
statusLED.setPosition(0.75); // Green — successful intake collection`}
              />
              <NoteBox type="warning">
                Do <strong>not</strong> use <code>CRServo</code> for goBILDA
                LEDs. Always retrieve them as <code>Servo.class</code> and
                command with <code>setPosition()</code>. Calibrate exact
                color values for your specific LED model.
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
                Choose gear ratio by mechanism — lower ratios are faster;
                higher ratios produce more torque and better position accuracy.
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
                    ["5202-2402-0005", "5.2 : 1", "1150 RPM", "7.9 kg·cm", "Fast intake roller"],
                    ["5202-2402-0019", "19.2 : 1", "312 RPM", "24.3 kg·cm", "Mecanum drivetrain"],
                    ["5202-2402-0027", "26.9 : 1", "223 RPM", "38 kg·cm", "Light arm / slides"],
                    ["5202-2402-0051", "50.9 : 1", "117 RPM", "68.4 kg·cm", "Heavy lift / vipers"],
                    ["5202-2402-0071", "71.2 : 1", "84 RPM", "93.6 kg·cm", "Turret / heavy arm"],
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
                For the Strafer Chassis, the <strong>19.2:1</strong> ratio is
                the community standard — ~90 cm/s top speed with 96 mm mecanum
                wheels while retaining encoder resolution for odometry.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "odometry-pods",
          title: "Pinpoint Odometry Computer Integration",
          content: (
            <Prose>
              <p>
                The goBILDA Pinpoint Odometry Computer is an on-board coprocessor
                that reads dedicated X/Y dead-wheels, fuses data with an
                integrated IMU, and outputs field position over I²C.
              </p>
              <SpecTable
                rows={[
                  { label: "Coordinates", value: "Millimeters and degrees", note: "Pose2D output" },
                  { label: "4-Bar Pod Resolution", value: "2000 CPR", note: "32 mm wheel → ≈ 19.89 ticks/mm" },
                  { label: "SDK Class", value: "GoBildaPinpointDriver", note: "com.qualcomm.hardware.gobilda" },
                  { label: "Update Rate", value: "Every loop", note: "Must call update() each frame" },
                ]}
              />
              <CodeBlock
                filename="PinpointTracking.java"
                code={`package org.firstinspires.ftc.teamcode;

import com.qualcomm.hardware.gobilda.GoBildaPinpointDriver;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import org.firstinspires.ftc.robotcore.external.navigation.Pose2D;

@TeleOp(name = "Pinpoint Field Tracking", group = "Tracking")
public class PinpointTracking extends LinearOpMode {
    private GoBildaPinpointDriver pinpoint;

    @Override
    public void runOpMode() {
        pinpoint = hardwareMap.get(GoBildaPinpointDriver.class, "pinpoint");

        // X: positive = forward of center | Y: positive = left of center (mm)
        pinpoint.setOffsets(-84.0, -168.0);

        pinpoint.setEncoderResolution(
            GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD
        );

        pinpoint.setEncoderDirections(
            GoBildaPinpointDriver.EncoderDirection.FORWARD,
            GoBildaPinpointDriver.EncoderDirection.FORWARD
        );

        pinpoint.resetPosAndIMU();

        waitForStart();

        while (opModeIsActive()) {
            // CRITICAL: call update() every frame to refresh the I²C pose
            pinpoint.update();

            Pose2D pose = pinpoint.getPosition();

            telemetry.addData("Field X (mm)", "%.1f", pose.getX(DistanceUnit.MM));
            telemetry.addData("Field Y (mm)", "%.1f", pose.getY(DistanceUnit.MM));
            telemetry.addData("Heading (°)", "%.1f", pose.getHeading(AngleUnit.DEGREES));
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="info">
                Measure pod offsets from your robot&apos;s center of rotation
                carefully — incorrect offsets cause consistent autonomous drift.
                Road Runner and Pedro Pathing both support Pinpoint as a
                localizer; see their doc pages for drop-in integration.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

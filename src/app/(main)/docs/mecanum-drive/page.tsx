import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Mecanum Drive – FTC Programming Hub" };

export default function MecanumDrivePage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/mecanum-drive" },
        { label: "Mecanum Drive" },
      ]}
      title="Mecanum Drive"
      description="Mecanum wheels allow full omnidirectional movement — forward, strafe, and rotate simultaneously. This guide covers the physics, robot-centric control equations, power normalization, and field-centric drive using the IMU."
      badge="TeleOp"
      badgeColor="blue"
      readingTime="12 min"
      sections={[
        {
          id: "how-mecanum-works",
          title: "How Mecanum Works",
          content: (
            <Prose>
              <DocVideo docSlug="mecanum-drive" sectionId="how-mecanum-works" />
              <p>
                Mecanum wheels have rollers mounted at <strong>45°</strong> to
                the wheel axle. When a wheel spins, the force on the ground is
                split between the axle direction and the roller direction. By
                controlling the speeds of all four wheels independently, the
                robot can produce any combination of forward, sideways, and
                rotational movement.
              </p>
              <InfoGrid
                items={[
                  { label: "Motors", value: "4 independent", sub: "Each controlled separately" },
                  { label: "Movement", value: "Omnidirectional", sub: "Forward, strafe, rotate simultaneously" },
                  { label: "Wheel layout", value: "O from top, X from bottom", sub: "Rollers point toward center when viewed from above — strafing requires this" },
                  { label: "Strafing", value: "Slightly inefficient", sub: "×1.1 correction factor helps" },
                ]}
              />
              <p>
                The key insight is the <strong>power equations</strong> — each
                wheel&apos;s power is a combination of three driver inputs:
              </p>
              <SpecTable
                rows={[
                  { label: "y", value: "Forward/backward", note: "Left stick Y (negated — up is positive)" },
                  { label: "x", value: "Strafe left/right", note: "Left stick X" },
                  { label: "rx", value: "Rotate left/right", note: "Right stick X" },
                ]}
              />
              <SpecTable
                rows={[
                  { label: "Front Left", value: "y + x + rx" },
                  { label: "Back Left", value: "y - x + rx" },
                  { label: "Front Right", value: "y - x - rx" },
                  { label: "Back Right", value: "y + x - rx" },
                ]}
              />
              <NoteBox type="warning">
                Roller orientation is perspective-dependent: from the{" "}
                <strong>top</strong> of the robot, rollers must form an{" "}
                <strong>O</strong> (diamond) — each wheel&apos;s rollers point
                toward the center. From the <strong>bottom</strong> (ground
                view), they form an X. If you mount an X when looking down from
                above, forward and rotate still work, but{" "}
                <strong>strafing will not</strong> — the wheels fight each other
                and lock up.
              </NoteBox>
              <NoteBox type="info">
                The right side motors are typically <strong>reversed</strong>{" "}
                in software so that positive power = forward on all four
                wheels. If your robot drives backward when you push forward,
                reverse the left side instead.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "robot-centric",
          title: "Robot-Centric Drive",
          content: (
            <Prose>
              <p>
                In robot-centric mode the driver controls the robot relative
                to its own front. Push forward — the robot drives toward its
                nose regardless of which way it&apos;s facing on the field.
                This is the simpler implementation and a good starting point.
              </p>
              <CodeBlock
                filename="RobotCentricMecanumTeleOp.java"
                code={`import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "Robot-Centric Mecanum")
public class RobotCentricMecanum extends LinearOpMode {

    private DcMotor frontLeft, backLeft, frontRight, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");

        // Reverse the right side so all motors drive forward at positive power
        frontRight.setDirection(DcMotorSimple.Direction.REVERSE);
        backRight.setDirection(DcMotorSimple.Direction.REVERSE);

        waitForStart();

        while (opModeIsActive()) {
            double y  = -gamepad1.left_stick_y;       // Y axis is inverted — negate it
            double x  =  gamepad1.left_stick_x * 1.1; // × 1.1 counteracts strafing inefficiency
            double rx =  gamepad1.right_stick_x;

            // ── Power normalization ─────────────────────────────────────────
            // Finds the largest raw power value (or 1 if all are within [-1, 1])
            // Then divides all four powers by it, scaling them down proportionally
            // so the largest value is exactly 1.0 — preserving the drive ratio.
            double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);

            double frontLeftPower  = (y + x + rx) / denominator;
            double backLeftPower   = (y - x + rx) / denominator;
            double frontRightPower = (y - x - rx) / denominator;
            double backRightPower  = (y + x - rx) / denominator;

            frontLeft.setPower(frontLeftPower);
            backLeft.setPower(backLeftPower);
            frontRight.setPower(frontRightPower);
            backRight.setPower(backRightPower);

            telemetry.addData("FL / FR", "%.2f / %.2f", frontLeftPower, frontRightPower);
            telemetry.addData("BL / BR", "%.2f / %.2f", backLeftPower,  backRightPower);
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="tip">
                The <code>* 1.1</code> strafing correction compensates for
                the fact that mecanum wheels are slightly less efficient when
                strafing — without it, strafe commands feel weaker than
                forward commands at the same stick position.
              </NoteBox>
              <NoteBox type="warning">
                The Y axis of a gamepad joystick is <strong>inverted</strong> —
                pushing up returns a <em>negative</em> value. Always negate
                <code>left_stick_y</code> so forward = positive.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "power-normalization",
          title: "Power Normalization",
          content: (
            <Prose>
              <p>
                Without normalization, combining forward + strafe + rotation
                can produce motor power values greater than 1.0, which the
                SDK silently clamps — distorting the ratio between wheels and
                making the robot pull to one side.
              </p>
              <p>
                The fix is to divide all four powers by the largest absolute
                value among them (or 1 if all are already within range):
              </p>
              <CodeBlock
                filename="PowerNormalization.java"
                code={`// Without normalization — can exceed [-1, 1]:
// y=1, x=1, rx=1 → frontLeft = 1 + 1 + 1 = 3  ← clamped to 1 by SDK!

// ── Correct approach ──────────────────────────────────────────────────────
double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
// If y=1, x=1, rx=1 → denominator = 3
// frontLeft  = (1 + 1 + 1) / 3 = 1.0
// backLeft   = (1 - 1 + 1) / 3 = 0.333
// frontRight = (1 - 1 - 1) / 3 = -0.333
// backRight  = (1 + 1 - 1) / 3 = 0.333
// The ratio is preserved — no wheel is clamped!

// If all values are already within [-1, 1], denominator = 1
// and all powers are unchanged.`}
              />
            </Prose>
          ),
        },
        {
          id: "field-centric",
          title: "Field-Centric Drive",
          content: (
            <Prose>
              <p>
                In field-centric mode, pushing the stick forward always moves
                the robot toward the <strong>field&apos;s forward wall</strong>{" "}
                regardless of which way the robot is facing. Many drivers prefer
                this because it&apos;s more intuitive — strafing while spinning
                is much easier.
              </p>
              <p>
                The implementation reads the robot&apos;s current heading from the
                IMU and <strong>rotates the stick vector</strong> counter to the
                robot&apos;s rotation using a 2D rotation matrix:
              </p>
              <SpecTable
                rows={[
                  { label: "rotX", value: "x·cos(θ) + y·sin(θ)", note: "Rotated strafe component" },
                  { label: "rotY", value: "−x·sin(θ) + y·cos(θ)", note: "Rotated forward component" },
                ]}
              />
              <CodeBlock
                filename="FieldCentricMecanumTeleOp.java"
                code={`import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.hardware.IMU;
import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;

@TeleOp(name = "Field-Centric Mecanum")
public class FieldCentricMecanum extends LinearOpMode {

    private DcMotor frontLeft, backLeft, frontRight, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");

        frontRight.setDirection(DcMotorSimple.Direction.REVERSE);
        backRight.setDirection(DcMotorSimple.Direction.REVERSE);

        // ── IMU setup ─────────────────────────────────────────────────────
        IMU imu = hardwareMap.get(IMU.class, "imu");
        IMU.Parameters imuParams = new IMU.Parameters(
            new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
            )
        );
        imu.initialize(imuParams);

        waitForStart();

        while (opModeIsActive()) {
            double y  = -gamepad1.left_stick_y;
            double x  =  gamepad1.left_stick_x;
            double rx =  gamepad1.right_stick_x;

            // ── Reset heading with Options/Start button ───────────────────
            // Important! Counteracts IMU drift and lets drivers reset
            // the "forward" direction at any point.
            if (gamepad1.options) {
                imu.resetYaw();
            }

            // ── Read current robot heading from IMU ───────────────────────
            double botHeading = imu.getRobotYawPitchRollAngles()
                                   .getYaw(AngleUnit.RADIANS);

            // ── Rotate stick vector counter to robot's heading ────────────
            // Equivalent to cos(−θ)/sin(−θ) form; uses cos(−θ)=cos(θ), sin(−θ)=−sin(θ)
            double rotX = x * Math.cos(botHeading) + y * Math.sin(botHeading);
            double rotY = -x * Math.sin(botHeading) + y * Math.cos(botHeading);

            rotX = rotX * 1.1; // strafing correction

            // ── Power normalization + motor assignment ────────────────────
            double denominator = Math.max(Math.abs(rotY) + Math.abs(rotX) + Math.abs(rx), 1);

            frontLeft.setPower((rotY + rotX + rx) / denominator);
            backLeft.setPower((rotY - rotX + rx) / denominator);
            frontRight.setPower((rotY - rotX - rx) / denominator);
            backRight.setPower((rotY + rotX - rx) / denominator);
        }
    }
}`}
              />
              <NoteBox type="info">
                The IMU heading is relative to the robot&apos;s orientation at
                power-on (or last <code>resetYaw()</code> call). Always bind
                the yaw reset to a button so drivers can re-zero the forward
                direction if the robot is bumped or rotated before the match
                starts. The <code>options</code> button (PS4) / <code>start</code>{" "}
                (Xbox) is hard to hit accidentally — a good choice.
              </NoteBox>
              <NoteBox type="warning">
                Make sure to set <code>LogoFacingDirection</code> and{" "}
                <code>UsbFacingDirection</code> to match how your Control Hub
                is physically mounted. Wrong orientation causes the heading to
                drift or report incorrect values.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "speed-modes",
          title: "Speed Modes & Fine Control",
          content: (
            <Prose>
              <p>
                A common pattern is to add a <strong>slow mode</strong> so
                drivers can make precise adjustments near scoring positions:
              </p>
              <CodeBlock
                filename="SpeedMode.java"
                code={`while (opModeIsActive()) {
    double y  = -gamepad1.left_stick_y;
    double x  =  gamepad1.left_stick_x * 1.1;
    double rx =  gamepad1.right_stick_x;

    // ── Hold right bumper for 30% speed (fine-control mode) ──────────────
    if (gamepad1.right_bumper) {
        y  *= 0.3;
        x  *= 0.3;
        rx *= 0.3;
    }

    double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
    frontLeft.setPower((y + x + rx) / denominator);
    backLeft.setPower((y - x + rx) / denominator);
    frontRight.setPower((y - x - rx) / denominator);
    backRight.setPower((y + x - rx) / denominator);
}`}
              />
              <p>
                You can also apply a <strong>deadzone</strong> to ignore small
                unintentional stick deflections. The SDK can do this for you in{" "}
                <code>init()</code> — no ternary logic needed in the loop:
              </p>
              <CodeBlock
                filename="Deadzone.java"
                code={`// ── Preferred: SDK built-in deadzone (set once before waitForStart) ─────
gamepad1.setJoystickDeadzone(0.05f);

// ── Manual alternative — apply each loop if you need custom per-axis logic ─
double DEADZONE = 0.05;

double rawY = -gamepad1.left_stick_y;
double rawX =  gamepad1.left_stick_x;

double y  = Math.abs(rawY) > DEADZONE ? rawY : 0;
double x  = Math.abs(rawX) > DEADZONE ? rawX : 0;
double rx = Math.abs(gamepad1.right_stick_x) > DEADZONE
              ? gamepad1.right_stick_x : 0;`}
              />
            </Prose>
          ),
        },
        {
          id: "motor-directions",
          title: "Verifying Motor Directions",
          content: (
            <Prose>
              <p>
                Before writing any autonomous, verify motor directions manually.
                Run a simple TeleOp and test each movement:
              </p>
              <StepList
                steps={[
                  "Push left stick straight forward — all four wheels should spin so the robot moves forward. If it spins or strafes, motors are reversed.",
                  "Push left stick straight right (strafe) — robot should slide right without rotating. If it rotates, check x vs rx in your equations.",
                  "Push right stick right (rotate) — robot should spin clockwise in place. If it translates instead, check rx signs.",
                  "If any individual wheel is wrong, add motor.setDirection(DcMotorSimple.Direction.REVERSE) for that motor — never negate power in code.",
                ]}
              />
              <SpecTable
                rows={[
                  { label: "Front-left only backwards", value: "Reverse frontLeft" },
                  { label: "Robot spins instead of strafing", value: "x and rx are swapped in equations — or rollers form X from top (should be O)" },
                  { label: "Robot drives forward instead of strafing", value: "Left stick X and Y are swapped" },
                  { label: "Strafe direction is wrong", value: "Negate x in equations" },
                ]}
              />
            </Prose>
          ),
        },
      ]}
    />
  );
}

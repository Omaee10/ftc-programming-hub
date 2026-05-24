export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Challenge {
  id: number;
  title: string;
  difficulty: Difficulty;
  description: string;
  xp: number;
  estimatedTime: string;
  tags: string[];
  objectives: string[];
  instructions: string;
  starterCode: string;
  hints: string[];
  conceptsCovered: string[];
}

export const challenges: Challenge[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 1 — Basic TeleOp
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    title: "Basic TeleOp",
    difficulty: "Beginner",
    description:
      "Initialize a DC Motor from hardwareMap and map its power directly to gamepad1.left_stick_y so the driver can control it in real time.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["TeleOp", "Motors", "Gamepad"],
    objectives: [
      "Declare a DcMotor field in a LinearOpMode class.",
      "Retrieve the motor instance via hardwareMap.get().",
      "Read gamepad1.left_stick_y inside the OpMode loop.",
      "Call motor.setPower() with the stick value each iteration.",
      "Understand why the Y-axis value must be negated.",
    ],
    instructions: `Your task is to write a TeleOp OpMode that lets a driver control a single DC motor using the left joystick's Y-axis.

**Requirements:**
- The motor's hardware configuration name is \`"left_motor"\`.
- When the driver pushes the left stick **forward** (up), the motor should spin **forward** at full power.
- When the driver pulls the stick **backward** (down), the motor spins in reverse.
- The motor should stop (power = 0) when the stick is released to center.

**Key insight:** FTC gamepad Y-axes are inverted — pushing the stick fully forward returns **−1.0**, not +1.0. You must negate the value before passing it to setPower().`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Basic TeleOp", group = "Challenge 1")
public class BasicTeleOp extends LinearOpMode {

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Initialized — waiting for start");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.update();
        }
    }
}`,
    hints: [
      "Declare the motor as a field: `private DcMotor leftMotor;` — not inside runOpMode().",
      "Initialize with: `leftMotor = hardwareMap.get(DcMotor.class, \"left_motor\");`",
      "The Y-axis is negated because pushing forward returns a negative float in the FTC SDK. Use `double power = -gamepad1.left_stick_y;`.",
      "Call `leftMotor.setPower(power);` inside the while loop so it updates every iteration.",
      "Optionally add `leftMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);` to make the motor hold position when the stick is released.",
    ],
    conceptsCovered: [
      "LinearOpMode structure",
      "hardwareMap initialization",
      "Gamepad analog input",
      "DcMotor power control",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 2 — Encoder Basics
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 2,
    title: "Encoder Basics",
    difficulty: "Beginner",
    description:
      "Use a motor's built-in encoder to drive it to a precise target position of 500 ticks, then stop — no timers, no guessing.",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["Encoders", "Autonomous", "RUN_TO_POSITION"],
    objectives: [
      "Reset encoder ticks to zero using STOP_AND_RESET_ENCODER.",
      "Switch the motor to RUN_TO_POSITION mode.",
      "Set a target position using setTargetPosition().",
      "Monitor isBusy() to block until the motor reaches its target.",
      "Stop the motor cleanly after arriving at the target.",
    ],
    instructions: `Write an Autonomous OpMode that drives a single motor to exactly **500 encoder ticks** and then stops.

**Requirements:**
- Hardware name: \`"drive_motor"\`
- Target: \`500\` encoder ticks (approx. 5 inches for a goBILDA 19.2:1 motor)
- Use \`RUN_TO_POSITION\` mode — do **not** use a timer or manual distance calculation.
- After reaching the target, set motor power to \`0\` and print the final encoder position to telemetry.

**Encoder tick math (for reference):**
\`ticks_per_inch = (537.7 CPR × gear_ratio) / (wheel_circumference)\`
For a 19.2:1 motor with 3.78-inch wheels: ≈ 71.7 ticks/inch.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Encoder Target", group = "Challenge 2")
public class EncoderTarget extends LinearOpMode {

    private DcMotor driveMotor;

    private static final int    TARGET_TICKS = 500;
    private static final double MOTOR_POWER  = 0.6;

    @Override
    public void runOpMode() {
        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("Current Ticks", driveMotor.getCurrentPosition());
            telemetry.addData("Target Ticks", driveMotor.getTargetPosition());
            telemetry.update();
        }

        driveMotor.setPower(0);

        telemetry.addData("Final Position", driveMotor.getCurrentPosition());
        telemetry.update();
        sleep(2000);
    }
}`,
    hints: [
      "To reset: `driveMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);` — this zeroes the tick counter.",
      "To switch mode: `driveMotor.setMode(DcMotor.RunMode.RUN_TO_POSITION);` — must come AFTER resetting.",
      "Set target BEFORE setting power: `driveMotor.setTargetPosition(TARGET_TICKS);`",
      "The motor won't move until you call `driveMotor.setPower(MOTOR_POWER);` — power must be positive even if the target is behind.",
      "The busy loop condition is: `while (driveMotor.isBusy() && opModeIsActive())` — always include opModeIsActive() as a safety exit.",
    ],
    conceptsCovered: [
      "Motor RunMode states",
      "Encoder tick arithmetic",
      "RUN_TO_POSITION pattern",
      "isBusy() polling",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 3 — Autonomous Timer
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    title: "Autonomous Timer",
    difficulty: "Beginner",
    description:
      "Drive a two-motor tank-style robot forward for exactly 2 seconds using an ElapsedTime timer, then stop both motors.",
    xp: 75,
    estimatedTime: "20 min",
    tags: ["Autonomous", "ElapsedTime", "Motors"],
    objectives: [
      "Initialize two DC motors for a tank drive.",
      "Create an ElapsedTime object to track real time.",
      "Drive forward while elapsed time is under the target duration.",
      "Stop all motors when the timer expires.",
      "Understand the difference between sleep() and timer-based waits.",
    ],
    instructions: `Write an Autonomous OpMode that drives the robot forward for **exactly 2 seconds** using \`ElapsedTime\`, then stops.

**Requirements:**
- Motors: \`"left_motor"\` and \`"right_motor"\`
- Drive speed: \`0.5\` (50% power)
- Drive duration: \`2.0\` seconds
- After 2 seconds, both motors must stop (power = 0).

**Why use ElapsedTime instead of sleep()?**
Using \`sleep(2000)\` blocks the entire thread — you can't read sensors, update telemetry, or check stop conditions. \`ElapsedTime\` lets the loop keep running so the robot can react while driving.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "Timer Drive", group = "Challenge 3")
public class TimerDrive extends LinearOpMode {

    private DcMotor leftMotor;
    private DcMotor rightMotor;

    private static final double DRIVE_SPEED    = 0.5;
    private static final double DRIVE_DURATION = 2.0;

    @Override
    public void runOpMode() {
        leftMotor  = hardwareMap.get(DcMotor.class, "left_motor");
        rightMotor = hardwareMap.get(DcMotor.class, "right_motor");

        leftMotor.setDirection(DcMotorSimple.Direction.REVERSE);

        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("Elapsed", 0.0);
            telemetry.addData("Target", DRIVE_DURATION);
            telemetry.update();
        }

        leftMotor.setPower(0);
        rightMotor.setPower(0);

        telemetry.addData("Status", "Done — drove for 2 seconds");
        telemetry.update();
        sleep(2000);
    }
}`,
    hints: [
      "Import and construct: `ElapsedTime timer = new ElapsedTime();` — the timer starts counting from the moment it's created.",
      "Read elapsed time with `timer.seconds()` which returns a double (e.g. `1.743`).",
      "The while loop condition should be `timer.seconds() < DRIVE_DURATION && opModeIsActive()`.",
      "Set both motors to `DRIVE_SPEED` before the loop so the robot is already moving when the loop starts.",
      "Calling `timer.reset()` restarts it from zero — useful if you want to chain multiple timed actions.",
    ],
    conceptsCovered: [
      "ElapsedTime API",
      "Two-motor tank drive",
      "Non-blocking timed loops",
      "opModeIsActive() safety pattern",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 4 — Road Runner Trajectory
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 4,
    title: "Road Runner Trajectory",
    difficulty: "Intermediate",
    description:
      "Build a smooth, spline-based autonomous path using Road Runner 1.0's ActionBuilder — drive to a point with a curve, wait, then return home.",
    xp: 250,
    estimatedTime: "90 min",
    tags: ["Road Runner", "Splines", "Autonomous", "ActionBuilder"],
    objectives: [
      "Instantiate a MecanumDrive with a starting Pose2d.",
      "Use drive.actionBuilder() to chain movement segments.",
      "Use splineTo() for curved paths with tangent heading.",
      "Use waitSeconds() for in-sequence pauses.",
      "Execute the trajectory with Actions.runBlocking().",
    ],
    instructions: `Build a Road Runner 1.0 autonomous routine that follows a 3-segment path:

**Segment 1:** Spline from \`(0, 0, 0°)\` to \`(30, 30)\` with an end tangent of **90°** (facing up-field).

**Segment 2:** Wait **0.5 seconds** at the endpoint (simulating a mechanism action).

**Segment 3:** Drive straight back along X to \`x = 0\` using \`lineToX()\`.

**Prerequisites:** Road Runner 1.0 must be installed (see the Road Runner docs page). The \`MecanumDrive\` class and \`Actions\` class come from the RR quickstart.

**Coordinate system:** X = forward, Y = left, angles in radians (use Math.PI / 2 for 90°).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import org.firstinspires.ftc.teamcode.MecanumDrive;
import com.acmerobotics.roadrunner.Pose2d;
import com.acmerobotics.roadrunner.Vector2d;
import com.acmerobotics.roadrunner.Action;
import com.acmerobotics.roadrunner.ftc.Actions;

@Autonomous(name = "RR Spline Auto", group = "Challenge 4")
public class RRSplineAuto extends LinearOpMode {

    @Override
    public void runOpMode() throws InterruptedException {

        telemetry.addData("Status", "Initialized");
        telemetry.update();

        waitForStart();

        telemetry.addData("Status", "Trajectory complete!");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "`new Pose2d(x, y, heading)` — for the origin: `new Pose2d(0, 0, 0)`. Heading is in radians.",
      "`splineTo(new Vector2d(30, 30), Math.PI / 2)` — the second argument is the end tangent angle in radians. `Math.PI / 2` = 90°.",
      "`waitSeconds(0.5)` pauses the sequence for half a second without stopping the timer.",
      "`lineToX(0)` drives the robot in a straight line until its X coordinate equals 0 — heading stays constant.",
      "`Actions.runBlocking(trajectory)` executes the entire sequence and blocks until it's finished. Make sure you import `com.acmerobotics.roadrunner.Action` and `com.acmerobotics.roadrunner.Actions`.",
    ],
    conceptsCovered: [
      "Road Runner 1.0 ActionBuilder",
      "Pose2d coordinate system",
      "splineTo() and lineToX()",
      "Actions.runBlocking()",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 5 — Pedro Pathing Chain
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 5,
    title: "Pedro Pathing Chain",
    difficulty: "Advanced",
    description:
      "Chain three Bézier curve path segments into a continuous PathChain using Pedro Pathing's follower, with different heading interpolations on each leg.",
    xp: 350,
    estimatedTime: "2 hrs",
    tags: ["Pedro Pathing", "PathChain", "Bézier", "Autonomous"],
    objectives: [
      "Create a Pedro Pathing Follower instance and set a starting pose.",
      "Build a PathChain with pathBuilder(), chaining BezierCurve and BezierLine segments.",
      "Apply linear, constant, and tangent heading interpolations per segment.",
      "Call follower.followPath() and update the follower in the OpMode loop.",
      "Detect path completion with follower.atParametricEnd().",
    ],
    instructions: `Build a 3-segment Pedro Pathing autonomous that:

**Leg 1 (Bézier Curve):** Curve from \`(0, 0)\` to \`(24, 0)\` with control point \`(10, 15)\`. Interpolate heading linearly from **0°** to **90°**.

**Leg 2 (Bézier Line):** Straight line from \`(24, 0)\` to \`(48, 0)\`. Maintain a **constant heading** of 90°.

**Leg 3 (Bézier Curve):** Curve back to origin \`(0, 0)\` with control point \`(36, -15)\`. Interpolate heading from **90°** back to **0°**.

**Prerequisites:** Pedro Pathing Quickstart must be installed. \`Follower\`, \`PathChain\`, \`BezierCurve\`, \`BezierLine\`, \`Point\`, and \`Pose\` classes come from the Pedro library.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.follower.Follower;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.pathgen.BezierCurve;
import com.pedropathing.pathgen.BezierLine;
import com.pedropathing.pathgen.Point;
import com.pedropathing.localization.Pose;

@Autonomous(name = "Pedro Chain Auto", group = "Challenge 5")
public class PedroChainAuto extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() throws InterruptedException {

        Pose startPose = new Pose(0, 0, 0);

        telemetry.addData("Status", "Path built, waiting for start");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.addData("Path Segment", 0);
            telemetry.addData("t value", 0.0);
            telemetry.addData("At End", false);
            telemetry.update();

        }

        telemetry.addData("Status", "Chain complete!");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "`new Follower(hardwareMap)` — the constructor automatically reads constants from `RobotConstants.java`. Make sure those are configured first.",
      "For Leg 1 start: `new Point(0, 0, Point.CARTESIAN)`, control: `new Point(10, 15, Point.CARTESIAN)`, end: `new Point(24, 0, Point.CARTESIAN)`.",
      "`setLinearHeadingInterpolation(startHeading, endHeading)` — pass raw radian values. `0` = 0°, `Math.PI / 2` = 90°.",
      "`setConstantHeadingInterpolation(heading)` keeps the robot at a fixed angle for the entire segment.",
      "`follower.atParametricEnd()` returns true when the follower reaches the very end of the last path in the chain — use `if (follower.atParametricEnd()) break;` inside the loop.",
    ],
    conceptsCovered: [
      "Pedro Pathing Follower",
      "BezierCurve & BezierLine",
      "PathChain builder API",
      "Heading interpolation strategies",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 6 — Dual Motor TeleOp
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 6,
    title: "Dual Motor TeleOp",
    difficulty: "Beginner",
    description:
      "Control two drive motors independently — left stick Y drives the left motor, right stick Y drives the right — with BRAKE mode to stop the robot instantly.",
    xp: 75,
    estimatedTime: "20 min",
    tags: ["TeleOp", "Motors", "Gamepad", "Tank Drive"],
    objectives: [
      "Declare leftDrive and rightDrive DcMotor fields.",
      "Initialize both motors from hardwareMap.",
      "Reverse leftDrive so both sides produce forward motion.",
      "Set BRAKE zero-power behavior on both motors.",
      "Read and negate both joystick Y values each loop.",
      "Apply powers to both motors every iteration.",
    ],
    instructions: `Build a TeleOp with tank-style control: the left joystick Y-axis drives the left motor and the right joystick Y-axis drives the right motor.

**Why reverse one side?** Both drive motors are mounted facing opposite directions on the chassis. Sending +1.0 to both in code makes one push the robot forward and the other push backward. Reversing \`leftDrive\`'s direction fixes this so pushing both sticks forward moves the whole robot forward.

**Requirements:**
- Hardware names: \`"left_drive"\` and \`"right_drive"\`
- Use \`ZeroPowerBehavior.BRAKE\` on both motors — the robot stops cleanly when sticks return to center instead of coasting.
- Always negate both Y-axis values: pushing the stick fully forward returns **−1.0** in the FTC SDK.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "Dual Motor TeleOp", group = "Challenge 6")
public class DualMotorTeleOp extends LinearOpMode {

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Ready — use both sticks");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            double leftPower  = 0;
            double rightPower = 0;

            telemetry.addData("Left  Power", leftPower);
            telemetry.addData("Right Power", rightPower);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Declare motors as class fields above `runOpMode()` so both methods share the same reference.",
      "Use `leftDrive.setDirection(DcMotorSimple.Direction.REVERSE)` after initialization — this flips forward without changing any other logic.",
      "Full loop body: `double leftPower = -gamepad1.left_stick_y; leftDrive.setPower(leftPower);` — then repeat for right side with `right_stick_y` and `rightDrive`.",
    ],
    conceptsCovered: [
      "Dual-motor tank drive",
      "Motor direction reversal",
      "ZeroPowerBehavior.BRAKE",
      "Dual joystick axis mapping",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 7 — Servo Position Control
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 7,
    title: "Servo Position Control",
    difficulty: "Beginner",
    description:
      "Move a servo to three preset positions using gamepad buttons: A opens it (0.0), B closes it (1.0), and X moves it to the midpoint (0.5).",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["TeleOp", "Servo", "Gamepad"],
    objectives: [
      "Declare a Servo field named blockerServo.",
      "Initialize blockerServo from hardwareMap.",
      "Map the A button to position 0.0 (open).",
      "Map the B button to position 1.0 (closed).",
      "Map the X button to position 0.5 (midpoint).",
      "Display the current servo position in telemetry.",
    ],
    instructions: `Write a TeleOp that controls a single servo using three gamepad buttons. Servos in the FTC SDK accept positions from **0.0** (one extreme) to **1.0** (the other extreme), with 0.5 representing the mechanical midpoint.

**Requirements:**
- Hardware name: \`"blocker_servo"\`
- **A button** → position \`0.0\` (fully open)
- **B button** → position \`1.0\` (fully closed)
- **X button** → position \`0.5\` (midpoint / neutral)
- Display the servo's current position each loop using \`servo.getPosition()\`.

**Key behaviour:** Unlike motors, you don't need to call \`setPosition()\` every loop iteration — the servo holds the last commanded position. Only call it again when a button is pressed to change position.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Servo Control", group = "Challenge 7")
public class ServoControl extends LinearOpMode {

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "A=open  B=close  X=mid");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.a) {
            }

            if (gamepad1.b) {
            }

            if (gamepad1.x) {
            }

            telemetry.addData("Position", 0.0);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Retrieve the servo with `blockerServo = hardwareMap.get(Servo.class, \"blocker_servo\");`",
      "Call `blockerServo.setPosition(0.0)` for open, `setPosition(1.0)` for closed, `setPosition(0.5)` for mid.",
      "Read back the position with `blockerServo.getPosition()` — this returns the last value you set, not a physical sensor reading.",
    ],
    conceptsCovered: [
      "Servo position range (0.0–1.0)",
      "setPosition() and getPosition()",
      "Button-driven servo control",
      "hardwareMap.get() for servos",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 8 — CRServo Intake
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 8,
    title: "CRServo Intake",
    difficulty: "Beginner",
    description:
      "Drive a continuous-rotation servo as a variable-speed intake: right trigger sets forward power, left trigger reverses, and releasing both stops the motor.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["TeleOp", "CRServo", "Intake", "Trigger"],
    objectives: [
      "Declare a CRServo field named intakeServo.",
      "Initialize intakeServo from hardwareMap.",
      "Map the right trigger to forward intake power (0.0 to 1.0).",
      "Map the left trigger to reverse power (negate the trigger value).",
      "Stop the CRServo when neither trigger is pressed.",
      "Display the intake power in telemetry.",
    ],
    instructions: `A **CRServo** (Continuous Rotation Servo) works like a motor but uses the \`Servo\` API. Instead of \`setPower()\`, you call \`setPower()\` with values from **-1.0** (full reverse) to **+1.0** (full forward). Setting 0.0 stops it.

**Requirements:**
- Hardware name: \`"intake_servo"\`
- **Right trigger** → forward power equal to \`gamepad1.right_trigger\` (range 0.0–1.0 automatically)
- **Left trigger** → reverse power (negate the trigger value)
- When **neither trigger** is pressed, set power to \`0.0\`
- Print the current power to telemetry each loop.

**Priority rule:** if both triggers are pressed simultaneously, the right trigger takes priority (handle right trigger first in your if-else chain).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.CRServo;

@TeleOp(name = "CRServo Intake", group = "Challenge 8")
public class CRServoIntake extends LinearOpMode {

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "RT=intake  LT=reverse");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            double intakePower = 0.0;

            telemetry.addData("Intake Power", intakePower);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Retrieve with `intakeServo = hardwareMap.get(CRServo.class, \"intake_servo\");` — note `CRServo.class`, not `Servo.class`.",
      "Trigger values are floats from 0.0 to 1.0. Use `if (gamepad1.right_trigger > 0.05) { intakePower = gamepad1.right_trigger; }` to ignore stick drift.",
      "For reverse, use `intakePower = -gamepad1.left_trigger;` — negating the trigger value gives you a negative power (reverse direction).",
    ],
    conceptsCovered: [
      "CRServo vs Servo",
      "Analog trigger input",
      "Variable power control",
      "Deadband filtering",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 9 — Telemetry Dashboard
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 9,
    title: "Telemetry Dashboard",
    difficulty: "Beginner",
    description:
      "Build a well-formatted Driver Station display showing loop count, elapsed time, motor power, encoder position, and a status string — organized with section headers.",
    xp: 75,
    estimatedTime: "20 min",
    tags: ["Telemetry", "TeleOp", "Debugging"],
    objectives: [
      "Create and reset an ElapsedTime to track total runtime.",
      "Track a loop counter variable that increments each iteration.",
      "Read a motor encoder position with getCurrentPosition().",
      "Use telemetry.addLine() for section headers.",
      "Display all five data points: loop count, elapsed time, motor power, encoder position, and status.",
      "Call telemetry.update() exactly once per loop iteration.",
    ],
    instructions: `A good telemetry dashboard is essential for tuning and debugging FTC robots. This challenge teaches you to display structured data on the Driver Station during a TeleOp run.

**Required display sections:**
\`\`\`
RUNTIME
  Loop Count : 142
  Elapsed    : 3.47 s

MOTOR
  Power    : 0.65
  Encoder  : 1234 ticks

STATUS
  Running
\`\`\`

Use \`telemetry.addLine("RUNTIME")\` for the section headers and \`telemetry.addData("Key", value)\` for each data row. Call \`telemetry.update()\` **exactly once** at the end of every loop cycle — calling it multiple times causes flickering on the Driver Station screen.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@TeleOp(name = "Telemetry Dashboard", group = "Challenge 9")
public class TelemetryDashboard extends LinearOpMode {

    private DcMotor driveMotor;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        waitForStart();

        while (opModeIsActive()) {

            double motorPower = -gamepad1.left_stick_y;
            driveMotor.setPower(motorPower);

        }
    }
}`,
    hints: [
      "Use `telemetry.addLine(\"RUNTIME\");` for a blank-label header — `addLine()` takes a string and adds it as its own line.",
      "`telemetry.addData(\"Elapsed\", timer.seconds());` — the second argument is the value, which telemetry auto-converts to a string.",
      "Put all `addLine()` / `addData()` calls before a single `telemetry.update()` at the bottom of the loop — the driver station receives the whole packet at once.",
    ],
    conceptsCovered: [
      "telemetry.addLine() vs addData()",
      "ElapsedTime for runtime tracking",
      "Loop counter pattern",
      "Driver Station display layout",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 10 — Button Debouncing
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 10,
    title: "Button Debouncing",
    difficulty: "Beginner",
    description:
      "Toggle an intake on/off with a single button press using rising-edge detection — without debouncing, the toggle fires hundreds of times per second.",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["TeleOp", "Debouncing", "State Toggle", "Gamepad"],
    objectives: [
      "Declare a boolean lastAButton to track the previous button state.",
      "Declare a boolean intakeRunning to hold the current toggle state.",
      "Detect a rising edge: button is pressed now AND was not pressed last iteration.",
      "Flip intakeRunning only on the rising edge.",
      "Update lastAButton at the end of each loop iteration.",
      "Drive a CRServo at full power when intakeRunning is true, zero otherwise.",
    ],
    instructions: `Without debouncing, \`gamepad1.a\` returns \`true\` for every loop iteration while the button is held. A 100 Hz loop fires the toggle ~10 times per second of button press — the intake turns on and off so fast it appears broken.

**Rising-edge detection** fixes this: you only act when the button transitions from \`false\` → \`true\`. Store the button's state from the previous loop tick in \`lastAButton\`, then check:

\`\`\`java
if (gamepad1.a && !lastAButton) {
    // Button was just pressed this tick — fire the toggle once
    intakeRunning = !intakeRunning;
}
lastAButton = gamepad1.a; // update for next tick
\`\`\`

**Requirements:**
- Hardware name: \`"intake_servo"\` (CRServo)
- Toggle starts OFF (\`intakeRunning = false\`)
- When ON: run intake at power \`1.0\`
- When OFF: stop intake at power \`0.0\``,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.CRServo;

@TeleOp(name = "Button Debounce", group = "Challenge 10")
public class ButtonDebounce extends LinearOpMode {

    private CRServo intakeServo;

    @Override
    public void runOpMode() {

        intakeServo = hardwareMap.get(CRServo.class, "intake_servo");

        telemetry.addData("Status", "Press A to toggle intake");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.addData("Intake Running", false);
            telemetry.addData("A Button", gamepad1.a);
            telemetry.update();
        }
    }
}`,
    hints: [
      "The rising edge condition is: `gamepad1.a && !lastAButton` — the button is currently down AND was up on the previous tick.",
      "Toggle: `intakeRunning = !intakeRunning;` — the `!` operator flips a boolean.",
      "CRITICAL: update `lastAButton = gamepad1.a;` at the END of the loop body, AFTER you check for the rising edge, so next iteration gets this tick's state.",
    ],
    conceptsCovered: [
      "Rising-edge detection",
      "Boolean state toggle",
      "Debouncing pattern",
      "Loop-to-loop state tracking",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 11 — ElapsedTime Patterns
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 11,
    title: "ElapsedTime Patterns",
    difficulty: "Beginner",
    description:
      "Write an autonomous that waits 1 second, drives a motor for 500 ms, then stops — all using ElapsedTime instead of Thread.sleep().",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["Autonomous", "ElapsedTime", "Non-blocking", "Timing"],
    objectives: [
      "Create an ElapsedTime object and reset it at the start.",
      "Implement a blocking wait using a while loop and timer.seconds().",
      "Reset the timer to chain a second timed segment.",
      "Drive a motor for exactly 500 ms using a second timed loop.",
      "Stop the motor and display the final elapsed time.",
    ],
    instructions: `\`Thread.sleep()\` freezes the entire OpMode thread — you can't check sensors, update telemetry, or respond to a stop request during a sleep. **ElapsedTime** keeps the loop running while you wait.

**Pattern for a timed wait:**
\`\`\`java
ElapsedTime timer = new ElapsedTime();
timer.reset(); // start counting
while (timer.seconds() < 1.0 && opModeIsActive()) {
    // loop runs for 1 second, updating telemetry each tick
    telemetry.addData("Waiting", timer.seconds());
    telemetry.update();
}
\`\`\`

**Your autonomous sequence:**
1. Wait **1.0 second** (motor off, display countdown)
2. Reset timer, drive motor at **0.6 power** for **0.5 seconds**
3. Stop motor, display "Done"

The \`opModeIsActive()\` guard in every while condition lets the referee stop the robot instantly during any timed segment.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "ElapsedTime Demo", group = "Challenge 11")
public class ElapsedTimeDemo extends LinearOpMode {

    private DcMotor driveMotor;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("Waiting", 0.0);
            telemetry.update();
        }

        driveMotor.setPower(0);
        while (opModeIsActive()) {
            telemetry.addData("Driving", 0.0);
            telemetry.update();
        }

        driveMotor.setPower(0);
        telemetry.addData("Status", "Done");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "Create and reset: `ElapsedTime timer = new ElapsedTime(); timer.reset();` — the reset is important if you declare the timer before `waitForStart()` (startup takes time).",
      "Wait loop: `while (timer.seconds() < 1.0 && opModeIsActive()) { ... }` — the loop exits automatically when 1 second passes or when Stop is pressed.",
      "After the wait loop, call `timer.reset()` to start a fresh 0.5 s window for the drive segment. Then `driveMotor.setPower(0.6)` BEFORE the second while loop.",
    ],
    conceptsCovered: [
      "ElapsedTime reset pattern",
      "Chained timed segments",
      "Non-blocking waits",
      "opModeIsActive() safety guard",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 12 — Motor Zero Power Behavior
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 12,
    title: "Motor Zero Power Behavior",
    difficulty: "Beginner",
    description:
      "Toggle a motor between BRAKE and FLOAT zero-power behavior with the X button and observe how stopping distance changes for each mode.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["TeleOp", "Motors", "ZeroPowerBehavior", "BRAKE", "FLOAT"],
    objectives: [
      "Declare and initialize a DcMotor from hardwareMap.",
      "Declare a boolean to track the current behavior mode.",
      "Detect a rising edge on the X button.",
      "Toggle between ZeroPowerBehavior.BRAKE and ZeroPowerBehavior.FLOAT.",
      "Reapply setZeroPowerBehavior() every time the mode changes.",
      "Display the current mode in telemetry.",
    ],
    instructions: `**BRAKE** mode shorts the motor terminals together when power is 0, creating magnetic resistance that rapidly decelerates the motor shaft. **FLOAT** mode disconnects the terminals, letting the motor spin freely to a stop under friction alone.

For competition robots, BRAKE is almost always preferred — it keeps the robot from rolling when joysticks are released and makes positioning far more repeatable. FLOAT is occasionally useful for mechanisms that need to rotate freely (e.g., a passive arm).

**Requirements:**
- Hardware name: \`"drive_motor"\`
- Left stick Y controls the motor power
- **X button** (debounced) toggles between BRAKE and FLOAT
- Display the current mode and current motor power in telemetry
- Start in BRAKE mode`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Zero Power Behavior", group = "Challenge 12")
public class ZeroPowerBehaviorDemo extends LinearOpMode {

    private DcMotor driveMotor;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        boolean brakeMode   = true;
        boolean lastXButton = false;

        telemetry.addData("Mode", "BRAKE (X to toggle)");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            double power = -gamepad1.left_stick_y;
            driveMotor.setPower(power);

            telemetry.addData("Mode", brakeMode ? "BRAKE" : "FLOAT");
            telemetry.addData("Power", power);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Set behavior with `driveMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);` after initialization.",
      "Use a ternary in the toggle: `driveMotor.setZeroPowerBehavior(brakeMode ? DcMotor.ZeroPowerBehavior.BRAKE : DcMotor.ZeroPowerBehavior.FLOAT);`",
      "You must call `setZeroPowerBehavior()` every time you switch — it's not enough to track the boolean; you have to push the new value to the hardware.",
    ],
    conceptsCovered: [
      "ZeroPowerBehavior.BRAKE vs FLOAT",
      "Dynamic hardware configuration",
      "Rising-edge toggle",
      "Motor stopping characteristics",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 13 — Init-Loop Configuration
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 13,
    title: "Init-Loop Configuration",
    difficulty: "Beginner",
    description:
      "Use the init loop (before waitForStart) to let the driver choose RED or BLUE alliance with gamepad buttons, displaying the selection live on the Driver Station.",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["Autonomous", "Init Loop", "Alliance Selection", "Configuration"],
    objectives: [
      "Declare a boolean isRedAlliance starting as true.",
      "Write a while(!isStarted() && !isStopRequested()) init loop.",
      "Set isRedAlliance = true when B is pressed (RED).",
      "Set isRedAlliance = false when X is pressed (BLUE).",
      "Display alliance selection and target AprilTag ID in telemetry.",
      "Use the selection after waitForStart() to branch autonomous behavior.",
    ],
    instructions: `Before a match, the drive team configures the robot for the correct alliance. This is done in the **init loop** — a while loop that runs after \`opModeInit()\` but before the driver presses Start.

**Init loop pattern:**
\`\`\`java
while (!isStarted() && !isStopRequested()) {
    // read gamepad, update telemetry
}
\`\`\`
This loop runs continuously, showing live feedback on the Driver Station, until the driver presses Start (or Stop).

**Requirements:**
- B button → RED alliance (\`isRedAlliance = true\`)
- X button → BLUE alliance (\`isRedAlliance = false\`)
- Display: alliance name (RED/BLUE), target AprilTag ID (RED=24, BLUE=20)
- After \`waitForStart()\`, log the selected alliance to telemetry and stop`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "Alliance Select", group = "Challenge 13")
public class AllianceSelect extends LinearOpMode {

    @Override
    public void runOpMode() {

        waitForStart();

        telemetry.addData("Running as", "TBD");
        telemetry.update();
        sleep(2000);
    }
}`,
    hints: [
      "The init loop condition is `while (!isStarted() && !isStopRequested())` — `isStarted()` becomes true the instant the driver presses START.",
      "Read buttons inside the loop: `if (gamepad1.b) isRedAlliance = true; else if (gamepad1.x) isRedAlliance = false;`",
      "Call `telemetry.update()` inside the init loop so the Driver Station refreshes as the driver toggles the selection.",
    ],
    conceptsCovered: [
      "Init loop pattern",
      "Pre-match configuration",
      "isStarted() and isStopRequested()",
      "Alliance-based autonomous branching",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 14 — Encoder-Based Drive Distance
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 14,
    title: "Encoder-Based Drive Distance",
    difficulty: "Beginner",
    description:
      "Drive a motor to exactly 1000 encoder ticks using RUN_TO_POSITION mode, then switch back to RUN_USING_ENCODER and display the final position.",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["Autonomous", "Encoders", "RUN_TO_POSITION", "RUN_USING_ENCODER"],
    objectives: [
      "Reset the encoder with STOP_AND_RESET_ENCODER.",
      "Set target position to 1000 ticks with setTargetPosition().",
      "Switch to RUN_TO_POSITION mode.",
      "Apply motor power to start movement.",
      "Wait in a loop until isBusy() returns false.",
      "Stop the motor and switch back to RUN_USING_ENCODER mode.",
    ],
    instructions: `\`RUN_TO_POSITION\` is the FTC SDK's built-in closed-loop position controller. You give it a target tick count and a power level, and the motor's internal PID drives it there automatically. Your job is to set up the sequence correctly.

**The sequence order matters:**
1. \`STOP_AND_RESET_ENCODER\` — zero the counter
2. \`setTargetPosition(1000)\` — set destination
3. \`RUN_TO_POSITION\` — enable closed-loop
4. \`setPower(0.6)\` — motor won't move without power
5. Wait: \`while (motor.isBusy() && opModeIsActive())\`
6. \`setPower(0)\` — cut power at destination
7. \`RUN_USING_ENCODER\` — return to velocity-feedback mode

**Why switch back to RUN_USING_ENCODER?** Leaving the motor in RUN_TO_POSITION after arrival makes it fight any external load applied to the shaft. Switching to RUN_USING_ENCODER releases that hold.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Encoder Distance", group = "Challenge 14")
public class EncoderDistance extends LinearOpMode {

    private DcMotor driveMotor;
    private static final int    TARGET_TICKS = 1000;
    private static final double MOTOR_POWER  = 0.6;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        telemetry.addData("Status", "Waiting for START");
        telemetry.update();

        waitForStart();

        driveMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

        while (opModeIsActive()) {
            telemetry.addData("Current", driveMotor.getCurrentPosition());
            telemetry.addData("Target", TARGET_TICKS);
            telemetry.update();
        }

        driveMotor.setPower(0);

        telemetry.addData("Final Position", driveMotor.getCurrentPosition());
        telemetry.update();
        sleep(2000);
    }
}`,
    hints: [
      "The full setup sequence: `STOP_AND_RESET_ENCODER` → `setTargetPosition(TARGET_TICKS)` → `RUN_TO_POSITION` → `setPower(MOTOR_POWER)`.",
      "Busy-wait condition: `while (driveMotor.isBusy() && opModeIsActive())` — `isBusy()` returns false when the motor is within a few ticks of the target.",
      "After the loop: `driveMotor.setPower(0)` then `driveMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER)` to release position hold.",
    ],
    conceptsCovered: [
      "RUN_TO_POSITION closed-loop control",
      "RunMode state transitions",
      "isBusy() polling",
      "Encoder tick math",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 15 — Bulk Cache Reads
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 15,
    title: "Bulk Cache Reads",
    difficulty: "Intermediate",
    description:
      "Enable MANUAL bulk caching on all REV hubs, clear the cache once per loop, and measure the improvement in loop frequency — a critical optimization for high-speed control loops.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Optimization", "Bulk Cache", "LynxModule", "Loop Hz", "TeleOp"],
    objectives: [
      "Get a list of all LynxModule hubs from hardwareMap.",
      "Set each hub's bulk caching mode to BulkCachingMode.MANUAL.",
      "Call clearBulkCache() on each hub once at the top of the loop.",
      "Measure loop frequency using an ElapsedTime counter.",
      "Display the measured Hz in telemetry alongside encoder and motor data.",
    ],
    instructions: `Every time you call \`motor.getCurrentPosition()\` or \`motor.getVelocity()\`, the SDK sends an I²C command to the Control Hub and waits for a reply. In AUTO mode, the SDK caches the result — but only for that exact call. **MANUAL mode** lets you read the entire hub's sensor state in one round trip by calling \`clearBulkCache()\` once per loop.

Without bulk reads, a loop with 4 motors + 2 sensors might fire 8+ I²C transactions per tick, capping loop rate around 50–80 Hz. With MANUAL bulk reads, all those reads share a single transaction, pushing loop rate above 250 Hz.

**Pattern:**
\`\`\`java
List<LynxModule> hubs = hardwareMap.getAll(LynxModule.class);
for (LynxModule hub : hubs) hub.setBulkCachingMode(LynxModule.BulkCachingMode.MANUAL);

// Inside loop:
for (LynxModule hub : hubs) hub.clearBulkCache(); // ONE transaction for all reads
\`\`\`

**Requirements:** Display loop Hz in telemetry. Motor power controlled by left stick Y as usual.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;
import com.qualcomm.hardware.lynx.LynxModule;
import java.util.List;

@TeleOp(name = "Bulk Cache Demo", group = "Challenge 15")
public class BulkCacheDemo extends LinearOpMode {

    private DcMotor driveMotor;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        ElapsedTime loopTimer  = new ElapsedTime();
        int   loopsThisSecond  = 0;
        double loopsPerSecond  = 0;

        waitForStart();
        loopTimer.reset();

        while (opModeIsActive()) {

            double power   = -gamepad1.left_stick_y;
            int    encoder = driveMotor.getCurrentPosition();
            driveMotor.setPower(power);

            loopsThisSecond++;
            if (loopTimer.seconds() >= 1.0) {
                loopsPerSecond   = loopsThisSecond / loopTimer.seconds();
                loopsThisSecond  = 0;
                loopTimer.reset();
            }

            telemetry.addData("Loop Hz", loopsPerSecond);
            telemetry.addData("Encoder", encoder);
            telemetry.addData("Power", power);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Import: `import com.qualcomm.hardware.lynx.LynxModule;` and `import java.util.List;`",
      "`hardwareMap.getAll(LynxModule.class)` returns a `List<LynxModule>` containing every connected REV hub (Control Hub + Expansion Hub if present).",
      "Place `hub.clearBulkCache()` as the very first line inside the while loop — before any `getCurrentPosition()`, `getVelocity()`, or sensor reads.",
    ],
    conceptsCovered: [
      "I²C bulk reads",
      "BulkCachingMode.MANUAL",
      "LynxModule API",
      "Loop frequency optimization",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 16 — REV Touch Sensor Homing
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 16,
    title: "REV Touch Sensor Homing",
    difficulty: "Beginner",
    description:
      "Drive a motor slowly toward its mechanical limit until a Touch Sensor is pressed, then stop and reset the encoder to zero — the same pattern used for turret zeroing.",
    xp: 100,
    estimatedTime: "25 min",
    tags: ["Autonomous", "TouchSensor", "Homing", "Encoder Reset"],
    objectives: [
      "Declare and initialize a DcMotor and a TouchSensor from hardwareMap.",
      "Apply a slow negative power to drive the motor toward the limit.",
      "Loop until touchSensor.isPressed() returns true.",
      "Stop the motor immediately when the sensor triggers.",
      "Reset the encoder to zero with STOP_AND_RESET_ENCODER.",
      "Switch the motor back to RUN_USING_ENCODER.",
    ],
    instructions: `Homing (also called zeroing) is the process of finding a mechanism's known physical reference point and setting the encoder to zero there. This gives all future encoder-based moves an accurate starting reference.

**The homing sequence:**
1. Drive the motor slowly toward the limit switch (usually negative power)
2. Wait in a loop until \`touchSensor.isPressed()\`
3. **Immediately** stop the motor (\`setPower(0)\`)
4. Reset encoder: \`STOP_AND_RESET_ENCODER\`
5. Switch to \`RUN_USING_ENCODER\` for subsequent moves

**Key detail:** Use a slow homing speed (≤ 0.2 power) to reduce impact when the mechanism hits the switch. Too fast and the mechanism may bounce off or damage the switch.

**Hardware names:** motor = \`"turret_motor"\`, sensor = \`"touch_sensor"\``,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.TouchSensor;

@Autonomous(name = "Touch Sensor Homing", group = "Challenge 16")
public class TouchSensorHoming extends LinearOpMode {

    private DcMotor  turretMotor;
    private TouchSensor touchSensor;

    private static final double HOMING_POWER = -0.2;

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Press START to home turret");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("Sensor", touchSensor.isPressed() ? "PRESSED" : "open");
            telemetry.addData("Encoder", turretMotor.getCurrentPosition());
            telemetry.update();

            if (false) break;
        }

        turretMotor.setPower(0);

        turretMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

        turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        telemetry.addData("Homing", "Complete — encoder zeroed");
        telemetry.addData("Final Encoder", turretMotor.getCurrentPosition());
        telemetry.update();
        sleep(2000);
    }
}`,
    hints: [
      "Retrieve sensor: `touchSensor = hardwareMap.get(TouchSensor.class, \"touch_sensor\");`",
      "Start the motor BEFORE the loop: `turretMotor.setPower(HOMING_POWER);` — then the loop's only job is to watch for the sensor.",
      "Break condition: `if (touchSensor.isPressed()) break;` inside the loop — then immediately `turretMotor.setPower(0)` after the loop exits.",
    ],
    conceptsCovered: [
      "Touch sensor / limit switch",
      "Homing / zeroing pattern",
      "Encoder reset sequence",
      "Mechanical reference point",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 17 — Basic 4-Motor Mecanum
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 17,
    title: "Basic 4-Motor Mecanum",
    difficulty: "Beginner",
    description:
      "Wire up all four mecanum wheels, apply the standard wheel-vector formula, and normalize output so no wheel exceeds 1.0 — the foundation of every FTC mecanum drive.",
    xp: 100,
    estimatedTime: "30 min",
    tags: ["TeleOp", "Mecanum Drive", "4 Motors", "Normalization"],
    objectives: [
      "Declare and initialize frontLeft, frontRight, backLeft, backRight motors.",
      "Reverse the left-side motors to account for mirrored mounting.",
      "Read drive, strafe, and rotate from the gamepad and negate Y.",
      "Apply the mecanum power formula to each wheel.",
      "Normalize the four powers so the max is exactly 1.0.",
      "Display all four wheel powers in telemetry.",
    ],
    instructions: `Mecanum wheels have rollers angled at 45° so each wheel produces force both forward and sideways. The four-wheel vector sum lets the robot move in any direction. The standard power formula is:

\`\`\`
frontLeft  = drive + strafe + rotate
frontRight = drive - strafe - rotate
backLeft   = drive - strafe + rotate
backRight  = drive + strafe - rotate
\`\`\`

**Normalization:** When two axes are maxed simultaneously (e.g., full forward + full strafe), raw powers can exceed 1.0. Normalize by finding the largest absolute value and dividing all four by it — but **only if the maximum is greater than 1.0** to avoid reducing full-speed straight driving.

**Hardware names:** \`"front_left"\`, \`"front_right"\`, \`"back_left"\`, \`"back_right"\`
**Reverse:** frontLeft and backLeft (left side is mirrored).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import org.firstinspires.ftc.teamcode.MecanumDrive;

@TeleOp(name = "Mecanum Drive", group = "Challenge 17")
public class MecanumDrive extends LinearOpMode {

    @Override
    public void runOpMode() {

        waitForStart();

        while (opModeIsActive()) {

            double drive   = -gamepad1.left_stick_y;
            double strafe  =  gamepad1.left_stick_x;
            double rotate  = -gamepad1.right_stick_x;

            double fl = drive + strafe + rotate;
            double fr = 0;
            double bl = 0;
            double br = 0;

            double max = Math.max(Math.abs(fl),
                         Math.max(Math.abs(fr),
                         Math.max(Math.abs(bl), Math.abs(br))));
            if (max > 1.0) {
            }

            telemetry.addData("FL", fl); telemetry.addData("FR", fr);
            telemetry.addData("BL", bl); telemetry.addData("BR", br);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Formulas: `fr = drive - strafe - rotate`, `bl = drive - strafe + rotate`, `br = drive + strafe - rotate`.",
      "Normalization: `if (max > 1.0) { fl /= max; fr /= max; bl /= max; br /= max; }`",
      "Apply powers after normalization: `frontLeft.setPower(fl); frontRight.setPower(fr); backLeft.setPower(bl); backRight.setPower(br);`",
    ],
    conceptsCovered: [
      "Mecanum wheel kinematics",
      "Drive/strafe/rotate decomposition",
      "Power normalization",
      "Motor direction reversal for mirrored mounting",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 18 — Mecanum Power Normalization
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 18,
    title: "Mecanum Power Normalization",
    difficulty: "Intermediate",
    description:
      "Implement a standalone normalize() helper that scales four wheel powers down only if the maximum exceeds 1.0, preserving the ratio between all four values.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["Mecanum Drive", "Math", "Helper Method", "Normalization"],
    objectives: [
      "Write a private double[] normalize(double fl, double fr, double bl, double br) method.",
      "Find the maximum absolute value among the four inputs.",
      "Divide all four values by the maximum only when max > 1.0.",
      "Return the four scaled values as a double array.",
      "Call the helper from the main loop and apply the results.",
    ],
    instructions: `Raw mecanum powers can exceed the ±1.0 motor range when the driver combines axes. If you just clamp each wheel independently with \`Math.max(-1, Math.min(1, power))\`, you change the ratio between wheels and the robot curves instead of driving straight.

**The correct fix is normalization:** find the largest absolute wheel power, then divide all four by it. This scales the entire set down uniformly so the robot tracks the intended direction.

\`\`\`java
private double[] normalize(double fl, double fr, double bl, double br) {
    double max = Math.max(Math.abs(fl), Math.max(Math.abs(fr),
                 Math.max(Math.abs(bl), Math.abs(br))));
    if (max > 1.0) {
        fl /= max; fr /= max; bl /= max; br /= max;
    }
    return new double[]{fl, fr, bl, br};
}
\`\`\`

Implement this helper and verify it in telemetry by printing the raw and normalized values for a diagonal-strafing command.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "Normalize Demo", group = "Challenge 18")
public class NormalizeDemo extends LinearOpMode {

    private DcMotor frontLeft, frontRight, backLeft, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        waitForStart();

        while (opModeIsActive()) {
            double drive  = -gamepad1.left_stick_y;
            double strafe =  gamepad1.left_stick_x;
            double rotate = -gamepad1.right_stick_x;

            double rawFL = drive + strafe + rotate;
            double rawFR = drive - strafe - rotate;
            double rawBL = drive - strafe + rotate;
            double rawBR = drive + strafe - rotate;

            double[] norm = normalize(rawFL, rawFR, rawBL, rawBR);
            frontLeft.setPower(norm[0]);
            frontRight.setPower(norm[1]);
            backLeft.setPower(norm[2]);
            backRight.setPower(norm[3]);

            telemetry.addData("Raw  FL/FR", "%.2f / %.2f", rawFL, rawFR);
            telemetry.addData("Norm FL/FR", "%.2f / %.2f", norm[0], norm[1]);
            telemetry.update();
        }
    }

    private double[] normalize(double fl, double fr, double bl, double br) {
        return new double[]{fl, fr, bl, br};
    }
}`,
    hints: [
      "`Math.max(a, Math.max(b, Math.max(c, d)))` chains three calls to find the maximum of four values.",
      "The scaling guard: `if (max > 1.0) { fl /= max; fr /= max; bl /= max; br /= max; }` — skip the division when max ≤ 1.0 to avoid slowing down low-speed commands.",
      "Return the result as a `double[]` array: `return new double[]{fl, fr, bl, br};` — caller unpacks with `norm[0]`, `norm[1]`, etc.",
    ],
    conceptsCovered: [
      "Power normalization algorithm",
      "Preserving drive vector ratios",
      "Helper method pattern",
      "double[] return type",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 19 — Field-Relative Mecanum
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 19,
    title: "Field-Relative Mecanum",
    difficulty: "Intermediate",
    description:
      "Rotate the driver's joystick vector by the robot's current heading before computing mecanum powers, so pushing 'forward' always moves the robot toward the far wall regardless of its orientation.",
    xp: 150,
    estimatedTime: "40 min",
    tags: ["Mecanum Drive", "Field-Relative", "IMU", "Rotation Matrix"],
    objectives: [
      "Read the robot heading in radians from a simulated heading variable.",
      "Apply a 2D rotation matrix to the drive and strafe inputs.",
      "Use the rotated drive/strafe values in the mecanum formula.",
      "Normalize the output and apply to all four motors.",
      "Display both raw and rotated drive vectors in telemetry.",
    ],
    instructions: `**Robot-relative** mecanum means "forward" is always the front of the robot. **Field-relative** means "forward" is always toward the far field wall, regardless of which way the robot is facing. This is dramatically easier to drive.

**2D rotation matrix:** To rotate a vector (drive, strafe) by heading angle θ:
\`\`\`java
double rotDrive  = drive  * Math.cos(-heading) - strafe * Math.sin(-heading);
double rotStrafe = drive  * Math.sin(-heading) + strafe * Math.cos(-heading);
\`\`\`
Use the **negative** heading to un-rotate the driver's input back to field coordinates. This is identical to what the team's \`mecanumDriveWithBraking()\` does internally.

For this challenge, simulate the heading with a running variable that you update with the right stick X (pretend it's an IMU — add \`rotate * 0.01\` to the heading each loop). In a real robot you'd read \`imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.RADIANS)\`.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.hardware.IMU;

@TeleOp(name = "Field Relative Drive", group = "Challenge 19")
public class FieldRelativeDrive extends LinearOpMode {

    private DcMotor frontLeft, frontRight, backLeft, backRight;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);

        double simulatedHeading = 0.0;

        waitForStart();

        while (opModeIsActive()) {

            double drive  = -gamepad1.left_stick_y;
            double strafe =  gamepad1.left_stick_x;
            double rotate = -gamepad1.right_stick_x;

            simulatedHeading += rotate * 0.01;

            double rotDrive  = drive;
            double rotStrafe = strafe;

            double fl = rotDrive + rotStrafe + rotate;
            double fr = 0;
            double bl = 0;
            double br = 0;

            double max = Math.max(Math.abs(fl),Math.max(Math.abs(fr),Math.max(Math.abs(bl),Math.abs(br))));
            if (max > 1.0) { fl/=max; fr/=max; bl/=max; br/=max; }

            frontLeft.setPower(fl); frontRight.setPower(fr);
            backLeft.setPower(bl);  backRight.setPower(br);

            telemetry.addData("Heading (deg)", Math.toDegrees(simulatedHeading));
            telemetry.addData("Raw   D/S", "%.2f / %.2f", drive, strafe);
            telemetry.addData("Rot   D/S", "%.2f / %.2f", rotDrive, rotStrafe);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Rotation matrix: `rotDrive = drive * cos(-h) - strafe * sin(-h)` and `rotStrafe = drive * sin(-h) + strafe * cos(-h)` where `h` is the robot heading in radians.",
      "Complete the mecanum formula: `fr = rotDrive - rotStrafe - rotate`, `bl = rotDrive - rotStrafe + rotate`, `br = rotDrive + rotStrafe - rotate`.",
      "The key insight: after rotation, use `rotDrive` and `rotStrafe` instead of the raw `drive` and `strafe` in all mecanum formulas. `rotate` is not rotated.",
    ],
    conceptsCovered: [
      "Field-relative drive",
      "2D rotation matrix",
      "Heading-based vector rotation",
      "IMU integration pattern",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 20 — Mecanum Strafing Test
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 20,
    title: "Mecanum Strafing Test",
    difficulty: "Beginner",
    description:
      "Write an autonomous that strafes right for 1 second then strafes left for 1 second, returning to the start — pure strafing tests that your mecanum formula and reversals are correct.",
    xp: 75,
    estimatedTime: "25 min",
    tags: ["Autonomous", "Mecanum Drive", "Strafing", "ElapsedTime"],
    objectives: [
      "Initialize all four mecanum motors with correct direction reversals.",
      "Apply the strafing-only formula (drive=0, rotate=0, strafe=±1.0).",
      "Use ElapsedTime to strafe right for 1 second.",
      "Reset the timer and strafe left for 1 second.",
      "Stop all motors at the end.",
    ],
    instructions: `Pure strafing uses the mecanum formula with \`drive=0\` and \`rotate=0\`, only varying \`strafe\`. The powers are:
\`\`\`
strafing right (strafe = +1.0):  FL=+1  FR=-1  BL=-1  BR=+1
strafing left  (strafe = -1.0):  FL=-1  FR=+1  BL=+1  BR=-1
\`\`\`
If your robot drives diagonally instead of sideways, check two things: (1) the direction reversals on the left-side motors, and (2) whether backLeft and backRight use the correct sign.

**Sequence:**
1. Strafe **right** (\`strafe = +0.5\`) for **1.0 s**
2. Strafe **left** (\`strafe = -0.5\`) for **1.0 s**
3. Stop all motors

The robot should return to approximately its starting position if the field is flat.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "Strafe Test", group = "Challenge 20")
public class StrafeTest extends LinearOpMode {

    private DcMotor frontLeft, frontRight, backLeft, backRight;

    @Override
    public void runOpMode() {

        waitForStart();

        ElapsedTime timer = new ElapsedTime();

        timer.reset();
        while (timer.seconds() < 1.0 && opModeIsActive()) {
            telemetry.addData("Phase", "Strafe RIGHT");
            telemetry.addData("Time", timer.seconds());
            telemetry.update();
        }

        timer.reset();
        while (timer.seconds() < 1.0 && opModeIsActive()) {
            telemetry.addData("Phase", "Strafe LEFT");
            telemetry.addData("Time", timer.seconds());
            telemetry.update();
        }

        telemetry.addData("Status", "Complete");
        telemetry.update();
        sleep(1000);
    }

    private void setMecanumPowers(double drive, double strafe, double rotate) {
    }
}`,
    hints: [
      "For pure strafe right: `fl=+strafe, fr=-strafe, bl=-strafe, br=+strafe` (with drive=0, rotate=0).",
      "Call your `setMecanumPowers(0, 0.5, 0)` helper for right and `setMecanumPowers(0, -0.5, 0)` for left — but implement the formula inside first.",
      "Stop all motors after both loops: `frontLeft.setPower(0); frontRight.setPower(0); backLeft.setPower(0); backRight.setPower(0);`",
    ],
    conceptsCovered: [
      "Pure strafe mecanum formula",
      "Direction reversal validation",
      "Timed autonomous segments",
      "Motor symmetry testing",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 21 — Velocity-Magnitude Braking
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 21,
    title: "Velocity-Magnitude Braking",
    difficulty: "Intermediate",
    description:
      "Compute the joystick input magnitude and apply a deadband — stop all motors if the magnitude is below 0.05 — mirroring the team's competition-ready braking pattern.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["TeleOp", "Mecanum Drive", "Deadband", "Velocity Magnitude"],
    objectives: [
      "Compute input magnitude: Math.sqrt(drive² + strafe²).",
      "Apply a deadband: if magnitude < 0.05, zero all motor powers.",
      "Only compute mecanum powers when magnitude is above the deadband.",
      "Display input magnitude and active/inactive state in telemetry.",
    ],
    instructions: `Joysticks never perfectly return to 0.0 — there's always a small offset (\`±0.03\` is typical). Without a deadband, the robot creeps slightly when the driver releases the sticks. Applying a **deadband** means ignoring inputs below a threshold.

**Magnitude-based deadband:**
\`\`\`java
double magnitude = Math.sqrt(drive * drive + strafe * strafe);
if (magnitude < DEADBAND) {
    drive = 0; strafe = 0; // snap both to zero
}
\`\`\`
This is better than independent per-axis deadbands because it handles diagonal stick drift: a tiny off-center joystick shouldn't cause any movement even if the X and Y components are individually above threshold.

**Requirements:**
- \`DEADBAND = 0.05\`
- Full four-motor mecanum drive using this magnitude check
- When below deadband: all four wheels get 0.0 power
- Display magnitude and "ACTIVE" / "DEADBAND" status in telemetry`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "Magnitude Braking", group = "Challenge 21")
public class MagnitudeBraking extends LinearOpMode {

    private DcMotor frontLeft, frontRight, backLeft, backRight;
    private static final double DEADBAND = 0.05;

    @Override
    public void runOpMode() {
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        waitForStart();

        while (opModeIsActive()) {
            double drive  = -gamepad1.left_stick_y;
            double strafe =  gamepad1.left_stick_x;
            double rotate = -gamepad1.right_stick_x;

            double magnitude = 0;

            boolean active = false;

            double fl = 0, fr = 0, bl = 0, br = 0;
            if (active) {
            }

            frontLeft.setPower(fl); frontRight.setPower(fr);
            backLeft.setPower(bl);  backRight.setPower(br);

            telemetry.addData("Magnitude", magnitude);
            telemetry.addData("State", active ? "ACTIVE" : "DEADBAND");
            telemetry.update();
        }
    }
}`,
    hints: [
      "`magnitude = Math.sqrt(drive * drive + strafe * strafe)` — or equivalently `Math.hypot(drive, strafe)`.",
      "Deadband gate: `if (magnitude < DEADBAND) { drive = 0; strafe = 0; }` — then compute mecanum powers using the zeroed values.",
      "When magnitude is below deadband, all four powers become 0 automatically because `drive + strafe + rotate = 0` (rotate is typically also near 0).",
    ],
    conceptsCovered: [
      "Input magnitude calculation",
      "Deadband filtering",
      "Joystick drift prevention",
      "Math.hypot() utility",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 22 — DcMotorEx Velocity Control
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 22,
    title: "DcMotorEx Velocity Control",
    difficulty: "Intermediate",
    description:
      "Replace setPower() with setVelocity() on a DcMotorEx flywheel to hold a precise tick-per-second target, and compare the velocity stability against open-loop power control.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["TeleOp", "DcMotorEx", "Velocity Control", "Flywheel", "PIDF"],
    objectives: [
      "Declare and initialize a DcMotorEx (not DcMotor) from hardwareMap.",
      "Switch the motor to RUN_USING_ENCODER mode.",
      "Call setVelocity(targetTPS) to command a closed-loop speed.",
      "Read the current velocity with getVelocity() and display it.",
      "Toggle between open-loop (setPower) and closed-loop (setVelocity) with a button.",
    ],
    instructions: `\`DcMotorEx\` extends the base \`DcMotor\` class and adds **velocity control** via an internal PIDF loop. Instead of setting a percentage of battery voltage (\`setPower(0.8)\`), you command a specific tick-per-second rate (\`setVelocity(1400)\`) and the motor's firmware adjusts power automatically as the battery drains.

**Key difference:**
- \`setPower(0.8)\` → 80% of current battery voltage, speed varies as battery discharges
- \`setVelocity(1400)\` → holds 1400 ticks/second regardless of load, actively controlled

**Setup sequence:**
\`\`\`java
DcMotorEx shooter = hardwareMap.get(DcMotorEx.class, "shooter_motor");
shooter.setMode(DcMotor.RunMode.RUN_USING_ENCODER); // required for velocity mode
shooter.setVelocity(TARGET_TPS);
double actual = shooter.getVelocity(); // reads current TPS
\`\`\`

**Requirements:** A button toggles between velocity mode (1400 TPS) and power mode (0.8). Display both target and actual TPS in telemetry.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;

@TeleOp(name = "Velocity Control", group = "Challenge 22")
public class VelocityControl extends LinearOpMode {

    private static final double TARGET_TPS    = 1400.0;
    private static final double OPEN_LOOP_PWR = 0.8;

    @Override
    public void runOpMode() {

        boolean velocityMode = true;
        boolean lastAButton  = false;

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.a && !lastAButton) velocityMode = !velocityMode;
            lastAButton = gamepad1.a;

            if (velocityMode) {
            } else {
            }

            double actual = 0;

            telemetry.addData("Mode", velocityMode ? "VELOCITY" : "OPEN LOOP");
            telemetry.addData("Target", TARGET_TPS);
            telemetry.addData("Actual", actual);
            telemetry.addData("Error", TARGET_TPS - actual);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Declare as `private DcMotorEx shooterMotor;` and retrieve with `hardwareMap.get(DcMotorEx.class, \"shooter_motor\")` — note `DcMotorEx.class`.",
      "`setVelocity()` requires `RUN_USING_ENCODER` mode. Set it once during init: `shooterMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);`",
      "Read actual velocity: `double actual = shooterMotor.getVelocity();` — this returns ticks per second matching the `setVelocity()` units.",
    ],
    conceptsCovered: [
      "DcMotorEx velocity control",
      "setVelocity() vs setPower()",
      "Closed-loop vs open-loop comparison",
      "RUN_USING_ENCODER requirement",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 23 — Simple P Controller
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 23,
    title: "Simple P Controller",
    difficulty: "Intermediate",
    description:
      "Implement a proportional position controller for a turret motor: power = Kp × (target − current), clamped to ±0.8 — the simplest form of feedback control.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["PID Control", "Turret", "Proportional", "Feedback", "Encoder"],
    objectives: [
      "Read the current encoder position with getCurrentPosition().",
      "Compute the error: target − current.",
      "Multiply error by Kp to get the proportional power.",
      "Clamp the power to the range [-0.8, 0.8].",
      "Apply the clamped power to the motor.",
      "Display error, raw power, and clamped power in telemetry.",
    ],
    instructions: `A **proportional controller** applies motor power proportional to how far the motor is from its target. When it's far away, power is large; as it approaches, power decreases and the motor slows naturally.

**Formula:** \`power = Kp × (target − current)\`

With \`Kp = 0.003\` and a target of 1000 ticks:
- At position 0 → error=1000 → power = 3.0 → clamped to 0.8
- At position 800 → error=200 → power = 0.6 → not clamped
- At position 990 → error=10 → power = 0.03 → very slow approach

**Clamping:** Without a clamp, large errors would command power > 1.0 which the SDK silently clips, but we lose predictability. Always clamp: \`power = Math.max(-0.8, Math.min(0.8, rawPower))\`

**Requirements:** Hardware name \`"turret_motor"\`. Target set by Dpad (Up +100 ticks, Down -100 ticks with debounce). Display error and power each loop.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "P Controller", group = "Challenge 23")
public class PController extends LinearOpMode {

    private DcMotor turretMotor;
    private static final double Kp           = 0.003;
    private static final double MAX_POWER    = 0.8;
    private static final int    TICK_STEP    = 100;

    @Override
    public void runOpMode() {

        turretMotor = hardwareMap.get(DcMotor.class, "turret_motor");
        turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        int    targetTicks   = 0;
        boolean lastDpadUp   = false;
        boolean lastDpadDown = false;

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.dpad_up && !lastDpadUp)   targetTicks += TICK_STEP;
            if (gamepad1.dpad_down && !lastDpadDown) targetTicks -= TICK_STEP;
            lastDpadUp   = gamepad1.dpad_up;
            lastDpadDown = gamepad1.dpad_down;

            int current = turretMotor.getCurrentPosition();

            int error = 0;

            double rawPower = 0;

            double clampedPower = 0;

            telemetry.addData("Target", targetTicks);
            telemetry.addData("Current", current);
            telemetry.addData("Error", error);
            telemetry.addData("Power", clampedPower);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Error = `targetTicks - current` — positive error means the motor needs to move forward.",
      "Raw power = `Kp * error` — with Kp=0.003 and error=300, rawPower=0.9.",
      "Clamp: `double clamped = Math.max(-MAX_POWER, Math.min(MAX_POWER, rawPower));` — limits the range without losing sign.",
    ],
    conceptsCovered: [
      "Proportional control",
      "Error computation",
      "Power clamping",
      "Feedback control fundamentals",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 24 — Encoder Ticks to Degrees
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 24,
    title: "Encoder Ticks to Degrees",
    difficulty: "Intermediate",
    description:
      "Write a ticksToDegrees() conversion method using gear ratio and ticks-per-revolution, then display a turret's real angle live in telemetry.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["Math", "Encoders", "Gear Ratio", "Turret", "Conversion"],
    objectives: [
      "Define constants: TICKS_PER_REV = 537.7, GEAR_RATIO = 2.0.",
      "Implement double ticksToDegrees(int ticks) using the formula.",
      "Read the turret encoder position each loop.",
      "Display the position in both ticks and degrees.",
      "Verify the conversion: 537.7 × 2.0 ticks should equal 360°.",
    ],
    instructions: `Motors report position in **encoder ticks**, but humans and physics use **degrees**. The conversion:

\`\`\`
degrees = (ticks / (TICKS_PER_REV × GEAR_RATIO)) × 360
\`\`\`

For a goBILDA motor with 537.7 ticks/revolution and a 2:1 external gear reduction:
- 537.7 × 2.0 = 1075.4 ticks per full output shaft revolution
- 1075.4 ticks = 360° → 1 tick ≈ 0.335°

**Verification test:** move the turret by hand one full rotation (1075.4 ticks) and confirm telemetry reads ~360°. Half a rotation (537.7 ticks) should read ~180°.

Implement \`ticksToDegrees()\` as a helper method, then also implement the inverse \`degreesToTicks(double degrees)\` as a bonus.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Ticks to Degrees", group = "Challenge 24")
public class TicksToDegrees extends LinearOpMode {

    private DcMotor turretMotor;

    private static final double TICKS_PER_REV = 537.7;
    private static final double GEAR_RATIO    = 2.0;

    @Override
    public void runOpMode() {

        turretMotor = hardwareMap.get(DcMotor.class, "turret_motor");
        turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        turretMotor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        waitForStart();

        while (opModeIsActive()) {

            turretMotor.setPower(gamepad1.left_stick_x * 0.4);

            int ticks = turretMotor.getCurrentPosition();

            double degrees = 0;

            telemetry.addData("Ticks", ticks);
            telemetry.addData("Degrees", degrees);
            telemetry.update();
        }
    }

    private double ticksToDegrees(int ticks) {
        return 0;
    }

    private int degreesToTicks(double degrees) {
        return 0;
    }
}`,
    hints: [
      "Formula: `return (ticks / (TICKS_PER_REV * GEAR_RATIO)) * 360.0;` — pure arithmetic, no Math library needed.",
      "Sanity check: `ticksToDegrees((int)(537.7 * 2.0))` should return exactly 360.0.",
      "Inverse: `return (int)((degrees / 360.0) * TICKS_PER_REV * GEAR_RATIO);` — cast to int since encoder targets are integer ticks.",
    ],
    conceptsCovered: [
      "Encoder tick-to-degree conversion",
      "Gear ratio math",
      "Physical unit conversions",
      "Helper method pattern",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 25 — Flywheel TPS Calibration
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 25,
    title: "Flywheel TPS Calibration",
    difficulty: "Intermediate",
    description:
      "Implement interpolateTPS() that linearly maps shooting distance (inches) to flywheel speed (TPS) using the team's actual calibration table, clamping for out-of-range inputs.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Math", "Interpolation", "Flywheel", "Calibration", "Shooter"],
    objectives: [
      "Define parallel arrays for distances and TPS values from the calibration table.",
      "Find which two table entries bracket the input distance.",
      "Compute the linear interpolation between those two entries.",
      "Clamp the output for distances below 30 in or above 60 in.",
      "Display the distance, interpolated TPS, and nearest table entries in telemetry.",
    ],
    instructions: `The team's flywheel requires different speeds at different distances from the goal. The calibration table was measured empirically:

| Distance (in) | Target TPS |
|--------------|------------|
| 30           | 1200       |
| 40           | 1350       |
| 50           | 1500       |
| 60           | 1650       |

**Linear interpolation between two table entries:**
\`\`\`java
// For distance 45 in, between 40 and 50:
double t = (45 - 40) / (50 - 40); // t = 0.5
double tps = 1350 + t * (1500 - 1350); // = 1425
\`\`\`

Implement \`interpolateTPS(double distanceInches)\`:
- If \`distance ≤ 30\`, return 1200 (clamp to minimum)
- If \`distance ≥ 60\`, return 1650 (clamp to maximum)
- Otherwise, find the bracketing pair and linearly interpolate`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "TPS Calibration", group = "Challenge 25")
public class TPSCalibration extends LinearOpMode {

    private static final double[] DIST_TABLE = {30.0, 40.0, 50.0, 60.0};
    private static final double[] TPS_TABLE  = {1200.0, 1350.0, 1500.0, 1650.0};

    @Override
    public void runOpMode() {
        waitForStart();

        double simulatedDistance = 30.0;

        while (opModeIsActive()) {

            simulatedDistance += gamepad1.right_trigger * 0.1;
            simulatedDistance -= gamepad1.left_trigger  * 0.1;
            simulatedDistance = Math.max(20, Math.min(70, simulatedDistance));

            double targetTPS = interpolateTPS(simulatedDistance);

            telemetry.addData("Distance (in)", simulatedDistance);
            telemetry.addData("Target TPS", targetTPS);
            telemetry.update();
        }
    }

    private double interpolateTPS(double distanceInches) {
        if (distanceInches <= DIST_TABLE[0]) return TPS_TABLE[0];

        if (distanceInches >= DIST_TABLE[DIST_TABLE.length - 1]) return TPS_TABLE[TPS_TABLE.length - 1];

        for (int i = 0; i < DIST_TABLE.length - 1; i++) {
            if (distanceInches >= DIST_TABLE[i] && distanceInches <= DIST_TABLE[i + 1]) {
                double t = 0;
                return 0;
            }
        }
        return TPS_TABLE[0];
    }
}`,
    hints: [
      "Compute t: `double t = (distanceInches - DIST_TABLE[i]) / (DIST_TABLE[i+1] - DIST_TABLE[i]);` — t is 0.0 at the left entry, 1.0 at the right.",
      "Interpolate: `return TPS_TABLE[i] + t * (TPS_TABLE[i+1] - TPS_TABLE[i]);`",
      "Test: `interpolateTPS(45)` should return 1425.0 (midpoint between 40→1350 and 50→1500).",
    ],
    conceptsCovered: [
      "Linear interpolation",
      "Lookup table pattern",
      "Input clamping",
      "Distance-to-velocity calibration",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 26 — PIDF Velocity Loop
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 26,
    title: "PIDF Velocity Loop",
    difficulty: "Advanced",
    description:
      "Build a full PIDF controller for a flywheel: proportional, integral (with anti-windup clamp), derivative, and feedforward terms — the same structure used in production FTC code.",
    xp: 250,
    estimatedTime: "60 min",
    tags: ["Advanced", "PIDF", "Flywheel", "Velocity Control", "Control Theory"],
    objectives: [
      "Compute velocity error: target TPS − current TPS.",
      "Accumulate the integral term with a windup clamp.",
      "Compute the derivative term from the change in error.",
      "Add a feedforward term proportional to the target.",
      "Sum all four terms and clamp to [0.0, 1.0] for a one-directional flywheel.",
      "Display all four terms and the output in telemetry.",
    ],
    instructions: `A PIDF controller combines four terms to hold a flywheel at a target velocity with minimal steady-state error:

**P (Proportional):** \`Kp × error\` — immediate response proportional to error
**I (Integral):** \`Ki × Σerror × dt\` — eliminates persistent offsets by accumulating past error  
**D (Derivative):** \`Kd × Δerror / dt\` — dampens overshoot by reacting to rate of change
**F (Feedforward):** \`Kf × targetTPS\` — baseline power needed to spin at the target speed

**Anti-windup:** clamp the integral accumulator so it can't grow without bound: \`integral = Math.max(-WINDUP, Math.min(WINDUP, integral))\`

**Constants:** \`Kp=0.001, Ki=0.0002, Kd=0.0003, Kf=0.00055, WINDUP=200\`

Use DcMotorEx to read \`getVelocity()\`. Target is 1400 TPS, toggled with A.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.util.ElapsedTime;

@TeleOp(name = "PIDF Velocity", group = "Challenge 26")
public class PIDFVelocity extends LinearOpMode {

    private DcMotorEx shooterMotor;

    private static final double TARGET_TPS = 1400.0;
    private static final double Kp = 0.001, Ki = 0.0002, Kd = 0.0003, Kf = 0.00055;
    private static final double WINDUP = 200.0;

    @Override
    public void runOpMode() {

        shooterMotor = hardwareMap.get(DcMotorEx.class, "shooter_motor");
        shooterMotor.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

        double integral   = 0;
        double lastError  = 0;
        ElapsedTime loopTimer = new ElapsedTime();

        boolean running = false;
        boolean lastA   = false;

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.a && !lastA) running = !running;
            lastA = gamepad1.a;

            double dt = loopTimer.seconds();
            loopTimer.reset();

            double currentTPS = shooterMotor.getVelocity();
            double error      = running ? (TARGET_TPS - currentTPS) : 0;

            integral += error * dt;

            double derivative = 0;

            double feedforward = 0;

            double output = 0;

            output = Math.max(0, Math.min(1, output));

            if (!running) output = 0;
            shooterMotor.setPower(output);
            lastError = error;

            telemetry.addData("Running", running);
            telemetry.addData("Current TPS", currentTPS);
            telemetry.addData("Error", error);
            telemetry.addData("Output", output);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Integral: `integral += error * dt;` then clamp: `integral = Math.max(-WINDUP, Math.min(WINDUP, integral));`",
      "Derivative: `double derivative = (error - lastError) / dt;` — guard against dt=0 with `if (dt > 0.001)`.",
      "Full output: `double output = Kp*error + Ki*integral + Kd*derivative + Kf*TARGET_TPS;` then clamp to [0,1].",
    ],
    conceptsCovered: [
      "PIDF control loop",
      "Integral anti-windup",
      "Derivative calculation",
      "Feedforward term",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 27 — Loop Frequency Measurement
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 27,
    title: "Loop Frequency Measurement",
    difficulty: "Intermediate",
    description:
      "Measure the actual loop frequency of your OpMode in Hz and average loop time in ms — essential for tuning PIDF derivative terms and diagnosing performance regressions.",
    xp: 125,
    estimatedTime: "25 min",
    tags: ["Performance", "Loop Hz", "ElapsedTime", "Telemetry", "Optimization"],
    objectives: [
      "Count loop iterations using an int counter.",
      "Use an ElapsedTime to gate the Hz calculation once per second.",
      "Compute Hz = loopCount / elapsedSeconds and reset both.",
      "Compute average loop time in ms = 1000 / Hz.",
      "Display Hz, average loop time, and total loop count in telemetry.",
    ],
    instructions: `Knowing your loop frequency matters for three reasons: (1) the derivative term in a PIDF controller requires accurate \`dt\`; (2) sensor polling only refreshes once per loop; (3) diagnosing I²C slowdowns shows up as a sudden drop in Hz.

**Hz measurement pattern:**
\`\`\`java
ElapsedTime loopTimer = new ElapsedTime();
int loopsThisSecond = 0;
double hz = 0;

// In the loop:
loopsThisSecond++;
if (loopTimer.seconds() >= 1.0) {
    hz = loopsThisSecond / loopTimer.seconds();
    loopsThisSecond = 0;
    loopTimer.reset();
}
\`\`\`

A well-optimized FTC OpMode with bulk reads achieves **200–300 Hz**. Without bulk reads, expect **50–100 Hz**. Add bulk reads (see Challenge 15) and compare.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@TeleOp(name = "Loop Hz Meter", group = "Challenge 27")
public class LoopHzMeter extends LinearOpMode {

    private DcMotor driveMotor;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        waitForStart();

        while (opModeIsActive()) {

            double power = -gamepad1.left_stick_y;
            driveMotor.setPower(power);

            telemetry.addData("Loop Hz", 0.0);
            telemetry.addData("Avg Loop (ms)", 0.0);
            telemetry.addData("Total Loops", 0L);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Compute Hz: `hz = loopsThisSecond / loopTimer.seconds();` — use the actual elapsed seconds for accuracy.",
      "Average loop time: `double avgMs = (hz > 0) ? 1000.0 / hz : 0;` — guard against division by zero on startup.",
      "Reset both counter and timer: `loopsThisSecond = 0; loopTimer.reset();` — do this immediately after computing Hz.",
    ],
    conceptsCovered: [
      "Loop frequency measurement",
      "ElapsedTime gating",
      "Performance profiling",
      "dt calculation for PIDF",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 28 — Button-Latch Shooting
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 28,
    title: "Button-Latch Shooting",
    difficulty: "Intermediate",
    description:
      "Implement the team's shooting latch: the feeder only runs when the bumper is held AND the flywheel has reached target speed — preventing premature shots.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["TeleOp", "State Logic", "Shooting", "Latch Pattern", "Flywheel"],
    objectives: [
      "Declare booleans shootingLatched and shooterReady.",
      "Set shooterReady = true when simulated TPS is within 100 of target.",
      "Arm the latch only when shootButtonPressed AND shooterReady.",
      "Run the feeder motor only when latched AND shoot button is pressed.",
      "Disarm the latch when the shoot button is released.",
      "Display latch state, shooter readiness, and feeder state in telemetry.",
    ],
    instructions: `Pressing a bumper while the flywheel is still spinning up wastes game elements. The **latch pattern** solves this: pressing the bumper arms a latch boolean, but the feeder only opens when the latch fires — and the latch only fires when the shooter is at speed.

**Logic (from the team's MainTeleOp):**
\`\`\`java
if (!shootButtonPressed) {
    shootingLatched = false;          // release latch when button released
} else {
    if (!shootingLatched) {
        if (shooterReady) shootingLatched = true; // arm on first ready tick
    }
}
boolean feeding = shootButtonPressed && shootingLatched;
\`\`\`

**Requirements:**
- Left bumper = shoot button
- Simulate flywheel TPS ramping up: increment by 50 each loop when A is held, decrement otherwise
- Target TPS = 1400, tolerance = ±100
- feeder motor at power 1.0 when feeding, 0 otherwise`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Shoot Latch", group = "Challenge 28")
public class ShootLatch extends LinearOpMode {

    private DcMotor feederMotor;

    private static final double TARGET_TPS = 1400.0;
    private static final double TOLERANCE  = 100.0;

    @Override
    public void runOpMode() {

        feederMotor = hardwareMap.get(DcMotor.class, "transfer_motor");

        boolean shootingLatched = false;
        double  simulatedTPS    = 0;

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.a) simulatedTPS = Math.min(simulatedTPS + 50, 1800);
            else            simulatedTPS = Math.max(simulatedTPS - 30, 0);

            boolean shooterReady = false;

            boolean shootButtonPressed = gamepad1.left_bumper;

            boolean feeding = false;

            feederMotor.setPower(feeding ? 1.0 : 0.0);

            telemetry.addData("TPS", simulatedTPS);
            telemetry.addData("Ready", shooterReady);
            telemetry.addData("Latched", shootingLatched);
            telemetry.addData("Feeding", feeding);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Ready check: `boolean shooterReady = Math.abs(simulatedTPS - TARGET_TPS) <= TOLERANCE;`",
      "Latch: `if (!shootButtonPressed) { shootingLatched = false; } else if (!shootingLatched && shooterReady) { shootingLatched = true; }`",
      "Feeding: `boolean feeding = shootButtonPressed && shootingLatched;` — both conditions must be true simultaneously.",
    ],
    conceptsCovered: [
      "Shooting latch pattern",
      "Boolean state arming",
      "Velocity readiness check",
      "Conditional feeder control",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 29 — Turret Zeroing State Machine
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 29,
    title: "Turret Zeroing State Machine",
    difficulty: "Intermediate",
    description:
      "Implement a two-state machine (IDLE → ZEROING) triggered by Gamepad2.A that homes the turret to its limit switch, then resets the encoder — mirroring the team's competition homing routine.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["TeleOp", "State Machine", "Turret", "Homing", "TouchSensor"],
    objectives: [
      "Define an enum with IDLE and ZEROING states.",
      "Trigger the ZEROING state on Gamepad2 A rising edge.",
      "In ZEROING, drive the turret at slow negative power.",
      "Transition back to IDLE when the touch sensor is pressed.",
      "Stop the motor and reset the encoder on transition to IDLE.",
      "Block shooting while ZEROING is active.",
    ],
    instructions: `The team's turret uses a limit switch at the physical zero position. Before every match, or if the encoder loses sync, the operator presses Gamepad2.A to home the turret.

**State machine pattern:**
\`\`\`java
enum TurretState { IDLE, ZEROING }
TurretState state = TurretState.IDLE;

// In the loop:
switch (state) {
    case IDLE:
        if (gamepad2.a && !lastGamepad2A) {
            state = TurretState.ZEROING;
            turretMotor.setPower(-0.2);
        }
        break;
    case ZEROING:
        if (limitSwitch.isPressed()) {
            turretMotor.setPower(0);
            turretMotor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
            turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
            state = TurretState.IDLE;
        }
        break;
}
\`\`\`

While zeroing, show "ZEROING" in telemetry and block other turret commands.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.TouchSensor;

@TeleOp(name = "Turret State Machine", group = "Challenge 29")
public class TurretStateMachine extends LinearOpMode {

    private DcMotor     turretMotor;
    private TouchSensor limitSwitch;

    @Override
    public void runOpMode() {

        turretMotor = hardwareMap.get(DcMotor.class, "turret_motor");
        limitSwitch = hardwareMap.get(TouchSensor.class, "touch_sensor");
        turretMotor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        boolean lastGamepad2A = false;

        waitForStart();

        while (opModeIsActive()) {

            lastGamepad2A = gamepad2.a;

            telemetry.addData("State", "TBD");
            telemetry.addData("Sensor", limitSwitch.isPressed() ? "PRESSED" : "open");
            telemetry.addData("Encoder", turretMotor.getCurrentPosition());
            telemetry.update();
        }
    }
}`,
    hints: [
      "Define the enum outside the class or as an inner enum: `enum TurretState { IDLE, ZEROING }`",
      "Rising edge: `if (gamepad2.a && !lastGamepad2A) { state = TurretState.ZEROING; turretMotor.setPower(-0.2); }`",
      "In ZEROING: `if (limitSwitch.isPressed()) { turretMotor.setPower(0); turretMotor.setMode(STOP_AND_RESET_ENCODER); turretMotor.setMode(RUN_USING_ENCODER); state = TurretState.IDLE; }`",
    ],
    conceptsCovered: [
      "Finite state machine (FSM)",
      "Java enum states",
      "Homing with state machine",
      "State-gated hardware control",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 30 — Autonomous State Machine
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 30,
    title: "Autonomous State Machine",
    difficulty: "Intermediate",
    description:
      "Build a 4-state autonomous — DRIVE_TO_SHOOT, SHOOTING, DRIVE_TO_COLLECT, DONE — using only motor powers and ElapsedTime timers, no path-following libraries needed.",
    xp: 175,
    estimatedTime: "45 min",
    tags: ["Autonomous", "State Machine", "ElapsedTime", "Motors", "Timer-Based"],
    objectives: [
      "Define a 4-state enum: DRIVE_TO_SHOOT, SHOOTING, DRIVE_TO_COLLECT, DONE.",
      "Use ElapsedTime to time each state's duration.",
      "Transition between states when the timer expires.",
      "Apply different motor powers in each state.",
      "Transition to DONE after DRIVE_TO_COLLECT completes.",
      "Stop all motors in the DONE state.",
    ],
    instructions: `A **timer-based state machine** is the simplest form of autonomous: each state runs for a fixed duration, then transitions to the next. It doesn't require encoders or path-following libraries.

**States and durations:**
- \`DRIVE_TO_SHOOT\`: drive forward at 0.5 for **1.5 s**, then → SHOOTING
- \`SHOOTING\`: stop driving, run flywheel at 0.8 for **1.0 s**, then → DRIVE_TO_COLLECT  
- \`DRIVE_TO_COLLECT\`: reverse at -0.4 for **1.5 s**, then → DONE
- \`DONE\`: all motors off

**Pattern for state transitions:**
\`\`\`java
if (state == State.DRIVE_TO_SHOOT && stateTimer.seconds() > 1.5) {
    state = State.SHOOTING;
    stateTimer.reset(); // reset for the next state's timing
}
\`\`\``,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "State Machine Auto", group = "Challenge 30")
public class StateMachineAuto extends LinearOpMode {

    private DcMotor leftDrive, rightDrive, flywheel;

    @Override
    public void runOpMode() {

        leftDrive  = hardwareMap.get(DcMotor.class, "left_drive");
        rightDrive = hardwareMap.get(DcMotor.class, "right_drive");
        flywheel   = hardwareMap.get(DcMotor.class, "shooter_motor");
        leftDrive.setDirection(DcMotorSimple.Direction.REVERSE);

        waitForStart();

        ElapsedTime stateTimer = new ElapsedTime();

        while (opModeIsActive()) {

            telemetry.addData("State", "TBD");
            telemetry.addData("State Time", stateTimer.seconds());
            telemetry.update();
        }
    }
}`,
    hints: [
      "Each state case: set motor powers, then `if (stateTimer.seconds() > DURATION) { state = nextState; stateTimer.reset(); }`",
      "In SHOOTING: `leftDrive.setPower(0); rightDrive.setPower(0); flywheel.setPower(0.8);`",
      "In DONE: stop everything and don't add any timer check — the while loop continues until the OpMode is stopped externally.",
    ],
    conceptsCovered: [
      "Timer-based state machine",
      "State transitions",
      "Timed autonomous sequence",
      "Multi-motor coordination",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 31 — Multi-Shot Cycling
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 31,
    title: "Multi-Shot Cycling",
    difficulty: "Intermediate",
    description:
      "Extend the autonomous state machine to loop N times through a TO_HUMAN → SHOOT cycle, where N is configured in the init loop with Dpad Up/Down — mirroring the team's Far Auto cycling.",
    xp: 175,
    estimatedTime: "45 min",
    tags: ["Autonomous", "State Machine", "Cycling", "Init Loop", "Counter"],
    objectives: [
      "Configure cycle count (1–8) in the init loop with Dpad Up/Down.",
      "Implement TO_HUMAN and SHOOT states with timers.",
      "Decrement remainingCycles after each SHOOT completion.",
      "Transition to LEAVE when remainingCycles reaches 0.",
      "Display remaining cycles in telemetry throughout.",
    ],
    instructions: `The team's autonomous cycles between the human player station and the shooting position multiple times. The number of cycles is configured before the match starts and counts down during the run.

**State flow:**
\`\`\`
TO_HUMAN (1.5 s) → SHOOT (1.0 s) → [remainingCycles > 0 ? TO_HUMAN : LEAVE]
\`\`\`

**Init loop configuration:**
\`\`\`java
while (!isStarted() && !isStopRequested()) {
    if (gamepad1.dpad_up   && !lastUp)   cycleCount++;
    if (gamepad1.dpad_down && !lastDown) cycleCount = Math.max(0, cycleCount - 1);
    telemetry.addData("Cycles", cycleCount);
    telemetry.update();
}
remainingCycles = cycleCount;
\`\`\`

After each SHOOT, decrement \`remainingCycles\`. When it reaches 0, transition to LEAVE instead of back to TO_HUMAN.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "Multi-Shot Auto", group = "Challenge 31")
public class MultiShotAuto extends LinearOpMode {

    private DcMotor leftDrive, rightDrive, flywheel;

    enum State { TO_HUMAN, SHOOT, LEAVE, DONE }

    @Override
    public void runOpMode() {

        leftDrive  = hardwareMap.get(DcMotor.class, "left_drive");
        rightDrive = hardwareMap.get(DcMotor.class, "right_drive");
        flywheel   = hardwareMap.get(DcMotor.class, "shooter_motor");
        leftDrive.setDirection(DcMotorSimple.Direction.REVERSE);

        int cycleCount = 4;

        int remainingCycles = cycleCount;

        waitForStart();

        State state = State.TO_HUMAN;
        ElapsedTime stateTimer = new ElapsedTime();

        while (opModeIsActive()) {

            switch (state) {
                case TO_HUMAN:
                    break;

                case SHOOT:
                    break;

                case LEAVE:
                    break;

                case DONE:
                    leftDrive.setPower(0); rightDrive.setPower(0); flywheel.setPower(0);
                    break;
            }

            telemetry.addData("State", state.name());
            telemetry.addData("Remaining", remainingCycles);
            telemetry.addData("Time", stateTimer.seconds());
            telemetry.update();
        }
    }
}`,
    hints: [
      "After the SHOOT timer expires: `remainingCycles--; state = (remainingCycles > 0) ? State.TO_HUMAN : State.LEAVE; stateTimer.reset();`",
      "Init loop: `while (!isStarted() && !isStopRequested()) { if (gamepad1.dpad_up && !lastUp) cycleCount++; ... }`",
      "LEAVE: drive backward for 1.0 s → DONE. Reset timer on transition just like the other states.",
    ],
    conceptsCovered: [
      "Cyclic state machine",
      "Configurable cycle count",
      "Counter-based state transition",
      "Pre-match configuration pattern",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 32 — TeleOp Mode Switching
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 32,
    title: "TeleOp Mode Switching",
    difficulty: "Intermediate",
    description:
      "Implement NORMAL and SAFE_MODE TeleOp modes — B button enters safe mode (capped 50% drive power, warning telemetry), Y exits — mirroring the team's competition safe-mode pattern.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["TeleOp", "Mode Switching", "State", "Safe Mode", "Gamepad"],
    objectives: [
      "Declare boolean safeMode = false.",
      "Enter safe mode on B button press (debounced).",
      "Exit safe mode on Y button press.",
      "Cap motor power at 50% when safeMode is true.",
      "Display a prominent SAFE MODE warning in telemetry when active.",
    ],
    instructions: `Safe mode is used when the robot's odometry is unreliable or a subsystem is malfunctioning. In safe mode, drive power is capped and the driver gets clear visual feedback.

**Mode transitions (from MainTeleOp):**
- B button (debounced) → enter safe mode: \`safeMode = true\`
- Y button while in safe mode → exit: \`safeMode = false\`

**Power cap in safe mode:**
\`\`\`java
double scale = safeMode ? 0.5 : 1.0;
leftDrive.setPower(leftPower * scale);
rightDrive.setPower(rightPower * scale);
\`\`\`

Display \`"** SAFE MODE **"\` prominently in telemetry (addLine at the top) when active, so the driver can see it at a glance. In normal mode, display \`"NORMAL"\` instead.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@TeleOp(name = "Mode Switch", group = "Challenge 32")
public class ModeSwitchTeleOp extends LinearOpMode {

    private DcMotor leftDrive, rightDrive;

    @Override
    public void runOpMode() {

        leftDrive  = hardwareMap.get(DcMotor.class, "left_drive");
        rightDrive = hardwareMap.get(DcMotor.class, "right_drive");
        leftDrive.setDirection(DcMotorSimple.Direction.REVERSE);

        boolean safeMode   = false;
        boolean lastBButton = false;

        waitForStart();

        while (opModeIsActive()) {

            double leftPower  = -gamepad1.left_stick_y;
            double rightPower = -gamepad1.right_stick_y;
            double scale = 1.0;

            leftDrive.setPower(leftPower * scale);
            rightDrive.setPower(rightPower * scale);

            telemetry.addData("Mode", safeMode ? "** SAFE MODE **" : "NORMAL");
            telemetry.addData("Scale", scale);
            telemetry.update();
        }
    }
}`,
    hints: [
      "B button debounced: `if (gamepad1.b && !lastBButton) { safeMode = true; } lastBButton = gamepad1.b;`",
      "Y button exits immediately (no debounce needed): `if (gamepad1.y && safeMode) { safeMode = false; }`",
      "Scale: `double scale = safeMode ? 0.5 : 1.0;` — apply to both motor powers: `leftDrive.setPower(leftPower * scale);`",
    ],
    conceptsCovered: [
      "Mode switching pattern",
      "Power scaling by mode",
      "Debounced mode entry",
      "Telemetry mode indication",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 33 — Pythagorean Distance to Goal
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 33,
    title: "Pythagorean Distance to Goal",
    difficulty: "Intermediate",
    description:
      "Implement distanceToGoal() using Math.hypot() to compute the straight-line distance from the robot's current (x, y) position to the fixed goal, in millimeters.",
    xp: 125,
    estimatedTime: "25 min",
    tags: ["Math", "Odometry", "Distance", "Field Coordinates"],
    objectives: [
      "Define goalX and goalY constants in mm (72 in × 25.4 mm/in).",
      "Implement double distanceToGoal(double x, double y) using Math.hypot().",
      "Simulate robot position changing with joystick input.",
      "Display distance to goal, robot position, and goal position in telemetry.",
      "Verify with the team's known positions: robot at (46.5 in, 10.5 in).",
    ],
    instructions: `Field positions in Pedro Pathing are stored in **millimeters** (1 inch = 25.4 mm). The straight-line distance between two points uses the Pythagorean theorem: \`d = √((x₂−x₁)² + (y₂−y₁)²)\`

Java provides \`Math.hypot(dx, dy)\` which computes this directly and handles numerical precision better than manual squaring.

**Team coordinate system (converted to mm):**
- Goal center: \`(72 × 25.4, 72 × 25.4)\` = \`(1828.8, 1828.8)\` mm
- Shot point: \`(46.5 × 25.4, 10.5 × 25.4)\` = \`(1181.1, 266.7)\` mm

At the shot point, the distance to goal should be approximately **1694 mm (66.7 in)**.

Implement \`distanceToGoal()\` and verify this result using the known coordinates.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Distance to Goal", group = "Challenge 33")
public class DistanceToGoal extends LinearOpMode {

    private static final double GOAL_X = 72 * 25.4;
    private static final double GOAL_Y = 72 * 25.4;

    @Override
    public void runOpMode() {
        waitForStart();

        double robotX = 46.5 * 25.4;
        double robotY = 10.5 * 25.4;

        while (opModeIsActive()) {

            robotX += gamepad1.left_stick_x  * 10;
            robotY += -gamepad1.left_stick_y * 10;

            double dist = 0;

            double distInches = dist / 25.4;

            telemetry.addData("Robot (mm)", "(%.0f, %.0f)", robotX, robotY);
            telemetry.addData("Goal  (mm)", "(%.0f, %.0f)", GOAL_X, GOAL_Y);
            telemetry.addData("Distance mm", dist);
            telemetry.addData("Distance in", distInches);
            telemetry.update();
        }
    }

    private double distanceToGoal(double x, double y) {
        return 0;
    }
}`,
    hints: [
      "`Math.hypot(dx, dy)` computes `sqrt(dx² + dy²)` — pass `(GOAL_X - x)` and `(GOAL_Y - y)` as arguments.",
      "At `(46.5*25.4, 10.5*25.4)` → expect ~1694 mm distance. If you get ~66.7, you forgot to convert to mm.",
      "Full implementation: `return Math.hypot(GOAL_X - x, GOAL_Y - y);`",
    ],
    conceptsCovered: [
      "Pythagorean distance formula",
      "Math.hypot()",
      "Field coordinates in mm",
      "Robot position tracking",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 34 — atan2 Turret Bearing
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 34,
    title: "atan2 Turret Bearing",
    difficulty: "Intermediate",
    description:
      "Compute the required turret angle to point at the goal from any robot position and heading, using Math.atan2(dy, dx) — the core of the team's pointTurretAtGoal() method.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Math", "Turret", "atan2", "Bearing", "Field Coordinates"],
    objectives: [
      "Compute dx = goalX - robotX and dy = goalY - robotY.",
      "Compute the absolute field bearing using Math.atan2(dy, dx) in degrees.",
      "Subtract the robot heading to get the required turret angle.",
      "Wrap the result to [-180, 180] degrees.",
      "Display field bearing, robot heading, and turret angle in telemetry.",
    ],
    instructions: `\`Math.atan2(dy, dx)\` returns the angle (in radians) from the positive X axis to the vector (dx, dy). This gives the **field bearing** to the goal — but the turret needs the angle **relative to the robot's nose**.

**Formula:**
\`\`\`java
double dx = GOAL_X - robotX;
double dy = GOAL_Y - robotY;
double fieldBearing = Math.toDegrees(Math.atan2(dy, dx));
double turretAngle  = fieldBearing - robotHeadingDegrees;
\`\`\`

**Angle wrapping** keeps the result in [−180, 180]:
\`\`\`java
while (turretAngle >  180) turretAngle -= 360;
while (turretAngle < -180) turretAngle += 360;
\`\`\`

**Test case:** robot at (46.5 in, 10.5 in), heading 180°, goal at (72 in, 72 in):
- dx = 25.5 in → 647.7 mm, dy = 61.5 in → 1562.1 mm
- fieldBearing ≈ 67.5°
- turretAngle ≈ 67.5 − 180 = −112.5° (robot faces backward, turret must swing left)`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Turret Bearing", group = "Challenge 34")
public class TurretBearing extends LinearOpMode {

    private static final double GOAL_X = 72 * 25.4;
    private static final double GOAL_Y = 72 * 25.4;

    @Override
    public void runOpMode() {
        waitForStart();

        double robotX       = 46.5 * 25.4;
        double robotY       = 10.5 * 25.4;
        double robotHeading = 180.0;

        while (opModeIsActive()) {

            robotX       += gamepad1.left_stick_x  * 10;
            robotY       += -gamepad1.left_stick_y * 10;
            robotHeading += gamepad1.right_stick_x * 2;

            double dx = 0;
            double dy = 0;

            double fieldBearingDeg = 0;

            double turretAngle = 0;

            telemetry.addData("Robot Heading", robotHeading);
            telemetry.addData("Field Bearing", fieldBearingDeg);
            telemetry.addData("Turret Angle", turretAngle);
            telemetry.update();
        }
    }
}`,
    hints: [
      "`double fieldBearing = Math.toDegrees(Math.atan2(dy, dx));` — atan2 returns radians, convert to degrees.",
      "`double turretAngle = fieldBearing - robotHeading;` — this gives the angle the turret must be at relative to the robot's forward direction.",
      "Wrap: `while (turretAngle > 180) turretAngle -= 360; while (turretAngle < -180) turretAngle += 360;`",
    ],
    conceptsCovered: [
      "Math.atan2() bearing calculation",
      "Field vs robot-relative angles",
      "Angle wrapping",
      "Turret pointing math",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 35 — Alliance Coordinate Mirror
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 35,
    title: "Alliance Coordinate Mirror",
    difficulty: "Beginner",
    description:
      "Implement mirrorX() to convert BLUE alliance coordinates to RED alliance by reflecting across the field's center line — so one autonomous works for both alliances.",
    xp: 75,
    estimatedTime: "20 min",
    tags: ["Math", "Alliance", "Coordinate Mirror", "Autonomous"],
    objectives: [
      "Define the field width constant: FIELD_MM = 144 * 25.4 mm.",
      "Implement double mirrorX(double x) returning FIELD_MM - x.",
      "Apply mirrorX() to a list of BLUE coordinates to produce RED coordinates.",
      "Display both BLUE and RED coordinates in telemetry.",
      "Verify: mirrorX(0) = FIELD_MM, mirrorX(FIELD_MM) = 0.",
    ],
    instructions: `FTC fields are symmetric. Your autonomous code can be written for one alliance and then mirrored for the other using a simple X-axis reflection. The field is **144 inches = 3657.6 mm** wide.

**Mirror formula:** \`redX = FIELD_MM - blueX\`

This reflects a point across the field center (at \`FIELD_MM / 2\` = 1828.8 mm):
- Blue \`x = 0\` (left wall) → Red \`x = 3657.6\` (right wall)
- Blue \`x = 72*25.4\` (center) → Red \`x = 72*25.4\` (center — unchanged)

**Test your coordinates:**
- BLUE shot point: \`x = 46.5 * 25.4 = 1181.1 mm\`
- RED shot point: \`x = 3657.6 - 1181.1 = 2476.5 mm\`

The Y axis stays the same for both alliances (near wall is always Y = 0).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Coordinate Mirror", group = "Challenge 35")
public class CoordinateMirror extends LinearOpMode {

    private static final double FIELD_MM = 144.0 * 25.4;

    private static final double BLUE_SHOT_X    = 46.5 * 25.4;
    private static final double BLUE_COLLECT_X = 6.689 * 25.4;
    private static final double BLUE_GOAL_X    = 72 * 25.4;

    @Override
    public void runOpMode() {
        waitForStart();

        while (opModeIsActive()) {

            double redShotX    = 0;
            double redCollectX = 0;
            double redGoalX    = 0;

            telemetry.addLine("=== BLUE ===");
            telemetry.addData("Shot X", BLUE_SHOT_X);
            telemetry.addData("Collect X", BLUE_COLLECT_X);
            telemetry.addData("Goal X", BLUE_GOAL_X);
            telemetry.addLine("=== RED ===");
            telemetry.addData("Shot X", redShotX);
            telemetry.addData("Collect X", redCollectX);
            telemetry.addData("Goal X", redGoalX);
            telemetry.update();
        }
    }

    private double mirrorX(double x) {
        return 0;
    }
}`,
    hints: [
      "`return FIELD_MM - x;` — single subtraction mirrors the coordinate.",
      "Verify: `mirrorX(BLUE_GOAL_X) == BLUE_GOAL_X` — the center X (72*25.4=1828.8) equals FIELD_MM/2 so it maps to itself.",
      "Both alliances share the same Y coordinates — only X needs to be mirrored for left/right symmetry.",
    ],
    conceptsCovered: [
      "Field coordinate mirroring",
      "Alliance-agnostic autonomous",
      "Linear transformation",
      "Field dimension constants",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 36 — Degrees ↔ Radians Conversion
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 36,
    title: "Degrees ↔ Radians Conversion",
    difficulty: "Beginner",
    description:
      "Write toRadians() and toDegrees() helpers from scratch without Math.toRadians/toDegrees, then apply them to convert headings for Pedro Pathing Pose constructors.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["Math", "Angles", "Radians", "Degrees", "Pedro Pathing"],
    objectives: [
      "Implement double toRadians(double deg) using * Math.PI / 180.",
      "Implement double toDegrees(double rad) using * 180 / Math.PI.",
      "Convert 0°, 90°, 180°, 270°, 360° to radians and display results.",
      "Verify round-trip: toDegrees(toRadians(angle)) == angle.",
    ],
    instructions: `Pedro Pathing's \`Pose\` constructor takes heading in **radians**, but humans think in **degrees**. You need conversion helpers constantly in robotics code.

**Formulas:**
- Degrees to radians: \`rad = deg × π / 180\`
- Radians to degrees: \`deg = rad × 180 / π\`

**Key values to verify:**

| Degrees | Radians       |
|---------|---------------|
| 0°      | 0             |
| 90°     | π/2 ≈ 1.5708  |
| 180°    | π ≈ 3.1416    |
| 270°    | 3π/2 ≈ 4.7124 |
| 360°    | 2π ≈ 6.2832   |

**Pedro Pathing usage:** \`new Pose(x, y, toRadians(180))\` for a robot facing backward. The Pose constructor's third argument is always radians.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Angle Conversion", group = "Challenge 36")
public class AngleConversion extends LinearOpMode {

    @Override
    public void runOpMode() {
        waitForStart();

        while (opModeIsActive()) {

            double[] degreesTable = {0, 90, 180, 270, 360};

            for (double deg : degreesTable) {
                double rad     = toRadians(deg);
                double roundTrip = toDegrees(rad);
                telemetry.addData(deg + "°", "rad=%.4f  back=%.1f°", rad, roundTrip);
            }

            double poseHeading = toRadians(180);
            telemetry.addData("Pose heading (180°)", poseHeading);
            telemetry.update();
        }
    }

    private double toRadians(double degrees) {
        return 0;
    }

    private double toDegrees(double radians) {
        return 0;
    }
}`,
    hints: [
      "`toRadians`: `return degrees * Math.PI / 180.0;`",
      "`toDegrees`: `return radians * 180.0 / Math.PI;`",
      "Round-trip check: `toDegrees(toRadians(90))` should return exactly `90.0` — if it doesn't, you have a sign error.",
    ],
    conceptsCovered: [
      "Degrees to radians conversion",
      "Radians to degrees conversion",
      "Math.PI constant",
      "Pedro Pathing angle units",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 37 — GoBilda Pinpoint Odometry Setup
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 37,
    title: "GoBilda Pinpoint Odometry",
    difficulty: "Intermediate",
    description:
      "Initialize a GoBildaPinpointDriver, configure encoder offsets and resolution, call resetPosAndIMU(), and read live X/Y/heading position from the odometry computer.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["Odometry", "GoBilda", "Pinpoint", "Position Tracking"],
    objectives: [
      "Retrieve a GoBildaPinpointDriver from hardwareMap.",
      "Set the X and Y pod offsets in mm from the robot center.",
      "Set the encoder resolution for goBILDA pods.",
      "Call resetPosAndIMU() to zero position and calibrate the IMU.",
      "Call update() each loop and read getPosition() for X, Y, heading.",
      "Display all three values in telemetry.",
    ],
    instructions: `The **GoBilda Pinpoint** is a dedicated odometry computer that reads two encoder pods and an IMU to track the robot's field position in real time. It replaces manual dead-wheel encoder math.

**Initialization sequence:**
\`\`\`java
GoBildaPinpointDriver odo = hardwareMap.get(GoBildaPinpointDriver.class, "odo");
odo.setOffsets(-84.0, -168.0); // X pod offset (mm), Y pod offset (mm)
odo.setEncoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD);
odo.setEncoderDirections(FORWARD, FORWARD);
odo.resetPosAndIMU();
\`\`\`

**In the loop:** call \`odo.update()\` first, then read position. The returned \`Pose2D\` has \`getX()\`, \`getY()\`, and \`getHeading(AngleUnit.DEGREES)\` methods.

**Pod offsets** measure where each pod sits relative to the robot's tracking center — these values are robot-specific. Use the team's values: X offset = −84 mm, Y offset = −168 mm.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import com.qualcomm.hardware.gobilda.GoBildaPinpointDriver;

@TeleOp(name = "Pinpoint Odometry", group = "Challenge 37")
public class PinpointOdometry extends LinearOpMode {

    private GoBildaPinpointDriver odo;

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Pinpoint initialized");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.addData("X (mm)", 0.0);
            telemetry.addData("Y (mm)", 0.0);
            telemetry.addData("Heading (deg)", 0.0);
            telemetry.update();
        }
    }
}`,
    hints: [
      "Import `com.gobilda.ftcdriverstation.GoBildaPinpointDriver` and `org.firstinspires.ftc.robotcore.external.navigation.*`",
      "Call `odo.resetPosAndIMU()` BEFORE `waitForStart()` so the IMU calibrates during init.",
      "Reading position: `Pose2D pos = odo.getPosition(); double x = pos.getX(DistanceUnit.MM);`",
    ],
    conceptsCovered: [
      "GoBilda Pinpoint initialization",
      "Dead-wheel odometry",
      "Pod offset configuration",
      "Pose2D reading",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 38 — Field Position Reset
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 38,
    title: "Field Position Reset",
    difficulty: "Beginner",
    description:
      "Add a button that resets the Pinpoint odometry computer to a known field position (72 in, 72 in, 0°) — the field center — mirroring the team's coordinate reset pattern.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["Odometry", "GoBilda", "Position Reset", "Field Coordinates"],
    objectives: [
      "Call odo.setPosition() with a Pose2D at the field center.",
      "Convert 72 inches to mm for the X and Y coordinates.",
      "Trigger the reset on gamepad1.x press (debounced).",
      "Confirm the reset by displaying the new position in telemetry.",
    ],
    instructions: `If the robot is manually placed on the field at a known position during a match (e.g., reset after a penalty), you can re-anchor odometry by calling \`setPosition()\` with the exact starting coordinates.

**Resetting to field center (72 in, 72 in, 0°):**
\`\`\`java
odo.setPosition(new Pose2D(DistanceUnit.MM, 72*25.4, 72*25.4, AngleUnit.DEGREES, 0));
\`\`\`

**The team's pattern:** gamepad1.x resets to the known reset point. This is called a "re-localization anchor" — after the reset, odometry is accurate again even if drift accumulated earlier.

After pressing X, the telemetry should immediately show the robot at \`(1828.8 mm, 1828.8 mm, 0°)\` regardless of where the odometry drifted to.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import com.qualcomm.hardware.gobilda.GoBildaPinpointDriver;

@TeleOp(name = "Position Reset", group = "Challenge 38")
public class PositionReset extends LinearOpMode {

    private GoBildaPinpointDriver odo;

    private static final double RESET_X_MM = 72 * 25.4;
    private static final double RESET_Y_MM = 72 * 25.4;

    @Override
    public void runOpMode() {

        odo = hardwareMap.get(GoBildaPinpointDriver.class, "odo");
        odo.setOffsets(-84.0, -168.0);
        odo.setEncoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD);
        odo.resetPosAndIMU();

        boolean lastX = false;

        waitForStart();

        while (opModeIsActive()) {

            odo.update();

            if (gamepad1.x && !lastX) {
            }
            lastX = gamepad1.x;

            Pose2D pos = odo.getPosition();

            telemetry.addData("X (mm)", pos.getX(DistanceUnit.MM));
            telemetry.addData("Y (mm)", pos.getY(DistanceUnit.MM));
            telemetry.addData("Hdg (°)", pos.getHeading(AngleUnit.DEGREES));
            telemetry.addData("Press X", "to reset to field center");
            telemetry.update();
        }
    }
}`,
    hints: [
      "`new Pose2D(DistanceUnit.MM, x, y, AngleUnit.DEGREES, 0)` — uses factory arguments for unit specification.",
      "Call `odo.setPosition(pose)` inside the `if (gamepad1.x && !lastX)` block.",
      "After pressing X, the next `odo.getPosition()` call should return the reset coordinates immediately.",
    ],
    conceptsCovered: [
      "Odometry position anchoring",
      "setPosition() reset pattern",
      "Pose2D construction",
      "Re-localization",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 39 — Limelight3A Init & Read
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 39,
    title: "Limelight3A Init & Read",
    difficulty: "Intermediate",
    description:
      "Initialize a Limelight3A, start the pipeline, and read tx, ty, ta, and capture latency from the latest result — the starting point for all vision-based targeting.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Vision", "Limelight", "AprilTag", "Telemetry", "Targeting"],
    objectives: [
      "Retrieve a Limelight3A from hardwareMap.",
      "Set the active pipeline to 0.",
      "Call limelight.start() to begin streaming.",
      "Call getLatestResult() each loop.",
      "Display tx, ty, ta, isValid(), and capture latency in telemetry.",
    ],
    instructions: `The **Limelight 3A** is a vision coprocessor that runs on the robot and communicates with the Control Hub over USB. It provides real-time target tracking for AprilTags, colored objects, and neural network detections.

**Init sequence:**
\`\`\`java
Limelight3A limelight = hardwareMap.get(Limelight3A.class, "limelight");
limelight.pipelineSwitch(0); // activate pipeline 0
limelight.start();           // begin capturing
\`\`\`

**Reading results each loop:**
\`\`\`java
LLResult result = limelight.getLatestResult();
if (result != null && result.isValid()) {
    double tx = result.getTx();  // horizontal offset in degrees
    double ty = result.getTy();  // vertical offset in degrees
    double ta = result.getTa();  // target area (% of image)
    double lat = result.getCaptureLatency(); // ms
}
\`\`\`

**tx** is the key value for turret alignment — it's 0° when the target is centered and ±degrees when the camera needs to rotate.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;

@TeleOp(name = "Limelight Basic", group = "Challenge 39")
public class LimelightBasic extends LinearOpMode {

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Limelight initialized");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.update();
        }

    }
}`,
    hints: [
      "Import: `import com.qualcomm.hardware.limelightvision.Limelight3A;` and `import com.qualcomm.hardware.limelightvision.LLResult;`",
      "Always null-check: `if (result != null && result.isValid())` before reading tx/ty — the camera may not have a fresh frame yet.",
      "Stop the camera after the run: `limelight.stop()` in a finally block or after the main loop to free resources.",
    ],
    conceptsCovered: [
      "Limelight3A initialization",
      "Pipeline switching",
      "LLResult reading",
      "tx/ty targeting values",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 40 — Stale Frame Detection
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 40,
    title: "Stale Frame Detection",
    difficulty: "Intermediate",
    description:
      "Implement the team's stale-frame counter: if tx, ty, and timestamp are identical for 5+ consecutive loops, increment a stale counter and report the camera health percentage.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["Vision", "Limelight", "Diagnostics", "Stale Frame", "Debugging"],
    objectives: [
      "Track previous tx, ty, and timestamp from the last loop.",
      "Increment staleFrames when all three values are identical.",
      "Reset staleFrames to 0 when a new (different) frame arrives.",
      "Track totalFrames and compute health = (1 - staleFrames/totalFrames) × 100.",
      "Display staleFrames, totalFrames, and health % in telemetry.",
    ],
    instructions: `The Limelight can appear to be running while actually freezing on the same frame — a hardware issue seen intermittently during competition. The team's \`LimelightDiagnostic\` class detects this by comparing consecutive results.

**Stale detection logic:**
\`\`\`java
if (result != null) {
    boolean stale = (result.getTx() == lastTx) &&
                    (result.getTy() == lastTy) &&
                    (result.getCaptureLatency() == lastLatency);
    if (stale) staleFrames++;
    else       staleFrames = 0; // reset on fresh frame
    totalFrames++;
    lastTx      = result.getTx();
    lastTy      = result.getTy();
    lastLatency = result.getCaptureLatency();
}
\`\`\`

A camera is considered "unhealthy" when staleFrames exceeds 5 consecutively. Display a "CAMERA FROZEN" warning when this threshold is exceeded.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;

@TeleOp(name = "Stale Frame Detect", group = "Challenge 40")
public class StaleFrameDetect extends LinearOpMode {

    private Limelight3A limelight;

    @Override
    public void runOpMode() {

        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        limelight.pipelineSwitch(0);
        limelight.start();

        waitForStart();

        while (opModeIsActive()) {

            LLResult result = limelight.getLatestResult();

            if (result != null) {

                double health = 0;

                telemetry.addData("Stale Frames", 0);
                telemetry.addData("Total Frames", 0);
                telemetry.addData("Health %", health);
                telemetry.addData("Camera Status", 0 > 5 ? "FROZEN" : "OK");
            } else {
                telemetry.addData("Status", "No result");
            }

            telemetry.update();
        }

        limelight.stop();
    }
}`,
    hints: [
      "Compare all three: `boolean stale = (result.getTx() == lastTx) && (result.getTy() == lastTy) && (result.getCaptureLatency() == lastLatency);`",
      "On fresh frame: `staleFrames = 0; lastTx = result.getTx(); lastTy = result.getTy(); lastLatency = result.getCaptureLatency();`",
      "Health: `double health = (1.0 - (double)staleFrames / Math.max(1, totalFrames)) * 100;` — use Math.max(1,...) to avoid division by zero on startup.",
    ],
    conceptsCovered: [
      "Camera health monitoring",
      "Stale frame detection",
      "Consecutive equality check",
      "Diagnostic telemetry",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 41 — AprilTag Fiducial Extraction
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 41,
    title: "AprilTag Fiducial Extraction",
    difficulty: "Intermediate",
    description:
      "Iterate getFiducialResults() to find a specific AprilTag by ID (24 for RED, 20 for BLUE) and extract its horizontal offset — the targeting step before turret correction.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Vision", "Limelight", "AprilTag", "Fiducial", "Targeting"],
    objectives: [
      "Get the fiducial results list from the LLResult.",
      "Loop through results to find the entry matching expectedTagId.",
      "Extract getTargetXDegrees() as tx when the tag is found.",
      "Display 'Target Found' with tx, or 'No Target' if not found.",
      "Toggle between RED (24) and BLUE (20) tag IDs with a button.",
    ],
    instructions: `The Limelight returns all detected fiducials in one result. Your robot needs to track a **specific** AprilTag by ID — not just whichever tag is largest. This requires iterating the list.

**Fiducial iteration pattern:**
\`\`\`java
List<LLResultTypes.FiducialResult> tags = result.getFiducialResults();
boolean found = false;
double tx = 0;
for (LLResultTypes.FiducialResult tag : tags) {
    if (tag.getFiducialId() == expectedTagId) {
        tx    = tag.getTargetXDegrees();
        found = true;
        break;
    }
}
\`\`\`

**Alliance tag IDs from the team's code:**
- RED alliance goal: Tag ID **24**
- BLUE alliance goal: Tag ID **20**

When the expected tag is found, display its \`tx\` (horizontal offset in degrees). When not found, display "NO TARGET — scanning".`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;
import com.qualcomm.hardware.limelightvision.LLResultTypes;
import java.util.List;

@TeleOp(name = "AprilTag Target", group = "Challenge 41")
public class AprilTagTarget extends LinearOpMode {

    private Limelight3A limelight;
    private static final int RED_TAG_ID  = 24;
    private static final int BLUE_TAG_ID = 20;

    @Override
    public void runOpMode() {

        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        limelight.pipelineSwitch(0);
        limelight.start();

        boolean useRedAlliance = true;
        boolean lastBButton    = false;

        waitForStart();

        while (opModeIsActive()) {

            if (gamepad1.b && !lastBButton) useRedAlliance = !useRedAlliance;
            lastBButton = gamepad1.b;

            int expectedId = useRedAlliance ? RED_TAG_ID : BLUE_TAG_ID;

            LLResult result = limelight.getLatestResult();

            boolean targetFound = false;
            double  targetTx    = 0;

            if (result != null && result.isValid()) {

            }

            telemetry.addData("Alliance", useRedAlliance ? "RED (24)" : "BLUE (20)");
            telemetry.addData("Target", targetFound ? "FOUND" : "NOT FOUND");
            telemetry.addData("tx (deg)", targetFound ? targetTx : Double.NaN);
            telemetry.update();
        }

        limelight.stop();
    }
}`,
    hints: [
      "Import: `import com.qualcomm.hardware.limelightvision.LLResultTypes;` and `import java.util.List;`",
      "Loop: `for (LLResultTypes.FiducialResult tag : result.getFiducialResults()) { if (tag.getFiducialId() == expectedId) { tx = tag.getTargetXDegrees(); found = true; break; } }`",
      "Use `break` after finding the target — there's only one tag with a given ID on the field.",
    ],
    conceptsCovered: [
      "Fiducial result iteration",
      "AprilTag ID filtering",
      "getTargetXDegrees()",
      "Alliance-specific targeting",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 42 — tx-Based Turret Correction
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 42,
    title: "tx-Based Turret Correction",
    difficulty: "Intermediate",
    description:
      "Drive a turret motor using proportional correction from the Limelight's tx value — stop when |tx| < 2°, showing 'ON TARGET' — the team's vision-servo loop.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["Vision", "Limelight", "Turret", "P Controller", "Targeting"],
    objectives: [
      "Read tx from the Limelight result.",
      "Compute correctionPower = Kp × tx.",
      "Clamp correctionPower to [-0.4, 0.4].",
      "Set turret power to 0.0 when |tx| < 2.0 (on-target deadband).",
      "Display tx, correction power, and ON TARGET / TRACKING status.",
    ],
    instructions: `This challenge combines vision (Challenge 39–41) with proportional control (Challenge 23) to close the loop between the camera and the turret.

**tx** is the horizontal error in degrees. When tx = 0, the target is centered. When tx is positive, the target is to the right — the turret must rotate right. The proportional law directly converts this to motor power:

\`\`\`java
double correctionPower = Kp * tx;
correctionPower = Math.max(-0.4, Math.min(0.4, correctionPower));

if (Math.abs(tx) < ON_TARGET_THRESHOLD) {
    correctionPower = 0;
    onTarget = true;
} else {
    onTarget = false;
}
turretMotor.setPower(correctionPower);
\`\`\`

**Constants:** \`Kp = 0.02\`, \`ON_TARGET_THRESHOLD = 2.0°\`, max power ±0.4.

When the turret is on-target for 5+ consecutive loops, trigger a "LOCKED" state.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;

@TeleOp(name = "Vision Servo Loop", group = "Challenge 42")
public class VisionServoLoop extends LinearOpMode {

    private Limelight3A limelight;
    private DcMotor     turretMotor;

    private static final double Kp                 = 0.02;
    private static final double MAX_POWER          = 0.4;
    private static final double ON_TARGET_THRESHOLD = 2.0;

    @Override
    public void runOpMode() {

        limelight   = hardwareMap.get(Limelight3A.class, "limelight");
        turretMotor = hardwareMap.get(DcMotor.class, "turret_motor");
        limelight.pipelineSwitch(0);
        limelight.start();

        int onTargetStreak = 0;

        waitForStart();

        while (opModeIsActive()) {

            LLResult result = limelight.getLatestResult();
            double tx = 0;
            boolean hasTarget = false;

            if (result != null && result.isValid()) {
                tx = result.getTx();
                hasTarget = true;
            }

            double correctionPower = 0;
            boolean onTarget = false;

            if (hasTarget) {
                correctionPower = 0;

                correctionPower = 0;

            }

            turretMotor.setPower(correctionPower);

            onTargetStreak = onTarget ? onTargetStreak + 1 : 0;

            telemetry.addData("tx (deg)", tx);
            telemetry.addData("Power", correctionPower);
            telemetry.addData("Status", !hasTarget ? "NO TARGET" : onTarget ? "ON TARGET" : "TRACKING");
            telemetry.addData("Streak", onTargetStreak);
            telemetry.update();
        }

        limelight.stop();
    }
}`,
    hints: [
      "`correctionPower = Kp * tx;` — with Kp=0.02 and tx=10°, power=0.2 (within ±0.4 already).",
      "Clamp: `correctionPower = Math.max(-MAX_POWER, Math.min(MAX_POWER, correctionPower));`",
      "On-target: `if (Math.abs(tx) < ON_TARGET_THRESHOLD) { correctionPower = 0; onTarget = true; }`",
    ],
    conceptsCovered: [
      "Vision-based proportional control",
      "tx targeting offset",
      "On-target deadband",
      "Consecutive lock detection",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 43 — Poll Rate Cycling
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 43,
    title: "Poll Rate Cycling",
    difficulty: "Intermediate",
    description:
      "Implement Y-button cycling through Limelight poll rates (100, 50, 25, 10 Hz) and observe how frame latency changes — the team found 50 Hz outperformed 100 Hz for their setup.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["Vision", "Limelight", "Poll Rate", "Tuning", "Performance"],
    objectives: [
      "Create an array of poll rates: {100, 50, 25, 10}.",
      "Track the current index into the array.",
      "On Y button rising edge, advance the index (wrapping around).",
      "Call limelight.setPollRateHz() with the new rate.",
      "Display current rate, latency, and frame count in telemetry.",
    ],
    instructions: `The Limelight's poll rate controls how often the Control Hub requests a new frame from the camera. Surprisingly, **100 Hz can perform worse than 50 Hz** because the USB bus gets saturated at high poll rates, causing frames to queue up and increasing effective latency.

**The team's finding:** at 100 Hz, effective latency was ~40 ms due to USB saturation. At 50 Hz, latency dropped to ~18 ms with stable frame delivery. Always empirically verify your poll rate.

**Cycling pattern:**
\`\`\`java
int[] rates = {100, 50, 25, 10};
int rateIdx = 0;
// On Y rising edge:
rateIdx = (rateIdx + 1) % rates.length;
limelight.setPollRateHz(rates[rateIdx]);
\`\`\`

Display the current rate, the latest capture latency, and a running frame count so you can compare rates side by side.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;

@TeleOp(name = "Poll Rate Cycle", group = "Challenge 43")
public class PollRateCycle extends LinearOpMode {

    private Limelight3A limelight;

    @Override
    public void runOpMode() {

        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        limelight.pipelineSwitch(0);
        limelight.start();

        int[] rates   = {100, 50, 25, 10};
        int   rateIdx = 0;
        limelight.setPollRateHz(rates[rateIdx]);

        boolean lastY    = false;
        int     frameCount = 0;
        double  lastLatency = 0;

        waitForStart();

        while (opModeIsActive()) {

            lastY = gamepad1.y;

            LLResult result = limelight.getLatestResult();
            if (result != null && result.isValid()) {
                lastLatency = result.getCaptureLatency();
                frameCount++;
            }

            telemetry.addData("Poll Rate Hz", rates[rateIdx]);
            telemetry.addData("Latency (ms)", lastLatency);
            telemetry.addData("Frames", frameCount);
            telemetry.addData("Press Y", "to cycle rate");
            telemetry.update();
        }

        limelight.stop();
    }
}`,
    hints: [
      "Cycle index: `rateIdx = (rateIdx + 1) % rates.length;` — the modulo wraps from 3 back to 0.",
      "Apply the new rate immediately: `limelight.setPollRateHz(rates[rateIdx]);` right after updating rateIdx.",
      "Observe: at 100 Hz you might see latency HIGHER than at 50 Hz if the USB bus is saturated — this is the team's empirical finding.",
    ],
    conceptsCovered: [
      "Camera poll rate configuration",
      "Circular array index cycling",
      "USB bandwidth limitation",
      "Empirical latency measurement",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 44 — Pose Construction & Heading
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 44,
    title: "Pose Construction & Heading",
    difficulty: "Beginner",
    description:
      "Construct the three key field poses from the team's autonomous (start, shot point, human station) using Math.toRadians() for heading, and verify degree↔radian display in telemetry.",
    xp: 75,
    estimatedTime: "20 min",
    tags: ["Pedro Pathing", "Pose", "Heading", "Field Coordinates"],
    objectives: [
      "Construct Pose(64, 8.35, Math.toRadians(180)) for start.",
      "Construct Pose(46.5, 10.5, Math.toRadians(180)) for the shot point.",
      "Construct Pose(6.689, 8.874, Math.toRadians(180)) for the human station.",
      "Display each pose's x, y, and heading in both radians and degrees.",
      "Verify that Math.toDegrees(pose.getHeading()) == 180.",
    ],
    instructions: `Pedro Pathing's \`Pose\` class stores a robot's position (x, y in inches) and heading (in radians). Heading = 0 means the robot faces the +X direction; heading = π (180°) means it faces −X.

**The team's three key poses (all facing backward at 180°):**
\`\`\`java
Pose startPose    = new Pose(64,     8.35,  Math.toRadians(180));
Pose shotPose     = new Pose(46.5,   10.5,  Math.toRadians(180));
Pose humanStation = new Pose(6.689,  8.874, Math.toRadians(180));
\`\`\`

In telemetry, display each pose's x, y, and heading in both radians (\`pose.getHeading()\`) and degrees (\`Math.toDegrees(pose.getHeading())\`). Verify the degree display shows 180.0 for all three — confirming your conversion is correct.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.localization.Pose;

@Autonomous(name = "Pose Construction", group = "Challenge 44")
public class PoseConstruction extends LinearOpMode {

    @Override
    public void runOpMode() {

        Pose startPose = null;

        Pose shotPose = null;

        Pose humanStation = null;

        waitForStart();

        while (opModeIsActive()) {
            if (startPose != null) {
                telemetry.addLine("--- Start Pose ---");
                telemetry.addData("X", startPose.getX());
                telemetry.addData("Y", startPose.getY());
                telemetry.addData("Hdg rad", startPose.getHeading());
                telemetry.addData("Hdg deg", Math.toDegrees(startPose.getHeading()));
            }
            telemetry.update();
        }
    }
}`,
    hints: [
      "`new Pose(x, y, heading)` — heading is in radians. Use `Math.toRadians(180)` to convert 180° → π.",
      "`pose.getHeading()` returns radians. Wrap with `Math.toDegrees()` for human-readable display.",
      "Verify: `Math.toDegrees(Math.toRadians(180))` == 180.0 — if you see 179.9999..., that's floating-point rounding and is acceptable.",
    ],
    conceptsCovered: [
      "Pedro Pathing Pose class",
      "Heading in radians",
      "Math.toRadians() usage",
      "Field position constants",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 45 — BezierLine Path Follow
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 45,
    title: "BezierLine Path Follow",
    difficulty: "Intermediate",
    description:
      "Build a simple straight-line PathChain from start to the shot point using BezierLine, follow it with the Pedro Pathing follower, and wait in a loop until isBusy() returns false.",
    xp: 175,
    estimatedTime: "45 min",
    tags: ["Pedro Pathing", "BezierLine", "PathChain", "Follower", "Autonomous"],
    objectives: [
      "Initialize a Follower and set the starting pose.",
      "Build a single-segment PathChain using BezierLine.",
      "Set constant heading interpolation for the path.",
      "Call follower.followPath() to start execution.",
      "Call follower.update() in a loop until !follower.isBusy().",
    ],
    instructions: `A \`BezierLine\` creates a straight-line path segment between two points. It's the simplest Pedro Pathing path and a good starting point before tackling curves.

**PathChain with a single BezierLine:**
\`\`\`java
PathChain drivePath = follower.pathBuilder()
    .addPath(new BezierLine(
        new Point(startPose, Point.POSE),
        new Point(shotPose,  Point.POSE)
    ))
    .setConstantHeadingInterpolation(startPose.getHeading())
    .build();
\`\`\`

**Execution loop:**
\`\`\`java
follower.followPath(drivePath, true); // true = hold position at end
while (opModeIsActive() && follower.isBusy()) {
    follower.update();
    telemetry.addData("t", follower.getCurrentTValue());
    telemetry.update();
}
\`\`\`

The parametric t value runs from 0.0 (start) to 1.0 (end) as the robot follows the path.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.follower.Follower;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.pathgen.BezierLine;
import com.pedropathing.pathgen.Point;
import com.pedropathing.localization.Pose;

@Autonomous(name = "BezierLine Follow", group = "Challenge 45")
public class BezierLineFollow extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() {

        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {

            telemetry.addData("t value", 0.0);
            telemetry.addData("Busy", true);
            telemetry.update();
        }

        telemetry.addData("Status", "Path complete");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "`new BezierLine(new Point(startPose, Point.POSE), new Point(endPose, Point.POSE))` — `Point.POSE` tells the constructor to extract x/y from a Pose object.",
      "`follower.followPath(path, true)` — the boolean enables position hold at the end; set `false` if you want the robot to drift to rest.",
      "Loop: `while (opModeIsActive() && follower.isBusy()) { follower.update(); }` — don't break manually; let isBusy() handle the exit.",
    ],
    conceptsCovered: [
      "BezierLine segment",
      "PathChain builder",
      "follower.isBusy() pattern",
      "Constant heading interpolation",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 46 — BezierCurve Tape Detour
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 46,
    title: "BezierCurve Tape Detour",
    difficulty: "Advanced",
    description:
      "Replicate the team's tape-3 detour: a BezierCurve that arcs from the start pose, through a control point at (startX, 35.864), to (19, 36) — avoiding the tape line with a smooth curve.",
    xp: 250,
    estimatedTime: "60 min",
    tags: ["Pedro Pathing", "BezierCurve", "Advanced", "Autonomous", "Control Points"],
    objectives: [
      "Construct a BezierCurve with three Point objects: start, control, end.",
      "Set the control point's Y coordinate to 35.864 (tape line height).",
      "Apply tangent heading interpolation for a smooth arc.",
      "Build a PathChain and follow it to completion.",
      "Explain how the control point Y value changes the arc shape.",
    ],
    instructions: `The team's field has a raised tape strip at Y ≈ 35.864 inches. The robot must arc over or around it rather than driving straight through. A **Bézier curve** with one control point creates a smooth arc — the control point "pulls" the path toward it like a rubber band.

**The tape detour curve:**
\`\`\`java
double startX   = 64.0;
double startY   = 8.35;
double controlY = 35.864; // height of the tape line
double endX     = 19.0;
double endY     = 36.0;

new BezierCurve(
    new Point(startX, startY,    Point.CARTESIAN), // start
    new Point(startX, controlY,  Point.CARTESIAN), // control (same X, pulls up)
    new Point(endX,   endY,      Point.CARTESIAN)  // end
)
\`\`\`

**Heading interpolation:** Use \`setTangentHeadingInterpolation()\` so the robot's heading follows the curve tangent — the robot faces the direction it's moving rather than a fixed angle.

**Key insight:** Moving the control point's Y value changes the peak height of the arc. At Y=35.864, the robot just grazes the tape height at its maximum.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.follower.Follower;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.pathgen.BezierCurve;
import com.pedropathing.pathgen.BezierLine;
import com.pedropathing.pathgen.Point;
import com.pedropathing.localization.Pose;

@Autonomous(name = "Tape Detour", group = "Challenge 46")
public class TapeDetour extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() {

        follower = new Follower(hardwareMap);

        Pose startPose = new Pose(64, 8.35, Math.toRadians(180));
        follower.setStartingPose(startPose);

        double controlY = 35.864;
        double endX     = 19.0;
        double endY     = 36.0;

        telemetry.addData("Control Y", controlY);
        telemetry.addData("End", "(" + endX + ", " + endY + ")");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("t value", 0.0);
            telemetry.addData("X pos", 0.0);
            telemetry.addData("Y pos", 0.0);
            telemetry.update();
        }

        telemetry.addData("Status", "Detour complete");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "A `BezierCurve` with control at `(64, 35.864)` and end at `(19, 36)` creates a path that peaks near Y=35.864 then sweeps to the endpoint.",
      "`setTangentHeadingInterpolation()` (no arguments) makes the robot always face the direction it's moving — natural for curved paths.",
      "Try changing `controlY` to 20.0 vs 40.0 in telemetry to see how the arc height changes without reflowing.",
    ],
    conceptsCovered: [
      "Bézier curve control points",
      "Tangent heading interpolation",
      "Obstacle avoidance paths",
      "Parametric curve shaping",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 47 — Reversed Path
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 47,
    title: "Reversed Path",
    difficulty: "Intermediate",
    description:
      "Build a BezierLine with setReversed(true) to drive the robot backward from the human station to the shot point — explaining when reversed paths are preferred over forward paths.",
    xp: 175,
    estimatedTime: "40 min",
    tags: ["Pedro Pathing", "Reversed Path", "BezierLine", "Autonomous"],
    objectives: [
      "Build a BezierLine from the human station back to the shot point.",
      "Call setReversed(true) on the path segment.",
      "Set linear heading interpolation between the two endpoints.",
      "Follow the reversed path and monitor the robot facing direction.",
      "Explain in comments why reversed is used here.",
    ],
    instructions: `A **reversed path** drives the robot backward (robot's back leading) while still following the path geometry. This is useful when:
- The robot needs to face a specific direction at the **start** of the next action
- The mechanism is on the back and needs to face toward the goal on arrival
- The path has a tight exit angle that's better handled backward

**The team's use case:** after collecting from the human station (robot faces the station at 0°), the robot needs to arrive at the shot point facing 180° (back to goal). Driving backward on the return path naturally achieves this without needing a point-turn.

\`\`\`java
PathChain returnPath = follower.pathBuilder()
    .addPath(new BezierLine(
        new Point(humanStation, Point.POSE),
        new Point(shotPose,     Point.POSE)
    ))
    .setReversed(true)
    .setLinearHeadingInterpolation(humanStation.getHeading(), shotPose.getHeading())
    .build();
\`\`\``,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.follower.Follower;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.pathgen.BezierLine;
import com.pedropathing.pathgen.Point;
import com.pedropathing.localization.Pose;

@Autonomous(name = "Reversed Path", group = "Challenge 47")
public class ReversedPath extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() {

        follower = new Follower(hardwareMap);

        Pose humanStation = new Pose(6.689, 8.874, Math.toRadians(0));
        Pose shotPose     = new Pose(46.5, 10.5, Math.toRadians(180));

        follower.setStartingPose(humanStation);

        waitForStart();

        while (opModeIsActive()) {

            telemetry.addData("Heading (deg)", 0.0);
            telemetry.addData("t value", 0.0);
            telemetry.update();
        }

        telemetry.addData("Status", "Return path complete");
        telemetry.update();
        sleep(1500);
    }
}`,
    hints: [
      "Add `.setReversed(true)` as a chained call after `.addPath(...)` and before the heading interpolation.",
      "`setLinearHeadingInterpolation(startHeading, endHeading)` — pass the heading from humanStation (0 rad) to shotPose (π rad).",
      "Reversed path: the robot's back leads the movement. Use this when your intake or scoring mechanism is at the rear.",
    ],
    conceptsCovered: [
      "Reversed path driving",
      "setReversed() flag",
      "Linear heading interpolation",
      "Approach direction strategy",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 48 — Dynamic Path Building
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 48,
    title: "Dynamic Path Building",
    difficulty: "Advanced",
    description:
      "Implement a buildPathTo() helper that constructs a BezierLine PathChain from the follower's current position to any target Pose — then use it to chain three consecutive waypoints.",
    xp: 300,
    estimatedTime: "60 min",
    tags: ["Pedro Pathing", "Advanced", "Dynamic Paths", "Helper Method", "Autonomous"],
    objectives: [
      "Implement PathChain buildPathTo(Pose target, boolean reversed).",
      "Use follower.getPose() as the start point inside the helper.",
      "Call the helper for three consecutive waypoints.",
      "Wait for each path to complete before calling the next.",
      "Display the start and end of each segment in telemetry.",
    ],
    instructions: `Hard-coding start points in every \`pathBuilder()\` call is error-prone when chaining many segments. A helper method that reads the follower's **current** pose at call-time is more robust.

**Dynamic path helper:**
\`\`\`java
private PathChain buildPathTo(Pose target, boolean reversed) {
    Pose current = follower.getPose();
    return follower.pathBuilder()
        .addPath(new BezierLine(
            new Point(current, Point.POSE),
            new Point(target,  Point.POSE)
        ))
        .setReversed(reversed)
        .setConstantHeadingInterpolation(target.getHeading())
        .build();
}
\`\`\`

**Usage:** call \`buildPathTo()\` and immediately \`follower.followPath()\` before the robot moves (the pose is captured at build time). Then wait in a loop until \`!follower.isBusy()\` before building the next segment.

**Waypoints:** A→B→C→A (triangle route using the three team field positions).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.pedropathing.follower.Follower;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.localization.Pose;

@Autonomous(name = "Dynamic Paths", group = "Challenge 48")
public class DynamicPaths extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() {

        follower = new Follower(hardwareMap);

        Pose posA = new Pose(64, 8.35, Math.toRadians(180));
        Pose posB = new Pose(6.689, 8.874, Math.toRadians(0));
        Pose posC = new Pose(46.5, 10.5, Math.toRadians(180));

        follower.setStartingPose(posA);

        waitForStart();

        followTo(posB, false);

        followTo(posC, true);

        followTo(posA, false);

        telemetry.addData("Status", "Triangle complete");
        telemetry.update();
        sleep(2000);
    }

    private void followTo(Pose target, boolean reversed) {
        PathChain path = null;

        if (path != null) {
            follower.followPath(path, true);
            while (opModeIsActive() && follower.isBusy()) {
                follower.update();
                telemetry.addData("Target", "(" + target.getX() + ", " + target.getY() + ")");
                telemetry.addData("t value", follower.getCurrentTValue());
                telemetry.update();
            }
        }
    }

    private PathChain buildPathTo(Pose target, boolean reversed) {
        return null;
    }
}`,
    hints: [
      "`follower.getPose()` returns a `Pose` with the robot's current position and heading — call it inside `buildPathTo()` before any other follower calls.",
      "Builder chain: `.addPath(new BezierLine(...)).setReversed(reversed).setConstantHeadingInterpolation(target.getHeading()).build()`",
      "The helper must be called right before `followPath()` — not earlier — so it captures the correct current position.",
    ],
    conceptsCovered: [
      "Dynamic path construction",
      "follower.getPose() current position",
      "Helper method with path building",
      "Multi-waypoint chaining",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 49 — Unit Conversion
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 49,
    title: "Unit Conversion",
    difficulty: "Beginner",
    description:
      "Implement inchesToMm() and mmToInches() conversion helpers, apply them to convert the FTC field dimensions (144×144 in) to millimeters, and display both representations.",
    xp: 75,
    estimatedTime: "15 min",
    tags: ["Math", "Unit Conversion", "Field Dimensions", "Beginner"],
    objectives: [
      "Implement double inchesToMm(double inches) returning inches * 25.4.",
      "Implement double mmToInches(double mm) returning mm / 25.4.",
      "Convert the 144 in × 144 in field size to mm.",
      "Verify round-trip: mmToInches(inchesToMm(72)) == 72.",
      "Display field dimensions in both units in telemetry.",
    ],
    instructions: `The FTC field is **144 inches × 144 inches** (approximately 3.66 m × 3.66 m). Pedro Pathing and GoBilda Pinpoint both use **millimeters** internally, but robot positions are often described in inches in the field manual.

**Conversion factors:**
- 1 inch = **25.4 mm** (exact, by definition)
- 1 mm = **1/25.4 ≈ 0.03937 inches**

Implement two helpers:
\`\`\`java
double inchesToMm(double inches) { return inches * 25.4; }
double mmToInches(double mm)     { return mm / 25.4; }
\`\`\`

**Field facts in both units:**
- Width: 144 in = 3657.6 mm
- Center: 72 in = 1828.8 mm
- Near wall: 0 in = 0 mm
- Far wall: 144 in = 3657.6 mm`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Unit Conversion", group = "Challenge 49")
public class UnitConversion extends LinearOpMode {

    private static final double FIELD_INCHES = 144.0;

    @Override
    public void runOpMode() {
        waitForStart();

        while (opModeIsActive()) {

            double fieldMm     = inchesToMm(FIELD_INCHES);
            double centerMm    = inchesToMm(72);
            double backToInch  = mmToInches(fieldMm);

            telemetry.addData("Field (in)", FIELD_INCHES);
            telemetry.addData("Field (mm)", fieldMm);
            telemetry.addData("Center (mm)", centerMm);
            telemetry.addData("Round-trip", backToInch);
            telemetry.addData("1 in = ? mm", inchesToMm(1.0));
            telemetry.update();
        }
    }

    private double inchesToMm(double inches) {
        return 0;
    }

    private double mmToInches(double mm) {
        return 0;
    }
}`,
    hints: [
      "`inchesToMm`: `return inches * 25.4;`",
      "`mmToInches`: `return mm / 25.4;`",
      "Round-trip check: `mmToInches(inchesToMm(72.0))` should equal exactly `72.0` — floating point preserves this since 25.4 is exact in this multiplication.",
    ],
    conceptsCovered: [
      "Unit conversion fundamentals",
      "Inches to millimeters",
      "Field dimension constants",
      "Round-trip verification",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 50 — Vector Dot Product
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 50,
    title: "Vector Dot Product",
    difficulty: "Intermediate",
    description:
      "Implement a 2D dot product helper and use it to check whether the robot's velocity vector is aligned with its intended drive direction — a signal used in motion-state detection.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["Math", "Vector", "Dot Product", "Mecanum", "Motion Detection"],
    objectives: [
      "Implement double dot(double ax, double ay, double bx, double by).",
      "Compute the dot product of the drive command vector and a reference vector.",
      "A positive dot product means vectors are roughly aligned.",
      "A negative dot product means they point in opposite directions.",
      "Display the dot product and alignment status in telemetry.",
    ],
    instructions: `The **dot product** of two 2D vectors \`A·B = ax×bx + ay×by\`. It measures alignment:
- **Positive:** vectors point in the same general direction
- **Zero:** vectors are perpendicular (90° apart)
- **Negative:** vectors point in opposite directions

**FTC use case:** comparing the gamepad drive vector with the robot's velocity vector. If the dot product is positive, the robot is moving the way the driver commands. If it's negative, the robot is decelerating (vectors opposed) and the motor braking pattern differs.

**Normalized dot product** (cosine similarity) divides by both magnitudes. If the result is < 0, the robot is moving opposite to the drive command — a signal to enable stronger braking.

Implement \`dot(ax, ay, bx, by)\` and display it for the joystick vector vs. a fixed reference vector (1, 0) while the driver moves the sticks.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "Dot Product Demo", group = "Challenge 50")
public class DotProductDemo extends LinearOpMode {

    @Override
    public void runOpMode() {
        waitForStart();

        while (opModeIsActive()) {
            double driveX = gamepad1.left_stick_x;
            double driveY = -gamepad1.left_stick_y;

            double refX = 1.0, refY = 0.0;

            double dotProduct = dot(driveX, driveY, refX, refY);

            double magDrive = Math.hypot(driveX, driveY);
            double magRef   = Math.hypot(refX, refY);

            double cosAngle = (magDrive > 0.01) ? dotProduct / (magDrive * magRef) : 0;

            telemetry.addData("Drive Vector", "(%.2f, %.2f)", driveX, driveY);
            telemetry.addData("Dot Product", dotProduct);
            telemetry.addData("Cos Angle", cosAngle);
            telemetry.addData("Alignment", cosAngle > 0 ? "aligned" : cosAngle < 0 ? "opposed" : "perpendicular");
            telemetry.update();
        }
    }

    private double dot(double ax, double ay, double bx, double by) {
        return 0;
    }
}`,
    hints: [
      "`dot(ax, ay, bx, by) = ax * bx + ay * by` — multiply matching components and add.",
      "When drive vector is (0, 1) (pure forward) and ref is (1, 0) (pure right): dot = 0*1 + 1*0 = 0 → perpendicular.",
      "Cosine similarity: `dotProduct / (magA * magB)` gives a value in [-1, 1] regardless of vector magnitudes.",
    ],
    conceptsCovered: [
      "2D dot product",
      "Vector alignment detection",
      "Cosine similarity",
      "Drive vector analysis",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 51 — Linear Interpolation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 51,
    title: "Linear Interpolation",
    difficulty: "Intermediate",
    description:
      "Implement lerp(a, b, t) and use it to ramp motor power from 0 to 1 over 2 seconds — the same ramp pattern used for the team's 250 ms transfer ramp.",
    xp: 125,
    estimatedTime: "30 min",
    tags: ["Math", "Interpolation", "ElapsedTime", "Ramp", "Motor Control"],
    objectives: [
      "Implement double lerp(double a, double b, double t) returning a + t*(b-a).",
      "Create an ElapsedTime and compute t = elapsed / rampDuration (clamped to [0,1]).",
      "Pass t to lerp(0.0, 1.0, t) to get the ramp power.",
      "Apply the ramped power to a motor.",
      "Display t, ramp power, and elapsed time in telemetry.",
    ],
    instructions: `Linear interpolation (lerp) blends between two values based on a parameter t ∈ [0, 1]:
\`\`\`java
double lerp(double a, double b, double t) { return a + t * (b - a); }
\`\`\`
When \`t = 0\`, result = \`a\`. When \`t = 1\`, result = \`b\`. When \`t = 0.5\`, result is the midpoint.

**Power ramp application:**
\`\`\`java
double elapsed = timer.seconds();
double t       = Math.min(1.0, elapsed / RAMP_DURATION); // clamp t to [0,1]
double power   = lerp(0.0, 1.0, t); // 0→1 over RAMP_DURATION seconds
\`\`\`

**The team's transfer ramp:** uses 250 ms (\`RAMP_DURATION = 0.25\`) to ramp from 0 to full power for the ball transfer mechanism, preventing jerk that knocks the ball off track.

For this challenge, use a 2-second ramp for a drive motor (more visible in telemetry).`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@Autonomous(name = "Lerp Ramp", group = "Challenge 51")
public class LerpRamp extends LinearOpMode {

    private DcMotor driveMotor;
    private static final double RAMP_DURATION = 2.0;

    @Override
    public void runOpMode() {

        driveMotor = hardwareMap.get(DcMotor.class, "drive_motor");

        waitForStart();

        ElapsedTime timer = new ElapsedTime();
        timer.reset();

        while (opModeIsActive()) {

            double elapsed = timer.seconds();

            double t = 0;

            double power = 0;

            driveMotor.setPower(power);

            telemetry.addData("Elapsed (s)", elapsed);
            telemetry.addData("t", t);
            telemetry.addData("Power", power);
            telemetry.addData("Ramp done", t >= 1.0 ? "YES" : "NO");
            telemetry.update();

            if (t >= 1.0 && elapsed > RAMP_DURATION + 1.0) break;
        }

        driveMotor.setPower(0);
        sleep(1000);
    }

    private double lerp(double a, double b, double t) {
        return 0;
    }
}`,
    hints: [
      "`lerp(a, b, t) = a + t * (b - a)` — when t=0 returns a, when t=1 returns b.",
      "Clamp t: `double t = Math.min(1.0, elapsed / RAMP_DURATION);` — ensures power never exceeds 1.0.",
      "Ramp power: `lerp(0.0, 1.0, t)` simplifies to just `t` for a 0→1 ramp, but the full formula works for any range.",
    ],
    conceptsCovered: [
      "Linear interpolation (lerp)",
      "Power ramping",
      "t parameter clamping",
      "Smooth motion start",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 52 — Projectile Distance from TPS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 52,
    title: "Projectile Distance from TPS",
    difficulty: "Intermediate",
    description:
      "Implement a tpsToDistance() inverse lookup — given a flywheel TPS reading, find the corresponding shooting distance using linear interpolation on the team's calibration table.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Math", "Interpolation", "Flywheel", "Inverse Lookup", "Calibration"],
    objectives: [
      "Use the same calibration table as Challenge 25 (distance→TPS pairs).",
      "Implement double tpsToDistance(double tps) as the inverse of interpolateTPS().",
      "Clamp output for TPS values outside the table range.",
      "Find the bracket pair where the input TPS falls.",
      "Linearly interpolate between the two bracketing distances.",
    ],
    instructions: `Challenge 25 maps **distance → TPS**. This challenge inverts it: given a measured TPS, find the **estimated shooting distance**. This is useful for localization — if you know the flywheel speed needed to make the shot, you can infer how far you are from the goal.

**Calibration table (same as before):**
| Distance (in) | TPS  |
|--------------|------|
| 30           | 1200 |
| 40           | 1350 |
| 50           | 1500 |
| 60           | 1650 |

**Inverse interpolation:** search for where the input TPS falls in the TPS array, then interpolate in the DIST array:
\`\`\`java
// TPS=1425 falls between index 1 (1350) and index 2 (1500)
double t = (1425 - 1350) / (1500 - 1350); // = 0.5
double dist = 40 + t * (50 - 40); // = 45 in
\`\`\`

**Verify:** \`tpsToDistance(1425)\` should return 45.0 inches.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@TeleOp(name = "TPS to Distance", group = "Challenge 52")
public class TpsToDistance extends LinearOpMode {

    private static final double[] DIST_TABLE = {30.0, 40.0, 50.0, 60.0};
    private static final double[] TPS_TABLE  = {1200.0, 1350.0, 1500.0, 1650.0};

    @Override
    public void runOpMode() {
        waitForStart();

        double simulatedTPS = 1200.0;

        while (opModeIsActive()) {
            simulatedTPS += gamepad1.right_trigger * 2.0;
            simulatedTPS -= gamepad1.left_trigger  * 2.0;
            simulatedTPS = Math.max(1100, Math.min(1750, simulatedTPS));

            double dist = tpsToDistance(simulatedTPS);

            telemetry.addData("Simulated TPS", simulatedTPS);
            telemetry.addData("Distance (in)", dist);
            telemetry.addData("Test: TPS=1425", tpsToDistance(1425));
            telemetry.update();
        }
    }

    private double tpsToDistance(double tps) {
        if (tps <= TPS_TABLE[0]) return DIST_TABLE[0];

        if (tps >= TPS_TABLE[TPS_TABLE.length - 1]) return DIST_TABLE[DIST_TABLE.length - 1];

        for (int i = 0; i < TPS_TABLE.length - 1; i++) {
            if (tps >= TPS_TABLE[i] && tps <= TPS_TABLE[i + 1]) {
                double t = 0;
                return 0;
            }
        }
        return DIST_TABLE[0];
    }
}`,
    hints: [
      "The inverse interpolates in the DIST_TABLE (output) based on where the input falls in TPS_TABLE (instead of the other way around).",
      "`t = (tps - TPS_TABLE[i]) / (TPS_TABLE[i+1] - TPS_TABLE[i])` — then `return DIST_TABLE[i] + t * (DIST_TABLE[i+1] - DIST_TABLE[i]);`",
      "Test: `tpsToDistance(1200)` → 30.0, `tpsToDistance(1650)` → 60.0, `tpsToDistance(1425)` → 45.0.",
    ],
    conceptsCovered: [
      "Inverse lookup table",
      "Reverse linear interpolation",
      "TPS-to-distance calibration",
      "Clamped interpolation",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Challenge 53 — Robot Velocity Magnitude
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 53,
    title: "Robot Velocity Magnitude",
    difficulty: "Intermediate",
    description:
      "Compute the robot's translational speed from two DcMotorEx velocity readings (forward + strafe wheels), compare against a 1000 mm/s threshold, and implement the team's robotSpeedOk check.",
    xp: 150,
    estimatedTime: "35 min",
    tags: ["Math", "Velocity", "DcMotorEx", "Shooting Readiness", "Speed Check"],
    objectives: [
      "Read forward and strafe wheel velocities using getVelocity() on DcMotorEx.",
      "Convert ticks/s to mm/s using the wheel circumference.",
      "Compute magnitude: Math.sqrt(vx² + vy²).",
      "Compare magnitude against 1000 mm/s threshold.",
      "Display speed, threshold, and TOO FAST TO SHOOT / SPEED OK status.",
    ],
    instructions: `Before shooting, the team's code checks that the robot isn't moving too fast — a moving robot disturbs the shooter's aim. The speed check uses forward and strafe encoder velocities.

**Ticks/s to mm/s conversion:**
\`\`\`java
// goBILDA 19.2:1 motor, 96mm wheel
double MM_PER_TICK = (96 * Math.PI) / 537.7; // ≈ 0.5613 mm/tick
double vxMMs = forwardVelocityTPS * MM_PER_TICK;
double vyMMs = strafeVelocityTPS  * MM_PER_TICK;
\`\`\`

**Magnitude:**
\`\`\`java
double speed = Math.sqrt(vxMMs * vxMMs + vyMMs * vyMMs);
boolean robotSpeedOk = speed < SPEED_THRESHOLD; // 1000 mm/s
\`\`\`

**Team context:** the \`robotSpeedOk\` boolean was ANDed with \`shooterReady\` in the latch logic (Challenge 28) to prevent shots during rapid driving maneuvers.`,
    starterCode: `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotorEx;

@TeleOp(name = "Velocity Magnitude", group = "Challenge 53")
public class VelocityMagnitude extends LinearOpMode {

    private static final double WHEEL_DIAMETER_MM = 96.0;
    private static final double TICKS_PER_REV     = 537.7;
    private static final double MM_PER_TICK       = (WHEEL_DIAMETER_MM * Math.PI) / TICKS_PER_REV;
    private static final double SPEED_THRESHOLD   = 1000.0;

    @Override
    public void runOpMode() {

        waitForStart();

        while (opModeIsActive()) {

            double fwdTPS    = 0;
            double strafeTPS = 0;

            double vxMMs = 0;
            double vyMMs = 0;

            double speed = 0;

            boolean robotSpeedOk = false;

            telemetry.addData("Speed (mm/s)", speed);
            telemetry.addData("Threshold", SPEED_THRESHOLD);
            telemetry.addData("Status", robotSpeedOk ? "SPEED OK" : "TOO FAST TO SHOOT");
            telemetry.update();
        }
    }
}`,
    hints: [
      "Declare as `DcMotorEx` and retrieve with `hardwareMap.get(DcMotorEx.class, \"motor_name\")` — requires `RUN_USING_ENCODER` mode.",
      "`double vxMMs = fwdTPS * MM_PER_TICK;` — the MM_PER_TICK constant converts ticks/s to mm/s.",
      "Magnitude: `double speed = Math.sqrt(vxMMs * vxMMs + vyMMs * vyMMs);` or equivalently `Math.hypot(vxMMs, vyMMs)`.",
    ],
    conceptsCovered: [
      "Velocity magnitude calculation",
      "Ticks/s to mm/s conversion",
      "robotSpeedOk gate",
      "Math.hypot() application",
    ],
  },
];

/** Lookup helpers */
export const getChallengeById = (id: number) =>
  challenges.find((c) => c.id === id);

export const difficultyOrder: Difficulty[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export const difficultyConfig: Record<
  Difficulty,
  { label: string; badgeClass: string; glowClass: string }
> = {
  Beginner: {
    label: "Beginner",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glowClass: "shadow-emerald-500/10",
  },
  Intermediate: {
    label: "Intermediate",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    glowClass: "shadow-amber-500/10",
  },
  Advanced: {
    label: "Advanced",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    glowClass: "shadow-red-500/10",
  },
};

export const pastProgramCode: Record<string, string> = {
  "main-teleop": `package org.firstinspires.ftc.teamcode.opmodes;

import com.bylazar.telemetry.PanelsTelemetry;
import com.bylazar.telemetry.TelemetryManager;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.util.ElapsedTime;

import org.firstinspires.ftc.teamcode.Constants.RobotConstants;
import org.firstinspires.ftc.teamcode.subsystems.Drive;
import org.firstinspires.ftc.teamcode.subsystems.Shooter;

/**
 * Main TeleOp Program
 *
 * GAMEPAD1 LAYOUT:
 * ================
 * Left Stick:      Mecanum drive (forward/strafe)
 * Right Stick X:   Rotation
 * A Button:        Spin up shooter
 * Left Bumper:     Shoot (standard position)
 * Right Bumper:    Shoot (close position, capped at 1600 TPS)
 * Left Trigger:    Shoot (no overrides — pure odometry aim)
 * Right Trigger:   Run intake
 * Back Button:     Reverse intake/unjam
 * B Button:        Enter safe mode (Limelight visual tracking)
 * Y Button:        Exit safe mode
 * X Button:        Reset Pinpoint position to (72, 72, 0)
 * Start Button:    Toggle climber up/down
 * Dpad Up:         Increase manual TPS +50
 * Dpad Down:       Decrease manual TPS -50
 * Right Stick Btn: Toggle visual tracking enable/disable
 *
 * GAMEPAD2 LAYOUT:
 * ================
 * A Button:        Zero Turret (starts homing process)
 * X Button:        Reset Pinpoint Position to (72, 72, 0)
 * Dpad Up:         Increase Goal Y Offset (+1.0 inch forward)
 * Dpad Down:       Decrease Goal Y Offset (-1.0 inch backward)
 * Dpad Right:      Increase Goal X Offset (+1.0 inch right)
 * Dpad Left:       Decrease Goal X Offset (-1.0 inch left)
 */
@TeleOp(name="V10", group="Linear Opmode")
public class MainTeleOp extends LinearOpMode {

    private TelemetryManager panelsTelemetry;

    private Drive drive;
    private Shooter shooter;

    private int selectedRobot = RobotConstants.ROBOT_19564;
    private boolean isRedAlliance = true;

    private boolean SHOOTING = false;
    private boolean shootingLatched = false;

    private boolean manualRPMMode = false;
    private double manualTargetTPS = 1350.0;
    private static final double TPS_INCREMENT = 50.0;

    private boolean climberUp = false;
    private boolean lastStartButton = false;

    private boolean lastDpadUp = false;
    private boolean lastDpadDown = false;

    private boolean lastRightStickButton = false;

    private long feedingStartTime = 0;
    private boolean wasFeeding = false;

    private boolean hasShotOnce = false;
    private boolean visualTrackingEnabled = true;

    private boolean turretDisabled = false;
    private boolean lastDpadLeft = false;

    private boolean safeMode = false;

    private boolean lastGamepad2DpadUp = false;
    private boolean lastGamepad2DpadDown = false;
    private boolean lastGamepad2DpadLeft = false;
    private boolean lastGamepad2DpadRight = false;
    private static final double GOAL_OFFSET_INCREMENT = 1.0;

    private boolean lastGamepad2X = false;
    private boolean lastXButton = false;
    private boolean lastBButton = false;
    private boolean lastYButtonInit = false;

    private int loopCounter = 0;
    private ElapsedTime loopTimer = new ElapsedTime();
    private int loopsThisSecond = 0;
    private double loopsPerSecond = 0.0;
    private ElapsedTime runtime = new ElapsedTime();

    private enum TurretZeroingState { IDLE, ZEROING }
    private TurretZeroingState turretZeroingState = TurretZeroingState.IDLE;
    private boolean lastGamepad2A = false;

    @Override
    public void runOpMode() {
        telemetry.setMsTransmissionInterval(5);
        panelsTelemetry = PanelsTelemetry.INSTANCE.getTelemetry();

        RobotConstants.setRobot(selectedRobot);
        drive = new Drive(hardwareMap);
        shooter = new Shooter(hardwareMap);

        // ── Init loop: select robot + alliance before START ──────────────────
        while (!opModeIsActive() && !isStopRequested()) {
            drive.updateOdometry();

            telemetry.addData("=== TURRET ===", "");
            telemetry.addData("Status", "Not Zeroed — Use Gamepad2.A during opmode to zero");
            telemetry.addData("Raw Encoder", shooter.getRawEncoderPosition());
            telemetry.addData("Turret Angle", "%.1f°", shooter.getTurretAngle());
            telemetry.addData("Robot Heading", "%.1f°", drive.getOdometryHeading());
            telemetry.addLine("");
            telemetry.addData("=== ROBOT SELECT ===", "Y = Toggle 19564 / 21171");
            telemetry.addData("Current Robot", selectedRobot);
            telemetry.addLine("");
            telemetry.addData("=== ALLIANCE ===", "B = RED  |  X = BLUE");
            telemetry.addData("Alliance", isRedAlliance ? "RED" : "BLUE");
            telemetry.addData("Target Tag", isRedAlliance ? 24 : 20);
            telemetry.addLine("");
            telemetry.addData("=== PINPOINT ===", "");
            telemetry.addData("Status", drive.getPinpointStatus());
            telemetry.addData("Field Pos", "X:%.1f  Y:%.1f",
                drive.getOdometryX() / 25.4, drive.getOdometryY() / 25.4);
            telemetry.addData(">>> Status", "Press START when ready <<<");
            telemetry.update();
            panelsTelemetry.update(telemetry);

            boolean yButton = gamepad1.y;
            if (yButton && !lastYButtonInit) {
                selectedRobot = (selectedRobot == RobotConstants.ROBOT_19564)
                    ? RobotConstants.ROBOT_21171 : RobotConstants.ROBOT_19564;
                RobotConstants.setRobot(selectedRobot);
                shooter.applyMotorSettings();
            }
            lastYButtonInit = yButton;

            if (gamepad1.b) isRedAlliance = true;
            else if (gamepad1.x) isRedAlliance = false;

            if (gamepad1.right_stick_button && !lastRightStickButton)
                visualTrackingEnabled = !visualTrackingEnabled;
            lastRightStickButton = gamepad1.right_stick_button;

            if (gamepad1.dpad_left && !lastDpadLeft) {
                turretDisabled = !turretDisabled;
                if (turretDisabled) shooter.setTurretPower(0);
            }
            lastDpadLeft = gamepad1.dpad_left;
        }

        RobotConstants.setRobot(selectedRobot);
        shooter.applyMotorSettings();
        shooter.initServos();
        drive.setAlliance(isRedAlliance);
        runtime.reset();
        waitForStart();
        loopTimer.reset();

        // ── Main loop ────────────────────────────────────────────────────────
        while (opModeIsActive()) {
            loopsThisSecond++;
            if (loopTimer.seconds() >= 1.0) {
                loopsPerSecond = loopsThisSecond / loopTimer.seconds();
                loopsThisSecond = 0;
                loopTimer.reset();
            }

            drive.clearBulkCache();
            shooter.updateMotorCache();
            drive.cacheDriveVelocities();
            drive.updateOdometry();

            // ── Turret zeroing state machine ──────────────────────────────
            boolean gamepad2A = gamepad2.a;
            switch (turretZeroingState) {
                case IDLE:
                    if (gamepad2A && !lastGamepad2A) {
                        turretZeroingState = TurretZeroingState.ZEROING;
                        shooter.startHoming();
                        shootingLatched = false;
                        hasShotOnce = false;
                    }
                    break;
                case ZEROING:
                    if (!shooter.updateHoming())
                        turretZeroingState = TurretZeroingState.IDLE;
                    break;
            }
            lastGamepad2A = gamepad2A;

            // ── Limelight (safe mode only) ────────────────────────────────
            boolean limelightUpdated = false;
            if (safeMode) {
                shooter.updateLimelightData(isRedAlliance);
                limelightUpdated = true;
            }

            boolean limelightDataValid = limelightUpdated && !shooter.isLimelightFrameStale();
            double tx = limelightDataValid ? shooter.getLimelightTx(isRedAlliance) : 0.0;
            double ty = limelightDataValid ? shooter.getLimelightTy() : 0.0;
            double ta = limelightDataValid ? shooter.getAprilTagArea() : 0.0;
            int detectedTagId = limelightDataValid ? shooter.getDetectedAprilTagId(isRedAlliance) : -1;
            boolean hasTarget = limelightDataValid && shooter.hasLimelightTarget();

            // ── Odometry distance → TPS calibration ──────────────────────
            double odometryDistanceToGoal = shooter.getOdometryDistanceToGoal(
                    isRedAlliance, drive.getOdometryX(), drive.getOdometryY());
            shooter.setCachedTagDistance(odometryDistanceToGoal);

            // ── Mecanum drive ─────────────────────────────────────────────
            double driveInput = -gamepad1.left_stick_y;
            double strafe    =  gamepad1.left_stick_x;
            double rotate    = -gamepad1.right_stick_x;
            double driveInputPower = Math.max(Math.abs(driveInput),
                                     Math.max(Math.abs(strafe), Math.abs(rotate)));
            drive.mecanumDriveWithBraking(driveInput, strafe, rotate, 1.0);

            // ── Odometry/safe-mode quick resets ───────────────────────────
            if (gamepad1.x && !lastXButton)
                drive.setOdometryPosition(72.0 * 25.4, 72.0 * 25.4, 0);
            lastXButton = gamepad1.x;

            if (gamepad1.b && !lastBButton) safeMode = true;
            lastBButton = gamepad1.b;

            if (gamepad1.y && safeMode) {
                safeMode = false;
                hasShotOnce = false;
                shootingLatched = false;
                manualRPMMode = false;
                shooter.controlShooter(false);
            }

            // ── Gamepad2: goal offset fine-tuning ─────────────────────────
            boolean gp2Up    = gamepad2.dpad_up;
            boolean gp2Down  = gamepad2.dpad_down;
            boolean gp2Left  = gamepad2.dpad_left;
            boolean gp2Right = gamepad2.dpad_right;
            if (gp2Up    && !lastGamepad2DpadUp)    shooter.adjustGoalOffset(0,  GOAL_OFFSET_INCREMENT);
            if (gp2Down  && !lastGamepad2DpadDown)  shooter.adjustGoalOffset(0, -GOAL_OFFSET_INCREMENT);
            if (gp2Right && !lastGamepad2DpadRight) shooter.adjustGoalOffset( GOAL_OFFSET_INCREMENT, 0);
            if (gp2Left  && !lastGamepad2DpadLeft)  shooter.adjustGoalOffset(-GOAL_OFFSET_INCREMENT, 0);
            lastGamepad2DpadUp    = gp2Up;
            lastGamepad2DpadDown  = gp2Down;
            lastGamepad2DpadLeft  = gp2Left;
            lastGamepad2DpadRight = gp2Right;

            boolean gamepad2X = gamepad2.x;
            if (gamepad2X && !lastGamepad2X)
                drive.setOdometryPosition(72.0 * 25.4, 72.0 * 25.4, 0);
            lastGamepad2X = gamepad2X;

            // ── Turret tracking ────────────────────────────────────────────
            boolean velocityLowEnough = drive.getVelocityMagnitude() < 10000;
            if (turretZeroingState == TurretZeroingState.ZEROING) {
                // Homing process owns turret power
            } else if (turretDisabled) {
                shooter.setTurretPower(0);
            } else if (safeMode) {
                int expectedTagId = isRedAlliance ? 24 : 20;
                if (limelightDataValid && hasTarget && detectedTagId == expectedTagId) {
                    shooter.pointTurretAtGoal(isRedAlliance, true,
                            drive.getOdometryX(), drive.getOdometryY(), drive.getOdometryHeading());
                } else {
                    shooter.setTurretPower(0);
                }
            } else {
                shooter.pointTurretAtGoal(isRedAlliance, false,
                        drive.getOdometryX(), drive.getOdometryY(), drive.getOdometryHeading());
            }

            // ── Manual TPS tuning ──────────────────────────────────────────
            boolean dpadUp   = gamepad1.dpad_up;
            boolean dpadDown = gamepad1.dpad_down;
            if (dpadUp && !lastDpadUp) {
                manualRPMMode = true;
                manualTargetTPS = Math.min(manualTargetTPS + TPS_INCREMENT, 2500);
            }
            if (dpadDown && !lastDpadDown) {
                manualRPMMode = true;
                manualTargetTPS = Math.max(manualTargetTPS - TPS_INCREMENT, 1000);
            }
            lastDpadUp = dpadUp; lastDpadDown = dpadDown;

            if (gamepad1.a) {
                if (manualRPMMode) shooter.controlShooterManual(manualTargetTPS, true);
                else               shooter.controlShooter(true);
            }

            // ── Shooting latch logic ───────────────────────────────────────
            boolean leftBumper     = gamepad1.left_bumper;
            boolean rightBumper    = gamepad1.right_bumper;
            boolean leftTrigShoot  = gamepad1.left_trigger > 0.5;
            boolean shootButtonPressed = leftBumper || rightBumper || leftTrigShoot;

            if (leftBumper) {
                shooter.setCloseShotOverride(false);
            } else if (rightBumper) {
                drive.setPositionOverride(72.0, 90.0);
                shooter.setDefaultTPSOverride(1550.0);
                shooter.setCloseShotOverride(true);
            } else {
                drive.clearPositionOverride();
                shooter.clearDefaultTPSOverride();
                shooter.setCloseShotOverride(false);
            }

            double currentTPS  = shooter.getShooterTPS();
            double robotSpeed  = drive.getVelocityMagnitude();
            double targetTPS;
            if (manualRPMMode) {
                targetTPS = manualTargetTPS;
            } else if (robotSpeed > 1000.0) {
                double overrideTPS = shooter.getCurrentDefaultTPS();
                targetTPS = hasShotOnce
                    ? Math.max(overrideTPS, shooter.getMinCalibrationTPS())
                    : overrideTPS;
            } else {
                targetTPS = shooter.getTargetShooterTPS();
            }
            if (rightBumper && targetTPS > 1600.0) targetTPS = 1600.0;
            if (RobotConstants.hasFarShotTxOffset() && targetTPS > 1650)
                shooter.setFarShotTxOffset(2.5);
            else
                shooter.clearFarShotTxOffset();

            boolean shooterReady  = shooter.isShooterSpeedReady(targetTPS);
            boolean turretOnTarget = shooter.isTurretOnTarget(isRedAlliance);
            boolean robotSpeedOk  = robotSpeed < 1000.0;
            if (safeMode) { shooterReady = turretOnTarget = robotSpeedOk = true; }

            // ── Intake / transfer ──────────────────────────────────────────
            boolean feeding = false;
            if (turretZeroingState == TurretZeroingState.ZEROING) {
                shootingLatched = false;
                shooter.setBlocker(true);
            } else {
                if (!shootButtonPressed) {
                    shootingLatched = false;
                } else {
                    if (shootingLatched) {
                        if (!turretOnTarget || !robotSpeedOk) shootingLatched = false;
                    } else {
                        if (shooterReady && robotSpeedOk) shootingLatched = true;
                    }
                }
                if (shootButtonPressed) shooter.setBlocker(false);

                if (shootButtonPressed && shootingLatched && turretOnTarget) {
                    hasShotOnce = true;
                    if (!wasFeeding) feedingStartTime = System.currentTimeMillis();
                    double transferPower;
                    if (targetTPS > 1650) {
                        long dur = System.currentTimeMillis() - feedingStartTime;
                        transferPower = (dur < 250) ? 1.0 : 0.6;
                    } else {
                        transferPower = 1.0;
                    }
                    shooter.setTransferPower(transferPower);
                    feeding = true;
                }
            }
            wasFeeding = feeding;

            if (turretZeroingState == TurretZeroingState.ZEROING) {
                shooter.controlShooter(false);
                SHOOTING = false;
            } else if (shootButtonPressed) {
                if (manualRPMMode) shooter.controlShooterManual(manualTargetTPS, true, feeding);
                else               shooter.controlShooter(true, feeding);
                SHOOTING = true;
            } else {
                if (hasShotOnce) {
                    shooter.controlShooterManual(shooter.getMinCalibrationTPS(), true);
                } else {
                    shooter.controlShooter(true);
                }
                SHOOTING = true;
            }
            if (safeMode) { shooter.setRawPower(0.55); SHOOTING = true; }

            if (gamepad1.back) {
                shooter.runIntakeSystem(-1.0);
                shooter.setBlocker(true);
                feeding = true;
            }
            if (gamepad1.right_trigger > 0.1) {
                shooter.runIntakeSystem(1.0);
                shooter.setBlocker(true);
                feeding = true;
            }
            if (!feeding) {
                if (shootButtonPressed) shooter.runIntakeSystem(0);
                else { shooter.runIntakeSystem(0.30); shooter.setBlocker(true); }
            }

            // ── LED feedback ───────────────────────────────────────────────
            if (turretZeroingState == TurretZeroingState.ZEROING) {
                shooter.setLightColor(RobotConstants.LIGHT_RED);
            } else {
                boolean turretVisual = shooter.isTurretUsingVisualTracking();
                boolean usingOdometryOnlyTooFast = !turretVisual && !velocityLowEnough;
                shooter.updateLightServo(
                    SHOOTING, shooterReady, feeding,
                    feeding && SHOOTING && shooterReady,
                    detectedTagId > 0, turretOnTarget, turretVisual,
                    usingOdometryOnlyTooFast, shootButtonPressed);
            }
            if (safeMode) shooter.setLightOrange();
            if (gamepad1.x)  shooter.setLightPurple();

            // ── Climber ────────────────────────────────────────────────────
            boolean startButton = gamepad1.start;
            if (startButton && !lastStartButton) {
                climberUp = !climberUp;
                if (climberUp) shooter.setClimberUp();
                else           shooter.setClimberDown();
            }
            lastStartButton = startButton;

            // ── Telemetry (throttled to every 2nd loop) ────────────────────
            loopCounter++;
            if (loopCounter % 2 == 0) {
                telemetry.addData("Status", "%d | %.0fHz | %s %s %s",
                    RobotConstants.getCurrentRobot(), loopsPerSecond,
                    isRedAlliance ? "RED" : "BLUE",
                    SHOOTING ? "SHOOTING" : "",
                    safeMode ? "** SAFE MODE **" : "");
                telemetry.addData("Shooter", "%.0f/%.0f TPS %s %s %s",
                    currentTPS, targetTPS,
                    manualRPMMode ? "MAN" : "AUTO",
                    shooterReady ? "READY" : "",
                    shootingLatched ? "LATCHED" : "");
                telemetry.addData("Speed", "%.0f mm/s %s", robotSpeed, robotSpeedOk ? "" : "TOO FAST");
                String turretStatus = (turretZeroingState == TurretZeroingState.ZEROING)
                    ? "ZEROING: " + shooter.getHomingStatus()
                    : String.format("%.1f° %s %s",
                        shooter.getTurretAngle(),
                        turretDisabled ? "DISABLED" : (shooter.isTurretUsingVisualTracking() ? "VISUAL" : "ODO"),
                        shooter.isTurretOnTarget(isRedAlliance) ? "ON TARGET" : "");
                telemetry.addData("Turret", turretStatus);
                telemetry.addData("Position", "X:%.1f Y:%.1f H:%.1f°",
                    drive.getOdometryX() / 25.4,
                    drive.getOdometryY() / 25.4,
                    drive.getOdometryHeading());
                telemetry.addData("Goal Offset", "X:%.1f\\\\" Y:%.1f\\\\" (Gamepad2 Dpad)",
                    shooter.getGoalOffsetX(), shooter.getGoalOffsetY());
                telemetry.update();
                panelsTelemetry.update(telemetry);
            }
        }

        drive.stopMotors();
        shooter.stopAll();
    }
}`,
  "far-auto-blue": `package org.firstinspires.ftc.teamcode.opmodes.autos;

import com.bylazar.configurables.annotations.Configurable;
import com.bylazar.telemetry.PanelsTelemetry;
import com.bylazar.telemetry.TelemetryManager;
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.util.ElapsedTime;

import org.firstinspires.ftc.teamcode.Constants.RobotConstants;
import org.firstinspires.ftc.teamcode.subsystems.Shooter;
import org.firstinspires.ftc.teamcode.pedroPathing.Constants;

import com.pedropathing.follower.Follower;
import com.pedropathing.geometry.BezierCurve;
import com.pedropathing.geometry.BezierLine;
import com.pedropathing.geometry.Pose;
import com.pedropathing.paths.PathChain;

@Autonomous(name = "Far Auto Blue", group = "Autonomous")
@Configurable
public class FarAuto_BLUE extends LinearOpMode {

    private TelemetryManager panelsTelemetry;
    private Shooter shooter;
    private Follower follower;

    private ElapsedTime shootTimer        = new ElapsedTime();
    private ElapsedTime turretLockTimer   = new ElapsedTime();
    private ElapsedTime turretAcquireTimer = new ElapsedTime();

    private static final double SHOOT_TIME           = 0.5;
    private static final double TURRET_LOCK_TIME     = 0.25;
    private static final double TURRET_ACQUIRE_TIMEOUT = 0.75;

    private boolean shooterRunning          = false;
    private double  targetShooterVelocity   = RobotConstants.DEFAULT_TARGET_SHOOTER_VELOCITY;
    private boolean shootingStarted         = false;

    private double[] shotTxValues = new double[10];
    private int      shotCount    = 0;

    private boolean turretTrackingEnabled = true;

    // ── Configurable init options ────────────────────────────────────────────
    boolean skipTape3  = false;
    int     cycleCount = 4;
    int     remainingCycles;

    // ── State machine ────────────────────────────────────────────────────────
    enum State {
        StartShot, Shooting,
        StartToShotPoint,
        ToTape3, Tape3ToShoot,
        ToHuman, HumanToShoot,
        ToCyclePoint1, CycleToShot,
        Leave
    }
    State state;
    State nextState;

    // ── Fixed field positions (BLUE alliance, far side) ──────────────────────
    // X coordinates are mirrored from RED: blueX = 144 - redX
    private static final Pose SHOT_POINT  = new Pose(46.5,   10.5);
    private static final Pose TAPE3_POS   = new Pose(19,     36);
    private static final Pose TAPE3_CTRL  = new Pose(64,     35.864);
    private static final Pose HUMAN_POS   = new Pose(6.689,  8.874);
    private static final Pose CYCLE_POS   = new Pose(15.5,   10.951);
    private static final Pose LEAVE_POS   = new Pose(39.447, 18.301);

    @Override
    public void runOpMode() throws InterruptedException {
        RobotConstants.setRobot(RobotConstants.ROBOT_19564);

        panelsTelemetry = PanelsTelemetry.INSTANCE.getTelemetry();
        shooter  = new Shooter(hardwareMap);
        follower = Constants.createFollower(hardwareMap);
        follower.setStartingPose(new Pose(64, 8.350, Math.toRadians(180)));

        // Start Limelight background thread (BLUE alliance = tag 20)
        shooter.startLimelightThread(false);

        // ── Init loop: configure match options ───────────────────────────
        boolean lastDpadUp = false, lastDpadDown = false;
        while (!isStarted() && !isStopRequested()) {
            if (gamepad1.left_bumper)  skipTape3 = true;
            else if (gamepad1.right_bumper) skipTape3 = false;

            if (gamepad1.dpad_up   && !lastDpadUp)   cycleCount++;
            if (gamepad1.dpad_down && !lastDpadDown)  cycleCount = Math.max(0, cycleCount - 1);
            lastDpadUp   = gamepad1.dpad_up;
            lastDpadDown = gamepad1.dpad_down;

            telemetry.addLine("=== FAR AUTO BLUE (Hybrid V2) ===");
            telemetry.addLine("LB: Skip Tape3 / RB: Include Tape3");
            telemetry.addData("Skip Tape 3", skipTape3);
            telemetry.addLine("Dpad Up/Down = cycle count");
            telemetry.addData("Cycle Count", cycleCount);
            telemetry.update();
            panelsTelemetry.update(telemetry);
        }

        // ── Start ────────────────────────────────────────────────────────
        shooter.initServos();
        shooter.blockShooter();

        remainingCycles  = cycleCount;
        state            = State.StartShot;
        shooterRunning   = true;
        turretTrackingEnabled = true;
        shootingStarted  = false;
        turretAcquireTimer.reset();

        ElapsedTime telemetryTimer = new ElapsedTime();
        boolean autoComplete = false;

        // ── Main loop ────────────────────────────────────────────────────
        while (opModeIsActive()) {
            if (state != State.Shooting) follower.update();

            shooter.updateMotorCache();
            shooter.processLimelightData(false);

            autonomousPathUpdate();
            shooter.updateShooter(shooterRunning, targetShooterVelocity);

            // Continuous turret aim while driving
            if (turretTrackingEnabled) {
                Pose pose = follower.getPose();
                shooter.pointTurretAtGoalInches(false, true,
                        pose.getX(), pose.getY(), Math.toDegrees(pose.getHeading()));
            }

            // Telemetry at 10 Hz
            if (telemetryTimer.milliseconds() > 100 && !autoComplete) {
                telemetryTimer.reset();
                Pose pose = follower.getPose();
                if (shooterRunning) {
                    boolean sReady = Math.abs(shooter.getShooterVelocity()
                        - targetShooterVelocity) <= RobotConstants.VELOCITY_TOLERANCE;
                    boolean tOnTarget = shooter.isTurretOnTarget(false);
                    shooter.updateLightServo(true, sReady, !follower.isBusy(),
                        state == State.Shooting || state == State.StartShot,
                        shooter.hasLimelightTarget(), tOnTarget,
                        shooter.isTurretUsingVisualTracking(), shooter.hasThreeBalls());
                }
                telemetry.addData("State",            state);
                telemetry.addData("Remaining Cycles", remainingCycles);
                telemetry.addData("X/Y",              "%.1f / %.1f", pose.getX(), pose.getY());
                telemetry.addData("Heading",          "%.1f°", Math.toDegrees(pose.getHeading()));
                telemetry.addData("Shooter TPS",      shooter.getShooterVelocity());
                telemetry.addData("Target TPS",       targetShooterVelocity);
                telemetry.addData("Turret",           shooter.isTurretUsingVisualTracking() ? "VISUAL" : "ODO");
                telemetry.update();
            }

            // Final summary when auto completes
            if (state == State.Leave && !follower.isBusy() && !autoComplete) {
                autoComplete = true;
                telemetry.clear();
                telemetry.addLine("========== AUTO COMPLETE ==========");
                for (int i = 0; i < shotCount; i++)
                    telemetry.addData("Shot " + (i + 1), "%.2f°", shotTxValues[i]);
                telemetry.addData("Final X", "%.1f", follower.getPose().getX());
                telemetry.addData("Final Y", "%.1f", follower.getPose().getY());
                telemetry.update();
            }
        }

        shooter.stopAll();
    }

    // ── Dynamic path builders ────────────────────────────────────────────────

    /** Straight BezierLine from current pose to target. */
    private PathChain buildPathTo(Pose target, boolean reversed) {
        Pose current = follower.getPose();
        if (reversed) {
            return follower.pathBuilder()
                    .addPath(new BezierLine(current, target))
                    .setTangentHeadingInterpolation()
                    .setReversed()
                    .build();
        }
        return follower.pathBuilder()
                .addPath(new BezierLine(current, target))
                .setTangentHeadingInterpolation()
                .build();
    }

    /** Curved BezierCurve detour to the Tape-3 pickup zone. */
    private PathChain buildPathToTape3() {
        Pose current = follower.getPose();
        Pose ctrl    = new Pose(current.getX(), TAPE3_CTRL.getY());
        return follower.pathBuilder()
                .addPath(new BezierCurve(current, ctrl, TAPE3_POS))
                .setTangentHeadingInterpolation()
                .build();
    }

    /** Straight return from Tape-3 to the shot point, constant heading. */
    private PathChain buildPathFromTape3ToShot() {
        return follower.pathBuilder()
                .addPath(new BezierLine(follower.getPose(), SHOT_POINT))
                .setConstantHeadingInterpolation(Math.toRadians(180))
                .build();
    }

    // ── State machine ────────────────────────────────────────────────────────

    public void autonomousPathUpdate() {
        switch (state) {

            case StartShot:
                if (!shootingStarted) {
                    boolean tOnTarget  = shooter.isTurretOnTarget(false);
                    boolean timedOut   = turretAcquireTimer.seconds() >= TURRET_ACQUIRE_TIMEOUT;
                    boolean sReady     = Math.abs(shooter.getShooterVelocity()
                        - targetShooterVelocity) <= RobotConstants.VELOCITY_TOLERANCE;
                    if (sReady && (tOnTarget || timedOut)) {
                        targetShooterVelocity = shooter.getTargetShooterTPS();
                        if (shotCount < shotTxValues.length)
                            shotTxValues[shotCount++] = shooter.getAngleToTag();
                        shooter.unblockShooter();
                        shooter.runIntake();
                        shootTimer.reset();
                        shootingStarted = true;
                    }
                    break;
                }
                if (shootTimer.seconds() >= SHOOT_TIME) {
                    shooter.blockShooter();
                    shooter.stopIntakeSystem();
                    shootingStarted = false;
                    if (skipTape3) {
                        state = State.StartToShotPoint;
                        shooterRunning = true;
                        turretTrackingEnabled = true;
                        follower.followPath(buildPathTo(SHOT_POINT, false), false);
                    } else {
                        state = State.ToTape3;
                        shooterRunning = false;
                        turretTrackingEnabled = false;
                        shooter.setTurretPower(0);
                        shooter.runIntake();
                        follower.followPath(buildPathToTape3(), true);
                    }
                }
                break;

            case StartToShotPoint:
                if (!follower.isBusy()) {
                    targetShooterVelocity = shooter.getTargetShooterTPS();
                    shooter.stopIntakeSystem();
                    state = State.Shooting;
                    nextState = State.ToHuman;
                    shootingStarted = false;
                    turretLockTimer.reset();
                    follower.breakFollowing();
                }
                break;

            case Shooting:
                if (!shootingStarted) {
                    boolean sReady   = Math.abs(shooter.getShooterVelocity()
                        - targetShooterVelocity) <= RobotConstants.VELOCITY_TOLERANCE;
                    boolean tLocked  = turretLockTimer.seconds() >= TURRET_LOCK_TIME;
                    if (sReady && tLocked) {
                        if (shotCount < shotTxValues.length)
                            shotTxValues[shotCount++] = shooter.getAngleToTag();
                        shooter.unblockShooter();
                        shooter.runIntake();
                        shootTimer.reset();
                        shootingStarted = true;
                    }
                    break;
                }
                if (shootTimer.seconds() >= SHOOT_TIME) {
                    shooter.blockShooter();
                    shooter.stopIntakeSystem();
                    follower.update();
                    turretTrackingEnabled = false;
                    shooter.setTurretPower(0);
                    if (nextState == State.ToHuman) {
                        state = State.ToHuman;
                        shooterRunning = false;
                        shooter.runIntake();
                        follower.followPath(buildPathTo(HUMAN_POS, false), true);
                    } else if (nextState == State.ToCyclePoint1) {
                        state = State.ToCyclePoint1;
                        shooterRunning = false;
                        shooter.runIntake();
                        follower.followPath(buildPathTo(CYCLE_POS, false), true);
                    } else if (nextState == State.Leave) {
                        state = State.Leave;
                        shooterRunning = false;
                        shooter.stopIntakeSystem();
                        follower.followPath(buildPathTo(LEAVE_POS, false), false);
                    }
                }
                break;

            case ToTape3:
                if (!follower.isBusy()) {
                    state = State.Tape3ToShoot;
                    shooterRunning = true;
                    turretTrackingEnabled = true;
                    shooter.stopIntakeSystem();
                    shooter.blockShooter();
                    shooter.runIdleIntake();
                    follower.followPath(buildPathFromTape3ToShot(), false);
                }
                break;

            case Tape3ToShoot:
                if (!follower.isBusy()) {
                    targetShooterVelocity = shooter.getTargetShooterTPS();
                    shooter.stopIntakeSystem();
                    state = State.Shooting;
                    nextState = State.ToHuman;
                    shootingStarted = false;
                    turretLockTimer.reset();
                    follower.breakFollowing();
                }
                break;

            case ToHuman:
                if (!follower.isBusy()) {
                    state = State.HumanToShoot;
                    shooterRunning = true;
                    turretTrackingEnabled = true;
                    shooter.stopIntakeSystem();
                    shooter.blockShooter();
                    shooter.runIdleIntake();
                    follower.followPath(buildPathTo(SHOT_POINT, true), false);
                }
                break;

            case HumanToShoot:
                if (!follower.isBusy()) {
                    remainingCycles--;
                    targetShooterVelocity = shooter.getTargetShooterTPS();
                    shooter.stopIntakeSystem();
                    state = State.Shooting;
                    shootingStarted = false;
                    turretLockTimer.reset();
                    follower.breakFollowing();
                    nextState = (remainingCycles > 0) ? State.ToHuman : State.Leave;
                }
                break;

            case ToCyclePoint1:
                if (!follower.isBusy()) {
                    state = State.CycleToShot;
                    shooterRunning = true;
                    turretTrackingEnabled = true;
                    shooter.stopIntakeSystem();
                    shooter.blockShooter();
                    shooter.runIdleIntake();
                    follower.followPath(buildPathTo(SHOT_POINT, true), false);
                }
                break;

            case CycleToShot:
                if (!follower.isBusy()) {
                    remainingCycles--;
                    targetShooterVelocity = shooter.getTargetShooterTPS();
                    shooter.stopIntakeSystem();
                    state = State.Shooting;
                    shootingStarted = false;
                    turretLockTimer.reset();
                    follower.breakFollowing();
                    nextState = (remainingCycles > 0) ? State.ToCyclePoint1 : State.Leave;
                }
                break;

            case Leave:
                turretTrackingEnabled = false;
                shooter.setTurretPower(0);
                shooter.stopIntakeSystem();
                break;
        }
    }
}`,
  "limelight-diagnostic": `package org.firstinspires.ftc.teamcode.TestOpModes;

import com.qualcomm.robotcore.eventloop.opmode.Disabled;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.limelightvision.LLResult;
import com.qualcomm.hardware.limelightvision.LLResultTypes;
import com.qualcomm.hardware.limelightvision.LLStatus;

import java.util.List;

/**
 * Standalone diagnostic for the Limelight 3A.
 * Reads and displays raw values only — no subsystem processing.
 *
 * CONTROLS:
 *   A — Restart limelight (stop → 100 ms sleep → start, resets counters)
 *   B — Switch to pipeline 1
 *   X — Switch to pipeline 0
 *   Y — Cycle poll rate: 100 → 50 → 25 → 10 → 100 Hz
 */
@TeleOp(name = "Limelight Diagnostic", group = "Test")
@Disabled
public class LimelightDiagnostic extends LinearOpMode {

    private Limelight3A limelight;

    // Stale-frame tracking
    private double lastTx          = -999;
    private double lastTy          = -999;
    private long   lastChangeTime  = 0;
    private int    sameFrameCount  = 0;
    private long   totalFrames     = 0;
    private long   staleFrames     = 0;

    // Limelight's internal timestamp (updates when a new frame is processed)
    private double lastTimestamp = -1;

    // Poll-rate cycling
    private int   pollRateIndex = 0;
    private int[] pollRates     = {100, 50, 25, 10};
    private boolean lastYButton = false;
    private boolean lastAButton = false;

    @Override
    public void runOpMode() {
        telemetry.setMsTransmissionInterval(50);

        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        limelight.setPollRateHz(pollRates[pollRateIndex]);
        limelight.pipelineSwitch(0);
        limelight.start();

        telemetry.addData("Status",   "Limelight initialized");
        telemetry.addData("Controls", "A=restart  B=pipe1  X=pipe0  Y=pollrate");
        telemetry.addData("Press",    "START to begin diagnostic");
        telemetry.update();

        waitForStart();
        lastChangeTime = System.currentTimeMillis();

        while (opModeIsActive()) {

            // ── Button handling ─────────────────────────────────────────
            if (gamepad1.a && !lastAButton) {
                limelight.stop();
                sleep(100);
                limelight.start();
                totalFrames = 0;
                staleFrames = 0;
            }
            lastAButton = gamepad1.a;

            if (gamepad1.b) limelight.pipelineSwitch(1);
            if (gamepad1.x) limelight.pipelineSwitch(0);

            if (gamepad1.y && !lastYButton) {
                pollRateIndex = (pollRateIndex + 1) % pollRates.length;
                limelight.setPollRateHz(pollRates[pollRateIndex]);
            }
            lastYButton = gamepad1.y;

            // ── Read latest result (no caching, no threading) ───────────
            LLResult result = limelight.getLatestResult();
            totalFrames++;

            if (result == null) {
                telemetry.addData("ERROR", "Result is NULL");
                telemetry.update();
                continue;
            }

            boolean isValid        = result.isValid();
            double  tx             = result.getTx();
            double  ty             = result.getTy();
            double  ta             = result.getTa();
            double  captureLatency = result.getCaptureLatency();
            double  targetLatency  = result.getTargetingLatency();
            double  timestamp      = result.getTimestamp();
            int     pipelineIndex  = result.getPipelineIndex();

            // ── Stale-frame detection ────────────────────────────────────
            boolean txChanged        = Math.abs(tx - lastTx)             > 0.01;
            boolean tyChanged        = Math.abs(ty - lastTy)             > 0.01;
            boolean timestampChanged = Math.abs(timestamp - lastTimestamp) > 0.001;

            if (txChanged || tyChanged || timestampChanged) {
                sameFrameCount = 0;
                lastChangeTime = System.currentTimeMillis();
            } else {
                sameFrameCount++;
                if (sameFrameCount > 5) staleFrames++;  // >5 identical = stale
            }
            lastTx = tx; lastTy = ty; lastTimestamp = timestamp;
            long timeSinceChange = System.currentTimeMillis() - lastChangeTime;

            // ── AprilTag fiducial results ────────────────────────────────
            List<LLResultTypes.FiducialResult> fiducials = result.getFiducialResults();
            int    tagCount = (fiducials != null) ? fiducials.size() : 0;
            String tagIds   = "";
            double tagTx    = 0, tagTy = 0;
            if (fiducials != null && !fiducials.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (LLResultTypes.FiducialResult f : fiducials) {
                    if (sb.length() > 0) sb.append(",");
                    sb.append((int) f.getFiducialId());
                }
                tagIds = sb.toString();
                tagTx  = fiducials.get(0).getTargetXDegrees();
                tagTy  = fiducials.get(0).getTargetYDegrees();
            }

            LLStatus status = limelight.getStatus();

            // ── Driver Station display ───────────────────────────────────
            telemetry.addData("=== LIMELIGHT DIAGNOSTIC ===", "");
            telemetry.addData("Controls", "A=restart  B=pipe1  X=pipe0  Y=pollrate");
            telemetry.addLine("");

            telemetry.addData("Valid",     isValid ? "YES" : "NO");
            telemetry.addData("Pipeline",  pipelineIndex);
            telemetry.addData("Poll Rate", "%d Hz", pollRates[pollRateIndex]);
            if (status != null) {
                telemetry.addData("LL Temp", "%.1f C", status.getTemp());
                telemetry.addData("LL FPS",  "%.1f",   status.getFps());
            }
            telemetry.addLine("");

            telemetry.addData("=== RAW VALUES ===", "");
            telemetry.addData("tx", "%.3f %s", tx, txChanged ? "[CHANGED]" : "");
            telemetry.addData("ty", "%.3f %s", ty, tyChanged ? "[CHANGED]" : "");
            telemetry.addData("ta", "%.3f",    ta);
            telemetry.addLine("");

            telemetry.addData("=== TIMING ===", "");
            telemetry.addData("Timestamp",         "%.4f %s", timestamp, timestampChanged ? "[NEW]" : "[SAME]");
            telemetry.addData("Capture Latency",   "%.1f ms", captureLatency);
            telemetry.addData("Targeting Latency", "%.1f ms", targetLatency);
            telemetry.addData("Time Since Change", "%d ms",   timeSinceChange);
            telemetry.addLine("");

            telemetry.addData("=== APRILTAGS ===", "");
            telemetry.addData("Tags Detected", tagCount);
            telemetry.addData("Tag IDs",        tagIds.isEmpty() ? "none" : tagIds);
            if (tagCount > 0)
                telemetry.addData("Tag tx/ty", "%.2f / %.2f", tagTx, tagTy);
            telemetry.addLine("");

            telemetry.addData("=== STALENESS ===", "");
            telemetry.addData("Same Frame Count", sameFrameCount);
            telemetry.addData("Stale Frames",
                "%d / %d (%.1f%%)", staleFrames, totalFrames,
                totalFrames > 0 ? (100.0 * staleFrames / totalFrames) : 0);
            telemetry.addData("Status", timeSinceChange > 100 ? ">>> STALE <<<" : "Fresh");

            telemetry.update();
        }

        limelight.stop();
    }
}`,
  "gate-intake-test": `package org.firstinspires.ftc.teamcode.TestOpModes;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

import org.firstinspires.ftc.teamcode.Constants.RobotConstants;
import org.firstinspires.ftc.teamcode.subsystems.Shooter;

/**
 * Gate Intake Alignment Test
 *
 * Locks the turret to the same angle computed by the autonomous program
 * when the robot is at the gate intake (lever) position, then displays
 * the live AprilTag distance for alignment verification.
 *
 * CONTROLS:
 *   B — Toggle RED / BLUE alliance (recomputes turret angle)
 */
@TeleOp(name = "Gate Intake Test", group = "Test")
public class GateIntakeTest extends LinearOpMode {

    private Shooter shooter;
    private boolean isRedAlliance = false;

    // Gate intake (lever) field coordinates — must match ConfigAuto_BLUE ToLever state
    private static final double LEVER_POS_X    = 12.25;  // inches
    private static final double LEVER_POS_Y    = 54.5;   // inches
    private static final double LEVER_HEADING  = 146.0;  // degrees from field X-axis

    private double leverApproachTurretAngle = 0.0;

    @Override
    public void runOpMode() throws InterruptedException {
        RobotConstants.setRobot(RobotConstants.ROBOT_19564);

        shooter = new Shooter(hardwareMap);

        // Assume turret is physically at its zero (limit-switch) position
        shooter.setHomePosition(0.0);

        // Start Limelight background thread (BLUE by default)
        shooter.startLimelightThread(isRedAlliance);
        shooter.initTurretMotor();

        // Compute the turret angle the robot needs at the lever position
        leverApproachTurretAngle = computeLeverAngle(isRedAlliance);

        waitForStart();

        while (opModeIsActive()) {
            shooter.updateMotorCache();
            shooter.processLimelightData(isRedAlliance);

            // Hold the turret at the precomputed angle (same as ConfigAuto_BLUE)
            shooter.setTurretAngle(leverApproachTurretAngle);

            double tagDistance = shooter.getAprilTagDistance(isRedAlliance);

            // Alliance toggle with debounce
            if (gamepad1.b) {
                isRedAlliance = !isRedAlliance;
                shooter.startLimelightThread(isRedAlliance);
                leverApproachTurretAngle = computeLeverAngle(isRedAlliance);
                sleep(100);
            }

            telemetry.addData("Tag Distance",  "%.2f in",  tagDistance);
            telemetry.addData("Alliance (B)",   isRedAlliance ? "RED" : "BLUE");
            telemetry.addData("Turret Angle",  "%.1f°",    leverApproachTurretAngle);
            telemetry.update();
        }

        shooter.stopAll();
    }

    /**
     * Mirrors the turret-angle calculation used in the autonomous ToLever state.
     * Converts field positions from inches to mm before calling the subsystem helper.
     */
    private double computeLeverAngle(boolean redAlliance) {
        double leverX = LEVER_POS_X * RobotConstants.INCHES_TO_MM;
        double leverY = LEVER_POS_Y * RobotConstants.INCHES_TO_MM;
        double goalX  = redAlliance ? RobotConstants.GOAL_RED_X  : RobotConstants.GOAL_BLUE_X;
        double goalY  = redAlliance ? RobotConstants.GOAL_RED_Y  : RobotConstants.GOAL_BLUE_Y;
        return shooter.calculateTurretAngleToGoal(goalX, goalY, leverX, leverY, LEVER_HEADING);
    }
}`,
};

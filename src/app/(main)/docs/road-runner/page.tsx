import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Road Runner – FTC Programming Hub" };

export default function RoadRunnerPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/road-runner" },
        { label: "Road Runner" },
      ]}
      title="Road Runner"
      description="Road Runner is a motion-planning library for FTC that generates smooth, constraint-respecting motion profiles along Bézier spline paths. Learn setup, tuning, trajectories, and followTrajectorySequence."
      badge="Autonomous"
      badgeColor="violet"
      readingTime="18 min"
      sections={[
        {
          id: "what-is-road-runner",
          title: "What is Road Runner?",
          content: (
            <Prose>
              <p>
                Road Runner (RR) is a motion-planning library that computes{" "}
                <strong>trapezoidal velocity profiles</strong> along Bézier spline
                paths. Unlike simple encoder-based moves, RR respects real
                physical constraints: max velocity, max acceleration, and maximum
                centripetal acceleration through curves.
              </p>
              <InfoGrid
                items={[
                  { label: "Version", value: "1.0.x", sub: "Latest stable" },
                  { label: "Path Type", value: "Bézier Splines", sub: "C2 continuous" },
                  { label: "Control", value: "Feedforward + PIDF", sub: "Full state control" },
                  { label: "Odometry", value: "Dead wheels / Drive enc.", sub: "Both supported" },
                ]}
              />
              <NoteBox type="warning">
                Road Runner 1.0 introduced <strong>breaking changes</strong> from
                0.5.x. If you are migrating an older robot, the{" "}
                <code>TrajectoryBuilder</code> and{" "}
                <code>TrajectorySequenceBuilder</code> APIs are replaced by{" "}
                <code>ActionBuilder</code>. Review the{" "}
                <a
                  href="https://rr.brott.dev"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  official migration guide
                </a>{" "}
                before porting.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "installation",
          title: "Installation & Setup",
          content: (
            <Prose>
              <p>
                The easiest way to start is with the{" "}
                <strong>Road Runner Quickstart</strong> repository — a
                pre-configured FTC project with all dependencies and tuning
                OpModes included.
              </p>
              <StepList
                steps={[
                  "Clone the Road Runner Quickstart from GitHub: acmerobotics/road-runner-ftc.",
                  "Open in Android Studio and let Gradle sync.",
                  "In TeamCode, find and open DriveConstants.java.",
                  "Fill in your robot's physical measurements (see DriveConstants section below).",
                  "Run the tuning OpModes in order to calibrate feedforward and PID.",
                ]}
              />
              <p>
                Alternatively, add the Gradle dependency manually to an existing
                project:
              </p>
              <CodeBlock
                filename="build.gradle"
                lang="groovy"
                code={`// In TeamCode/build.gradle (or your module's build.gradle)
dependencies {
    implementation 'com.acmerobotics.roadrunner:core:1.0.0'
    implementation 'com.acmerobotics.roadrunner:actions:1.0.0'

    // FTC Dashboard for real-time tuning graphs (strongly recommended)
    implementation 'com.acmerobotics.dashboard:dashboard:0.4.16'
}

repositories {
    maven { url = 'https://maven.brott.dev/' }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "drive-constants",
          title: "DriveConstants Configuration",
          content: (
            <Prose>
              <p>
                <code>DriveConstants.java</code> is the single source of truth for
                your robot&apos;s physical parameters. Accurate values here are the
                foundation of all RR accuracy.
              </p>
              <SpecTable
                rows={[
                  { label: "TICKS_PER_REV", value: "537.7", note: "goBILDA 19.2:1" },
                  { label: "MAX_RPM", value: "312", note: "Motor free speed" },
                  { label: "WHEEL_RADIUS", value: "1.89 in", note: "48 mm goBILDA mecanum" },
                  { label: "GEAR_RATIO", value: "1.0", note: "Motor output to wheel" },
                  { label: "TRACK_WIDTH", value: "Measure!", note: "Wheel center to center" },
                ]}
              />
              <CodeBlock
                filename="DriveConstants.java"
                code={`public class DriveConstants {

    /*
     * Measure TRACK_WIDTH physically on your robot using a ruler.
     * Run the WheelVelocityTuner to verify/refine with encoders.
     */
    public static final double TICKS_PER_REV  = 537.7;  // goBILDA 5202-0002-0019
    public static final double MAX_RPM        = 312;
    public static final double WHEEL_RADIUS   = 1.89;   // inches (96mm goBILDA wheel)
    public static final double GEAR_RATIO     = 1;      // output : wheel
    public static final double TRACK_WIDTH    = 14.2;   // MEASURE THIS — inches

    // ── Feedforward parameters ──────────────────────────────────────────────
    // Start with kV = 1/maxVelocity, then tune with ForwardRampLogger
    public static double kV      = 1.0 / rpmToVelocity(MAX_RPM);
    public static double kA      = 0;
    public static double kStatic = 0;

    // ── Velocity and acceleration limits ────────────────────────────────────
    // Be conservative at first — increase after initial tuning
    public static double MAX_VEL         = 40;                      // in/s
    public static double MAX_ACCEL       = 35;                      // in/s²
    public static double MAX_ANG_VEL     = Math.toRadians(180);     // rad/s
    public static double MAX_ANG_ACCEL   = Math.toRadians(180);     // rad/s²

    // ── Unit conversions ─────────────────────────────────────────────────────
    public static double encoderTicksToInches(double ticks) {
        return WHEEL_RADIUS * 2 * Math.PI * GEAR_RATIO * ticks / TICKS_PER_REV;
    }

    public static double rpmToVelocity(double rpm) {
        return rpm * GEAR_RATIO * 2 * Math.PI * WHEEL_RADIUS / 60.0;
    }
}`}
              />
              <NoteBox type="tip">
                Measure <code>TRACK_WIDTH</code> by driving your robot in a full
                360° circle using only rotation (no translation) and comparing the
                theoretical arc length to the encoder readings. Iterate until
                the robot turns exactly 360° with RR commands.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "tuning",
          title: "Tuning Process",
          content: (
            <Prose>
              <p>
                Tuning is the most critical step in Road Runner setup. Run each
                OpMode <strong>in order</strong> — later steps depend on earlier
                ones being correct.
              </p>
              <StepList
                steps={[
                  "ForwardPushTest — Push robot 60 in, verify encoder ticks match.",
                  "ForwardRampLogger — Slowly accelerate; FTC Dashboard plots kV and kA.",
                  "LateralRampLogger — Strafe version of above for mecanum correction.",
                  "ManualFeedforwardTuner — Fine-tune kV/kA/kStatic with live graph.",
                  "ManualFeedbackTuner — Tune translational and heading PIDF gains.",
                  "SplineTest — Drive a spline; verify accuracy visually and with telemetry.",
                ]}
              />
              <NoteBox type="info">
                Install{" "}
                <strong>FTC Dashboard</strong> and connect your phone/computer to
                the robot Wi-Fi network. Open{" "}
                <code>http://192.168.43.1:8080/dash</code> during tuning to see
                live position plots and adjust constants in real time.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "creating-trajectories",
          title: "Creating Trajectories",
          content: (
            <Prose>
              <p>
                In Road Runner 1.0, trajectories are built with{" "}
                <code>drive.actionBuilder(startPose)</code>. The builder provides
                a fluent API for chaining movement segments.
              </p>
              <CodeBlock
                filename="AutonomousOp.java"
                code={`@Autonomous(name = "Score Specimen Auto")
public class ScoreSpecimenAuto extends LinearOpMode {

    @Override
    public void runOpMode() throws InterruptedException {
        // MecanumDrive is the Road Runner 1.0 drive class (from quickstart)
        MecanumDrive drive = new MecanumDrive(hardwareMap, new Pose2d(0, 0, 0));

        // ── Build the full autonomous as a sequence of Actions ──────────────
        Action auto = drive.actionBuilder(new Pose2d(0, 0, 0))

            // Spline to spike mark (smooth curve)
            .splineTo(new Vector2d(24, 24), Math.PI / 2)
            .waitSeconds(0.5)  // pause for mechanism

            // Drive straight to backdrop
            .lineToLinearHeading(new Pose2d(48, 36, Math.PI))
            .waitSeconds(0.75)

            // Spline back to stack with tangent heading
            .splineToConstantHeading(new Vector2d(60, 10), 0)
            .waitSeconds(0.5)

            // Return to backdrop
            .splineTo(new Vector2d(48, 36), Math.PI / 2)

            .build();

        waitForStart();

        // Run the entire action — blocks until complete
        Actions.runBlocking(auto);
    }
}`}
              />
              <p>
                Key builder methods and what they do:
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["splineTo(vec, endTangent)", "Smooth spline curve, heading follows tangent"],
                    ["lineToX(x) / lineToY(y)", "Straight line along one axis"],
                    ["strafeToLinearHeading(pose)", "Strafe with linear heading interpolation"],
                    ["lineToLinearHeading(pose)", "Forward + linear heading change"],
                    ["turn(angle)", "Pure rotation in place"],
                    ["waitSeconds(t)", "Hold position for t seconds"],
                  ].map(([m, d]) => (
                    <tr key={m}>
                      <td>{m}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(100 116 139)", fontSize: "0.75rem" }}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Prose>
          ),
        },
        {
          id: "parallel-actions",
          title: "Parallel Actions",
          content: (
            <Prose>
              <p>
                RR 1.0 uses an <strong>Actions</strong> system. You can run
                mechanism actions in parallel with driving using{" "}
                <code>ParallelAction</code> — this saves precious autonomous
                seconds.
              </p>
              <CodeBlock
                filename="ParallelActionsExample.java"
                code={`// Raise the arm while driving to the backdrop (saves ~0.8 s)
Action driveToBackdrop = drive.actionBuilder(spikeMarkPose)
    .lineToLinearHeading(backdropPose)
    .build();

Action raiseArm = new SequentialAction(
    arm.goToHeight(ArmSystem.HIGH_BASKET),
    claw.open()
);

// Both actions run simultaneously; waits for the SLOWER one to finish
Action combined = new ParallelAction(driveToBackdrop, raiseArm);

Actions.runBlocking(combined);`}
              />
              <NoteBox type="tip">
                Prefer <code>ParallelAction</code> over spinning up threads
                manually. RR&apos;s action scheduler handles timing and ensures
                the OpMode loop frequency stays high.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "pid-tuning",
          title: "PID Tuning & DriveConstants",
          content: (
            <Prose>
              <p>
                All physical robot parameters and PID gains live in{" "}
                <code>DriveConstants.java</code>. Getting these right is the most
                important step in Road Runner setup — incorrect constants produce
                trajectory drift even if your code is perfect.
              </p>
              <SpecTable
                rows={[
                  { label: "TICKS_PER_REV", value: "Motor encoder PPR", note: "e.g. 537.6 for goBILDA 19.2:1" },
                  { label: "MAX_RPM", value: "Motor free-run RPM", note: "e.g. 312 for 19.2:1" },
                  { label: "WHEEL_RADIUS", value: "Wheel radius in inches", note: "Mecanum wheel = 1.9725 in" },
                  { label: "GEAR_RATIO", value: "Output/input ratio", note: "1.0 if direct drive" },
                  { label: "TRACK_WIDTH", value: "Lateral wheel-to-wheel", note: "Measured center-to-center" },
                  { label: "MAX_VEL", value: "Max linear velocity (in/s)", note: "Measure empirically" },
                  { label: "MAX_ACCEL", value: "Max acceleration (in/s²)", note: "Start at 30, tune up" },
                  { label: "MAX_ANG_VEL", value: "Max angular velocity (rad/s)", note: "Derived from TRACK_WIDTH" },
                ]}
              />
              <CodeBlock
                
                filename="DriveConstants.java"
                code={`// ── DriveConstants.java — tune every value for YOUR robot ───────────────

public static final double TICKS_PER_REV  = 537.6;  // goBILDA 19.2:1
public static final double MAX_RPM        = 312;

public static final boolean RUN_USING_ENCODER = true;
// If true, motor velocity is controlled by SDK PIDF during trajectories.
// If false, feedforward only — set MOTOR_VELO_PID to null.

public static final double WHEEL_RADIUS  = 1.9725; // inches (96mm mecanum)
public static final double GEAR_RATIO    = 1;       // direct drive
public static final double TRACK_WIDTH   = 14.25;  // inches — measure carefully!

// ── Velocity & acceleration limits ───────────────────────────────────────
// Set MAX_VEL to ~80% of your measured top speed for reliable following.
public static final double MAX_VEL   = 48;   // in/s
public static final double MAX_ACCEL = 35;   // in/s²
public static final double MAX_ANG_VEL = Math.toRadians(185);
public static final double MAX_ANG_ACCEL = Math.toRadians(185);

// ── Feedforward coefficients (kV, kA, kStatic) ───────────────────────────
// Run the ManualFeedforwardTuner OpMode to find these values.
public static double kV      = 1.0 / rpmToVelocity(MAX_RPM);
public static double kA      = 0;
public static double kStatic = 0;

// ── Translational PID ─────────────────────────────────────────────────────
// Run TranslationalPIDTuner then HeadingPIDTuner OpModes in sequence.
public static PIDCoefficients TRANSLATIONAL_PID = new PIDCoefficients(8, 0, 0);
public static PIDCoefficients HEADING_PID        = new PIDCoefficients(8, 0, 0);`}
              />
              <NoteBox type="tip">
                Measure <code>TRACK_WIDTH</code> empirically using the{" "}
                <strong>TrackWidthTuner</strong> OpMode — the physical ruler
                measurement is almost always wrong by 5–15% due to wheel
                compliance. Run the tuner on a full battery.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "async-following",
          title: "Async Following",
          content: (
            <Prose>
              <p>
                <code>followTrajectorySequenceAsync()</code> starts the trajectory
                and returns immediately, letting your OpMode run other code (e.g.
                update a vision pipeline, move a mechanism) on every loop
                iteration. You must call <code>drive.update()</code> every loop
                for the follower to make progress.
              </p>
              <CodeBlock
                
                filename="AsyncFollowing.java"
                code={`// ── Build the sequence (blocking version first, for reference) ─────────
TrajectorySequence seq = drive.trajectorySequenceBuilder(startPose)
    .splineTo(new Vector2d(24, 0), 0)
    .waitSeconds(0.5)
    .splineTo(new Vector2d(48, 0), 0)
    .build();

// ── Start async — returns immediately ────────────────────────────────────
drive.followTrajectorySequenceAsync(seq);

// ── OpMode loop — drive.update() must be called every iteration ──────────
while (opModeIsActive() && drive.isBusy()) {
    // Anything here runs in parallel with the trajectory:
    arm.update();          // e.g. move arm to scoring position
    intake.update();       // e.g. run intake logic
    vision.processFrame(); // e.g. AprilTag detection

    drive.update();        // ← REQUIRED every loop or robot stops moving

    telemetry.addData("Following", drive.isBusy());
    Pose2d poseEst = drive.getPoseEstimate();
    telemetry.addData("X", "%.1f", poseEst.getX());
    telemetry.addData("Y", "%.1f", poseEst.getY());
    telemetry.addData("Heading", "%.1f°", Math.toDegrees(poseEst.getHeading()));
    telemetry.update();
}

// ── Cancel early (e.g. on a button press) ────────────────────────────────
// drive.breakFollowing(); // Stops the active trajectory and halts the robot`}
              />
              <NoteBox type="warning">
                Forgetting <code>drive.update()</code> inside the loop is the
                most common async bug. The robot will freeze in place after the
                first tick because the follower never advances its internal state.
              </NoteBox>
              <NoteBox type="tip">
                Use <code>drive.isBusy()</code> as the loop condition so the loop
                exits cleanly when the sequence completes, rather than needing a
                separate boolean flag.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "constraints",
          title: "Per-Segment Constraints",
          content: (
            <Prose>
              <p>
                Global <code>DriveConstants</code> limits apply to the entire
                trajectory, but you can override velocity and acceleration for
                individual segments using{" "}
                <code>setVelConstraint()</code> and{" "}
                <code>setAccelConstraint()</code>. This is essential for precise
                scoring actions that need to happen at low speed.
              </p>
              <CodeBlock
                
                filename="SegmentConstraints.java"
                code={`import com.acmerobotics.roadrunner.trajectory.constraints.MinVelocityConstraint;
import com.acmerobotics.roadrunner.trajectory.constraints.ProfileAccelerationConstraint;
import com.acmerobotics.roadrunner.trajectory.constraints.TranslationalVelocityConstraint;
import com.acmerobotics.roadrunner.trajectory.constraints.AngularVelocityConstraint;

// ── Helper: combined constraint at a given speed ──────────────────────────
TrajectoryVelocityConstraint slowConstraint = new MinVelocityConstraint(Arrays.asList(
    new TranslationalVelocityConstraint(15),   // 15 in/s max linear
    new AngularVelocityConstraint(Math.toRadians(90)) // 90°/s max angular
));
TrajectoryAccelerationConstraint slowAccel =
    new ProfileAccelerationConstraint(15);     // 15 in/s² decel

// ── Build with per-segment overrides ─────────────────────────────────────
TrajectorySequence seq = drive.trajectorySequenceBuilder(startPose)

    // Full-speed approach
    .splineTo(new Vector2d(36, 0), 0)

    // Slow down to deposit precisely — setVelConstraint applies to this segment only
    .setVelConstraint(slowConstraint)
    .setAccelConstraint(slowAccel)
    .lineTo(new Vector2d(48, 0))          // Slow approach to backdrop
    .waitSeconds(0.4)                      // Deposit action time

    // Resume normal speed for parking
    .resetVelConstraint()
    .resetAccelConstraint()
    .splineTo(new Vector2d(60, -12), Math.toRadians(270))

    .build();

drive.followTrajectorySequence(seq);`}
              />
              <SpecTable
                rows={[
                  { label: "setVelConstraint(c)", value: "Override max velocity for subsequent segments" },
                  { label: "setAccelConstraint(c)", value: "Override max acceleration for subsequent segments" },
                  { label: "resetVelConstraint()", value: "Restore global MAX_VEL from DriveConstants" },
                  { label: "resetAccelConstraint()", value: "Restore global MAX_ACCEL from DriveConstants" },
                ]}
              />
              <NoteBox type="tip">
                Constraints are sticky — they apply to all segments after the call
                until you call <code>resetVelConstraint()</code>. Always reset
                after the slow section to avoid unintentionally limiting the rest
                of the path.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "follow-trajectory-sequence",
          title: "followTrajectorySequence (0.5.x)",
          content: (
            <Prose>
              <p>
                If your team is running <strong>Road Runner 0.5.x</strong> (the
                previous version), you will use{" "}
                <code>TrajectorySequenceBuilder</code> and{" "}
                <code>drive.followTrajectorySequence()</code>. This API is still
                widely used in active FTC code bases.
              </p>
              <CodeBlock
                filename="TrajectorySequenceExample.java"
                code={`Pose2d startPose = new Pose2d(12, -63, Math.toRadians(90));
drive.setPoseEstimate(startPose);

TrajectorySequence autoSequence = drive.trajectorySequenceBuilder(startPose)

    // Drive to spike mark
    .splineTo(new Vector2d(12, -30), Math.toRadians(90))
    .waitSeconds(0.5)

    // Temporal marker: fires at exactly t = 2.0 s into sequence
    .addTemporalMarker(2.0, () -> claw.setPosition(CLAW_OPEN))

    // Drive to backdrop on the other side
    .lineToLinearHeading(new Pose2d(50, -36, Math.toRadians(180)))
    .waitSeconds(0.75)

    // Displacement marker: fires when robot crosses x = 35
    .addDisplacementMarker(() -> arm.goToHigh())

    // Park in corner
    .splineTo(new Vector2d(60, -60), Math.toRadians(315))
    .build();

// Blocking call — waits until sequence is fully complete
drive.followTrajectorySequence(autoSequence);`}
              />
              <SpecTable
                rows={[
                  { label: "addTemporalMarker(t, fn)", value: "Fires at t seconds into sequence" },
                  { label: "addDisplacementMarker(fn)", value: "Fires at current path distance" },
                  { label: "addSpatialMarker(pos, fn)", value: "Fires when robot is near position" },
                  { label: "waitSeconds(t)", value: "Stop and wait for t seconds" },
                  { label: "UNSTABLE_addTemporalMarkerOffset(dt, fn)", value: "Offset from previous marker" },
                ]}
              />
            </Prose>
          ),
        },
      ]}
    />
  );
}

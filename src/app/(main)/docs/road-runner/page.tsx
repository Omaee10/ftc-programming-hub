import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Road Runner – FTC Programming Hub" };

export default function RoadRunnerPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Road Runner" },
      ]}
      title="Road Runner 1.0"
      description="Road Runner is a motion-planning library for FTC that generates smooth, constraint-respecting motion profiles along Bézier spline paths. This guide covers the full RR 1.0 setup, tuning sequence, Actions API, and trajectory building."
      badge="Autonomous"
      badgeColor="violet"
      readingTime="20 min"
      sections={[
        {
          id: "what-is-road-runner",
          title: "What is Road Runner?",
          content: (
            <Prose>
              <p>
                Road Runner (RR) is a motion-planning library that computes{" "}
                <strong>trapezoidal velocity profiles</strong> along Bézier
                spline paths. Unlike simple encoder-based moves, RR respects
                real physical constraints — max velocity, max acceleration, and
                centripetal acceleration through curves — and uses combined
                feedforward + feedback control to follow them accurately.
                Along each spline, RR continuously balances lateral error,
                heading error, and a trapezoidal velocity profile so the robot
                neither overshoots corners nor stalls mid-path.
              </p>
              <InfoGrid
                items={[
                  { label: "Version", value: "1.0.1", sub: "ftc:0.1.25" },
                  { label: "Path Type", value: "Bézier Splines", sub: "C2 continuous" },
                  { label: "Control", value: "FF + Feedback", sub: "Gain-based PID" },
                  { label: "Odometry", value: "4 localizers", sub: "Drive enc / dead wheels / Pinpoint / OTOS" },
                ]}
              />
              <NoteBox type="warning">
                Road Runner 1.0 has <strong>breaking changes</strong> from
                0.5.x. The old <code>TrajectorySequenceBuilder</code> and{" "}
                <code>DriveConstants.java</code> no longer exist. RR 1.0 is
                not backwards-compatible — start from the new quickstart rather
                than migrating old code.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "installation",
          title: "Installation",
          content: (
            <Prose>
              <p>
                The easiest way to start is the{" "}
                <strong>Road Runner Quickstart</strong> — a full Android Studio
                project with Road Runner, FTC Dashboard, and all tuning OpModes
                pre-installed.
              </p>
              <StepList
                steps={[
                  "Clone the quickstart: git clone https://github.com/acmerobotics/road-runner-quickstart.git",
                  "Open the folder as an FTC project in Android Studio and let Gradle sync.",
                  "Navigate to TeamCode/src/main/java/org/firstinspires/ftc/teamcode/ — your OpModes go here.",
                  "Proceed to Drive Classes setup before running any tuning OpModes.",
                ]}
              />
              <p>
                If you are adding RR to an <strong>existing project</strong>,
                add these dependencies to <code>TeamCode/build.gradle</code>:
              </p>
              <CodeBlock
                filename="TeamCode/build.gradle"
                code={`repositories {
    maven { url = 'https://maven.brott.dev/' }
}

dependencies {
    // Core Road Runner library
    implementation "com.acmerobotics.roadrunner:ftc:0.1.25"
    implementation "com.acmerobotics.roadrunner:core:1.0.1"
    implementation "com.acmerobotics.roadrunner:actions:1.0.1"

    // FTC Dashboard — required for all tuning steps
    implementation "com.acmerobotics.dashboard:dashboard:0.5.1"
}`}
              />
              <p>
                Then download the quickstart and copy the entire contents of
                its <code>teamcode</code> folder (including the{" "}
                <code>messages/</code> and <code>tuning/</code> subfolders)
                into your project&apos;s <code>teamcode</code> folder.
              </p>
              <NoteBox type="info">
                Always check{" "}
                <code>TeamCode/build.gradle</code> for the latest library
                version number — it changes with each release. The version
                shown above was current at time of writing.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "drive-classes",
          title: "Drive Classes & Localizer Setup",
          content: (
            <Prose>
              <p>
                Open <code>MecanumDrive.java</code> (or <code>TankDrive.java</code>)
                from the quickstart. This file is your robot&apos;s central
                configuration — motor names, IMU orientation, localizer choice,
                and all tuning parameters live here.
              </p>
              <p>
                <strong>Motor names</strong> — by default <code>MecanumDrive</code>{" "}
                expects four motors named <code>"leftFront"</code>,{" "}
                <code>"leftBack"</code>, <code>"rightBack"</code>, and{" "}
                <code>"rightFront"</code>, plus an IMU named <code>"imu"</code>.
                Change these strings in <code>Params</code> to match your
                Driver Station config.
              </p>
              <p>
                <strong>IMU orientation</strong> — set{" "}
                <code>logoFacingDirection</code> and{" "}
                <code>usbFacingDirection</code> based on how the Control Hub is
                physically mounted on your robot.
              </p>
              <p>
                <strong>Localizer</strong> — Road Runner 1.0 supports four
                built-in localizer options. Change the{" "}
                <code>localizer = </code> line in <code>MecanumDrive.java</code>:
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Drive Encoders (default)",
                    value: "new DriveLocalizer(...)",
                    note: "Uses motor encoders + IMU for heading",
                  },
                  {
                    label: "Two Dead Wheels",
                    value: "new TwoDeadWheelLocalizer(...)",
                    note: "par + perp encoder names",
                  },
                  {
                    label: "Three Dead Wheels",
                    value: "new ThreeDeadWheelLocalizer(...)",
                    note: "par0, par1, perp encoder names",
                  },
                  {
                    label: "Pinpoint",
                    value: "new PinpointLocalizer(...)",
                    note: "Device configured as \"pinpoint\"",
                  },
                  {
                    label: "SparkFun OTOS",
                    value: "new OTOSLocalizer(...)",
                    note: "Device configured as \"sensor_otos\"",
                  },
                ]}
              />
              <NoteBox type="warning">
                <code>TwoDeadWheelLocalizer</code> expects the{" "}
                <code>LazyImu</code> wrapper — pass <code>lazyImu</code>, not{" "}
                <code>lazyImu.get()</code> or a raw <code>IMU</code> from{" "}
                <code>hardwareMap</code>. Passing the wrong type causes a
                compile-time signature mismatch.
              </NoteBox>
              <NoteBox type="tip">
                Dead wheel encoder ports 0 and 3 on REV hubs are more accurate
                at high speeds due to hardware quadrature decoding. Use those
                for your parallel (forward) dead wheels.
              </NoteBox>
              <CodeBlock
                filename="MecanumDrive.java (setup)"
                code={`// ── Motor names — change to match your Driver Station config ─────────────
public static class Params {
    public String leftFront  = "leftFront";
    public String leftBack   = "leftBack";
    public String rightBack  = "rightBack";
    public String rightFront = "rightFront";
}

// ── IMU orientation — match how your Control Hub is mounted ──────────────
lazyImu = new LazyImu(hardwareMap, "imu", new RevHubOrientationOnRobot(
    RevHubOrientationOnRobot.LogoFacingDirection.UP,
    RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
));

// ── Localizer — pick one and change this line ─────────────────────────────
// Drive encoders (default):
localizer = new DriveLocalizer(hardwareMap, PARAMS.inPerTick, pose, leftMotors, rightMotors);

// Two dead wheels (encoders named "par" and "perp"):
// localizer = new TwoDeadWheelLocalizer(hardwareMap, lazyImu, PARAMS.inPerTick);

// Three dead wheels (encoders named "par0", "par1", "perp") — no IMU for heading:
// localizer = new ThreeDeadWheelLocalizer(hardwareMap, PARAMS.inPerTick);

// goBILDA Pinpoint (device named "pinpoint"):
// localizer = new PinpointLocalizer(hardwareMap, PARAMS.inPerTick, pose);

// SparkFun OTOS (device named "sensor_otos"):
// localizer = new OTOSLocalizer(hardwareMap, pose);`}
              />
              <p>
                After setting up motor names and localizer, run{" "}
                <code>MecanumDirectionDebugger</code> to verify every motor
                spins in the correct direction. Positive power on all wheels
                should move the robot forward:
              </p>
              <SpecTable
                rows={[
                  { label: "X / ▢ (Xbox/PS4)", value: "Front Left motor" },
                  { label: "Y / △", value: "Front Right motor" },
                  { label: "B / O", value: "Rear Right motor" },
                  { label: "A / X", value: "Rear Left motor" },
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "tuning",
          title: "Tuning Process",
          content: (
            <Prose>
              <DocVideo docSlug="road-runner" sectionId="tuning" />
              <p>
                Tuning is the most critical step. Run every OpMode{" "}
                <strong>in order</strong> — later steps depend on earlier
                ones. The full process takes 1–3 hours but only needs to be
                repeated when hardware changes. Connect your computer to the
                robot&apos;s Wi-Fi and open{" "}
                <code>http://192.168.43.1:8080/dash</code> for FTC Dashboard
                before starting.
              </p>
              <StepList
                steps={[
                  "ForwardPushTest — Push the robot forward ~40 in by hand (motors free-spinning). Record ticks from telemetry and the actual distance. Set inPerTick = distance_inches / ticks.",
                  "LateralPushTest (mecanum + drive encoders only) — Same as above but push left. Set lateralInPerTick = distance / ticks.",
                  "ForwardRampLogger (dead wheels only) — Robot accelerates forward automatically. After stopping, open http://192.168.43.1:8080/tuning/forward-ramp.html, click Latest, exclude outliers, and copy kS and kV into MecanumDrive.Params.",
                  "LateralRampLogger (mecanum + dead wheels only) — Strafe version. Open http://192.168.43.1:8080/tuning/lateral-ramp.html and copy lateralInPerTick.",
                  "AngularRampLogger — Spins in place. For drive encoders: open /tuning/drive-encoder-angular-ramp.html and copy kS, kV, and trackWidthTicks. For dead wheels: open /tuning/dead-wheel-angular-ramp.html and copy trackWidthTicks and wheel positions.",
                  "ManualFeedforwardTuner — Robot drives forward/back repeatedly. In FTC Dashboard graph vref vs v0. Increase kA from 0.0000001 by 10× until it affects the plot, then match the lines. Press Y/△ to pause and reset robot position.",
                  "ManualFeedbackTuner — Same back-and-forth but with feedback active. Tune axialGain, lateralGain, headingGain. Start at 1 and nudge the robot to observe correction.",
                  "SplineTest — Drives a basic spline to verify everything. The robot should follow it accurately with no visible drift.",
                ]}
              />
              <NoteBox type="info">
                The tuning web UI at <code>192.168.43.1:8080/tuning/</code>{" "}
                is your primary analysis tool during ramp logging. Click and
                drag to select outlier points, then press <strong>E</strong> to
                exclude them before reading off the final coefficient values.
                Press <strong>I</strong> to re-include a point if you exclude
                too many.
              </NoteBox>
              <NoteBox type="tip">
                Using a <strong>Pinpoint</strong> localizer? Tuning is the same
                as two dead wheels — skip the ForwardRampLogger and go straight
                to AngularRampLogger using the dead-wheel analysis URL.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "rr1-params",
          title: "MecanumDrive.Params Reference",
          content: (
            <Prose>
              <p>
                In Road Runner 1.0, all physical robot parameters live in the{" "}
                <code>Params</code> static class inside{" "}
                <code>MecanumDrive.java</code>. There is no separate{" "}
                <code>DriveConstants.java</code>.
              </p>
              <SpecTable
                rows={[
                  { label: "inPerTick", value: "Inches per encoder tick", note: "From ForwardPushTest" },
                  { label: "lateralInPerTick", value: "Lateral in/tick", note: "From LateralPushTest or LateralRampLogger" },
                  { label: "trackWidthTicks", value: "Track width in ticks", note: "From AngularRampLogger" },
                  { label: "kS", value: "Static feedforward", note: "From ForwardRampLogger / AngularRampLogger" },
                  { label: "kV", value: "Velocity feedforward", note: "From ForwardRampLogger" },
                  { label: "kA", value: "Acceleration feedforward", note: "From ManualFeedforwardTuner" },
                  { label: "maxWheelVel", value: "Max wheel velocity (in/s)", note: "~80% of measured top speed" },
                  { label: "minProfileAccel", value: "Max decel (negative, in/s²)", note: "Braking limit" },
                  { label: "maxProfileAccel", value: "Max accel (in/s²)", note: "Start at 25, tune up" },
                  { label: "axialGain", value: "Forward position gain", note: "From ManualFeedbackTuner" },
                  { label: "lateralGain", value: "Lateral position gain", note: "From ManualFeedbackTuner" },
                  { label: "headingGain", value: "Heading gain", note: "From ManualFeedbackTuner" },
                ]}
              />
              <CodeBlock
                filename="MecanumDrive.java (Params)"
                code={`public static class Params {
    // ── Filled in by push tests ───────────────────────────────────────────
    public double inPerTick         = 0;    // ForwardPushTest
    public double lateralInPerTick  = 1;    // LateralPushTest
    public double trackWidthTicks   = 0;    // AngularRampLogger

    // ── Filled in by ramp loggers ─────────────────────────────────────────
    public double kS = 0;
    public double kV = 0;
    public double kA = 0;

    // ── Motion constraints ────────────────────────────────────────────────
    public double maxWheelVel     =  50;   // in/s
    public double minProfileAccel = -30;   // in/s² (braking)
    public double maxProfileAccel =  50;   // in/s² (acceleration)
    public double maxAngVel       = Math.PI;    // rad/s
    public double maxAngAccel     = Math.PI;    // rad/s²

    // ── Feedback gains — filled in by ManualFeedbackTuner ─────────────────
    public double axialGain    = 0;
    public double lateralGain  = 0;
    public double headingGain  = 0;
    public double axialVelGain    = 0;
    public double lateralVelGain  = 0;
    public double headingVelGain  = 0;

    // ── Motor names (match Driver Station config) ─────────────────────────
    public String leftFront  = "leftFront";
    public String leftBack   = "leftBack";
    public String rightBack  = "rightBack";
    public String rightFront = "rightFront";
}`}
              />
              <NoteBox type="info">
                RR 1.0 measures distances in <strong>inches per tick</strong>{" "}
                rather than ticks per revolution. Run the push tests first —
                they give the most accurate values without needing motor spec
                sheets, and they account for real-world friction and wheel slip
                automatically.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "creating-trajectories",
          title: "Building Trajectories",
          content: (
            <Prose>
              <p>
                In Road Runner 1.0, trajectories are built with{" "}
                <code>drive.actionBuilder(startPose)</code>. The builder
                provides a fluent API for chaining movement segments and returns
                an <code>Action</code> that you run with{" "}
                <code>Actions.runBlocking()</code>.
              </p>
              <CodeBlock
                filename="AutonomousOp.java"
                code={`@Autonomous(name = "Full Auto")
public class FullAuto extends LinearOpMode {

    @Override
    public void runOpMode() throws InterruptedException {
        // Start pose: robot at (0,0) facing right (0 radians)
        Pose2d startPose = new Pose2d(0, 0, 0);
        MecanumDrive drive = new MecanumDrive(hardwareMap, startPose);

        // Build the entire autonomous as one chained Action
        Action auto = drive.actionBuilder(startPose)

            // Smooth spline to spike mark — heading follows the path tangent
            .splineTo(new Vector2d(24, 24), Math.PI / 2)
            .waitSeconds(0.5)

            // Drive straight to backdrop with heading change
            .lineToLinearHeading(new Pose2d(48, 36, Math.PI))
            .waitSeconds(0.75)

            // Spline to pixel stack keeping constant heading
            .splineToConstantHeading(new Vector2d(60, 10), 0)
            .waitSeconds(0.5)

            // Return to backdrop
            .splineTo(new Vector2d(48, 36), Math.PI / 2)

            .build();

        waitForStart();

        // Runs the entire action — blocks until complete or stop is pressed
        Actions.runBlocking(auto);
    }
}`}
              />
              <p>Key builder methods:</p>
              <SpecTable
                rows={[
                  { label: "splineTo(vec, endTangent)", value: "Smooth spline, heading follows tangent" },
                  { label: "splineToConstantHeading(vec, tangent)", value: "Spline, heading stays fixed" },
                  { label: "splineToLinearHeading(pose, tangent)", value: "Spline + linear heading change" },
                  { label: "lineToX(x) / lineToY(y)", value: "Straight along one axis" },
                  { label: "lineToLinearHeading(pose)", value: "Straight line + heading change" },
                  { label: "strafeToLinearHeading(vec, heading)", value: "Strafe with heading change" },
                  { label: "turn(angle)", value: "Pure rotation in place" },
                  { label: "waitSeconds(t)", value: "Hold position for t seconds" },
                ]}
              />
              <NoteBox type="tip">
                All coordinates are in <strong>inches</strong> and all angles
                are in <strong>radians</strong>. Use{" "}
                <code>Math.toRadians(degrees)</code> to convert. The field
                origin is wherever you place the robot at the start — there is
                no fixed field coordinate system unless you set one.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "actions",
          title: "Actions API",
          content: (
            <Prose>
              <p>
                Road Runner 1.0 uses an <strong>Actions</strong> system to
                compose autonomous behaviors. An <code>Action</code> is a
                long-running segment of code that runs in small steps each loop
                iteration — this lets two actions run in{" "}
                <strong>parallel without threads</strong>.
              </p>
              <SpecTable
                rows={[
                  { label: "Actions.runBlocking(a)", value: "Runs action until complete", note: "Safe to interrupt with stop button" },
                  { label: "SequentialAction(a, b, …)", value: "Runs actions one after another" },
                  { label: "ParallelAction(a, b, …)", value: "Runs actions simultaneously, waits for all" },
                  { label: "SleepAction(seconds)", value: "Waits for a duration" },
                  { label: "action.run(packet)", value: "Single step — returns false when done" },
                ]}
              />
              <CodeBlock
                filename="ActionsExample.java"
                code={`// ── Combine drive + mechanism using ParallelAction ────────────────────────
// Raise the arm while driving to the backdrop — saves ~0.8 s

Action driveToBackdrop = drive.actionBuilder(spikeMarkPose)
    .lineToLinearHeading(backdropPose)
    .build();

// Custom mechanism action — returns false when complete (see below)
Action raiseArm = arm.goToHeight(ArmSystem.HIGH_BASKET);

// Both run simultaneously; waits for the SLOWER one to finish
Actions.runBlocking(new ParallelAction(driveToBackdrop, raiseArm));

// ── SequentialAction: turn then drive ─────────────────────────────────────
Actions.runBlocking(new SequentialAction(
    drive.actionBuilder(startPose).turn(Math.PI / 2).build(),
    drive.actionBuilder(turnedPose).lineToX(48).build()
));

// ── SleepAction: wait 0.5 s between two moves ─────────────────────────────
Actions.runBlocking(new SequentialAction(
    drive.actionBuilder(startPose).splineTo(new Vector2d(24, 24), 0).build(),
    new SleepAction(0.5),
    drive.actionBuilder(midPose).lineToX(48).build()
));`}
              />
              <p>
                To create a <strong>custom Action</strong> for a mechanism,
                implement the <code>Action</code> interface. The{" "}
                <code>run()</code> method is called repeatedly — return{" "}
                <code>true</code> to keep running, <code>false</code> when done:
              </p>
              <CodeBlock
                filename="CustomAction.java"
                code={`public class Lift {
    private DcMotorEx motor;

    public Lift(HardwareMap hardwareMap) {
        motor = hardwareMap.get(DcMotorEx.class, "lift_motor");
        motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
    }

    public Action liftUp(int targetTicks) {
        return new Action() {
            private boolean initialized = false;

            @Override
            public boolean run(@NonNull TelemetryPacket packet) {
                if (!initialized) {
                    motor.setTargetPosition(targetTicks);
                    motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    motor.setPower(0.8);
                    initialized = true;
                }

                int pos = motor.getCurrentPosition();
                packet.put("liftPos", pos);

                // Return true (keep running) while motor is still moving
                return motor.isBusy();
            }
        };
    }
}

// Usage in autonomous:
Lift lift = new Lift(hardwareMap);
Actions.runBlocking(new ParallelAction(
    drive.actionBuilder(startPose).lineToX(48).build(),
    lift.liftUp(1500)
));`}
              />
              <NoteBox type="warning">
                Keep each <code>run()</code> call short — avoid{" "}
                <code>Thread.sleep()</code> or blocking <code>while</code>{" "}
                loops inside actions. If one action stalls, all parallel
                actions are starved. Use <code>SleepAction</code> for delays
                instead.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "parallel-actions",
          title: "Async Following Pattern",
          content: (
            <Prose>
              <p>
                For cases where you need fine-grained control over the loop
                (e.g. checking sensor values mid-trajectory), you can drive
                an action manually instead of using{" "}
                <code>Actions.runBlocking()</code>:
              </p>
              <CodeBlock
                filename="AsyncLoop.java"
                code={`Action driveAction = drive.actionBuilder(startPose)
    .splineTo(new Vector2d(48, 0), 0)
    .build();

boolean running = true;

while (opModeIsActive() && running) {
    TelemetryPacket packet = new TelemetryPacket();

    // Advance the trajectory one step; returns false when complete
    running = driveAction.run(packet);

    // Your own code runs every loop alongside the trajectory:
    if (colorSensor.red() > RED_THRESHOLD) {
        intake.setPower(0);
    }

    FtcDashboard.getInstance().sendTelemetryPacket(packet);
    telemetry.update();
}`}
              />
              <NoteBox type="warning">
                Always allocate a fresh <code>TelemetryPacket</code> each loop
                iteration. Reusing one instance causes <code>packet.put()</code>{" "}
                data to accumulate, bloating memory and dropping loop rate over
                long autonomous runs.
              </NoteBox>
              <NoteBox type="tip">
                For most routines, <code>ParallelAction</code> is cleaner than
                a manual loop — define each mechanism as an <code>Action</code>{" "}
                and let the scheduler compose them. Reserve the manual loop
                for sensor-reactive behavior that needs to interrupt or branch
                mid-trajectory.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "follow-trajectory-sequence",
          title: "Road Runner 0.5.x (Legacy)",
          content: (
            <Prose>
              <p>
                If your team is still running <strong>Road Runner 0.5.x</strong>,
                you will use <code>TrajectorySequenceBuilder</code> and{" "}
                <code>drive.followTrajectorySequence()</code>. This API is still
                in use on many active robots but is no longer maintained.
              </p>
              <CodeBlock
                filename="TrajectorySequence_05x.java"
                code={`// ── Road Runner 0.5.x only — not compatible with RR 1.0 ─────────────────

Pose2d startPose = new Pose2d(12, -63, Math.toRadians(90));
drive.setPoseEstimate(startPose);

TrajectorySequence autoSeq = drive.trajectorySequenceBuilder(startPose)
    .splineTo(new Vector2d(12, -30), Math.toRadians(90))
    .waitSeconds(0.5)
    // Temporal marker: fires at t = 2.0 s into the sequence
    .addTemporalMarker(2.0, () -> claw.setPosition(CLAW_OPEN))
    .lineToLinearHeading(new Pose2d(50, -36, Math.toRadians(180)))
    .waitSeconds(0.75)
    // Displacement marker: fires when total path distance crosses this value
    .addDisplacementMarker(() -> arm.goToHigh())
    .splineTo(new Vector2d(60, -60), Math.toRadians(315))
    .build();

// Blocking — waits until complete
drive.followTrajectorySequence(autoSeq);

// Async version — call drive.update() every loop
drive.followTrajectorySequenceAsync(autoSeq);
while (opModeIsActive() && drive.isBusy()) {
    drive.update(); // REQUIRED every iteration
    telemetry.update();
}`}
              />
              <SpecTable
                rows={[
                  { label: "addTemporalMarker(t, fn)", value: "Fires at t seconds into sequence" },
                  { label: "addDisplacementMarker(fn)", value: "Fires at current path distance" },
                  { label: "addSpatialMarker(pos, fn)", value: "Fires when robot is near position" },
                  { label: "waitSeconds(t)", value: "Stop and wait for t seconds" },
                ]}
              />
            </Prose>
          ),
        },
      ]}
    />
  );
}

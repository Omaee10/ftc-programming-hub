import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Pedro Pathing – FTC Programming Hub" };

export default function PedroPathingPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Pedro Pathing" },
      ]}
      title="Pedro Pathing"
      description="Pedro Pathing is a reactive Bézier-curve follower for FTC. It continuously re-projects the robot onto the path every loop, making it resilient to disturbances and defense — and supports Mecanum, swerve, Pinpoint, OTOS, and dead-wheel odometry."
      badge="Autonomous"
      badgeColor="emerald"
      readingTime="18 min"
      sections={[
        {
          id: "overview",
          title: "What is Pedro Pathing?",
          content: (
            <Prose>
              <p>
                Pedro Pathing uses a custom reactive follower algorithm built for
                FTC. Instead of pre-computing a time-parametrized trajectory and
                replaying it, Pedro continuously re-projects the robot&apos;s current
                position onto the nearest point on the path and computes corrective
                motor powers every loop. This means the robot automatically
                recovers from pushes, wheel slip, or any disturbance without any
                special handling code. Unlike time-parameterized trajectories,
                Pedro projects the robot onto the closest point on the Bézier
                curve every loop and computes a fresh correction vector — so
                obstacles that push you off-path are handled automatically.
              </p>
              <InfoGrid
                items={[
                  { label: "Approach", value: "Reactive Follower", sub: "Re-projects per loop" },
                  { label: "Path Type", value: "Bézier Curves", sub: "Lines & arbitrary curves" },
                  { label: "Odometry", value: "6 localizer options", sub: "Pinpoint, OTOS, dead wheels, drive enc" },
                  { label: "Coordinate System", value: "[0, 144] × [0, 144]", sub: "Bottom-left corner is origin" },
                ]}
              />
              <h3>Why Pedro vs Road Runner?</h3>
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th style={{ color: "rgb(196 181 253)" }}>Road Runner 1.0</th>
                    <th style={{ color: "rgb(110 231 183)" }}>Pedro Pathing</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Approach", "Pre-planned trajectory", "Reactive re-projection"],
                    ["Defense resistance", "Moderate", "High — continuous correction"],
                    ["Tuning effort", "High (6+ OpModes)", "Moderate (automatic + PIDF)"],
                    ["Community size", "Very large", "Growing fast"],
                    ["Actions/Commands", "RR Actions API", "Ivy command library"],
                    ["Coordinate system", "Inches from start", "[0, 144] full field"],
                  ].map(([f, rr, pp]) => (
                    <tr key={f}>
                      <td>{f}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(148 163 184)", fontSize: "0.8rem" }}>{rr}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(148 163 184)", fontSize: "0.8rem" }}>{pp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <NoteBox type="info">
                Pedro uses a field-wide coordinate system spanning{" "}
                <strong>[0, 144] inches on both axes</strong>, where (0, 0) is
                the bottom-left corner of the field. To convert from Road Runner
                poses, add +72 to both X and Y.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "installation",
          title: "Installation",
          content: (
            <Prose>
              <DocVideo docSlug="pedro-pathing" sectionId="installation" />
              <p>
                The easiest way to get started is the{" "}
                <strong>Pedro Pathing Quickstart</strong> — a ready-to-use Android
                Studio project with all files pre-installed.
              </p>
              <StepList
                steps={[
                  "In Android Studio: Main Menu → File → New → Project from Version Control. Enter URL: https://github.com/Pedro-Pathing/Quickstart.git",
                  "OR run: git clone https://github.com/Pedro-Pathing/Quickstart.git, then open the folder in Android Studio.",
                  "Wait for Gradle to sync. If you see a blue banner, click 'Sync Now'.",
                  "Navigate to TeamCode/src/main/java/org/firstinspires/ftc/teamcode/pedroPathing/ — this contains Constants.java, all tuning OpModes, and the follower.",
                ]}
              />
              <p>
                If you are adding Pedro to an <strong>existing project</strong>,
                add these to <code>build.dependencies.gradle</code>:
              </p>
              <CodeBlock
                filename="build.dependencies.gradle"
                code={`repositories {
    maven { url = "https://mymaven.bylazar.com/releases" }
}

dependencies {
    implementation 'com.pedropathing:ftc:1.0.8'   // check GitHub for latest version
    implementation 'com.pedropathing:telemetry:1.0.0'
    implementation 'com.bylazar:fullpanels:1.0.12' // Panels dashboard
}`}
              />
              <p>
                Then set the <strong>Compile SDK Version</strong> to 34 for both
                modules: go to <code>File → Project Structure → Modules</code>{" "}
                and update both <code>FtcRobotController</code> and{" "}
                <code>TeamCode</code>. Finally, copy the{" "}
                <code>pedroPathing/</code> package from the Quickstart into your
                project.
              </p>
              <NoteBox type="tip">
                Pedro&apos;s dashboard called <strong>Panels</strong> is accessible
                at <code>192.168.43.1:8001</code> when connected to robot Wi-Fi.
                FTC Dashboard also works at <code>192.168.43.1:8080/dash</code>.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "constants-setup",
          title: "Constants.java Setup",
          content: (
            <Prose>
              <p>
                All Pedro Pathing configuration lives in a single{" "}
                <code>Constants.java</code> file. It contains four types of
                constants and a <code>createFollower()</code> factory method
                that you call in your OpModes.
              </p>
              <SpecTable
                rows={[
                  { label: "FollowerConstants", value: "PIDF gains, mass, braking", note: "Values from automatic & manual tuners" },
                  { label: "MecanumConstants", value: "Motor names & directions", note: "Must match Driver Station config" },
                  { label: "Localizer constants", value: "Hardware names & offsets", note: "Depends on chosen localizer" },
                  { label: "PathConstraints", value: "Path end conditions", note: "When a path is considered finished" },
                  { label: "createFollower()", value: "Factory method", note: "Call this in every OpMode" },
                ]}
              />
              <CodeBlock
                filename="Constants.java"
                code={`public class Constants {

    // ── 1. Follower constants — filled in by tuning ───────────────────────────
    public static FollowerConstants followerConstants = new FollowerConstants()
            .mass(5); // robot mass in kilograms (used for centripetal correction)

    // ── 2. Drivetrain constants — motor names and directions ──────────────────
    public static MecanumConstants driveConstants = new MecanumConstants()
            .maxPower(1)
            .rightFrontMotorName("rf")
            .rightRearMotorName("rr")
            .leftRearMotorName("lr")
            .leftFrontMotorName("lf")
            .leftFrontMotorDirection(DcMotorSimple.Direction.REVERSE)
            .leftRearMotorDirection(DcMotorSimple.Direction.REVERSE)
            .rightFrontMotorDirection(DcMotorSimple.Direction.FORWARD)
            .rightRearMotorDirection(DcMotorSimple.Direction.FORWARD);

    // ── 3. Localizer constants — see "Localizer Setup" section for options ────
    public static PinpointConstants localizerConstants = new PinpointConstants()
            .hardwareMapName("pinpoint")
            .forwardPodY(-5)       // inches from robot center
            .strafePodX(0.5)       // inches from robot center
            .distanceUnit(DistanceUnit.INCH)
            .encoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD)
            .forwardEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD)
            .strafeEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD);

    // ── 4. Path constraints — when Pedro considers a path "done" ─────────────
    public static PathConstraints pathConstraints = new PathConstraints()
            .setPathEndTimeoutConstraint(0.99)
            .setPathEndTranslationalConstraint(1.0)
            .setPathEndHeadingConstraint(Math.toRadians(1.0))
            .setCentripetalScalingConstraint(100.0);

    // ── Factory method — use this in all your OpModes ─────────────────────────
    public static Follower createFollower(HardwareMap hardwareMap) {
        return new FollowerBuilder(followerConstants, hardwareMap)
                .pathConstraints(pathConstraints)
                .mecanumDrivetrain(driveConstants)
                .pinpointLocalizer(localizerConstants) // swap for your localizer
                .build();
    }
}`}
              />
              <NoteBox type="warning">
                Make sure your motor names match your Driver Station configuration
                exactly (case-sensitive). It is very likely you&apos;ll need to
                reverse one side — test with a simple teleop before running
                any autonomous.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "localizer-setup",
          title: "Localizer Setup",
          content: (
            <Prose>
              <p>
                Pedro supports six localizer options. Choose the one that matches
                your hardware and swap it into the <code>createFollower()</code>{" "}
                builder. All localizers except OTOS use pose exponential for
                converting robot-frame movements to global field coordinates.
              </p>
              <SpecTable
                rows={[
                  { label: "Drive Encoder", value: ".driveEncoderLocalizer(constants)", note: "No extra hardware needed" },
                  { label: "Two Dead Wheels", value: ".twoWheelLocalizer(constants)", note: "1 parallel + 1 perpendicular" },
                  { label: "Three Dead Wheels", value: ".threeWheelLocalizer(constants)", note: "2 parallel + 1 perpendicular" },
                  { label: "Three Wheels + IMU", value: ".threeWheelImuLocalizer(constants)", note: "Better heading accuracy" },
                  { label: "Pinpoint", value: ".pinpointLocalizer(constants)", note: "Recommended — goBILDA Pinpoint" },
                  { label: "OTOS", value: ".otosLocalizer(constants)", note: "SparkFun optical sensor" },
                ]}
              />
              <p>
                <strong>Pinpoint Localizer</strong> — the most common choice for
                teams using goBILDA Pinpoint:
              </p>
              <CodeBlock
                filename="Constants.java (Pinpoint)"
                code={`public static PinpointConstants localizerConstants = new PinpointConstants()
        .hardwareMapName("pinpoint")
        .forwardPodY(-5)    // Y offset of forward pod from center (inches)
        .strafePodX(0.5)    // X offset of strafe pod from center (inches)
        .distanceUnit(DistanceUnit.INCH)
        .encoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD)
        .forwardEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD)
        .strafeEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD);`}
              />
              <NoteBox type="warning">
                Pinpoint must be plugged into an I2C port <strong>other than port 0</strong>{" "}
                — the Control Hub&apos;s built-in IMU uses port 0. Also ensure the
                forward pod is in the Pinpoint&apos;s X port and the strafe pod is
                in the Y port.
              </NoteBox>
              <p>
                After configuring your localizer, verify encoder directions using the
                Localization Test OpMode. Move the robot forward — X should
                increase. Move left — Y should increase. Reverse any encoder that
                reads backwards:
              </p>
              <CodeBlock
                filename="Constants.java (Pinpoint encoder directions)"
                code={`// If forward motion decreases X, reverse the forward encoder:
.forwardEncoderDirection(GoBildaPinpointDriver.EncoderDirection.REVERSED)

// If leftward motion decreases Y, reverse the strafe encoder:
.strafeEncoderDirection(GoBildaPinpointDriver.EncoderDirection.REVERSED)`}
              />
              <p>
                <strong>Localization Test</strong> — after tuning, verify accuracy:
              </p>
              <StepList
                steps={[
                  "Run the 'Tuning' OpMode and navigate to Localization Test.",
                  "Connect to robot Wi-Fi and open Panels at 192.168.43.1:8001 or FTC Dashboard at 192.168.43.1:8080/dash.",
                  "Drive the robot around and observe the position overlay — it should closely track your physical movements.",
                  "Push the robot manually and verify the estimated pose updates correctly.",
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
              <p>
                Tuning must be completed in the correct order — each step
                depends on the previous one. All tuning OpModes live inside
                the <code>Tuning</code> OpMode entry point that comes with the
                Quickstart. Connect to Panels at{" "}
                <code>192.168.43.1:8001</code> before starting — it shows a
                live field view that makes every step much easier.
              </p>
              <StepList
                steps={[
                  "Step 1: Set robot mass and motor constants (see below)",
                  "Step 2: Tune and verify your localizer (see Localizer Setup section)",
                  "Step 3: Run Forward & Lateral Velocity Tuners",
                  "Step 4: Run Heading Tuner",
                  "Step 5: Choose braking algorithm and run its tuners",
                ]}
              />

              <h3>Step 1 — Robot Mass & Motor Setup</h3>
              <p>
                Set your robot&apos;s mass in kilograms — Pedro uses this to
                compensate for centripetal force on curves. Weigh your robot
                with all hardware attached.
              </p>
              <CodeBlock
                filename="Constants.java"
                code={`public static FollowerConstants followerConstants = new FollowerConstants()
        .mass(5.2); // replace with your robot's actual mass in kg

public static MecanumConstants driveConstants = new MecanumConstants()
        .maxPower(1)
        .rightFrontMotorName("rf")   // must match Driver Station config exactly
        .rightRearMotorName("rr")
        .leftRearMotorName("lr")
        .leftFrontMotorName("lf")
        .leftFrontMotorDirection(DcMotorSimple.Direction.REVERSE)
        .leftRearMotorDirection(DcMotorSimple.Direction.REVERSE)
        .rightFrontMotorDirection(DcMotorSimple.Direction.FORWARD)
        .rightRearMotorDirection(DcMotorSimple.Direction.FORWARD);`}
              />
              <NoteBox type="warning">
                Before running any tuner, drive the robot manually using the
                built-in TeleOp in the Quickstart and confirm all four wheels
                spin the correct direction. Wrong motor directions will cause
                every tuner to fail.
              </NoteBox>

              <h3>Step 2 — Localizer Setup</h3>
              <p>
                Pedro needs to know where the robot is on the field at all
                times. Add your localizer constants to <code>Constants.java</code>{" "}
                and plug them into the <code>createFollower()</code> builder.
                The example below uses the <strong>goBILDA Pinpoint</strong> —
                swap the builder method for your hardware (see the Localizer
                Setup section for all options).
              </p>
              <CodeBlock
                filename="Constants.java (Pinpoint localizer)"
                code={`public static PinpointConstants localizerConstants = new PinpointConstants()
        .hardwareMapName("pinpoint")     // must match Driver Station config
        .forwardPodY(-5)                 // forward pod Y offset from robot center (inches)
        .strafePodX(0.5)                 // strafe pod X offset from robot center (inches)
        .distanceUnit(DistanceUnit.INCH)
        .encoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD)
        .forwardEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD)
        .strafeEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD);

public static Follower createFollower(HardwareMap hardwareMap) {
    return new FollowerBuilder(followerConstants, hardwareMap)
            .pathConstraints(pathConstraints)
            .mecanumDrivetrain(driveConstants)
            .pinpointLocalizer(localizerConstants) // swap this line for your localizer
            .build();
}`}
              />
              <p>
                After adding your localizer, <strong>verify encoder directions</strong>{" "}
                using the Localization Test OpMode before continuing:
              </p>
              <StepList
                steps={[
                  "Run the Tuning OpMode and navigate to Localization Test.",
                  "Connect to Panels at 192.168.43.1:8001 — you should see the robot's position on the field.",
                  "Push the robot forward — the X coordinate must increase. If it decreases, add .forwardEncoderDirection(EncoderDirection.REVERSED) to your localizer constants.",
                  "Push the robot left — the Y coordinate must increase. If it decreases, add .strafeEncoderDirection(EncoderDirection.REVERSED).",
                  "Drive the robot in a full square and return it to start — the pose on Panels should return close to its starting values.",
                ]}
              />
              <CodeBlock
                filename="Constants.java (reversed encoder example)"
                code={`// If forward motion made X decrease, reverse the forward encoder:
public static PinpointConstants localizerConstants = new PinpointConstants()
        .hardwareMapName("pinpoint")
        .forwardPodY(-5)
        .strafePodX(0.5)
        .distanceUnit(DistanceUnit.INCH)
        .encoderResolution(GoBildaPinpointDriver.GoBildaOdometryPods.goBILDA_4_BAR_POD)
        .forwardEncoderDirection(GoBildaPinpointDriver.EncoderDirection.REVERSED) // <-- flipped
        .strafeEncoderDirection(GoBildaPinpointDriver.EncoderDirection.FORWARD);`}
              />
              <NoteBox type="info">
                The pod <strong>offsets</strong> (<code>forwardPodY</code> and{" "}
                <code>strafePodX</code>) are measured from the robot&apos;s center
                of rotation in inches. Positive <code>forwardPodY</code> means
                the forward pod is to the left of center; positive{" "}
                <code>strafePodX</code> means the strafe pod is in front of
                center. Use the offset tuner OpMode in the Quickstart if you
                are unsure of the exact values.
              </NoteBox>

              <h3>Step 3 — Forward & Lateral Velocity Tuners</h3>
              <p>
                These tuners drive the robot at full power and measure its
                actual top speed. The values are stored automatically — you
                just run the OpMode and read the output from telemetry.
              </p>
              <CodeBlock
                filename="ForwardVelocityTuner output → Constants.java"
                code={`// After running ForwardVelocityTuner, copy the reported value here:
public static FollowerConstants followerConstants = new FollowerConstants()
        .mass(5.2)
        .forwardZeroPowerAcceleration(-34.0)  // reported by ForwardVelocityTuner
        .lateralZeroPowerAcceleration(-78.5); // reported by LateralVelocityTuner`}
              />
              <NoteBox type="info">
                Both values will be <strong>negative</strong> — they represent
                deceleration (the robot slowing down when power cuts to zero).
                If you get a positive number, a motor direction is wrong.
              </NoteBox>

              <h3>Step 4 — Heading Tuner</h3>
              <p>
                The heading PIDF corrects the robot&apos;s rotation while following
                paths. Run <code>HeadingTuner</code> — the robot will rotate
                back and forth. Watch Panels and adjust gains until rotation
                is fast, accurate, and settles without oscillating.{" "}
                <strong>Heading error is computed in radians</strong> — do not
                tune assuming degree-scale error.
              </p>
              <CodeBlock
                filename="Constants.java (heading PIDF)"
                code={`// Radian-scaled baseline — heading error is in radians, not degrees
public static FollowerConstants followerConstants = new FollowerConstants()
        .mass(5.2)
        .forwardZeroPowerAcceleration(-34.0)
        .lateralZeroPowerAcceleration(-78.5)
        .headingPIDF(new PIDFCoefficients(
                2.0,   // P — increase if heading is slow to correct
                0.0,   // I — leave at 0 unless steady-state heading error
                0.15,  // D — increase to damp oscillation
                0.0    // F — leave at 0
        ));`}
              />
              <SpecTable
                rows={[
                  { label: "P (Proportional)", value: "How hard it corrects heading error", note: "Radian error — start ~2.0, not 1.0 for degrees" },
                  { label: "I (Integral)", value: "Eliminates small persistent error", note: "Leave at 0 — rarely needed" },
                  { label: "D (Derivative)", value: "Damps oscillation / overshoot", note: "Start ~0.15 — increase if robot wobbles" },
                  { label: "F (Feedforward)", value: "Constant baseline effort", note: "Leave at 0" },
                ]}
              />

              <h3>Step 5A — Predictive Braking (recommended)</h3>
              <p>
                Automatically tunes braking in a few minutes. The robot drives
                forward at full speed and coasts to a stop; Pedro measures the
                natural deceleration and computes the braking curve for you.
              </p>
              <StepList
                steps={[
                  "Run PredictiveBrakingTuner from the Tuning OpMode. The robot will drive forward and stop automatically — give it at least 6 feet of clear space.",
                  "After it stops, read zeroPowerAccelForward from telemetry and copy it into FollowerConstants (it is the same value measured in Step 3).",
                  "Tune a single drive P gain starting at 0.025 — increase until the robot reaches path endpoints quickly without oscillating past them.",
                ]}
              />
              <CodeBlock
                filename="Constants.java (Predictive Braking)"
                code={`public static FollowerConstants followerConstants = new FollowerConstants()
        .mass(5.2)
        .forwardZeroPowerAcceleration(-34.0)
        .lateralZeroPowerAcceleration(-78.5)
        .headingPIDF(new PIDFCoefficients(2.0, 0.0, 0.15, 0.0))
        // Drive P — controls how fast follower "chases" the path's t-value
        // Increase if robot is slow to reach endpoints; decrease if it oscillates
        .drivePIDF(new PIDFCoefficients(
                0.025, // P — start here, tune up slowly
                0,
                0,
                0.6    // F — feedforward keeps robot moving at constant speed
        ));`}
              />

              <h3>Step 5B — Manual PIDFs (advanced)</h3>
              <p>
                For more control over path following behavior. Run these
                tuners in order after the heading tuner:
              </p>
              <StepList
                steps={[
                  "ZeroPowerAccelerationTuner (forward) — confirms the forward deceleration value.",
                  "ZeroPowerAccelerationTuner (lateral) — confirms the lateral deceleration value.",
                  "TranslationalPIDTuner — tune translationalPIDF. Push the robot off the path and watch it snap back.",
                  "CentripetalTuner — tune centripetalScaling. Run a curved path and increase until the inside wheels don't slip on turns.",
                  "DrivePIDTuner — tune drivePIDF last. Increase P until the robot reaches waypoints quickly without oscillating.",
                ]}
              />
              <CodeBlock
                filename="Constants.java (Manual PIDFs)"
                code={`public static FollowerConstants followerConstants = new FollowerConstants()
        .mass(5.2)
        .forwardZeroPowerAcceleration(-34.0)
        .lateralZeroPowerAcceleration(-78.5)
        .headingPIDF(new PIDFCoefficients(2.0, 0.0, 0.15, 0.0))

        // Translational PIDF — corrects X/Y position error
        // Run TranslationalPIDTuner: push robot off a straight path and watch it snap back
        // Increase P until correction is snappy; add D if it oscillates
        .translationalPIDF(new PIDFCoefficients(
                0.1,   // P
                0,     // I
                0.01,  // D
                0      // F
        ))

        // Centripetal scaling — compensates for centripetal force on curves
        // Run CentripetalTuner: increase from 0.001 until curves are clean and wheels don't slip
        .centripetalScaling(0.0005)

        // Drive PIDF — controls how fast the follower advances along the path
        // Tune last: increase P until robot reaches endpoints quickly, D to stop oscillation
        .drivePIDF(new PIDFCoefficients(
                0.025, // P
                0,     // I
                0,     // D
                0.6    // F
        ));`}
              />
              <NoteBox type="tip">
                When tuning PIDFs, change only <strong>one value at a time</strong>{" "}
                and run the test again before adjusting further. Changing
                multiple values at once makes it impossible to know what caused
                an improvement or regression.
              </NoteBox>
              <NoteBox type="info">
                Pedro&apos;s Panels dashboard at{" "}
                <code>192.168.43.1:8001</code> shows a live field overlay
                during all tuning OpModes. The robot&apos;s estimated pose and
                target path are both drawn — you can immediately see if the
                follower is tracking the path or drifting.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "path-building",
          title: "Building Paths",
          content: (
            <Prose>
              <p>
                Paths are built from Bézier geometry. There are two path
                primitives:
              </p>
              <SpecTable
                rows={[
                  { label: "BezierLine", value: "Straight line", note: "Requires 2 points: start + end" },
                  { label: "BezierCurve", value: "Smooth curve", note: "3+ points: start + controls + end. Control points pull the curve." },
                ]}
              />
              <p>
                A single <code>Path</code> wraps one Bézier segment. A{" "}
                <code>PathChain</code> (from <code>follower.pathBuilder()</code>){" "}
                links multiple segments together with seamless, stop-free
                transitions.
              </p>
              <CodeBlock
                filename="PathBuilding.java"
                code={`// ── Poses (x, y, heading in radians) — [0, 144] field coordinate system ──
private final Pose startPose    = new Pose(28.5, 128, Math.toRadians(180));
private final Pose scorePose    = new Pose(60,   85,  Math.toRadians(135));
private final Pose pickup1Pose  = new Pose(37,   121, Math.toRadians(0));
private final Pose pickup2Pose  = new Pose(43,   130, Math.toRadians(0));

// ── Single path (BezierLine straight line) ────────────────────────────────
private Path scorePreload;

// ── PathChains for cycles ─────────────────────────────────────────────────
private PathChain grabPickup1, scorePickup1, grabPickup2, scorePickup2;

public void buildPaths() {

    // ── Single BezierLine path — straight from start to score ─────────────
    scorePreload = new Path(new BezierLine(startPose, scorePose));
    scorePreload.setLinearHeadingInterpolation(
        startPose.getHeading(), scorePose.getHeading());

    // ── PathChain example: score → grab pickup 1 ──────────────────────────
    grabPickup1 = follower.pathBuilder()
        .addPath(new BezierLine(scorePose, pickup1Pose))
        .setLinearHeadingInterpolation(
            scorePose.getHeading(), pickup1Pose.getHeading())
        .build();

    // ── PathChain with a curved segment (BezierCurve) ─────────────────────
    // Control point at (50, 105) pulls the path into a curve
    scorePickup1 = follower.pathBuilder()
        .addPath(new BezierCurve(
            pickup1Pose,
            new Pose(50, 105, 0), // control point — shapes the arc
            scorePose
        ))
        .setLinearHeadingInterpolation(
            pickup1Pose.getHeading(), scorePose.getHeading())
        .build();
}`}
              />
              <p>
                Heading interpolation strategies:
              </p>
              <SpecTable
                rows={[
                  { label: "setLinearHeadingInterpolation(start, end)", value: "Rotate linearly from start to end heading" },
                  { label: "setConstantHeadingInterpolation(heading)", value: "Hold a fixed heading the entire path" },
                  { label: "setTangentHeadingInterpolation()", value: "Always face in the direction of travel" },
                ]}
              />
              <NoteBox type="tip">
                All headings are in <strong>radians</strong>. Use{" "}
                <code>Math.toRadians(degrees)</code> to convert. The official
                QuickStart uses degrees in some comments but the actual API
                always takes radians.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "full-auto",
          title: "Full Autonomous Example",
          content: (
            <Prose>
              <p>
                The recommended approach is a <strong>Finite State Machine (FSM)</strong>{" "}
                inside an iterative <code>OpMode</code> (not <code>LinearOpMode</code>).
                Build all paths in <code>init()</code> so they are ready the
                moment <code>start()</code> is pressed.
              </p>
              <CodeBlock
                filename="ExampleAuto.java"
                code={`@Autonomous(name = "Example Auto", group = "Examples")
public class ExampleAuto extends OpMode {

    private Follower follower;
    private Timer pathTimer, opmodeTimer;
    private int pathState;

    // ── Poses ─────────────────────────────────────────────────────────────────
    private final Pose startPose   = new Pose(28.5, 128, Math.toRadians(180));
    private final Pose scorePose   = new Pose(60,   85,  Math.toRadians(135));
    private final Pose pickup1Pose = new Pose(37,   121, Math.toRadians(0));
    private final Pose pickup2Pose = new Pose(43,   130, Math.toRadians(0));

    // ── Paths ─────────────────────────────────────────────────────────────────
    private Path scorePreload;
    private PathChain grabPickup1, scorePickup1, grabPickup2, scorePickup2;

    public void buildPaths() {
        scorePreload = new Path(new BezierLine(startPose, scorePose));
        scorePreload.setLinearHeadingInterpolation(
            startPose.getHeading(), scorePose.getHeading());

        grabPickup1 = follower.pathBuilder()
            .addPath(new BezierLine(scorePose, pickup1Pose))
            .setLinearHeadingInterpolation(
                scorePose.getHeading(), pickup1Pose.getHeading())
            .build();

        scorePickup1 = follower.pathBuilder()
            .addPath(new BezierLine(pickup1Pose, scorePose))
            .setLinearHeadingInterpolation(
                pickup1Pose.getHeading(), scorePose.getHeading())
            .build();

        grabPickup2 = follower.pathBuilder()
            .addPath(new BezierLine(scorePose, pickup2Pose))
            .setLinearHeadingInterpolation(
                scorePose.getHeading(), pickup2Pose.getHeading())
            .build();

        scorePickup2 = follower.pathBuilder()
            .addPath(new BezierLine(pickup2Pose, scorePose))
            .setLinearHeadingInterpolation(
                pickup2Pose.getHeading(), scorePose.getHeading())
            .build();
    }

    // ── FSM path logic ────────────────────────────────────────────────────────
    public void autonomousPathUpdate() {
        switch (pathState) {
            case 0:
                follower.followPath(scorePreload);
                setPathState(1);
                break;

            case 1:
                // Wait until follower is done, then trigger scoring mechanism
                if (!follower.isBusy()) {
                    // score preloaded piece here
                    follower.followPath(grabPickup1, true); // true = hold end
                    setPathState(2);
                }
                break;

            case 2:
                if (!follower.isBusy()) {
                    // grab pickup 1 here
                    follower.followPath(scorePickup1, true);
                    setPathState(3);
                }
                break;

            case 3:
                if (!follower.isBusy()) {
                    // score pickup 1 here
                    follower.followPath(grabPickup2, true);
                    setPathState(4);
                }
                break;

            case 4:
                if (!follower.isBusy()) {
                    // grab pickup 2 here
                    follower.followPath(scorePickup2, true);
                    setPathState(5);
                }
                break;

            case 5:
                if (!follower.isBusy()) {
                    // score pickup 2 here
                    setPathState(-1); // -1 = done
                }
                break;
        }
    }

    public void setPathState(int pState) {
        pathState = pState;
        pathTimer.resetTimer();
    }

    // ── OpMode lifecycle ──────────────────────────────────────────────────────
    @Override
    public void init() {
        pathTimer  = new Timer();
        opmodeTimer = new Timer();

        follower = Constants.createFollower(hardwareMap);
        buildPaths();
        follower.setStartingPose(startPose);

        telemetry.addData("Status", "Ready");
        telemetry.update();
    }

    @Override
    public void start() {
        opmodeTimer.resetTimer();
        setPathState(0);
    }

    @Override
    public void loop() {
        follower.update();          // REQUIRED every loop iteration
        autonomousPathUpdate();

        telemetry.addData("Path State", pathState);
        telemetry.addData("X",          "%.2f", follower.getPose().getX());
        telemetry.addData("Y",          "%.2f", follower.getPose().getY());
        telemetry.addData("Heading",    "%.1f°",
            Math.toDegrees(follower.getPose().getHeading()));
        telemetry.update();
    }

    @Override
    public void stop() {}
}`}
              />
              <NoteBox type="info">
                Pedro uses iterative <strong>OpMode</strong>, not{" "}
                <strong>LinearOpMode</strong>. A clean iterative loop typically
                runs at <strong>150–500 Hz</strong> — far faster than 30 Hz.
                Avoid blocking or heavy string formatting in telemetry every
                frame. <code>follower.update()</code> <em>must</em> be called
                every iteration — without it the follower never advances.
              </NoteBox>
              <NoteBox type="tip">
                <code>follower.followPath(path, holdEnd)</code> — when{" "}
                <code>holdEnd = true</code>, Pedro continues correcting the
                robot&apos;s position at the endpoint after the path is
                complete. This is useful at scoring positions where you want
                the robot to stay precisely on target while mechanisms operate.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "path-transitions",
          title: "Path Transitions & Callbacks",
          content: (
            <Prose>
              <p>
                The FSM above checks <code>!follower.isBusy()</code> between
                paths. But you can also trigger mechanisms <em>during</em> a
                path using parametric callbacks — they fire at a specific
                fractional progress (0.0–1.0) along the path segment:
              </p>
              <CodeBlock
                filename="ParametricCallback.java"
                code={`// addParametricCallback(t, runnable):
// fires when follower's progress on that segment reaches t (0 = start, 1 = end)

PathChain scoringRun = follower.pathBuilder()
    .addPath(new BezierLine(pickupPose, scorePose))
    .setLinearHeadingInterpolation(
        pickupPose.getHeading(), scorePose.getHeading())
    .addParametricCallback(0.6, () -> {
        // At 60% of the path: start raising the arm in anticipation of scoring
        arm.goToHigh();
    })
    .addParametricCallback(0.95, () -> {
        // At 95%: open claw just before arrival
        claw.open();
    })
    .build();`}
              />
              <p>
                You can also check conditions beyond just <code>isBusy()</code>
                in the FSM switch cases:
              </p>
              <CodeBlock
                filename="ConditionChecks.java"
                code={`// Time-based: transition after 1.5 seconds regardless of follower state
if (pathTimer.getElapsedTimeSeconds() > 1.5) { ... }

// Position-based: transition when robot is within 2 inches of target
if (follower.getPose().getX() > 55) { ... }

// Standard: wait for follower to finish
if (!follower.isBusy()) { ... }

// Combined: wait for follower OR time out after 3 seconds
if (!follower.isBusy() || pathTimer.getElapsedTimeSeconds() > 3.0) { ... }`}
              />
              <NoteBox type="tip">
                The time-out condition (<code>pathTimer &gt; 3.0</code>) is
                important for competition reliability — if something goes wrong
                and the robot gets stuck, the FSM will still advance to the
                next state rather than hanging indefinitely.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "follower-api",
          title: "Follower API Reference",
          content: (
            <Prose>
              <SpecTable
                rows={[
                  { label: "Constants.createFollower(hwMap)", value: "Create follower — call once in init()" },
                  { label: "follower.setStartingPose(pose)", value: "Set initial position before start()" },
                  { label: "follower.followPath(path)", value: "Start following a Path" },
                  { label: "follower.followPath(path, true)", value: "Follow path + hold at endpoint when done" },
                  { label: "follower.followPath(chain)", value: "Follow a PathChain (multi-segment)" },
                  { label: "follower.update()", value: "Advance the follower — MUST call every loop" },
                  { label: "follower.isBusy()", value: "Returns true while actively following" },
                  { label: "follower.getPose()", value: "Returns current estimated Pose (x, y, heading)" },
                  { label: "follower.breakFollowing()", value: "Immediately stop following and hold position" },
                ]}
              />
              <CodeBlock
                filename="FollowerApi.java"
                code={`// ── The Pose class ────────────────────────────────────────────────────────
Pose current = follower.getPose();
double x       = current.getX();        // inches, 0–144
double y       = current.getY();        // inches, 0–144
double heading = current.getHeading();  // radians — use Math.toDegrees() to display

// ── Creating poses ────────────────────────────────────────────────────────
Pose examplePose = new Pose(60, 85, Math.toRadians(135));

// ── TeleOp: maintain a field-centric position ─────────────────────────────
// In your teleop loop, you can call followPath with a live target pose
// to implement point-to-point or heading lock behaviors`}
              />
            </Prose>
          ),
        },
        {
          id: "teleop",
          title: "TeleOp with Pedro",
          content: (
            <Prose>
              <p>
                Pedro&apos;s follower can also be used in TeleOp to implement
                heading lock or point-to-point movements. Set{" "}
                <code>follower.setTeleOpMovementVectors()</code> each loop
                with the driver&apos;s raw joystick inputs:
              </p>
              <CodeBlock
                filename="PedroTeleOp.java"
                code={`@TeleOp(name = "Pedro TeleOp")
public class PedroTeleOp extends OpMode {

    private Follower follower;

    @Override
    public void init() {
        follower = Constants.createFollower(hardwareMap);
    }

    @Override
    public void loop() {
        // Invert sticks so field-centric axes match Pedro's [0, 144] frame
        follower.setTeleOpMovementVectors(
            -gamepad1.left_stick_y,   // stick up → positive X (field forward)
            -gamepad1.left_stick_x,   // stick left → positive Y (field left)
            -gamepad1.right_stick_x,  // CCW rotation mapping
            true                      // true = field-centric
        );

        follower.update();

        telemetry.addData("X",       "%.1f", follower.getPose().getX());
        telemetry.addData("Y",       "%.1f", follower.getPose().getY());
        telemetry.addData("Heading", "%.1f°",
            Math.toDegrees(follower.getPose().getHeading()));
        telemetry.update();
    }
}`}
              />
              <NoteBox type="warning">
                Pedro&apos;s field-centric TeleOp maps positive X to field
                forward and positive Y to field left. Negate{" "}
                <code>left_stick_x</code> and <code>right_stick_x</code> so
                stick-left strafes left — passing raw gamepad values inverts
                strafe and rotation for most drivers.
              </NoteBox>
              <NoteBox type="info">
                Field-centric drive means the robot&apos;s forward direction is
                always relative to the field, not its own heading. The driver
                pushes the stick forward and the robot moves toward the
                field&apos;s positive X direction regardless of which way the
                robot is facing.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

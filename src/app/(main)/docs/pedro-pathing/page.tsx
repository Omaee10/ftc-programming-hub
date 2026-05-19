import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Pedro Pathing – FTC Programming Hub" };

export default function PedroPathingPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/pedro-pathing" },
        { label: "Pedro Pathing" },
      ]}
      title="Pedro Pathing"
      description="Pedro Pathing is a reactive follower-based path-following library for FTC. Unlike pre-planned trajectories, Pedro's PIDF follower re-projects the robot's position onto the path every loop, making it resilient to perturbations and defense."
      badge="New"
      badgeColor="emerald"
      readingTime="14 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                Pedro Pathing was developed by FTC team 10158 (Brainstormers)
                and open-sourced for the community. It uses a{" "}
                <strong>centripetal force correction</strong> model and a continuous
                re-projection algorithm to keep the robot on the path, even after
                being pushed or when wheel slip occurs.
              </p>
              <InfoGrid
                items={[
                  { label: "Approach", value: "Reactive Follower", sub: "Re-projects per loop" },
                  { label: "Path Type", value: "Bézier Curves", sub: "Arbitrary degree" },
                  { label: "Odometry", value: "3-wheel pods", sub: "Required" },
                  { label: "Created by", value: "Team 10158", sub: "Brainstormers" },
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
                    ["Path deviation recovery", "Limited", "Continuous re-projection"],
                    ["Tuning effort", "High (6+ OpModes)", "Moderate (3 OpModes)"],
                    ["Community size", "Very large", "Growing fast"],
                    ["RR 1.0 Actions compat", "Yes (native)", "No (separate API)"],
                    ["Defense resistance", "Moderate", "High"],
                  ].map(([f, rr, pp]) => (
                    <tr key={f}>
                      <td>{f}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(148 163 184)", fontSize: "0.8rem" }}>{rr}</td>
                      <td style={{ fontFamily: "inherit", color: "rgb(148 163 184)", fontSize: "0.8rem" }}>{pp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Prose>
          ),
        },
        {
          id: "setup",
          title: "Setup & Robot Constants",
          content: (
            <Prose>
              <p>
                Clone the{" "}
                <strong>Pedro Pathing Quickstart</strong> to get a pre-configured
                project with all tuning OpModes:
              </p>
              <CodeBlock
                lang="bash"
                code={`# Clone the quickstart (replace with current repo URL)
git clone https://github.com/Pedro-Pathing/PedroPathingQuickstart.git

# Open in Android Studio and sync Gradle
# Navigate to: TeamCode/src/main/java/org/firstinspires/ftc/teamcode/`}
              />
              <p>
                Then configure your robot&apos;s physical parameters in{" "}
                <code>RobotConstants.java</code>. Accurate measurements are
                essential — Pedro&apos;s follower is more forgiving than RR but
                still depends on correct constants.
              </p>
              <CodeBlock
                filename="RobotConstants.java"
                code={`public class RobotConstants {

    // ── Drive motor names (must match Driver Station configuration) ──────────
    public static final String LEFT_FRONT_MOTOR  = "leftFront";
    public static final String RIGHT_FRONT_MOTOR = "rightFront";
    public static final String LEFT_BACK_MOTOR   = "leftBack";
    public static final String RIGHT_BACK_MOTOR  = "rightBack";

    // ── Odometry pod names ───────────────────────────────────────────────────
    // Pedro requires a 3-dead-wheel setup: 2 parallel + 1 perpendicular pod
    public static final String LEFT_ODOMETRY_POD   = "leftFront";   // left parallel
    public static final String RIGHT_ODOMETRY_POD  = "rightBack";   // right parallel
    public static final String BACK_ODOMETRY_POD   = "rightFront";  // perpendicular

    // ── Physical measurements — measure carefully in inches ─────────────────
    public static final double TRACK_WIDTH          = 13.11; // parallel pod spacing
    public static final double CENTER_WHEEL_OFFSET  = 6.5;  // perp pod offset from center

    public static final double WHEEL_RADIUS         = 0.68898; // Gobilda odometry pod
    public static final double TICKS_PER_REVOLUTION = 2000;    // encoder counts per rev

    // ── Motion constraints ────────────────────────────────────────────────────
    public static final double MAX_VELOCITY         = 60;  // in/s
    public static final double MAX_ACCELERATION     = 50;  // in/s²
    public static final double MAX_ANGULAR_VELOCITY = 4;   // rad/s
}`}
              />
              <NoteBox type="warning">
                Pedro requires a <strong>3-wheel dead-wheel odometry</strong>{" "}
                setup (2 parallel pods + 1 perpendicular pod). It will not work
                correctly with drive-encoder-based odometry.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "simple-path",
          title: "Creating a Simple Path",
          content: (
            <Prose>
              <p>
                A <strong>Path</strong> in Pedro is constructed with{" "}
                <code>PathBuilder</code>. Each segment is defined as a Bézier
                curve with a heading interpolation strategy. The simplest path
                is a straight line between two points.
              </p>
              <StepList
                steps={[
                  "Create a Follower instance using the hardwareMap.",
                  "Set the robot's starting pose with follower.setStartingPose(pose).",
                  "Build a Path using PathBuilder and .addBezierLine().",
                  "Call follower.followPath(path, holdEnd) to begin following.",
                  "Update follower in a loop; check follower.atParametricEnd() to detect completion.",
                ]}
              />
              <CodeBlock
                filename="SimplePathAuto.java"
                code={`@Autonomous(name = "Simple Path Auto")
public class SimplePathAuto extends LinearOpMode {

    private Follower follower;

    @Override
    public void runOpMode() throws InterruptedException {
        follower = new Follower(hardwareMap);

        // Set starting pose — (x=0, y=0, heading=0)
        Pose startPose = new Pose(0, 0, 0);
        follower.setStartingPose(startPose);

        // Build a straight 30-inch path forward
        Path driveForward = new PathBuilder(startPose)
            .addBezierLine(
                new Point(startPose),
                new Point(30, 0, Point.CARTESIAN) // 30 inches forward
            )
            .setLinearHeadingInterpolation(0, 0)  // maintain 0° heading
            .build();

        waitForStart();

        // Start following — true = hold end position when done
        follower.followPath(driveForward, true);

        while (opModeIsActive() && !follower.atParametricEnd()) {
            follower.update();

            Pose current = follower.getPose();
            telemetry.addData("X", "%.2f in", current.getX());
            telemetry.addData("Y", "%.2f in", current.getY());
            telemetry.addData("Heading", "%.1f°", Math.toDegrees(current.getHeading()));
            telemetry.addData("t value",  "%.3f",  follower.getCurrentTValue());
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "bezier-curves",
          title: "Bézier Curves",
          content: (
            <Prose>
              <p>
                A Bézier curve is defined by <strong>control points</strong>. The
                robot follows the curve smoothly — the intermediate points pull the
                path toward them without requiring the robot to pass through them.
                Pedro supports linear, quadratic, and cubic Bézier segments.
              </p>
              <SpecTable
                rows={[
                  { label: "BezierLine", value: "2 points", note: "Start + End → straight line" },
                  { label: "BezierCurve (quad)", value: "3 points", note: "Start + Control + End" },
                  { label: "BezierCurve (cubic)", value: "4 points", note: "Start + C1 + C2 + End" },
                ]}
              />
              <p>
                Use <code>BezierCurve</code> with 3 or 4 control points to create
                smooth arcs. The middle control points shape the curve:
              </p>
              <CodeBlock
                filename="BezierCurveExample.java"
                code={`// Quadratic Bézier: Start → pulls toward (15, 10) → End at (30, 0)
Path arcPath = new PathBuilder(new Pose(0, 0, 0))
    .addBezierCurve(
        new Point(0,  0,  Point.CARTESIAN), // Start
        new Point(15, 10, Point.CARTESIAN), // Control point — curves toward this
        new Point(30, 0,  Point.CARTESIAN)  // End
    )
    .setTangentHeadingInterpolation() // heading follows the curve tangent
    .build();

// Cubic Bézier: for more S-shaped or complex curves
Path sPath = new PathBuilder(new Pose(0, 0, 0))
    .addBezierCurve(
        new Point(0,   0,  Point.CARTESIAN), // Start
        new Point(10, -10, Point.CARTESIAN), // First control
        new Point(20,  10, Point.CARTESIAN), // Second control
        new Point(30,   0, Point.CARTESIAN)  // End
    )
    .setLinearHeadingInterpolation(0, Math.PI) // rotate 180° along path
    .build();

follower.followPath(arcPath, true);`}
              />
              <NoteBox type="tip">
                Use <code>setTangentHeadingInterpolation()</code> when you want the
                robot to always face along the direction of travel — great for fast
                drive-and-pick movements. Use{" "}
                <code>setLinearHeadingInterpolation(start, end)</code> to rotate the
                robot by a fixed amount over the path&apos;s length.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "path-chains",
          title: "Chaining Paths (PathChain)",
          content: (
            <Prose>
              <p>
                A <strong>PathChain</strong> concatenates multiple path segments
                into a single continuous motion. Pedro transitions between segments
                without stopping — reducing overall autonomous time significantly.
              </p>
              <p>
                Build a PathChain using <code>follower.pathBuilder()</code> and
                call <code>follower.followPath(chain)</code>:
              </p>
              <CodeBlock
                filename="PathChainAuto.java"
                code={`@Autonomous(name = "Full Autonomous Routine")
public class FullAuto extends LinearOpMode {

    private Follower follower;
    private Claw     claw;
    private ArmSystem arm;

    @Override
    public void runOpMode() throws InterruptedException {
        follower = new Follower(hardwareMap);
        claw     = new Claw(hardwareMap);
        arm      = new ArmSystem(hardwareMap);

        Pose start    = new Pose(0,   0,  0);
        Pose spikeMid = new Pose(24,  24, Math.PI / 2);
        Pose backdrop = new Pose(48,  36, Math.PI);
        Pose stack    = new Pose(60,  0,  0);

        follower.setStartingPose(start);

        // ── Chain: Start → Spike → Backdrop → Stack → Backdrop ─────────────
        PathChain scoringChain = follower.pathBuilder()

            // Leg 1: curved drive to spike mark
            .addPath(new BezierCurve(
                new Point(start),
                new Point(12, 6,  Point.CARTESIAN), // pull control point
                new Point(spikeMid)
            ))
            .setLinearHeadingInterpolation(start.getHeading(), spikeMid.getHeading())

            // Leg 2: straight reverse to backdrop
            .addPath(new BezierLine(
                new Point(spikeMid),
                new Point(backdrop)
            ))
            .setLinearHeadingInterpolation(spikeMid.getHeading(), backdrop.getHeading())

            // Leg 3: strafe to pixel stack
            .addPath(new BezierLine(
                new Point(backdrop),
                new Point(stack)
            ))
            .setConstantHeadingInterpolation(backdrop.getHeading())

            // Leg 4: return to backdrop with pixels
            .addPath(new BezierCurve(
                new Point(stack),
                new Point(54, 20, Point.CARTESIAN),
                new Point(backdrop)
            ))
            .setLinearHeadingInterpolation(stack.getHeading(), backdrop.getHeading())

            .build();

        waitForStart();

        follower.followPath(scoringChain, true);

        while (opModeIsActive()) {
            follower.update();

            // Check which leg we're on to trigger mechanisms at the right time
            if (follower.getCurrentPathNumber() == 1 && !arm.isRaised()) {
                arm.goToHigh();
            }
            if (follower.getCurrentPathNumber() == 2 && arm.isAtHigh()) {
                claw.release();
            }

            telemetry.addData("Path Segment", follower.getCurrentPathNumber());
            telemetry.addData("t",            "%.3f", follower.getCurrentTValue());
            telemetry.update();

            if (follower.isRobotStuck()) {
                telemetry.addLine("WARNING: Robot appears stuck!");
                telemetry.update();
            }
        }
    }
}`}
              />
              <NoteBox type="info">
                <code>follower.getCurrentPathNumber()</code> returns the index
                of the current path segment in the chain (0-indexed). Use this
                to trigger mechanisms at the right point in the sequence instead
                of using raw timers.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "follower-setup",
          title: "Follower Setup",
          content: (
            <Prose>
              <p>
                The <code>Follower</code> class is Pedro&apos;s core object. It
                wraps your drivetrain, localizer, and PIDF controllers into a
                single interface. Initialize it in <code>runOpMode()</code> before
                <code>waitForStart()</code>.
              </p>
              <CodeBlock
                
                filename="PedroFollowerSetup.java"
                code={`import org.firstinspires.ftc.teamcode.pedroPathing.follower.Follower;
import org.firstinspires.ftc.teamcode.pedroPathing.localization.Pose;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.BezierLine;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.BezierCurve;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.Path;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.PathChain;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.PathBuilder;
import org.firstinspires.ftc.teamcode.pedroPathing.pathGeneration.Point;

@Autonomous(name = "Pedro Auto", group = "Pedro Pathing")
public class PedroAutoExample extends OpMode {

    private Follower follower;

    @Override
    public void init() {
        // ── Create the follower — pass hardwareMap to let it find motors ─────
        follower = new Follower(hardwareMap);

        // ── Set the robot's starting pose (x, y, heading in radians) ─────────
        // Origin is typically the center of the field.
        // X increases to the right; Y increases upward.
        Pose startPose = new Pose(9, -63, Math.toRadians(90));
        follower.setStartingPose(startPose);

        telemetry.addData("Status", "Initialized");
        telemetry.update();
    }

    @Override
    public void loop() {
        follower.update(); // ← Must be called every loop iteration

        Pose current = follower.getPose();
        telemetry.addData("X",       "%.2f", current.getX());
        telemetry.addData("Y",       "%.2f", current.getY());
        telemetry.addData("Heading", "%.1f°", Math.toDegrees(current.getHeading()));
        telemetry.addData("Busy",    follower.isBusy());
        telemetry.update();
    }
}`}
              />
              <NoteBox type="info">
                Pedro uses <strong>OpMode</strong> (iterative), not{" "}
                <strong>LinearOpMode</strong>. The <code>loop()</code> method
                runs continuously at the robot loop rate (~30 Hz). Call{" "}
                <code>follower.update()</code> every iteration — without it, the
                follower never advances along the path.
              </NoteBox>
              <p>
                <strong>The Pose class</strong> holds three values:
              </p>
              <SpecTable
                rows={[
                  { label: "getX()", value: "X field position", note: "Inches from field origin" },
                  { label: "getY()", value: "Y field position", note: "Inches from field origin" },
                  { label: "getHeading()", value: "Robot heading in radians", note: "Use Math.toDegrees() for display" },
                ]}
              />
            </Prose>
          ),
        },
        {
          id: "path-chains",
          title: "Path Chains",
          content: (
            <Prose>
              <p>
                A <strong>PathChain</strong> links multiple <code>Path</code>{" "}
                segments together. Pedro transitions between them automatically
                using its continuous re-projection algorithm, so there is no
                stop-and-go between segments. Use{" "}
                <code>PathBuilder.addPath()</code> to assemble the chain and{" "}
                <code>addParametricCallback()</code> to fire actions at specific
                points along the path.
              </p>
              <CodeBlock
                
                filename="PedroPathChain.java"
                code={`// ── Build individual paths ────────────────────────────────────────────────

// BezierLine: straight line from point A to point B
Path toSpike = new Path(new BezierLine(
    new Point(9, -63, Point.CARTESIAN),   // start
    new Point(9, -32, Point.CARTESIAN)    // end
));
toSpike.setLinearHeadingInterpolation(Math.toRadians(90), Math.toRadians(90));

// BezierCurve: spline with control points for smooth cornering
Path toBackdrop = new Path(new BezierCurve(
    new Point(9,  -32, Point.CARTESIAN),  // start
    new Point(24, -32, Point.CARTESIAN),  // control point 1 (pulls the curve)
    new Point(48, -36, Point.CARTESIAN)   // end
));
toBackdrop.setLinearHeadingInterpolation(Math.toRadians(90), Math.toRadians(180));

// BezierLine for the park
Path toPark = new Path(new BezierLine(
    new Point(48, -36, Point.CARTESIAN),
    new Point(60, -60, Point.CARTESIAN)
));
toPark.setConstantHeadingInterpolation(Math.toRadians(180));

// ── Chain all paths together ──────────────────────────────────────────────
PathChain autoChain = follower.pathBuilder()
    .addPath(toSpike)
    .addParametricCallback(0.85, () -> {
        // Fires when ~85% of toSpike is complete
        // e.g. start lowering arm before arrival
        arm.setState(ArmState.DEPOSIT);
    })
    .addPath(toBackdrop)
    .addParametricCallback(0.9, () -> {
        // Fires at 90% of toBackdrop
        claw.open();
    })
    .addPath(toPark)
    .build();

// ── Follow the chain ─────────────────────────────────────────────────────
follower.followPath(autoChain, true); // true = hold end position

// In loop():
while (!follower.isBusy()) {
    follower.update();
}`}
              />
              <NoteBox type="tip">
                <code>addParametricCallback(t, fn)</code> fires when the follower&apos;s
                parametric progress on that segment reaches the threshold
                (0.0–1.0). Use values of 0.8–0.95 to pre-arm mechanisms so they
                are ready the instant the robot arrives at the target position.
              </NoteBox>
              <NoteBox type="info">
                <strong>PathChain vs single Path</strong>: a single{" "}
                <code>Path</code> followed with <code>follower.followPath(path)</code>
                is fine for one move. Use <code>PathChain</code> whenever you
                need smooth, stop-free transitions across two or more segments —
                this is the standard for full autonomous routines.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "tuning-constants",
          title: "Tuning Constants",
          content: (
            <Prose>
              <p>
                Pedro&apos;s PIDF gains and physical robot constants live in{" "}
                <code>FollowerConstants.java</code> and{" "}
                <code>LConstants.java</code>. Tune them in the order listed below
                — each step depends on the previous one being correct.
              </p>
              <StepList
                steps={[
                  "Set odometry wheel radius and track width in LConstants.java. Measure with a ruler; you will refine these with the StraightBackAndForth and LocalizationTest OpModes.",
                  "Run ForwardVelocityTuner to find zeroPowerAccelMultiplier — this controls how aggressively Pedro decelerates when motor power cuts.",
                  "Tune translationalPIDFCoefficients using TranslationalPIDTuner. Start with P=0.1, I=0, D=0.01 and increase P until the robot tracks a straight line without oscillating.",
                  "Tune headingPIDFCoefficients using TurnTuner. Start with P=1.0, I=0, D=0.1.",
                  "Tune drivePIDFCoefficients last — this controls how fast the follower's parametric t advances along the path. Increase P until the robot reaches targets quickly without overshooting.",
                ]}
              />
              <CodeBlock
                
                filename="FollowerConstantsTuning.java"
                code={`// ── FollowerConstants.java — starting values, tune for your robot ────────

// How aggressively the robot brakes when power cuts (run ForwardVelocityTuner)
public static double zeroPowerAccelMultiplier = 4.0;

// XY position error PIDF — run TranslationalPIDTuner
public static CustomFilteredPIDFCoefficients translationalPIDFCoefficients =
    new CustomFilteredPIDFCoefficients(0.15, 0, 0.012, 0, 0);

// Secondary (slow-speed) translational PID kicks in near path end
public static boolean useSecondaryTranslationalPID = true;
public static CustomFilteredPIDFCoefficients secondaryTranslationalPIDFCoefficients =
    new CustomFilteredPIDFCoefficients(0.1, 0, 0.01, 0, 0);

// Heading PIDF — run TurnTuner
public static CustomFilteredPIDFCoefficients headingPIDFCoefficients =
    new CustomFilteredPIDFCoefficients(1.2, 0, 0.09, 0, 0);

// Path parametric t PIDF — how fast the follower advances along the path
public static CustomFilteredPIDFCoefficients drivePIDFCoefficients =
    new CustomFilteredPIDFCoefficients(0.025, 0, 0.00001, 0.6, 0);

// Tolerance for declaring a path segment complete
public static double pathEndTranslationalConstraint = 0.1;  // inches
public static double pathEndHeadingConstraint       = 0.007; // radians (~0.4°)
public static double pathEndTimeoutConstraint       = 500;   // ms`}
              />
              <NoteBox type="warning">
                Do not tune <code>drivePIDFCoefficients</code> until{" "}
                <code>translationalPIDFCoefficients</code> and{" "}
                <code>headingPIDFCoefficients</code> are stable. The drive PIDF
                pushes the robot forward along the path — if heading is
                oscillating, the robot will spiral rather than follow the curve.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "follower-config",
          title: "Follower Configuration",
          content: (
            <Prose>
              <p>
                The follower&apos;s PIDF gains and correction parameters are
                configured in <code>FollowerConstants.java</code>. Tune these
                after verifying your odometry constants are correct.
              </p>
              <SpecTable
                rows={[
                  { label: "translationalPIDFCoefficients", value: "PIDF for XY error" },
                  { label: "headingPIDFCoefficients", value: "PIDF for heading error" },
                  { label: "drivePIDFCoefficients", value: "PIDF for path parametric t" },
                  { label: "zeroPowerAccelMultiplier", value: "Braking decel multiplier" },
                  { label: "pathEndTimeoutConstraint", value: "Max ms to hold path end" },
                  { label: "useSecondaryTranslationalPID", value: "Extra PID near path end" },
                ]}
              />
              <CodeBlock
                filename="FollowerConstants.java"
                code={`// Inside FollowerConstants.java — these are starting values, tune for your robot
public static CustomFilteredPIDFCoefficients translationalPIDFCoefficients =
    new CustomFilteredPIDFCoefficients(0.1, 0, 0.01, 0, 0);

public static CustomFilteredPIDFCoefficients headingPIDFCoefficients =
    new CustomFilteredPIDFCoefficients(1, 0, 0.1, 0, 0);

// Drive PIDF controls how fast robot "catches up" to the parametric t value
public static CustomFilteredPIDFCoefficients drivePIDFCoefficients =
    new CustomFilteredPIDFCoefficients(0.025, 0, 0.00001, 0.6, 0);

// How aggressively the robot decelerates when power cuts
public static double zeroPowerAccelMultiplier = 4;

// ms to wait holding at path end before declaring "done"
public static double pathEndTimeoutConstraint = 500;`}
              />
              <NoteBox type="tip">
                Use <strong>FTC Dashboard</strong> with Pedro&apos;s built-in
                telemetry to visualize the robot&apos;s path in real-time during
                tuning. Connect to <code>http://192.168.43.1:8080/dash</code> and
                enable the <em>Field</em> widget to see the field overlay.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Limelight 3A – FTC Programming Hub" };

export default function LimelightPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Limelight 3A" },
      ]}
      title="Limelight 3A"
      description="Complete guide to mounting, wiring, and programming the Limelight 3A vision sensor in FTC — covering AprilTag localization, MegaTag2 IMU fusion, color detection, and neural network pipelines."
      badge="Vision"
      badgeColor="violet"
      readingTime="12 min"
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <Prose>
              <p>
                The <strong>Limelight 3A</strong> is a self-contained vision
                computer designed for FTC. It runs LimelightOS on an ARM64
                processor, ships with a built-in web interface for zero-code
                pipeline configuration, and communicates with the Control Hub
                over USB-C as an ethernet device. No external computer, no
                OpenCV setup — configure pipelines in a browser and read
                results in a few lines of Java.
              </p>
              <InfoGrid
                items={[
                  { label: "Sensor", value: "OV5647", sub: "640×480 @ 90 FPS" },
                  { label: "Field of View", value: "H 54.5° / V 42°" },
                  { label: "Power", value: "4.1–5.75 V", sub: "USB-C, max 4 W" },
                  { label: "Mass", value: "0.20 lb", sub: "72 × 48 × 17 mm" },
                  { label: "Pipelines", value: "10 hot-swap", sub: "Configured in browser" },
                  { label: "Connection", value: "USB-C → USB-A", sub: "Control Hub USB 3.0" },
                ]}
              />
              <NoteBox type="info">
                The Limelight 3A has <strong>no built-in LEDs</strong> and uses
                a rolling shutter sensor. It is optimized for well-lit FTC
                fields. For low-light environments or retroreflective tape
                tracking, consider the Limelight 3 instead.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "wiring-setup",
          title: "Wiring & Configuration",
          content: (
            <Prose>
              <DocVideo docSlug="limelight" sectionId="wiring-setup" />
              <p>
                The Limelight 3A connects to the Control Hub via a single
                USB-C to USB-A cable. It enumerates as an ethernet device
                and gets a DHCP-assigned IP address automatically — no manual
                network configuration is required.
              </p>
              <StepList
                steps={[
                  "Mount the Limelight using at least 2× M3 or M4 screws into goBILDA or REV channel. VHB tape alone is not recommended for competition.",
                  "Run a USB-C to USB-A cable from the Limelight to the blue USB 3.0 port on the REV Control Hub.",
                  "Connect your laptop to the Control Hub's Wi-Fi network, then open http://limelight.local:5801 in a browser to access the web interface.",
                  "In the Settings tab, enter your team number and click \"Restart Vision Client\".",
                  "Configure your pipelines (AprilTag, color blob, neural network, etc.) and save.",
                  "On the Driver Station app, go to Configure Robot → scan. An \"Ethernet Device\" will appear — rename it to \"limelight\".",
                  "Save the configuration. You can now reference it in code as \"limelight\".",
                  "In the Limelight web interface General tab, enter the camera's X, Y, Z offsets from the robot center of rotation and its pitch/roll mount angles. MegaTag2 uses this transform for perspective correction.",
                ]}
              />
              <NoteBox type="warning">
                Always plug the Limelight into the <strong>blue USB 3.0 port</strong>.
                The black USB 2.0 ports do not provide enough bandwidth for
                reliable video streaming and may cause dropped frames or
                connection resets.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "basic-usage",
          title: "Basic Usage",
          content: (
            <Prose>
              <p>
                The Limelight SDK is built into the FTC SDK — no extra library
                is needed. Retrieve the device with <code>Limelight3A.class</code>,
                select a pipeline index, call <code>start()</code>, then poll{" "}
                <code>getLatestResult()</code> every loop. The two most
                important targeting values are <code>tx</code> (horizontal
                offset from crosshair in degrees) and <code>ty</code> (vertical
                offset).
              </p>
              <SpecTable
                rows={[
                  {
                    label: "getTx()",
                    value: "Horizontal offset (degrees)",
                    note: "Negative = target left of crosshair",
                  },
                  {
                    label: "getTy()",
                    value: "Vertical offset (degrees)",
                    note: "Negative = target below crosshair",
                  },
                  {
                    label: "getTa()",
                    value: "Target area (% of image)",
                    note: "Proxy for distance",
                  },
                  {
                    label: "isValid()",
                    value: "true when a target is detected",
                    note: "Always check before reading data",
                  },
                  {
                    label: "getBotpose()",
                    value: "Pose3D — field-relative position",
                    note: "AprilTag pipelines only",
                  },
                ]}
              />
              <CodeBlock
                filename="LimelightBasic.java"
                code={`import com.qualcomm.hardware.limelightvision.LLResult;
import com.qualcomm.hardware.limelightvision.LLStatus;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import org.firstinspires.ftc.robotcore.external.navigation.Pose3D;

@TeleOp(name = "Limelight Basic", group = "Sensor")
public class LimelightBasic extends LinearOpMode {

    private Limelight3A limelight;

    @Override
    public void runOpMode() throws InterruptedException {
        limelight = hardwareMap.get(Limelight3A.class, "limelight");

        // Reduce telemetry lag — 11 ms matches Limelight's update rate
        telemetry.setMsTransmissionInterval(11);

        // Select pipeline 0 (configured in the web interface)
        limelight.pipelineSwitch(0);

        // Start polling — getLatestResult() returns null if you skip this
        limelight.start();

        waitForStart();

        while (opModeIsActive()) {
            LLResult result = limelight.getLatestResult();

            if (result != null && result.isValid()) {
                double tx = result.getTx(); // horizontal offset in degrees
                double ty = result.getTy(); // vertical offset in degrees
                double ta = result.getTa(); // target area as % of image

                Pose3D botpose = result.getBotpose(); // field-relative pose (AprilTag only)

                telemetry.addData("tx (horizontal °)", "%.2f", tx);
                telemetry.addData("ty (vertical °)",   "%.2f", ty);
                telemetry.addData("ta (area %)",        "%.2f", ta);
                telemetry.addData("Botpose",            botpose.toString());
            } else {
                telemetry.addData("Limelight", "No target");
            }

            // Log device health
            LLStatus status = limelight.getStatus();
            telemetry.addData("Pipeline", "Index %d — %s",
                status.getPipelineIndex(), status.getPipelineType());
            telemetry.addData("FPS / Temp",  "%d FPS  %.1f°C",
                (int) status.getFps(), status.getTemp());
            telemetry.update();
        }

        limelight.stop();
    }
}`}
              />
              <NoteBox type="tip">
                Switch pipelines at runtime with{" "}
                <code>limelight.pipelineSwitch(index)</code> — useful for
                switching between an AprilTag pipeline during autonomous and a
                color blob pipeline during TeleOp without restarting the OpMode.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "apriltag-localization",
          title: "AprilTag Localization",
          content: (
            <Prose>
              <p>
                The Limelight 3A ships with a built-in FTC field map and
                supports two localization algorithms. <strong>MegaTag1</strong>{" "}
                uses only camera data and works without an IMU.{" "}
                <strong>MegaTag2</strong> fuses camera data with the Control
                Hub&apos;s IMU for significantly higher accuracy — use it
                whenever possible. Feed the robot&apos;s current yaw into{" "}
                <code>updateRobotOrientation()</code> before reading the result
                every loop.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "MegaTag1",
                    value: "Camera-only 3D localization",
                    note: "Works without IMU",
                  },
                  {
                    label: "MegaTag2",
                    value: "IMU-fused localization",
                    note: "Higher accuracy — preferred",
                  },
                  {
                    label: "getBotpose()",
                    value: "MegaTag1 result",
                    note: "Field-relative Pose3D",
                  },
                  {
                    label: "getBotpose_MT2()",
                    value: "MegaTag2 result",
                    note: "Requires updateRobotOrientation()",
                  },
                  {
                    label: "Resolution",
                    value: "20 FPS @ 1280×960",
                    note: "Or 50 FPS @ 640×480",
                  },
                ]}
              />
              <CodeBlock
                filename="LimelightAprilTag.java"
                code={`import com.qualcomm.hardware.limelightvision.LLResult;
import com.qualcomm.hardware.limelightvision.Limelight3A;
import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import com.qualcomm.robotcore.hardware.IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.Pose3D;

@Autonomous(name = "AprilTag Localization", group = "Auto")
public class LimelightAprilTag extends LinearOpMode {

    private Limelight3A limelight;
    private IMU imu;

    @Override
    public void runOpMode() throws InterruptedException {
        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        imu       = hardwareMap.get(IMU.class, "imu");

        imu.initialize(new IMU.Parameters(
            new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD
            )
        ));

        telemetry.setMsTransmissionInterval(11);
        limelight.pipelineSwitch(0); // must be an AprilTag pipeline
        limelight.start();

        waitForStart();
        imu.resetYaw();

        while (opModeIsActive()) {
            // ── MegaTag2: feed current IMU heading for sensor fusion ──────
            double yaw = imu.getRobotYawPitchRollAngles()
                            .getYaw(AngleUnit.DEGREES);
            limelight.updateRobotOrientation(yaw);

            LLResult result = limelight.getLatestResult();

            if (result != null && result.isValid()) {
                Pose3D rawPose = result.getBotpose_MT2();

                // Limelight outputs WPILib/FRC field coordinates (X forward, Y left, Z up).
                // Remap to your localization engine's frame before path following.
                double robotFieldX = rawPose.getPosition().x;
                double robotFieldY = rawPose.getPosition().y;
                double robotFieldHeading =
                    rawPose.getOrientation().getYaw(AngleUnit.DEGREES);

                // MegaTag1 (camera-only) — fallback if IMU unavailable
                Pose3D botposeMT1 = result.getBotpose();

                double latencyMs = result.getCaptureLatency()
                                 + result.getTargetingLatency();

                telemetry.addData("Field X (m)",     "%.2f", robotFieldX);
                telemetry.addData("Field Y (m)",     "%.2f", robotFieldY);
                telemetry.addData("Field heading (°)", "%.1f", robotFieldHeading);
                telemetry.addData("MT1 Pose (raw)",  botposeMT1.toString());
                telemetry.addData("Latency (ms)",    "%.1f", latencyMs);
                telemetry.addData("IMU yaw (°)",     "%.1f", yaw);
            } else {
                telemetry.addData("AprilTag", "No tags visible");
            }

            telemetry.update();
        }

        limelight.stop();
    }
}`}
              />
              <NoteBox type="warning">
                <code>getBotpose_MT2()</code> returns coordinates in the{" "}
                <strong>WPILib/FRC field frame</strong> (X forward, Y left, Z
                up). Road Runner, Pedro Pathing, and FTC field layouts may use
                different axis signs or units. Never feed raw{" "}
                <code>botpose.toString()</code> directly into a path follower —
                extract components and remap them to your localizer&apos;s
                expected frame first.
              </NoteBox>
              <pre className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
{`+---------------------------+               +---------------------------+
|    REV Control Hub        |               |   Limelight 3A Camera     |
|                           |  USB-C Cable  |                           |
| 1. Reads internal IMU     | ------------> | 2. Receives yaw heading   |
| 2. updateRobotOrientation |  (Ethernet)   | 3. Detects AprilTag       |
|                           | <------------ | 4. Computes MegaTag2 pose |
+---------------------------+               +---------------------------+`}
              </pre>
              <NoteBox type="info">
                Total localization latency = <code>captureLatency</code> +{" "}
                <code>targetingLatency</code>. On the Limelight 3A this is
                typically 30–60 ms. Factor this into any motion control loop
                that uses the pose output to avoid oscillation.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "pipeline-types",
          title: "Pipeline Types",
          content: (
            <Prose>
              <p>
                All pipelines are configured in the Limelight web interface at{" "}
                <code>http://limelight.local:5801</code>. Up to 10 pipelines
                can be saved and switched at runtime. The result type your code
                reads depends on which pipeline is active.
              </p>
              <SpecTable
                rows={[
                  {
                    label: "AprilTag",
                    value: "getFiducialResults()",
                    note: "ID, family, X/Y angle, 3D pose",
                  },
                  {
                    label: "Color Blob",
                    value: "getColorResults()",
                    note: "tx, ty, area of detected blob",
                  },
                  {
                    label: "Neural Detector",
                    value: "getDetectorResults()",
                    note: "Class name, bounding box, area",
                  },
                  {
                    label: "Neural Classifier",
                    value: "getClassifierResults()",
                    note: "Class name, confidence score",
                  },
                  {
                    label: "Barcode",
                    value: "getBarcodeResults()",
                    note: "Decoded string data",
                  },
                  {
                    label: "Python SnapScript",
                    value: "getPythonOutput()",
                    note: "double[8] custom output array",
                  },
                ]}
              />
              <NoteBox type="warning">
                The Limelight 3A does <strong>not</strong> support Google Coral
                acceleration. Neural network pipelines run on the CPU — set the
                runtime engine to <strong>CPU</strong> in the web interface or
                the pipeline will fail to start.
              </NoteBox>
              <NoteBox type="info">
                MegaTag2 accuracy depends on two physical setup steps: feed IMU
                yaw every loop via <code>updateRobotOrientation()</code>, and
                configure the camera&apos;s mount offsets in the web interface
                General tab. If the lens is not at the robot center, omitting
                those values skews pose whenever the chassis rotates.
              </NoteBox>
              <CodeBlock
                filename="LimelightPipelines.java"
                code={`import com.qualcomm.hardware.limelightvision.LLResult;
import com.qualcomm.hardware.limelightvision.LLResultTypes;
import com.qualcomm.hardware.limelightvision.Limelight3A;

import java.util.List;

LLResult result = limelight.getLatestResult();

if (result != null && result.isValid()) {

    // ── AprilTag fiducials ────────────────────────────────────────────────
    List<LLResultTypes.FiducialResult> tags = result.getFiducialResults();
    for (LLResultTypes.FiducialResult tag : tags) {
        telemetry.addData("Tag ID",  tag.getFiducialId());
        telemetry.addData("Family",  tag.getFamily());
        telemetry.addData("Tag X°",  "%.2f", tag.getTargetXDegrees());
        telemetry.addData("Tag Y°",  "%.2f", tag.getTargetYDegrees());
    }

    // ── Color blob ────────────────────────────────────────────────────────
    List<LLResultTypes.ColorResult> blobs = result.getColorResults();
    for (LLResultTypes.ColorResult blob : blobs) {
        telemetry.addData("Blob X°", "%.2f", blob.getTargetXDegrees());
        telemetry.addData("Blob Y°", "%.2f", blob.getTargetYDegrees());
    }

    // ── Neural detector ───────────────────────────────────────────────────
    List<LLResultTypes.DetectorResult> detections = result.getDetectorResults();
    for (LLResultTypes.DetectorResult det : detections) {
        telemetry.addData("Object",  det.getClassName());
        telemetry.addData("Area %",  "%.2f", det.getTargetArea());
    }

    // ── Neural classifier ─────────────────────────────────────────────────
    List<LLResultTypes.ClassifierResult> classes = result.getClassifierResults();
    for (LLResultTypes.ClassifierResult cls : classes) {
        telemetry.addData("Class",      cls.getClassName());
        telemetry.addData("Confidence", "%.2f", cls.getConfidence());
    }

    // ── Python SnapScript output ──────────────────────────────────────────
    double[] pythonOut = result.getPythonOutput(); // up to 8 values, may be null
    if (pythonOut != null && pythonOut.length > 0) {
        telemetry.addData("Python[0]", "%.3f", pythonOut[0]);
    } else {
        telemetry.addData("Python Output", "No script data available");
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "aiming",
          title: "Target Aiming with tx",
          content: (
            <Prose>
              <p>
                A common TeleOp use case is auto-aiming: rotate the robot until{" "}
                <code>tx</code> is near zero (target centered), then drive or
                score. Feed <code>tx</code> into a simple proportional
                controller on the rotation axis — the robot turns toward the
                target continuously as long as the pipeline detects it.
              </p>
              <CodeBlock
                filename="LimelightAiming.java"
                code={`@TeleOp(name = "Limelight Aim Assist", group = "TeleOp")
public class LimelightAimAssist extends LinearOpMode {

    private Limelight3A limelight;
    // ... drive motors

    // Proportional gain — increase until the robot turns snappily but doesn't oscillate
    private static final double AIM_KP = 0.035;

    @Override
    public void runOpMode() throws InterruptedException {
        limelight = hardwareMap.get(Limelight3A.class, "limelight");
        limelight.pipelineSwitch(0);
        limelight.start();

        waitForStart();

        while (opModeIsActive()) {
            double rotationCorrection = 0;

            LLResult result = limelight.getLatestResult();
            if (result != null && result.isValid()) {
                double tx = result.getTx();
                // P controller — positive tx means target is to the right
                rotationCorrection = tx * AIM_KP;
            }

            double drive  = -gamepad1.left_stick_y;
            double strafe =  gamepad1.left_stick_x;
            double rotate =  gamepad1.right_stick_x + rotationCorrection;

            // ... apply to mecanum motors
            telemetry.addData("Rotation correction", "%.3f", rotationCorrection);
            telemetry.update();
        }

        limelight.stop();
    }
}`}
              />
              <NoteBox type="tip">
                Start with <code>AIM_KP = 0.02</code> and increase in steps of
                0.005 until the robot centers on the target quickly without
                overshooting. Add a deadband{" "}
                (<code>if (Math.abs(tx) &lt; 1.0) rotationCorrection = 0</code>)
                to prevent constant micro-corrections when already aimed.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}

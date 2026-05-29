import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Android Studio Setup – FTC Programming Hub" };

export default function AndroidStudioPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/android-studio" },
        { label: "Android Studio Setup" },
      ]}
      title="Android Studio Setup"
      description="Step-by-step guide to installing Android Studio, cloning the FTC SDK, and deploying your first OpMode to a REV Control Hub."
      badge="Setup"
      badgeColor="emerald"
      readingTime="15 min"
      sections={[
        {
          id: "requirements",
          title: "System Requirements",
          content: (
            <Prose>
              <InfoGrid
                items={[
                  { label: "OS", value: "Windows 10+ or macOS 12+" },
                  { label: "RAM", value: "8 GB minimum", sub: "16 GB recommended" },
                  { label: "Disk", value: "4 GB free", sub: "For IDE + SDK" },
                  { label: "Java", value: "Bundled", sub: "No separate JDK needed" },
                ]}
              />
              <NoteBox type="info">
                You do <strong>not</strong> need to install a separate JDK.
                Android Studio ships with its own bundled JVM and uses it
                automatically for all Gradle builds.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "install-android-studio",
          title: "Install Android Studio",
          content: (
            <Prose>
              <StepList
                steps={[
                  "Download Android Studio from developer.android.com/studio. The current version is Ladybug 2024.2.",
                  "Run the installer and accept the defaults. Keep \"Android Virtual Device\" checked — it is not required for FTC but safe to include.",
                  "On first launch, complete the Setup Wizard and download the default SDK package when prompted.",
                  "Verify the installation: go to Help → About and confirm it shows \"Android Studio Ladybug\" or newer.",
                ]}
              />
              <NoteBox type="warning">
                On Windows, avoid spaces in your <strong>project path</strong>{" "}
                (where you clone the repository) — for example, use{" "}
                <code>C:\FTC\FtcRobotController</code> instead of{" "}
                <code>C:\Users\Robotics Drive\Documents\FtcRobotController</code>.
                Gradle sync often fails when the folder path or your Windows
                username contains spaces. The Android Studio{" "}
                <em>installation</em> path (e.g.{" "}
                <code>C:\Program Files\Android\Android Studio</code>) is fine on
                modern versions.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "clone-ftc-sdk",
          title: "Clone the FTC SDK",
          content: (
            <Prose>
              <p>
                FIRST provides an official template repository at{" "}
                <strong>github.com/FIRST-Tech-Challenge/FtcRobotController</strong>.
                Fork this repo into your team&apos;s GitHub organization so you
                can track changes and collaborate, then clone your fork locally.
              </p>
              <StepList
                steps={[
                  "Open Android Studio and click \"Get from VCS\" on the welcome screen.",
                  "Paste your fork's repository URL (or the official URL) and choose a local directory with no spaces in the path (see warning above).",
                  "Wait for the initial Gradle sync to finish — the first sync downloads approximately 500 MB of dependencies.",
                  "If prompted about SDK versions or Gradle updates, click \"Update\" to accept the recommended settings.",
                ]}
              />
              <CodeBlock
                filename="project-structure.txt"
                code={`FtcRobotController/
└── TeamCode/
    └── src/
        └── main/
            └── java/
                └── org/firstinspires/ftc/teamcode/
                    └── (your OpModes go here)`}
              />
              <NoteBox type="tip">
                All custom OpModes go in the <code>teamcode</code> directory.
                Never modify files outside <code>TeamCode/</code> — those files
                belong to the SDK and will be overwritten when you pull SDK
                updates.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "first-opmode",
          title: "Write Your First OpMode",
          content: (
            <Prose>
              <StepList
                steps={[
                  "In the Project panel, right-click the teamcode folder → New → Java Class. Name it HelloOpMode.",
                  "Extend LinearOpMode: public class HelloOpMode extends LinearOpMode { }",
                  "Add the @TeleOp annotation directly above the class declaration.",
                  "Override the runOpMode() method — this is your entry point.",
                ]}
              />
              <CodeBlock
                filename="HelloOpMode.java"
                code={`package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "Hello FTC!", group = "TeleOp")
public class HelloOpMode extends LinearOpMode {

    @Override
    public void runOpMode() {
        telemetry.addData("Status", "Initialized — press Start");
        telemetry.update();

        waitForStart(); // Blocks here until the driver presses Start

        while (opModeIsActive()) {
            telemetry.addData("Status", "Hello FTC!");
            telemetry.addData("Runtime", getRuntime());
            telemetry.update();
        }
    }
}`}
              />
            </Prose>
          ),
        },
        {
          id: "deploy",
          title: "Build & Deploy to Robot",
          content: (
            <Prose>
              <p>
                To deploy, plug the REV Control Hub into your laptop via
                USB-C, then use the green Run button in Android Studio (or press{" "}
                <strong>Shift+F10</strong>). Android Studio builds the APK and
                installs it directly onto the hub.
              </p>
              <StepList
                steps={[
                  "Connect the REV Control Hub to your computer using a USB-C cable.",
                  "In Android Studio's device selector toolbar, the Control Hub should appear as \"Control Hub v1.x\".",
                  "Press the green Run ▶ button — Android Studio compiles the project and deploys the APK.",
                  "On the Driver Station app, go to Program & Manage. Your OpMode will appear in the list.",
                ]}
              />
              <NoteBox type="info">
                If the Control Hub does not appear in the device selector,
                install the <strong>REV Hardware Client</strong> and verify
                that the Control Hub firmware is up to date. The REV Hardware
                Client also lets you check hub status and update firmware over
                USB.
              </NoteBox>
              <NoteBox type="info">
                Unplugging the USB cable mid-build only stops the deployment in
                Android Studio — it does not corrupt or brick the Control Hub.
                The previously installed app stays on the hub; just reconnect and
                deploy again.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "wireless-deploy",
          title: "Wireless Deployment",
          content: (
            <Prose>
              <p>
                After the first successful wired deploy, you can switch to
                wireless deployment so you can iterate on the field without
                a tether.
              </p>
              <h3>Recommended — Pair in Android Studio (no terminal)</h3>
              <p>
                Ladybug and newer Android Studio builds include a built-in
                Wi-Fi pairing tool — no <code>PATH</code> editing required.
              </p>
              <StepList
                steps={[
                  "In Android Studio, open the device dropdown in the toolbar and choose Pair Devices Using Wi-Fi.",
                  "Put the Control Hub in pairing mode (REV Hardware Client or the hub's Wi-Fi settings).",
                  "Scan the QR code or enter the pairing code shown on the hub — Android Studio handles the rest.",
                  "Once paired, the hub appears in the device selector. Press Run ▶ as usual; deploy goes over Wi-Fi.",
                ]}
              />
              <h3>Alternative — ADB over Wi-Fi (terminal)</h3>
              <p>
                If you prefer the command line, install{" "}
                <strong>SDK Platform Tools</strong> and add{" "}
                <code>platform-tools</code> to your PATH:
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Bundled with Android Studio",
                    value: "[Android SDK]/platform-tools/adb",
                    note: "Windows: C:\\Users\\[you]\\AppData\\Local\\Android\\Sdk\\platform-tools\\ — macOS: ~/Library/Android/sdk/platform-tools/",
                  },
                  {
                    label: "Standalone download",
                    value: "developer.android.com/tools/releases/platform-tools",
                    note: "Extract the zip, then add the folder to PATH",
                  },
                ]}
              />
              <CodeBlock
                filename="terminal"
                code={`# Verify ADB is available
adb version

# Connect — use the IP shown on the Driver Station / hub status screen
# 192.168.43.1 is the default direct Wi-Fi IP; router or Phone-as-Display setups use a different address
adb connect 192.168.43.1:5555

adb devices
# Expected: 192.168.43.1:5555    device`}
              />
              <NoteBox type="info">
                The default Control Hub IP on its own Wi-Fi network is often{" "}
                <code>192.168.43.1</code>, but that changes if you connect
                through a router, use Phone-as-a-Display, or reconfigure the
                hub. Always confirm the active IP on the Driver Station or REV
                Hardware Client before running <code>adb connect</code>.
              </NoteBox>
              <NoteBox type="warning">
                If <code>adb</code> is not recognized, Platform Tools are
                missing or not on your PATH — re-check the paths above.
              </NoteBox>
              <NoteBox type="tip">
                Wireless deploy is slightly slower (~30 s) compared to wired
                (~15 s), but it lets you iterate while the robot is assembled
                on the field.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "common-errors",
          title: "Common Errors & Fixes",
          content: (
            <Prose>
              <SpecTable
                rows={[
                  {
                    label: "INSTALL_FAILED_UPDATE_INCOMPATIBLE",
                    value: "Uninstall the existing APK on the hub first",
                    note: "Settings → Apps on the hub",
                  },
                  {
                    label: "Gradle sync failed: SDK location not found",
                    value: "Set ANDROID_HOME env var or re-run Setup Wizard",
                    note: "Common after moving installation",
                  },
                  {
                    label: "duplicate class error",
                    value: "Clean project (Build → Clean Project), then rebuild",
                    note: "Often caused by stale build cache",
                  },
                  {
                    label: "OpMode missing from Driver Station",
                    value: "Remove @Disabled, or add @TeleOp / @Autonomous",
                    note: "SDK templates include @Disabled — that hides the OpMode. name is required; group is optional",
                  },
                  {
                    label: "NullPointerException on hardwareMap",
                    value: "Hardware name in code doesn't match config name",
                    note: "Check Driver Station configuration",
                  },
                ]}
              />
            </Prose>
          ),
        },
      ]}
    />
  );
}

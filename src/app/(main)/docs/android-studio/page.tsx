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
                On Windows, install Android Studio to a path with <strong>no spaces</strong>{" "}
                — for example, <code>C:\Android\</code> rather than{" "}
                <code>C:\Program Files\Android\</code>. Spaces in the
                installation path are a common cause of Gradle build failures.
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
                  "Paste your fork's repository URL (or the official URL) and choose a local directory.",
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
              <NoteBox type="warning">
                Never unplug the USB cable while a build is in progress. Doing
                so can corrupt the APK on the Control Hub and may require a
                factory reset.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "wireless-deploy",
          title: "Wireless Deployment (ADB over Wi-Fi)",
          content: (
            <Prose>
              <p>
                After the first successful wired deploy, you can switch to
                wireless deployment so you can iterate on the field without
                a tether. This requires <strong>ADB (Android Debug Bridge)</strong>,
                which must be installed and available on your system PATH before
                any of these steps will work.
              </p>
              <h3>Step 1 — Install ADB (Platform Tools)</h3>
              <p>
                ADB is part of Android <strong>SDK Platform Tools</strong>. You
                have two options:
              </p>
              <SpecTable
                rows={[
                  {
                    label: "Option A — Android Studio (bundled)",
                    value: "Already on your machine at: [Android SDK]/platform-tools/adb",
                    note: "Default SDK path: C:\\Users\\[you]\\AppData\\Local\\Android\\Sdk\\platform-tools\\ (Windows) or ~/Library/Android/sdk/platform-tools/ (macOS)",
                  },
                  {
                    label: "Option B — Standalone download",
                    value: "Download from developer.android.com/tools/releases/platform-tools",
                    note: "Extract the zip, then add the folder to your system PATH",
                  },
                ]}
              />
              <p>
                After installing, add the <code>platform-tools</code> folder to
                your system <strong>PATH</strong> so you can run{" "}
                <code>adb</code> from any terminal:
              </p>
              <CodeBlock
                filename="terminal"
                code={`# ── macOS / Linux: add to ~/.zshrc or ~/.bashrc ──────────────────────────
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"

# ── Windows: add to System Environment Variables → PATH ──────────────────
# C:\Users\[YourName]\AppData\Local\Android\Sdk\platform-tools

# ── Verify ADB is installed correctly ─────────────────────────────────────
adb version
# Should print: Android Debug Bridge version x.x.x`}
              />
              <h3>Step 2 — Connect over Wi-Fi</h3>
              <StepList
                steps={[
                  "Connect your laptop to the Control Hub's Wi-Fi network. The SSID matches the hub's configured name (e.g. \"FTC-12345\").",
                  "Open a terminal and run: adb connect 192.168.43.1:5555",
                  "Confirm the connection with: adb devices — the Control Hub should appear as \"192.168.43.1:5555 device\".",
                  "Press the green Run ▶ button in Android Studio as normal. The deploy now goes over Wi-Fi.",
                ]}
              />
              <CodeBlock
                filename="terminal"
                code={`# Connect ADB to the Control Hub over Wi-Fi
adb connect 192.168.43.1:5555

# Verify the hub is listed
adb devices
# Expected output:
# List of devices attached
# 192.168.43.1:5555    device`}
              />
              <NoteBox type="warning">
                If <code>adb</code> is not recognized, it means Platform Tools
                are either not installed or not on your PATH. Re-check the steps
                above — this is the most common reason wireless deploy fails.
              </NoteBox>
              <NoteBox type="tip">
                Wireless deploy is slightly slower (~30 s) compared to wired
                (~15 s), but it lets you iterate and test while the robot is
                assembled on the field — a significant time-saver during
                practice sessions.
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
                    value: "Add @TeleOp or @Autonomous annotation to the class",
                    note: "Both name and group fields required",
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

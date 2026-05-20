# Feature: Two New Documentation Pages

## Context

This is an FTC programming education platform built with Next.js (App Router) and Supabase.
Read `node_modules/next/dist/docs/` for any Next.js API questions before writing code.

Docs pages live at `src/app/(main)/docs/[slug]/page.tsx` and are **server components** (no
`"use client"`). Every page uses the same shared infrastructure:

- `DocPageLayout` (`src/components/DocPageLayout.tsx`) — wraps all doc pages; accepts
  `breadcrumbs`, `title`, `description`, `badge`, `badgeColor`, `readingTime`, and `sections`.
- `DocSection` — each section has an `id` (kebab-case anchor), a `title`, and a `content`
  (`React.ReactNode`).
- Primitives from `src/components/DocPrimitives.tsx`: `NoteBox` (types: `info | warning | tip`),
  `SpecTable` (rows: `[label, value, sub?][]`), `InfoGrid` (items: `{label, value, sub?}[]`),
  `Prose` (wrapper), `StepList` (numbered steps with title + description).
- `CodeBlock` from `src/components/CodeBlock.tsx` — renders syntax-highlighted Java/Kotlin code.
- **Sidebar** entries live in `src/components/Sidebar.tsx` in the `navigation` array under the
  "Documentation Hub" children list. Each entry needs `{ label, href, icon }` from `lucide-react`.

Reference `src/app/(main)/docs/gobilda/page.tsx` for the exact JSX structure and import pattern
to follow. Match its style exactly — no inline styles, no new CSS, no new components.

---

## What to Build

### Page 1 — Motors & Servos (`/docs/motors-servos`)

**File:** `src/app/(main)/docs/motors-servos/page.tsx`

**Header:**
```
title: "Motors & Servos"
description: "Everything you need to control DC motors and servos in FTC — the Java API is identical regardless of which hardware vendor you buy from."
badge: "Programming"
badgeColor: "blue"
readingTime: "10 min"
```

**Sections (in order):**

1. **`overview`** — "Overview"
   - Explain that FTC SDK abstracts hardware: `DcMotor` and `Servo` interfaces work the same
     whether you use goBILDA, REV, Andymark, or any other vendor's motors/servos.
   - `InfoGrid` showing: SDK Class / `DcMotor`, SDK Class / `Servo`, Config Name / set in Driver Station app, Port / REV Control Hub 0–3.
   - `NoteBox type="tip"` — remind students to always configure hardware names in the Driver
     Station app and match them exactly in `hardwareMap.get()` calls.

2. **`dc-motors`** — "DC Motors"
   - Getting a motor from `hardwareMap`, setting `direction`, `ZeroPowerBehavior` (`BRAKE` vs `FLOAT`), `RunMode` enum.
   - `SpecTable` showing the four `RunMode` values and what each does:
     - `RUN_WITHOUT_ENCODER` — raw power, no feedback
     - `RUN_USING_ENCODER` — uses encoder to regulate velocity
     - `RUN_TO_POSITION` — closed-loop position control
     - `STOP_AND_RESET_ENCODER` — zeroes the encoder count
   - Full working `CodeBlock` with a TeleOp example: get two motors from hardwareMap, set
     direction on one to REVERSE, set ZeroPowerBehavior to BRAKE, set power from gamepad sticks
     in a loop.
   - `NoteBox type="warning"` — explain `setMode(STOP_AND_RESET_ENCODER)` blocks until done;
     never call it inside `loop()`.

3. **`run-to-position`** — "Run To Position"
   - Explain ticks-per-revolution, how to calculate target ticks from distance or angle.
   - Full working `CodeBlock`: reset encoder, set target, set mode to RUN_TO_POSITION, set power,
     wait with `while (motor.isBusy())`, stop.
   - `NoteBox type="info"` — note that ticks-per-rev varies by motor model; goBILDA 5202 19.2:1
     is 537.7 ticks/rev, REV HD Hex 40:1 is 1120 ticks/rev.

4. **`servos`** — "Servos"
   - Explain `Servo` interface: `setPosition(double)` takes 0.0–1.0 mapping to 0°–270° (or
     the servo's full range).
   - `SpecTable` for `Servo` methods: `setPosition`, `getPosition`, `scaleRange`, `setDirection`.
   - Full working `CodeBlock`: get servo, set direction, map button presses to open/close positions
     in TeleOp loop.
   - `NoteBox type="tip"` — `scaleRange(min, max)` lets you restrict travel range so the servo
     never mechanically collides.

5. **`continuous-servos`** — "Continuous Rotation Servos"
   - Explain that CR servos use `CRServo` class; `setPower(-1.0 to 1.0)` instead of `setPosition`.
   - Full `CodeBlock` showing TeleOp control with a trigger.

6. **`encoder-reading`** — "Reading Encoders"
   - Explain `motor.getCurrentPosition()` returns ticks.
   - `CodeBlock` showing how to display encoder value on telemetry and use it in an if-condition.

---

### Page 2 — Android Studio Setup (`/docs/android-studio`)

**File:** `src/app/(main)/docs/android-studio/page.tsx`

**Header:**
```
title: "Android Studio Setup"
description: "Step-by-step guide to installing Android Studio, cloning the FTC SDK, and deploying your first OpMode to a REV Control Hub."
badge: "Setup"
badgeColor: "emerald"
readingTime: "15 min"
```

**Sections (in order):**

1. **`requirements`** — "System Requirements"
   - `InfoGrid`: OS / Windows 10+ or macOS 12+, RAM / 8 GB minimum (16 GB recommended),
     Disk / 4 GB free, Java / bundled with Android Studio.
   - `NoteBox type="info"` — you do NOT need a separate JDK; Android Studio bundles its own JVM.

2. **`install-android-studio`** — "Install Android Studio"
   - `StepList` walking through:
     1. Download Android Studio from developer.android.com/studio (current version Ladybug 2024.2)
     2. Run the installer; accept defaults; include "Android Virtual Device" (not required for FTC
        but safe to keep)
     3. On first launch, complete the Setup Wizard; download the default SDK package
     4. Verify installation: Help → About should show "Android Studio Ladybug" or newer
   - `NoteBox type="warning"` — on Windows, install to a path with no spaces (e.g. `C:\Android\`)
     to avoid Gradle errors.

3. **`clone-ftc-sdk`** — "Clone the FTC SDK"
   - Explain that FTC provides an official template repo: `github.com/FIRST-Tech-Challenge/FtcRobotController`
   - `StepList`:
     1. Open Android Studio → "Get from VCS"
     2. Paste the repo URL and choose a local directory
     3. Wait for Gradle sync to finish (first sync downloads ~500 MB)
     4. If prompted about SDK versions, click "Update" to accept recommended settings
   - `CodeBlock` showing the team code folder structure inside the cloned repo:
     ```
     TeamCode/src/main/java/org/firstinspires/ftc/teamcode/
     ```
   - `NoteBox type="tip"` — all custom OpModes go in the `teamcode` directory. Never modify
     files outside `TeamCode/` — they get overwritten by SDK updates.

4. **`first-opmode`** — "Write Your First OpMode"
   - `StepList`:
     1. Right-click `teamcode` → New → Java Class, name it `HelloOpMode`
     2. Extend `LinearOpMode`
     3. Add the `@TeleOp` annotation
     4. Override `runOpMode()`
   - Full working `CodeBlock` — a minimal LinearOpMode that waits for Start, then logs
     "Hello FTC!" to telemetry in a loop until Stop is pressed.

5. **`deploy`** — "Build & Deploy to Robot"
   - Explain: plug Control Hub into laptop via USB-C (or connect to Control Hub Wi-Fi), then
     use Android Studio's green Run button (or `Shift+F10`).
   - `StepList`:
     1. Connect the REV Control Hub via USB-C cable to your computer
     2. In Android Studio's device selector, the Control Hub should appear as "Control Hub v1.x"
     3. Press the green Run ▶ button — Android Studio builds and deploys the APK
     4. On the Driver Station app, go to Program & Manage → your OpMode should appear
   - `NoteBox type="info"` — if the device doesn't appear, install the REV Hardware Client and
     make sure the Control Hub firmware is up to date.
   - `NoteBox type="warning"` — never unplug the USB cable while a build is in progress; this
     can corrupt the APK on the Control Hub.

6. **`wireless-deploy`** — "Wireless Deployment (ADB over Wi-Fi)"
   - Explain that after the first wired deploy, you can switch to wireless.
   - `StepList`:
     1. Connect laptop to the Control Hub's Wi-Fi network (SSID matches the hub's name)
     2. Open a terminal and run: `adb connect 192.168.43.1:5555`
     3. Confirm with `adb devices` — the hub should appear
     4. Press Run ▶ in Android Studio as normal; the deploy goes over Wi-Fi
   - `CodeBlock` showing the two terminal commands.
   - `NoteBox type="tip"` — wireless deploy is slower (~30 s vs ~15 s wired) but lets you test
     while the robot is on the field.

7. **`common-errors`** — "Common Errors & Fixes"
   - Use a `SpecTable` (label = error, value = fix):
     - `INSTALL_FAILED_UPDATE_INCOMPATIBLE` → uninstall the existing APK on the hub first
     - `Gradle sync failed: SDK location not found` → set `ANDROID_HOME` env var or re-run Setup Wizard
     - `duplicate class` error → clean project (Build → Clean Project), then rebuild
     - OpMode doesn't appear in Driver Station → missing `@TeleOp` or `@Autonomous` annotation
     - `NullPointerException` on `hardwareMap` → hardware name in code doesn't match config name

---

## Sidebar — Add Both Pages

In `src/components/Sidebar.tsx`, add two new entries to the `children` array of "Documentation Hub":

```ts
{ label: "Motors & Servos",     href: "/docs/motors-servos",    icon: Cpu   },
{ label: "Android Studio",      href: "/docs/android-studio",   icon: MonitorSmartphone },
```

Import `MonitorSmartphone` from `lucide-react` (it is already available in the package).
Place "Motors & Servos" directly after "REV Robotics" and "Android Studio" after it.

---

## Style Conventions (match existing docs exactly)

- All doc pages are **server components** — no `"use client"`.
- Import order: `next/metadata`, then `DocPageLayout`, then `CodeBlock`, then named primitives
  from `DocPrimitives`.
- `badgeColor` for SDK/programming pages → `"blue"`, setup/tool pages → `"emerald"`.
- All Java code snippets must be syntactically correct, compilable FTC SDK code.
- Do NOT create any new components, hooks, or CSS. Use only existing primitives.
- Do NOT modify `DocPageLayout`, `DocPrimitives`, or `CodeBlock`.

## Files to Create / Modify

1. `src/app/(main)/docs/motors-servos/page.tsx` — new file
2. `src/app/(main)/docs/android-studio/page.tsx` — new file
3. `src/components/Sidebar.tsx` — add two sidebar entries

Do NOT touch any other files.

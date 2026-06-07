export type DocSectionIndex = {
  docHref: string;
  docTitle: string;
  sectionId: string;
  sectionTitle: string;
  /** Plain-text hint shown in search results */
  snippet: string;
  /** Lowercase tokens for matching topics, APIs, and concepts */
  terms: string[];
};

type DocDef = {
  slug: string;
  title: string;
  description: string;
  sections: {
    id: string;
    title: string;
    snippet: string;
    terms: string[];
  }[];
};

const DOC_DEFS: DocDef[] = [
  {
    slug: "java-basics",
    title: "Java Basics",
    description: "Variables, loops, classes, and FTC syntax",
    sections: [
      { id: "why-java", title: "Why Java for FTC?", snippet: "Java 8, object-oriented OpModes, Android Studio", terms: ["java", "oop", "object oriented", "android studio", "beginner", "syntax"] },
      { id: "variables", title: "Variables & Data Types", snippet: "int, double, boolean, String, constants, camelCase", terms: ["variables", "int", "double", "boolean", "string", "types", "final", "constant"] },
      { id: "operators", title: "Operators & Math", snippet: "Arithmetic, comparison, logical operators", terms: ["operators", "math", "plus", "minus", "modulo", "comparison", "&&", "||"] },
      { id: "control-flow", title: "Control Flow (if / else / loops)", snippet: "if, else, for, while, switch statements", terms: ["if", "else", "for loop", "while loop", "switch", "control flow", "break", "continue"] },
      { id: "arrays-lists", title: "Arrays & ArrayLists", snippet: "Fixed arrays and dynamic ArrayList collections", terms: ["array", "arraylist", "list", "index", "collection"] },
      { id: "methods", title: "Methods", snippet: "Defining and calling methods, parameters, return values", terms: ["methods", "functions", "parameters", "return", "void"] },
      { id: "classes-objects", title: "Classes & Objects", snippet: "Fields, constructors, instances, new keyword", terms: ["class", "object", "constructor", "field", "instance", "new"] },
      { id: "access-modifiers", title: "Access Modifiers", snippet: "public, private, protected visibility", terms: ["public", "private", "protected", "access modifier", "visibility"] },
      { id: "inheritance", title: "Inheritance", snippet: "extends LinearOpMode, super, method overriding", terms: ["inheritance", "extends", "super", "override", "subclass", "linearopmode"] },
      { id: "interfaces", title: "Interfaces", snippet: "implements keyword and interface contracts", terms: ["interface", "implements", "contract"] },
      { id: "static", title: "Static vs Instance", snippet: "Static members shared across all instances", terms: ["static", "instance", "class member"] },
      { id: "putting-it-together", title: "Putting It Together — FTC Example", snippet: "Complete beginner OpMode walkthrough", terms: ["example", "opmode", "first program", "walkthrough"] },
    ],
  },
  {
    slug: "android-studio",
    title: "Android Studio",
    description: "Project setup, Gradle, and deploying OpModes",
    sections: [
      { id: "requirements", title: "System Requirements", snippet: "JDK, Android Studio Ladybug, hardware needs", terms: ["requirements", "jdk", "install", "system"] },
      { id: "install-android-studio", title: "Install Android Studio", snippet: "Download and first-time IDE setup", terms: ["android studio", "install", "ide", "setup"] },
      { id: "clone-ftc-sdk", title: "Clone the FTC SDK", snippet: "Git clone, Gradle sync, project structure", terms: ["clone", "ftc sdk", "gradle", "git", "teamcode"] },
      { id: "first-opmode", title: "Write Your First OpMode", snippet: "Create a TeleOp class and package structure", terms: ["first opmode", "teleop", "autonomous", "class", "package"] },
      { id: "deploy", title: "Build & Deploy to Robot", snippet: "USB deploy, Run configuration, Driver Station", terms: ["deploy", "build", "usb", "driver station", "run"] },
      { id: "wireless-deploy", title: "Wireless Deployment (ADB over Wi-Fi)", snippet: "ADB Wi-Fi pairing without a cable", terms: ["wireless", "adb", "wifi", "deploy"] },
      { id: "common-errors", title: "Common Errors & Fixes", snippet: "Gradle sync, SDK path, and build failures", terms: ["errors", "gradle sync", "build failed", "fix", "troubleshoot"] },
    ],
  },
  {
    slug: "motors-servos",
    title: "Motors & Servos",
    description: "DcMotor, encoders, servos, and CRServos",
    sections: [
      { id: "overview", title: "Overview", snippet: "Unified DcMotor and Servo SDK interfaces", terms: ["dcmotor", "servo", "hardwaremap", "overview", "vendor"] },
      { id: "dc-motor-setup", title: "DC Motor Setup", snippet: "Direction, zero power behavior, RunMode overview", terms: ["setup", "setdirection", "zeropowerbehavior", "brake", "float", "hardwaremap.get"] },
      { id: "run-without-encoder", title: "RUN_WITHOUT_ENCODER", snippet: "Raw voltage control without encoder feedback", terms: ["run_without_encoder", "setpower", "percent output", "open loop"] },
      { id: "run-using-encoder", title: "RUN_USING_ENCODER", snippet: "Velocity PID with setVelocity on DcMotorEx", terms: ["run_using_encoder", "setvelocity", "dcmotorex", "velocity", "pid", "tps"] },
      { id: "run-to-position", title: "RUN_TO_POSITION", snippet: "setTargetPosition, isBusy, encoder moves", terms: ["run_to_position", "settargetposition", "isbusy", "encoder", "position", "idle"] },
      { id: "servos", title: "Servos", snippet: "setPosition 0.0–1.0 for standard servos", terms: ["servo", "setposition", "angle", "pwm"] },
      { id: "continuous-servos", title: "Continuous Rotation Servos", snippet: "CRServo setPower for continuous spin", terms: ["crservo", "continuous rotation", "setpower", "intake"] },
      { id: "encoder-reading", title: "Reading Encoders", snippet: "getCurrentPosition, reset encoder before reads", terms: ["getcurrentposition", "encoder read", "ticks", "stop_and_reset_encoder"] },
    ],
  },
  {
    slug: "mecanum-drive",
    title: "Mecanum Drive",
    description: "Holonomic drive math and teleop control",
    sections: [
      { id: "how-mecanum-works", title: "How Mecanum Works", snippet: "Wheel vectors, strafe, rotation combined", terms: ["mecanum", "holonomic", "strafe", "wheel", "vector"] },
      { id: "robot-centric", title: "Robot-Centric Drive", snippet: "Stick input mapped to robot-relative motion", terms: ["robot centric", "teleop", "left stick", "gamepad", "setpower"] },
      { id: "power-normalization", title: "Power Normalization", snippet: "Scale motor powers when sum exceeds 1.0", terms: ["normalization", "clamp", "max power", "scale"] },
      { id: "field-centric", title: "Field-Centric Drive", snippet: "Rotate stick input using IMU heading", terms: ["field centric", "imu", "heading", "yaw", "rotation"] },
      { id: "speed-modes", title: "Speed Modes & Fine Control", snippet: "Slow mode, precision driving multipliers", terms: ["speed mode", "slow mode", "fine control", "multiplier"] },
      { id: "motor-directions", title: "Verifying Motor Directions", snippet: "Test each wheel direction and fix reverses", terms: ["motor direction", "reverse", "test", "wiring"] },
    ],
  },
  {
    slug: "gamepad",
    title: "Gamepad & Telemetry",
    description: "Driver input, edge detection, and Driver Station UI",
    sections: [
      { id: "gamepad-inputs", title: "Gamepad Input Reference", snippet: "Buttons, triggers, sticks, d-pad values", terms: ["gamepad", "gamepad1", "buttons", "triggers", "sticks", "d-pad"] },
      { id: "basic-input", title: "Basic Input Handling", snippet: "Read sticks and buttons inside the loop", terms: ["input", "left_stick_y", "negate", "read gamepad"] },
      { id: "edge-detection", title: "Edge Detection (Press Once)", snippet: "Rising edge toggles, lastButton pattern", terms: ["edge detection", "rising edge", "toggle", "lasta", "debounce"] },
      { id: "toggles", title: "Toggle Buttons", snippet: "Boolean state flipped on button press", terms: ["toggle", "boolean state", "button press"] },
      { id: "gamepad-feedback", title: "Gamepad Feedback (Rumble & LED)", snippet: "Rumble motors and LED color on gamepad", terms: ["rumble", "led", "haptic", "feedback"] },
      { id: "telemetry", title: "Telemetry", snippet: "addData, update, Driver Station display", terms: ["telemetry", "adddata", "update", "driver station", "debug"] },
    ],
  },
  {
    slug: "pid-control",
    title: "PID & Control Loops",
    description: "Proportional control, error terms, and tuning",
    sections: [
      { id: "what-is-error", title: "What is Error?", snippet: "target minus current, setpoint vs measurement", terms: ["error", "setpoint", "target", "current", "measurement"] },
      { id: "p-controller", title: "P Controller (Proportional)", snippet: "Kp * error motor power calculation", terms: ["p controller", "proportional", "kp", "gain", "power"] },
      { id: "pid-terms", title: "Full PID — P, I, and D Terms", snippet: "Integral windup, derivative damping", terms: ["pid", "integral", "derivative", "ki", "kd", "windup"] },
      { id: "pid-tuning", title: "Tuning PID", snippet: "Ziegler-Nichols and manual gain tuning", terms: ["tuning", "gains", "oscillation", "stable"] },
      { id: "builtin-pid", title: "Built-in PID (RUN_USING_ENCODER)", snippet: "SDK velocity PID on DcMotorEx", terms: ["builtin pid", "run_using_encoder", "setvelocity", "firmware"] },
      { id: "feedforward", title: "Feedforward Control", snippet: "kF term for gravity and static load", terms: ["feedforward", "kf", "gravity", "static friction"] },
      { id: "fsm", title: "Finite State Machines", snippet: "State enum, transitions, autonomous sequences", terms: ["state machine", "fsm", "enum", "autonomous", "states"] },
      { id: "motion-profiles", title: "Motion Profiles", snippet: "Trapezoidal velocity profiles for smooth moves", terms: ["motion profile", "trapezoid", "acceleration", "smooth"] },
    ],
  },
  {
    slug: "gobilda",
    title: "goBILDA Hardware & Subsystems",
    description: "Strafer mecanum, Viper Slide, limit switches, LEDs, and Pinpoint odometry",
    sections: [
      { id: "overview", title: "Overview", snippet: "16 mm grid, 5202 motors, 2000 servos, REV compatibility", terms: ["gobilda", "hardware", "overview", "16mm", "grid"] },
      { id: "strafer-chassis", title: "Strafer Chassis", snippet: "Robot-centric mecanum with O-pattern roller layout", terms: ["strafer", "chassis", "mecanum", "5202", "537.7"] },
      { id: "viper-slide", title: "Viper Slide", snippet: "Preset and manual override slide control", terms: ["viper", "slide", "linear", "lift", "run to position"] },
      { id: "sensors", title: "Magnetic Limit Switch", snippet: "Active-low Hall sensor with software guard", terms: ["limit switch", "magnetic", "digital", "active low"] },
      { id: "led-lights", title: "LED Indicator Systems", snippet: "Servo PWM color positions for goBILDA LEDs", terms: ["led", "lights", "servo", "pwm", "strip"] },
      { id: "yellow-jacket-motors", title: "Yellow Jacket Motor Reference", snippet: "Gear ratios, free speed, stall torque table", terms: ["yellow jacket", "gear ratio", "tpr", "5202", "motor"] },
      { id: "odometry-pods", title: "Pinpoint Odometry", snippet: "GoBildaPinpointDriver setup and update loop", terms: ["odometry", "pinpoint", "dead wheel", "localization", "i2c"] },
    ],
  },
  {
    slug: "rev-robotics",
    title: "REV Robotics",
    description: "Control Hub, Expansion Hub, and electronics",
    sections: [
      { id: "control-hub", title: "Control Hub", snippet: "Built-in IMU, 4 motor ports, REV hub", terms: ["control hub", "rev", "ports", "imu built-in"] },
      { id: "expansion-hub", title: "Expansion Hub", snippet: "Second hub for extra motors and sensors", terms: ["expansion hub", "i2c", "extra ports"] },
      { id: "touch-sensor", title: "Touch Sensors (Digital)", snippet: "Digital touch sensor isPressed()", terms: ["touch sensor", "digital", "ispressed"] },
      { id: "color-sensor", title: "Color / Distance Sensors (I²C)", snippet: "REV color sensor RGB and distance", terms: ["color sensor", "distance", "i2c", "rgb", "rev color"] },
      { id: "imu", title: "IMU (BHI260AP)", snippet: "REV Control Hub IMU angles and heading", terms: ["imu", "bhi260ap", "yaw", "pitch", "roll", "heading"] },
      { id: "sensors-deep-dive", title: "Sensors Deep-Dive", snippet: "Bulk read, sensor fusion, best practices", terms: ["sensors", "bulk read", "fusion", "i2c"] },
    ],
  },
  {
    slug: "limelight",
    title: "Limelight 3A",
    description: "Vision targeting and AprilTag detection",
    sections: [
      { id: "overview", title: "Overview", snippet: "Limelight 3A vision coprocessor for FTC", terms: ["limelight", "vision", "camera", "coprocessor"] },
      { id: "wiring-setup", title: "Wiring & Configuration", snippet: "Ethernet, static IP, Robot Configuration", terms: ["wiring", "ethernet", "ip address", "config"] },
      { id: "basic-usage", title: "Basic Usage", snippet: "Limelight3A class, getLatestResult, pipeline", terms: ["limelight3a", "getlatestresult", "pipeline", "python"] },
      { id: "apriltag-localization", title: "AprilTag Localization", snippet: "Pose estimation from AprilTag fiducials", terms: ["apriltag", "localization", "pose", "fiducial", "tag"] },
      { id: "pipeline-types", title: "Pipeline Types", snippet: "AprilTag, neural network, and color pipelines", terms: ["pipeline", "neural network", "color", "apriltag pipeline"] },
      { id: "aiming", title: "Target Aiming with tx", snippet: "Horizontal offset tx for turret aiming", terms: ["aiming", "tx", "ty", "turret", "target"] },
    ],
  },
  {
    slug: "road-runner",
    title: "Road Runner",
    description: "Trajectory-based autonomous motion",
    sections: [
      { id: "what-is-road-runner", title: "What is Road Runner?", snippet: "Trajectory follower for mecanum drives", terms: ["road runner", "trajectory", "autonomous", "rr"] },
      { id: "installation", title: "Installation", snippet: "Gradle deps, FTCLib, Road Runner modules", terms: ["install", "gradle", "ftclib", "dependency"] },
      { id: "drive-classes", title: "Drive Classes & Localizer Setup", snippet: "MecanumDrive, ThreeTrackingWheelLocalizer", terms: ["mecanumdrive", "localizer", "odometry", "pinpoint"] },
      { id: "tuning", title: "Tuning Process", snippet: "Track width, kV, kA, feedforward tuning", terms: ["tuning", "track width", "kv", "ka", "feedforward"] },
      { id: "rr1-params", title: "MecanumDrive.Params Reference", snippet: "All Road Runner 1.x drive parameters", terms: ["params", "max vel", "max accel", "parameters"] },
      { id: "creating-trajectories", title: "Building Trajectories", snippet: "Pose2d, splineTo, lineTo, trajectory builder", terms: ["trajectory", "spline", "pose2d", "build", "path"] },
      { id: "actions", title: "Actions API", snippet: "SequentialAction, ParallelAction, waitFor", terms: ["actions", "sequential", "parallel", "waitfor", "rr actions"] },
      { id: "parallel-actions", title: "Async Following Pattern", snippet: "Non-blocking trajectory follow in loop", terms: ["async", "parallel", "isbusy", "non-blocking"] },
      { id: "follow-trajectory-sequence", title: "Road Runner 0.5.x (Legacy)", snippet: "TrajectorySequence for older RR versions", terms: ["legacy", "trajectorysequence", "0.5", "old road runner"] },
    ],
  },
  {
    slug: "pedro-pathing",
    title: "Pedro Pathing",
    description: "Follower-based path-following library",
    sections: [
      { id: "overview", title: "What is Pedro Pathing?", snippet: "Follower library with Bezier paths", terms: ["pedro", "pathing", "follower", "bezier"] },
      { id: "installation", title: "Installation", snippet: "Gradle, Panels dashboard dependency", terms: ["install", "gradle", "panels", "dependency"] },
      { id: "constants-setup", title: "Constants.java Setup", snippet: "Drive constants, mass, friction, PIDF", terms: ["constants", "pidf", "mass", "friction", "drive constants"] },
      { id: "localizer-setup", title: "Localizer Setup", snippet: "ThreeWheelLocalizer, Pinpoint, odometry", terms: ["localizer", "odometry", "three wheel", "pinpoint"] },
      { id: "tuning", title: "Tuning Process", snippet: "Panels dashboard live tuning workflow", terms: ["tuning", "panels", "dashboard", "live tune"] },
      { id: "path-building", title: "Building Paths", snippet: "PathBuilder, BezierLine, BezierCurve, PathChain", terms: ["pathbuilder", "bezierline", "beziercurve", "pathchain", "build path"] },
      { id: "full-auto", title: "Full Autonomous Example", snippet: "Complete Pedro autonomous OpMode", terms: ["autonomous", "example", "full auto", "opmode"] },
      { id: "path-transitions", title: "Path Transitions & Callbacks", snippet: "onEnd callbacks between path chains", terms: ["callback", "transition", "onend", "chain"] },
      { id: "follower-api", title: "Follower API Reference", snippet: "followPath, update, atParametricEnd", terms: ["follower", "followpath", "update", "atparametricend", "api"] },
      { id: "teleop", title: "TeleOp with Pedro", snippet: "Manual override and teleop integration", terms: ["teleop", "manual", "override"] },
    ],
  },
  {
    slug: "swyft-robotics",
    title: "Swyft Robotics",
    description: "Linear actuators and Swyft-specific hardware",
    sections: [
      { id: "overview", title: "Overview", snippet: "Swyft linear actuators and FTC use cases", terms: ["swyft", "linear actuator", "overview"] },
      { id: "linear-actuator", title: "Swyft Linear Actuator", snippet: "Hardware specs and wiring for Swyft slides", terms: ["linear actuator", "slide", "hardware", "wiring"] },
      { id: "sdk-initialization", title: "SDK Initialization", snippet: "hardwareMap setup for Swyft motors", terms: ["initialization", "hardwaremap", "setup"] },
      { id: "position-control", title: "Position Control", snippet: "RUN_TO_POSITION with tick targets", terms: ["position control", "settargetposition", "run_to_position", "ticks"] },
      { id: "teleop-integration", title: "TeleOp Integration", snippet: "Button-controlled actuator moves in teleop", terms: ["teleop", "buttons", "control"] },
      { id: "tuning-tips", title: "Tuning Tips", snippet: "Ticks-per-mm calibration and soft limits", terms: ["tuning", "ticks per mm", "soft limit", "calibration"] },
      { id: "cr-servos", title: "Continuous Rotation Servos", snippet: "CRServo intake control with Swyft", terms: ["crservo", "continuous rotation", "intake"] },
    ],
  },
  {
    slug: "blocks",
    title: "FTC Blocks Reference",
    description: "Visual block reference for Motors, Servos, Sensors, Gamepad, Telemetry, and Math",
    sections: [
      {
        id: "motors",
        title: "Motors",
        snippet: "Set Power, Set Direction, Reset Encoder, Set Target Position, Run to Position, Is Busy, Get Position, Set Velocity",
        terms: ["blocks", "motors", "setpower", "set power", "direction", "encoder", "run to position", "isbusy", "is busy", "get position", "velocity", "dcmotor", "dc motor"],
      },
      {
        id: "servos",
        title: "Servos",
        snippet: "Set Position for standard servos, Set Power for CRServo continuous rotation servos",
        terms: ["blocks", "servos", "servo", "setposition", "set position", "crservo", "continuous rotation", "setPower"],
      },
      {
        id: "sensors",
        title: "Sensors",
        snippet: "Touch sensor, distance sensor, color sensor ARGB, LED enable, IMU heading yaw",
        terms: ["blocks", "sensors", "touch sensor", "limit switch", "is pressed", "distance sensor", "range", "color sensor", "argb", "red", "blue", "imu", "heading", "yaw", "gyro"],
      },
      {
        id: "gamepad",
        title: "Gamepad",
        snippet: "Left stick, right stick, triggers, buttons A B X Y, bumpers, dpad",
        terms: ["blocks", "gamepad", "joystick", "left stick", "right stick", "trigger", "button", "bumper", "dpad", "gamepad1", "gamepad2"],
      },
      {
        id: "telemetry",
        title: "Telemetry",
        snippet: "Add Data, Add Line, Update — send live data to the Driver Station screen",
        terms: ["blocks", "telemetry", "adddata", "add data", "addline", "update", "driver station", "display"],
      },
      {
        id: "math",
        title: "Math",
        snippet: "Number, Arithmetic, Negate, Math functions abs sqrt max min pow, Deadzone, Ternary",
        terms: ["blocks", "math", "number", "arithmetic", "negate", "abs", "absolute value", "sqrt", "max", "min", "pow", "deadzone", "ternary", "clamp"],
      },
    ],
  },
];

export const DOC_SECTION_INDEX: DocSectionIndex[] = DOC_DEFS.flatMap((doc) =>
  doc.sections.map((section) => ({
    docHref: `/docs/${doc.slug}`,
    docTitle: doc.title,
    sectionId: section.id,
    sectionTitle: section.title,
    snippet: section.snippet,
    terms: [
      doc.title.toLowerCase(),
      doc.slug.replace(/-/g, " "),
      section.title.toLowerCase(),
      ...section.terms,
    ],
  }))
);

export const DOC_PAGE_INDEX = DOC_DEFS.map((doc) => ({
  href: `/docs/${doc.slug}`,
  title: doc.title,
  description: doc.description,
  slug: doc.slug,
}));

export type DocSearchHit = {
  docHref: string;
  docTitle: string;
  sectionId: string;
  sectionTitle: string;
  snippet: string;
  score: number;
};

function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s/._-]+/)
    .filter((t) => t.length >= 2);
}

export function searchDocumentation(query: string, limit = 24): DocSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return DOC_SECTION_INDEX.slice(0, limit).map((entry) => ({
      docHref: entry.docHref,
      docTitle: entry.docTitle,
      sectionId: entry.sectionId,
      sectionTitle: entry.sectionTitle,
      snippet: entry.snippet,
      score: 0,
    }));
  }

  const tokens = tokenize(q);
  const hits: DocSearchHit[] = [];

  for (const entry of DOC_SECTION_INDEX) {
    const titleHay = `${entry.docTitle} ${entry.sectionTitle}`.toLowerCase();
    const bodyHay = `${entry.snippet} ${entry.terms.join(" ")}`.toLowerCase();
    const fullHay = `${titleHay} ${bodyHay}`;

    let score = 0;

    if (entry.sectionTitle.toLowerCase() === q) score += 100;
    if (entry.sectionTitle.toLowerCase().includes(q)) score += 40;
    if (entry.docTitle.toLowerCase().includes(q)) score += 20;
    if (fullHay.includes(q)) score += 15;

    for (const token of tokens) {
      if (entry.sectionTitle.toLowerCase().includes(token)) score += 12;
      if (entry.terms.some((t) => t.includes(token))) score += 8;
      if (entry.snippet.toLowerCase().includes(token)) score += 5;
      if (fullHay.includes(token)) score += 2;
    }

    // Boost API-style exact token matches (e.g. setPower, RUN_TO_POSITION)
    if (entry.terms.some((t) => t === q || t.replace(/_/g, "") === q.replace(/_/g, ""))) {
      score += 25;
    }

    if (score > 0) {
      hits.push({
        docHref: entry.docHref,
        docTitle: entry.docTitle,
        sectionId: entry.sectionId,
        sectionTitle: entry.sectionTitle,
        snippet: entry.snippet,
        score,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.sectionTitle.localeCompare(b.sectionTitle))
    .slice(0, limit);
}

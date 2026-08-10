import {
  ActivitySquare,
  Cable,
  Cpu,
  Gamepad2,
  GitBranch,
  GraduationCap,
  LayoutGrid,
  MonitorSmartphone,
  MoveRight,
  Navigation,
  Rocket,
  ScanEye,
  Zap,
} from "lucide-react";
import { builtinChallengeMeta } from "@/data/challengeMeta";
import { DOC_SECTION_INDEX } from "@/data/docSearchIndex";

/**
 * The doc series catalog — one entry per page under /docs.
 *
 * Sidebar, /learn, /docs, and the sitemap all read from here, so a new doc
 * page only has to be registered once. Title, description, badge, and reading
 * time are kept in sync with the props each page passes to DocPageLayout.
 */

export type DocTrackId = "programming" | "hardware";

export interface DocTrack {
  id: DocTrackId;
  label: string;
  /** One-line framing shown under the track heading on /learn and /docs. */
  description: string;
}

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
  badge: string;
  badgeColor: "amber" | "blue" | "violet" | "emerald";
  icon: React.ElementType;
  track: DocTrackId;
  /** Sidebar-style badge shown on /learn — mirrors the old nav tree badges. */
  navBadge?: "Start Here" | "New";
  /**
   * Challenge tags this doc teaches. Challenges are tagged by topic rather
   * than by doc slug, so the mapping lives here instead of in challengeMeta.
   * Docs with no linked challenges render without a progress column.
   */
  challengeTags: string[];
}

export const docTracks: DocTrack[] = [
  {
    id: "programming",
    label: "Documentation Hub",
    description:
      "Writing the code — Java, the FTC SDK, driver control, and the pathing libraries a competition robot leans on.",
  },
  {
    id: "hardware",
    label: "Hardware & Vendors",
    description:
      "The parts underneath it — control hubs, motion hardware, and the vision sensors the code reads.",
  },
];

export const docCatalog: DocEntry[] = [
  {
    slug: "java-basics",
    title: "Java Basics",
    description:
      "A beginner-friendly introduction to Java for FTC programmers. Covers variables, data types, control flow, methods, scope, classes, and inheritance — everything you need before writing your first OpMode.",
    readingTime: "22 min",
    badge: "Beginner",
    badgeColor: "blue",
    icon: GraduationCap,
    track: "programming",
    navBadge: "Start Here",
    challengeTags: [
      "Java Basics",
      "Scope",
      "Methods",
      "Control Flow",
      "Unit Conversion",
      "Timing",
      "Non-blocking",
    ],
  },
  {
    slug: "android-studio",
    title: "Android Studio Setup",
    description:
      "Step-by-step guide to installing Android Studio, cloning the FTC SDK, and deploying your first OpMode to a REV Control Hub.",
    readingTime: "15 min",
    badge: "Setup",
    badgeColor: "emerald",
    icon: MonitorSmartphone,
    track: "programming",
    // A setup walkthrough, not a coding topic — renders without a progress column.
    challengeTags: [],
  },
  {
    slug: "motors-servos",
    title: "Motors & Servos",
    description:
      "Everything you need to control DC motors and servos in FTC — the Java API is identical regardless of which hardware vendor you buy from.",
    readingTime: "10 min",
    badge: "Programming",
    badgeColor: "blue",
    icon: Cpu,
    track: "programming",
    challengeTags: [
      "Motors",
      "Motor Control",
      "Encoders",
      "Encoder",
      "Encoder Reset",
      "DcMotorEx",
      "Servo",
      "CRServo",
      "RUN_TO_POSITION",
      "RUN_USING_ENCODER",
      "ZeroPowerBehavior",
      "BRAKE",
      "FLOAT",
      "Velocity Control",
      "Gear Ratio",
      "Homing",
    ],
  },
  {
    slug: "mecanum-drive",
    title: "Mecanum Drive",
    description:
      "Mecanum wheels allow full omnidirectional movement — forward, strafe, and rotate simultaneously. This guide covers the physics, robot-centric control equations, power normalization, and field-centric drive using the IMU.",
    readingTime: "12 min",
    badge: "TeleOp",
    badgeColor: "blue",
    icon: MoveRight,
    track: "programming",
    challengeTags: [
      "Mecanum Drive",
      "Mecanum",
      "Strafing",
      "Field-Relative",
      "Rotation Matrix",
      "Normalization",
      "4 Motors",
      "Tank Drive",
    ],
  },
  {
    slug: "gamepad",
    title: "Gamepad & Telemetry",
    description:
      "How to read gamepad inputs reliably in FTC — button aliases, rising/falling edge detection, toggles, rumble feedback, and telemetry best practices.",
    readingTime: "10 min",
    badge: "TeleOp",
    badgeColor: "blue",
    icon: Gamepad2,
    track: "programming",
    challengeTags: [
      "Gamepad",
      "Telemetry",
      "Trigger",
      "Debouncing",
      "State Toggle",
      "Deadband",
      "Init Loop",
      "Alliance Selection",
    ],
  },
  {
    slug: "blocks",
    title: "FTC Blocks Reference",
    description:
      "Visual block reference for Motors, Servos, Sensors, Gamepad, Telemetry, and Math — with a live Blockly workspace you can drag blocks around in.",
    readingTime: "12 min",
    badge: "Reference",
    badgeColor: "violet",
    icon: LayoutGrid,
    track: "programming",
    challengeTags: [],
  },
  {
    slug: "pid-control",
    title: "PID & Control Loops",
    description:
      "Control loops let mechanisms move quickly and precisely. This guide covers error, P/I/D terms, feedforward, gravity compensation, motion profiles, and finite state machines — all with FTC-specific examples.",
    readingTime: "16 min",
    badge: "Intermediate",
    badgeColor: "amber",
    icon: ActivitySquare,
    track: "programming",
    challengeTags: [
      "PIDF",
      "PID Control",
      "P Controller",
      "Proportional",
      "Feedback",
      "Control Theory",
      "Tuning",
      "Flywheel",
      "Turret",
      "Shooter",
      "State Machine",
      "State Logic",
    ],
  },
  {
    slug: "road-runner",
    title: "Road Runner 1.0",
    description:
      "Road Runner is a motion-planning library for FTC that generates smooth, constraint-respecting motion profiles along Bézier spline paths. This guide covers the full RR 1.0 setup, tuning sequence, Actions API, and trajectory building.",
    readingTime: "20 min",
    badge: "Autonomous",
    badgeColor: "violet",
    icon: GitBranch,
    track: "programming",
    // "Bézier" is deliberately left out — Pedro Pathing uses it too.
    challengeTags: ["Road Runner", "Splines", "ActionBuilder"],
  },
  {
    slug: "pedro-pathing",
    title: "Pedro Pathing",
    description:
      "Pedro Pathing is a reactive Bézier-curve follower for FTC. It continuously re-projects the robot onto the path every loop, making it resilient to disturbances and defense — and supports Mecanum, swerve, Pinpoint, OTOS, and dead-wheel odometry.",
    readingTime: "18 min",
    badge: "Autonomous",
    badgeColor: "emerald",
    icon: Navigation,
    track: "programming",
    challengeTags: [
      "Pedro Pathing",
      "PathChain",
      "BezierLine",
      "BezierCurve",
      "Control Points",
      "Reversed Path",
      "Dynamic Paths",
      "Follower",
      "Pose",
      "Heading",
      "Alliance",
      "Coordinate Mirror",
    ],
  },
  {
    slug: "wiring-configuration",
    title: "Wiring & Configuration",
    description:
      "A build-order walkthrough for wiring an FTC robot and naming every device — what to wire first, how to route it, what common mistakes look like when they happen, and how a config name becomes the exact string in your hardwareMap.get() call.",
    readingTime: "15 min",
    badge: "Wiring",
    badgeColor: "emerald",
    icon: Cable,
    track: "hardware",
    navBadge: "New",
    // A wiring/config walkthrough rather than a coding topic — like
    // android-studio, it renders without a progress column.
    challengeTags: [],
  },
  {
    slug: "gobilda",
    title: "goBILDA Hardware & Subsystems",
    description:
      "Metric modular hardware for FTC — Strafer mecanum chassis, Viper Slide lifts, limit switches, LED indicators, and Pinpoint odometry with production-ready SDK examples.",
    readingTime: "14 min",
    badge: "Hardware",
    badgeColor: "amber",
    icon: Cpu,
    track: "hardware",
    challengeTags: [
      "GoBilda",
      "Pinpoint",
      "Odometry",
      "Position Tracking",
      "Position Reset",
    ],
  },
  {
    slug: "rev-robotics",
    title: "REV Robotics",
    description:
      "Master the REV Control Hub, Expansion Hub, and the full REV sensor ecosystem. Covers touch sensors, color sensors, the BHI260AP IMU, and servo configuration — all with FTC SDK code examples.",
    readingTime: "15 min",
    badge: "Electronics",
    badgeColor: "blue",
    icon: Zap,
    track: "hardware",
    challengeTags: [
      "TouchSensor",
      "IMU",
      "LynxModule",
      "Bulk Cache",
      "Loop Hz",
      "Performance",
      "Optimization",
    ],
  },
  {
    slug: "limelight",
    title: "Limelight 3A",
    description:
      "Complete guide to mounting, wiring, and programming the Limelight 3A vision sensor in FTC — covering AprilTag localization, MegaTag2 IMU fusion, color detection, and neural network pipelines.",
    readingTime: "12 min",
    badge: "Vision",
    badgeColor: "violet",
    icon: ScanEye,
    track: "hardware",
    challengeTags: [
      "Limelight",
      "Vision",
      "AprilTag",
      "Targeting",
      "Fiducial",
      "Stale Frame",
      "Poll Rate",
      "Diagnostics",
    ],
  },
  {
    slug: "swyft-robotics",
    title: "Swyft Robotics",
    description:
      "A practical guide to Swyft Robotics hardware for FTC — covering linear actuators, structural integration, and full FTC SDK wiring from config name to code.",
    readingTime: "10 min",
    badge: "Hardware",
    badgeColor: "amber",
    icon: Rocket,
    track: "hardware",
    challengeTags: [],
  },
];

/** The doc a brand-new student should open first. */
export const startHereDoc: DocEntry =
  docCatalog.find((d) => d.navBadge === "Start Here") ?? docCatalog[0];

export function docHref(entry: DocEntry): string {
  return `/docs/${entry.slug}`;
}

export function docsInTrack(track: DocTrackId): DocEntry[] {
  return docCatalog.filter((d) => d.track === track);
}

/** Built-in challenges whose tags overlap this doc's topics, in catalog order. */
export function docChallenges(entry: DocEntry) {
  if (entry.challengeTags.length === 0) return [];
  const tags = new Set(entry.challengeTags);
  return builtinChallengeMeta.filter((c) => c.tags.some((t) => tags.has(t)));
}

/** How many `#anchor` sections the doc page renders — shown on /docs cards. */
export function docSectionCount(entry: DocEntry): number {
  const href = docHref(entry);
  return DOC_SECTION_INDEX.filter((s) => s.docHref === href).length;
}

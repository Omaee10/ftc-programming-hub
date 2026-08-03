/**
 * Curated videos embedded in the docs.
 *
 * Videos are deliberately sparse — only topics where watching beats reading
 * (multi-step setup flows, UI walkthroughs, physical/mechanical concepts).
 * Most sections should have no video at all.
 *
 * `docSlug` matches the folder under `src/app/(main)/docs/`, and `sectionId`
 * matches the section `id` used by DocPageLayout / the ToC anchors.
 */
export interface DocVideo {
  /** 11-character YouTube video ID. */
  id: string;
  /** Video title — required, used as the iframe's accessible name. */
  title: string;
  /** Channel name, shown as a credit line. */
  channel: string;
  /** Runtime, e.g. "6:42". Display only. */
  duration?: string;
  /** Seconds into the video to start playback. */
  start?: number;
  /** Doc page folder name, e.g. "android-studio". */
  docSlug: string;
  /** Section anchor id within that page, e.g. "install-android-studio". */
  sectionId: string;
}

export const DOC_VIDEOS: DocVideo[] = [
  {
    docSlug: "android-studio",
    sectionId: "install-android-studio",
    id: "_ZIYtNadJBo",
    title: "FTC Android Studio Setup (Learn Java for FTC Robotics)",
    channel: "Brogan M. Pratt",
    duration: "18:14",
  },
  {
    docSlug: "rev-robotics",
    sectionId: "control-hub",
    id: "fyxpptqQumw",
    title: "Control Hub: Getting Started using a Web Browser",
    channel: "REV Robotics",
    duration: "9:04",
  },
  {
    docSlug: "mecanum-drive",
    sectionId: "how-mecanum-works",
    id: "noqBUEgyQ8A",
    title: "The Brilliant Engineering of Mecanum Wheels!",
    channel: "Sabin Civil Engineering",
    duration: "5:51",
  },
  {
    docSlug: "pid-control",
    sectionId: "pid-tuning",
    id: "E6H6Nqe6qJo",
    title: "PIDF Loops & Arm Control | FTC | 16379",
    channel: "KookyBotz",
    duration: "9:00",
  },
  {
    docSlug: "limelight",
    sectionId: "wiring-setup",
    id: "IHRZDPQ-_l8",
    title: "FTC – Tutorial 1: Setting up a Limelight 3A",
    channel: "Edina Piece of Cake 3763",
    duration: "5:11",
  },
  {
    docSlug: "road-runner",
    sectionId: "tuning",
    id: "DLQDwS_EZjU",
    title: "FTC Roadrunner 1.0 Gain Tuning Tutorial",
    channel: "FTC 6282 Simi Valley",
    duration: "8:17",
  },
  {
    docSlug: "pedro-pathing",
    sectionId: "installation",
    id: "6v7QgzRhOwA",
    title: "Get Started with PedroPathing: The Complete Setup",
    channel: "Brogan M. Pratt",
    duration: "8:27",
  },
];

/** Videos for one section of one doc page, in declaration order. */
export function getDocVideos(docSlug: string, sectionId: string): DocVideo[] {
  return DOC_VIDEOS.filter(
    (v) => v.docSlug === docSlug && v.sectionId === sectionId,
  );
}

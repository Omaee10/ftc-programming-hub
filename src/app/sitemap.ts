import type { MetadataRoute } from "next";
import { challenges } from "@/data/challenges";
import { pastProgramCatalog } from "@/data/pastProgramCatalog";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ftc-programming-hub.vercel.app";

const DOC_PATHS = [
  "android-studio",
  "blocks",
  "gamepad",
  "gobilda",
  "java-basics",
  "limelight",
  "mecanum-drive",
  "motors-servos",
  "pedro-pathing",
  "pid-control",
  "rev-robotics",
  "road-runner",
  "swyft-robotics",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
    },
    {
      url: `${BASE_URL}/challenges`,
      lastModified,
    },
    ...challenges.map((challenge) => ({
      url: `${BASE_URL}/challenges/${challenge.id}`,
      lastModified,
    })),
    {
      url: `${BASE_URL}/past-programs`,
      lastModified,
    },
    ...pastProgramCatalog.map((program) => ({
      url: `${BASE_URL}/past-programs/${program.id}`,
      lastModified,
    })),
    ...DOC_PATHS.map((slug) => ({
      url: `${BASE_URL}/docs/${slug}`,
      lastModified,
    })),
  ];
}

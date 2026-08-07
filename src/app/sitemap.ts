import type { MetadataRoute } from "next";
import { challenges } from "@/data/challenges";
import { pastProgramCatalog } from "@/data/pastProgramCatalog";
import { docCatalog } from "@/data/docCatalog";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ftc-programming-hub.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
    },
    {
      url: `${BASE_URL}/learn`,
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
    {
      url: `${BASE_URL}/docs`,
      lastModified,
    },
    ...docCatalog.map((doc) => ({
      url: `${BASE_URL}/docs/${doc.slug}`,
      lastModified,
    })),
  ];
}

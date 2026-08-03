import { getDocVideos } from "@/data/docVideos";
import YouTubeEmbed from "./YouTubeEmbed";

/**
 * Looks up the curated video(s) for a doc section and renders them.
 *
 * Doc pages reference videos by location (`docSlug` + `sectionId`) instead of
 * carrying embed markup, so the video list stays in `src/data/docVideos.ts`.
 * Renders nothing when a section has no video, which is the common case.
 */
export default function DocVideo({
  docSlug,
  sectionId,
}: {
  docSlug: string;
  sectionId: string;
}) {
  const videos = getDocVideos(docSlug, sectionId);
  if (videos.length === 0) return null;

  return (
    <>
      {videos.map((v) => (
        <YouTubeEmbed
          key={v.id}
          id={v.id}
          title={v.title}
          channel={v.channel}
          duration={v.duration}
          start={v.start}
        />
      ))}
    </>
  );
}

"use client";

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";

interface YouTubeEmbedProps {
  /** The 11-character YouTube video ID (the `v=` value, not a full URL). */
  id: string;
  /** Required — becomes the iframe's accessible name and the visible caption. */
  title: string;
  /** Channel name, shown under the title as a credit line. */
  channel?: string;
  /** Human-readable runtime, e.g. "6:42". Display only. */
  duration?: string;
  /** Seconds into the video to start playback. */
  start?: number;
}

/**
 * Privacy-preserving YouTube embed.
 *
 * Renders a static thumbnail ("facade") on first paint and only mounts the real
 * iframe once the viewer presses play, so no YouTube script runs and no cookies
 * are set until someone opts in. The player is loaded from youtube-nocookie.com.
 *
 * This is a leaf Client Component with no data fetching — dropping it into a
 * Server Component page does not opt that page out of static generation.
 */
export default function YouTubeEmbed({
  id,
  title,
  channel,
  duration,
  start,
}: YouTubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  const watchUrl = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ""}`;

  const embedParams = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (start) embedParams.set("start", String(start));
  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?${embedParams}`;

  return (
    <figure className="my-6">
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 aspect-video">
        {playing ? (
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {/*
              Plain <img> rather than next/image: the thumbnail is already a
              CDN-optimized JPEG, and proxying it would add a remote pattern plus
              an image-optimization round trip for a purely decorative preview.
              hqdefault is 4:3 with 16:9 content letterboxed — object-cover in an
              aspect-video box crops exactly the black bars.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/10" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:bg-red-600 group-hover:border-red-500">
                <Play className="h-6 w-6 translate-x-[1px] fill-white text-white" />
              </span>
            </span>
            {duration && (
              <span className="absolute bottom-2.5 right-2.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">
                {duration}
              </span>
            )}
          </button>
        )}
      </div>

      <figcaption className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="text-slate-400">{title}</span>
        {channel && <span className="text-slate-600">· {channel}</span>}
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-accent ml-auto inline-flex items-center gap-1 hover:text-slate-400 transition-colors"
        >
          Watch on YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </figcaption>
    </figure>
  );
}

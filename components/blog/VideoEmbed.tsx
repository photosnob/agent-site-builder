"use client";
import { useState } from "react";
import { embedUrl, thumbnailUrl, type VideoRef } from "@/lib/blog/video";

/**
 * Click-to-play embed: shows the thumbnail and loads the player only when
 * clicked, so posts with videos stay fast (and score well on Core Web Vitals).
 */
export function VideoEmbed({ video, title }: { video: VideoRef; title: string }) {
  const thumb = thumbnailUrl(video);
  const [playing, setPlaying] = useState(!thumb); // Vimeo has no static thumbnail URL: load its lazy iframe directly
  return (
    <div className="post-video-frame">
      {playing ? (
        <iframe
          src={embedUrl(video, Boolean(thumb))}
          title={title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`} className="post-video-play">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb!} alt="" loading="lazy" />
          <span aria-hidden className="post-video-button">▶</span>
        </button>
      )}
    </div>
  );
}

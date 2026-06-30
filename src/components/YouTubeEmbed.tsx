import React from 'react';

interface YouTubeEmbedProps {
  id: string;
  title: string;
  maxWidth?: string;
  start?: number;
}

export default function YouTubeEmbed({id, title, maxWidth = '720px', start}: YouTubeEmbedProps) {
  const src = start
    ? `https://www.youtube.com/embed/${id}?start=${start}`
    : `https://www.youtube.com/embed/${id}`;
  return (
    <div className="youtube-embed">
      <div className="youtube-embed__frame corner-frame" style={{maxWidth}}>
        <div className="youtube-embed__inner">
          <iframe
            className="youtube-embed__iframe"
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

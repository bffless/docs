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
    <div style={{textAlign: 'center', marginBottom: '2rem'}}>
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          maxWidth,
          margin: '0 auto',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={src}
          title={title}
          style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0}}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

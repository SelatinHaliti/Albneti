'use client';

/** Etiketë muzike me scroll si Instagram Reels/Posts */
export function MusicSticker({
  title,
  artist,
  playing = false,
  onClick,
  className = '',
}: {
  title: string;
  artist?: string;
  playing?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const label = artist ? `${title} · ${artist}` : title;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`music-sticker ${playing ? 'music-sticker-playing' : ''} ${className}`}
      aria-label={playing ? 'Ndalo muzikën' : 'Luaj muzikën'}
    >
      <span className="music-sticker-icon" aria-hidden>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>
      <span className="music-sticker-track">
        <span className="music-sticker-text">{label}</span>
        <span className="music-sticker-text" aria-hidden>{label}</span>
      </span>
    </button>
  );
}

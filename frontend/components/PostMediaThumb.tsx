'use client';

/** Thumbnail për grid explore/profil – foto ose video */
export function PostMediaThumb({
  url,
  type,
  postType,
  className = '',
}: {
  url: string;
  type?: string;
  postType?: string;
  className?: string;
}) {
  const isVideo = type === 'video' || postType === 'reel' || postType === 'video';

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {isVideo ? (
        <>
          <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
          {postType === 'reel' && (
            <span className="absolute top-1.5 right-1.5 text-white text-[10px]">🎬</span>
          )}
        </>
      ) : (
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
    </div>
  );
}

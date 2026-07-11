'use client';

import { forwardRef, useEffect, useState } from 'react';

/** Si Instagram: portret max 4:5, landscape max 1.91:1 */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

export function clampPostAspectRatio(width: number, height: number): number {
  if (!width || !height) return 1;
  const ratio = width / height;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

type PostMediaFrameProps = {
  src: string;
  type?: 'image' | 'video';
  videoProps?: Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'ref'>;
  className?: string;
};

/** Shfaq foto/video të plotë – gjerësia 100%, lartësia sipas raportit real */
export const PostMediaFrame = forwardRef<HTMLVideoElement, PostMediaFrameProps>(
  function PostMediaFrame({ src, type = 'image', videoProps, className = '' }, ref) {
    const [aspectRatio, setAspectRatio] = useState(1);

    useEffect(() => {
      setAspectRatio(1);
    }, [src]);

    return (
      <div
        className={`relative w-full bg-black overflow-hidden ${className}`}
        style={{ aspectRatio }}
      >
        {type === 'video' ? (
          <video
            ref={ref}
            src={src}
            className="block w-full h-full object-contain"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setAspectRatio(clampPostAspectRatio(v.videoWidth, v.videoHeight));
              videoProps?.onLoadedMetadata?.(e);
            }}
            {...videoProps}
          />
        ) : (
          <img
            src={src}
            alt=""
            className="block w-full h-full object-contain"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setAspectRatio(clampPostAspectRatio(img.naturalWidth, img.naturalHeight));
            }}
          />
        )}
      </div>
    );
  }
);

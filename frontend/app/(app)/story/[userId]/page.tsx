'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';

const IMAGE_DURATION_MS = 5000;
const HOLD_MS = 180;

type Story = { _id: string; mediaUrl: string; type: string; user?: { username: string; avatar?: string } };
type StoryGroup = { user: { _id: string; username: string; avatar?: string }; stories: Story[] };

export default function StoryViewPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goNextRef = useRef<() => void>(() => {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapXRef = useRef(0);
  const imageElapsedRef = useRef(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const SWIPE_DOWN_CLOSE = 80;

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ stories: StoryGroup[] }>('/api/stories');
        setGroups(res.stories || []);
        const gi = res.stories?.findIndex((g) => g.user._id === userId) ?? 0;
        setCurrentGroupIndex(gi >= 0 ? gi : 0);
        setCurrentStoryIndex(0);
      } catch (_) {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const group = groups[currentGroupIndex];
  const story = group?.stories?.[currentStoryIndex];
  const totalInGroup = group?.stories?.length ?? 0;

  useEffect(() => {
    if (!story) return;
    api(`/api/stories/${story._id}/shiko`, { method: 'POST' }).catch(() => {});
  }, [story?._id]);

  const goNext = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    imageElapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    if (currentStoryIndex < (group?.stories?.length ?? 1) - 1) {
      setCurrentStoryIndex((i) => i + 1);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex((i) => i + 1);
      setCurrentStoryIndex(0);
    } else {
      router.back();
    }
  };
  goNextRef.current = goNext;

  const goPrev = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    imageElapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((i) => i - 1);
      const prevGroup = groups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup?.stories?.length ? prevGroup.stories.length - 1 : 0);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (!story || story.type === 'video') {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    if (paused) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    const start = Date.now() - imageElapsedRef.current;
    const duration = IMAGE_DURATION_MS;
    const tick = () => {
      const elapsed = Date.now() - start;
      imageElapsedRef.current = Math.min(elapsed, duration);
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) goNextRef.current();
      else timerRef.current = setTimeout(tick, 50);
    };
    timerRef.current = setTimeout(tick, 50);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [story?._id, currentGroupIndex, currentStoryIndex, paused]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    tapXRef.current = e.clientX;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setPaused(true);
      imageElapsedRef.current = (progress / 100) * IMAGE_DURATION_MS;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      videoRef.current?.pause();
    }, HOLD_MS);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width / 2) goPrev();
      else goNext();
    } else if (paused) {
      setPaused(false);
      videoRef.current?.play().catch(() => {});
    }
  };

  const handlePointerLeave = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const dy = endY - touchStartY.current;
    const dx = Math.abs(endX - touchStartX.current);
    if (dy > SWIPE_DOWN_CLOSE && dy > dx) router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Duke ngarkuar...</p>
      </div>
    );
  }

  if (!group || !story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <p>Story nuk u gjet.</p>
        <Link href="/feed" className="text-[var(--primary)] mt-2">Kthehu në feed</Link>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars – si Instagram */}
      <div className="absolute top-0 left-0 right-0 flex gap-0.5 p-2 pt-6 z-20">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={false}
              animate={{
                width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%',
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* Zona: tap majtas/djathtas = para/pas; mbaj = pause (si Instagram) */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-default select-none"
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') goPrev();
          if (e.key === 'ArrowRight') goNext();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={story._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
          >
            {story.type === 'video' ? (
              <video
                ref={videoRef}
                src={story.mediaUrl}
                className="max-w-full max-h-full object-contain"
                autoPlay
                playsInline
                muted={false}
                onEnded={goNext}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration && Number.isFinite(v.duration)) setProgress((v.currentTime / v.duration) * 100);
                }}
                onLoadedMetadata={(e) => setProgress(0)}
              />
            ) : (
              <img src={story.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <header className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center gap-3 text-white bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
        <Link
          href={`/profili/${group.user.username}`}
          className="pointer-events-auto flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={group.user.avatar || ''}
            alt=""
            className="w-10 h-10 rounded-full border-2 border-white object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + group.user.username;
            }}
          />
          <span className="font-semibold">{group.user.username}</span>
        </Link>
      </header>
    </div>
  );
}

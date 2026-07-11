'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { MusicSticker } from '@/components/MusicSticker';

const IMAGE_DURATION_MS = 5000;
const IMAGE_WITH_MUSIC_MS = 15000;
const HOLD_MS = 180;

type Story = {
  _id: string;
  mediaUrl: string;
  type: string;
  music?: { url: string; title?: string; artist?: string };
  user?: { username: string; avatar?: string };
};
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
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goNextRef = useRef<() => void>(() => {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const musicUnlockedRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const hasMusic = !!story?.music?.url;

  useEffect(() => {
    if (!story) return;
    api(`/api/stories/${story._id}/shiko`, { method: 'POST' }).catch(() => {});
  }, [story?._id]);

  const stopMusic = useCallback(() => {
    const audio = musicRef.current;
    if (audio) audio.pause();
    setMusicPlaying(false);
  }, []);

  const tryPlayMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio || !hasMusic || paused || musicMuted) return;
    audio.play()
      .then(() => {
        musicUnlockedRef.current = true;
        setMusicPlaying(true);
      })
      .catch(() => setMusicPlaying(false));
  }, [hasMusic, paused, musicMuted]);

  const startMusic = useCallback(() => {
    tryPlayMusic();
  }, [tryPlayMusic]);

  const goNext = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopMusic();
    musicUnlockedRef.current = false;
    setMusicMuted(false);
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
    stopMusic();
    musicUnlockedRef.current = false;
    setMusicMuted(false);
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
    musicUnlockedRef.current = false;
    setMusicPlaying(false);
    setMusicMuted(false);
    if (!story || !hasMusic) return;
    const t = setTimeout(() => tryPlayMusic(), 120);
    return () => clearTimeout(t);
  }, [story?._id, hasMusic, tryPlayMusic]);

  useEffect(() => {
    if (!story || story.type === 'video') {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    if (paused) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    const duration = hasMusic ? IMAGE_WITH_MUSIC_MS : IMAGE_DURATION_MS;
    const start = Date.now() - imageElapsedRef.current;
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
  }, [story?._id, currentGroupIndex, currentStoryIndex, paused, hasMusic]);

  useEffect(() => {
    if (paused) {
      stopMusic();
      videoRef.current?.pause();
    } else {
      startMusic();
      if (story?.type === 'video') videoRef.current?.play().catch(() => {});
    }
  }, [paused, startMusic, stopMusic, story?.type]);

  const handlePointerDown = () => {
    if (hasMusic && !musicUnlockedRef.current && !paused) tryPlayMusic();
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setPaused(true);
      imageElapsedRef.current = (progress / 100) * (hasMusic ? IMAGE_WITH_MUSIC_MS : IMAGE_DURATION_MS);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      videoRef.current?.pause();
      stopMusic();
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

  const toggleMusicMute = () => {
    const audio = musicRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
      setMusicMuted(true);
    } else {
      setMusicMuted(false);
      audio.play().then(() => {
        musicUnlockedRef.current = true;
        setMusicPlaying(true);
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || !story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-3">
        <p>Story nuk u gjet.</p>
        <Link href="/feed" className="text-[var(--ig-blue)] font-semibold">Kthehu në feed</Link>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasMusic && story.music?.url && (
        <audio
          key={story._id}
          ref={musicRef}
          src={story.music.url}
          loop
          preload="auto"
          playsInline
        />
      )}

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
                muted={hasMusic}
                onEnded={goNext}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration && Number.isFinite(v.duration)) setProgress((v.currentTime / v.duration) * 100);
                }}
                onLoadedMetadata={() => setProgress(0)}
              />
            ) : (
              <img src={story.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {hasMusic && story.music && (
        <div className="absolute bottom-8 left-4 right-4 z-20 flex justify-center pointer-events-auto">
          <MusicSticker
            title={story.music.title || 'Muzikë'}
            artist={story.music.artist}
            playing={musicPlaying && !paused}
            onClick={toggleMusicMute}
          />
        </div>
      )}

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
          {hasMusic && <span className="text-white/70 text-xs">♪</span>}
        </Link>
      </header>
    </div>
  );
}

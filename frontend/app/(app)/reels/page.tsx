'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { IconHeart, IconComment, IconShare, IconBookmark, IconMore } from '@/components/Icons';
import { MusicSticker } from '@/components/MusicSticker';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Reel = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string; isFollowing?: boolean };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  likes: string[];
  comments: unknown[];
  createdAt: string;
  saved?: boolean;
  music?: { url: string; title?: string; artist?: string };
  duetOf?: {
    _id: string;
    media: { url: string; type: string }[];
    user: { username: string; avatar?: string };
  };
};

type ReelsResponse = { reels: Reel[]; hasMore: boolean; nextCursor: string | null };

function timeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'tani';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} orë`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} ditë`;
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
}

export default function ReelsPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const currentReel = reels[currentIndex];

  useDocumentTitle(currentReel ? `@${currentReel.user?.username} • Reels` : 'Reels');

  useEffect(() => {
    const saved = sessionStorage.getItem('reels_muted');
    if (saved !== null) setMuted(saved === 'true');
  }, []);

  useEffect(() => {
    sessionStorage.setItem('reels_muted', String(muted));
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const i = parseInt(searchParams.get('i') || '0', 10);
    if (!isNaN(i) && i >= 0 && i < reels.length) setCurrentIndex(i);
  }, [searchParams, reels.length]);

  const fetchReels = useCallback(async (cursor: string | null, signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: '12' });
    if (cursor) params.set('cursor', cursor);
    return api<ReelsResponse>(`/api/posts/reels?${params.toString()}`, { signal, timeout: 20000 });
  }, []);

  useEffect(() => {
    if (!user) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetchReels(null, signal);
        if (signal.aborted) return;
        setReels(res.reels || []);
        setHasMore(res.hasMore ?? false);
        setNextCursor(res.nextCursor ?? null);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        setError('Nuk u ngarkuan reels. Provo përsëri.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { abortRef.current?.abort(); };
  }, [user, fetchReels]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    try {
      const res = await fetchReels(nextCursor);
      setReels((r) => [...r, ...(res.reels || [])]);
      setHasMore(res.hasMore ?? false);
      setNextCursor(res.nextCursor ?? null);
    } catch (_) {}
  }, [hasMore, nextCursor, fetchReels]);

  useEffect(() => {
    if (currentIndex >= reels.length - 3 && hasMore) loadMore();
  }, [currentIndex, reels.length, hasMore, loadMore]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, reels.length - 1));
    setCurrentIndex(clamped);
    setProgress(0);
    router.replace(`/reels?i=${clamped}`, { scroll: false });
  }, [reels.length, router]);

  useEffect(() => {
    const video = videoRef.current;
    const music = musicRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    if (music && currentReel?.music?.url) {
      music.currentTime = 0;
      if (!muted) music.play().catch(() => {});
      else music.pause();
    }
  }, [currentIndex, currentReel?.music?.url, muted]);

  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      const music = musicRef.current;
      if (document.hidden) {
        video?.pause();
        music?.pause();
      } else {
        video?.play().catch(() => {});
        if (music && currentReel?.music?.url && !muted) music.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [currentReel?.music?.url, muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
      if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, goTo]);

  const handleLike = async () => {
    if (!user || !currentReel) return;
    const liked = currentReel.likes?.includes(user.id || '');
    setReels((rs) => rs.map((r, i) => {
      if (i !== currentIndex) return r;
      const likes = liked
        ? r.likes.filter((id) => id !== user.id)
        : [...(r.likes || []), user.id || ''];
      return { ...r, likes };
    }));
    try {
      await api(`/api/posts/${currentReel._id}/pelqim`, { method: 'POST' });
    } catch (_) {
      setReels((rs) => rs.map((r, i) => {
        if (i !== currentIndex) return r;
        const likes = liked
          ? [...(r.likes || []), user.id || '']
          : r.likes.filter((id) => id !== user.id);
        return { ...r, likes };
      }));
      toastError('Nuk u pelqy.');
    }
  };

  const handleSave = async () => {
    if (!currentReel) return;
    const saved = currentReel.saved;
    setReels((rs) => rs.map((r, i) => i === currentIndex ? { ...r, saved: !saved } : r));
    try {
      await api(`/api/posts/${currentReel._id}/ruaj`, { method: 'POST' });
      toast(saved ? 'U hoq nga ruajturat' : 'Ruajtuar');
    } catch (_) {
      setReels((rs) => rs.map((r, i) => i === currentIndex ? { ...r, saved } : r));
      toastError('Nuk u ruajt.');
    }
  };

  const handleFollow = async () => {
    if (!currentReel?.user) return;
    const isFollowing = currentReel.user.isFollowing;
    setReels((rs) => rs.map((r, i) => {
      if (i !== currentIndex) return r;
      return { ...r, user: { ...r.user, isFollowing: !isFollowing } };
    }));
    try {
      await api(`/api/users/${currentReel.user._id}/ndiq`, { method: 'POST' });
    } catch (_) {
      setReels((rs) => rs.map((r, i) => {
        if (i !== currentIndex) return r;
        return { ...r, user: { ...r.user, isFollowing } };
      }));
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const liked = currentReel?.likes?.includes(user?.id || '');
      if (!liked) {
        handleLike();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    } else {
      setMuted((m) => !m);
    }
    lastTapRef.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    const elapsed = Date.now() - touchStartTime.current;
    if (Math.abs(diff) < 30 && elapsed < 300) {
      handleTap();
      return;
    }
    if (diff > 50) goTo(currentIndex + 1);
    else if (diff < -50) goTo(currentIndex - 1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) goTo(currentIndex + 1);
    else if (e.deltaY < 0) goTo(currentIndex - 1);
  };

  if (loading) {
    return (
      <div className="reels-container flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error && reels.length === 0) {
    return (
      <div className="reels-container flex flex-col items-center justify-center text-white gap-4">
        <p className="text-[15px]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm text-[14px] font-semibold hover:bg-white/20 transition-colors"
        >
          Provo përsëri
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-container flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
        <p className="text-[17px] font-semibold">Ende nuk ka reels</p>
        <p className="text-[14px] text-white/60">Krijo një Reel me muzikë për të parë këtu.</p>
        <Link href="/krijo/reel" className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold">
          Krijo Reel
        </Link>
      </div>
    );
  }

  const media = currentReel?.media?.[0];
  const liked = currentReel?.likes?.includes(user?.id || '');
  const likesCount = currentReel?.likes?.length || 0;
  const commentsCount = currentReel?.comments?.length || 0;

  return (
    <div
      ref={containerRef}
      className="reels-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 safe-area-pt">
        <div className="reels-progress">
          <div className="reels-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Video */}
      {currentReel.music?.url && (
        <audio ref={musicRef} key={`music-${currentReel._id}`} src={currentReel.music.url} loop preload="auto" />
      )}
      <video
        ref={videoRef}
        key={currentReel._id}
        src={media?.url}
        className={`absolute bg-black object-contain ${
          currentReel.duetOf
            ? 'right-0 top-0 w-1/2 h-full'
            : 'inset-0 w-full h-full'
        }`}
        playsInline
        loop
        muted={muted || !!currentReel.music?.url}
        preload="auto"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress(v.currentTime / v.duration);
        }}
        onLoadedData={(e) => { e.currentTarget.play().catch(() => {}); }}
      />
      {currentReel.duetOf?.media?.[0]?.url && (
        <video
          key={`duet-${currentReel.duetOf._id}`}
          src={currentReel.duetOf.media[0].url}
          className="absolute left-0 top-0 w-1/2 h-full object-contain bg-black border-r border-white/20"
          playsInline
          loop
          muted={muted || !!currentReel.music?.url}
          autoPlay
        />
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-double-tap">
          <span className="text-white drop-shadow-2xl [&_svg]:w-24 [&_svg]:h-24">
            <IconHeart filled />
          </span>
        </div>
      )}

      {/* Right actions */}
      <div className="absolute right-3 bottom-28 md:bottom-32 flex flex-col items-center gap-5 z-20">
        <button type="button" onClick={handleLike} className={`flex flex-col items-center gap-1 ${liked ? 'text-[var(--primary)]' : 'text-white'}`}>
          <IconHeart filled={liked} />
          {likesCount > 0 && <span className="text-[11px] font-semibold">{likesCount}</span>}
        </button>
        <Link href={`/post/${currentReel._id}`} className="flex flex-col items-center gap-1 text-white">
          <IconComment />
          {commentsCount > 0 && <span className="text-[11px] font-semibold">{commentsCount}</span>}
        </Link>
        <Link href={`/krijo/duet/${currentReel._id}`} className="flex flex-col items-center gap-1 text-white opacity-90" title="Krijo duet">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="9" height="16" rx="1" />
            <rect x="13" y="4" width="9" height="16" rx="1" />
          </svg>
          <span className="text-[10px] font-semibold">Duet</span>
        </Link>
        <button type="button" onClick={handleSave} className={`text-white ${currentReel.saved ? 'opacity-100' : 'opacity-80'}`}>
          <IconBookmark filled={currentReel.saved} />
        </button>
        <button type="button" onClick={() => setMuted((m) => !m)} className="text-white opacity-80">
          {muted ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 md:bottom-24 left-0 right-16 px-4 z-20">
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/profili/${currentReel.user?.username}`}>
            <img
              src={currentReel.user?.avatar || ''}
              alt=""
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentReel.user?.username; }}
            />
          </Link>
          <Link href={`/profili/${currentReel.user?.username}`} className="text-white font-semibold text-[14px] hover:opacity-80">
            {currentReel.user?.username}
          </Link>
          {currentReel.user?._id !== user?.id && (
            <button
              type="button"
              onClick={handleFollow}
              className={`ml-1 px-3 py-1 rounded-lg text-[12px] font-semibold border transition-colors ${
                currentReel.user?.isFollowing
                  ? 'border-white/40 text-white/80 bg-white/10'
                  : 'border-white text-white hover:bg-white/10'
              }`}
            >
              {currentReel.user?.isFollowing ? 'Ndiqet' : 'Ndiq'}
            </button>
          )}
        </div>
        {currentReel.createdAt && (
          <p className="text-white/60 text-[12px] mb-1">{timeAgo(currentReel.createdAt)}</p>
        )}
        {currentReel.caption && (
          <p className="text-white text-[13px] leading-snug line-clamp-2">{currentReel.caption}</p>
        )}
        {currentReel.music?.title && (
          <div className="mt-2 max-w-[85%]">
            <MusicSticker
              title={currentReel.music.title}
              artist={currentReel.music.artist}
              playing={!muted}
              onClick={() => setMuted((m) => !m)}
            />
          </div>
        )}
        {commentsCount > 0 && (
          <Link href={`/post/${currentReel._id}`} className="text-white/60 text-[12px] mt-1.5 hover:text-white/80">
            Shiko të gjitha {commentsCount} komente
          </Link>
        )}
      </div>

      {/* Index indicator */}
      <div className="absolute top-12 right-4 z-20 text-white/40 text-[11px] font-medium">
        {currentIndex + 1} / {reels.length}
      </div>
    </div>
  );
}

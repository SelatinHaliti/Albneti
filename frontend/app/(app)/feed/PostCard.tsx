'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { IconHeart, IconComment, IconShare, IconBookmark, IconMore } from '@/components/Icons';
import { MusicSticker } from '@/components/MusicSticker';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { PostMediaFrame } from '@/components/PostMediaFrame';
import { ReportButton } from '@/components/ReportButton';
import { CommentSheet } from '@/components/CommentSheet';

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string; isVerified?: boolean };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  hashtags?: string[];
  likes: string[];
  comments: unknown[];
  createdAt?: string;
  saved?: boolean;
  music?: { url: string; title?: string; artist?: string };
};

function timeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'tani';
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} orë`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} ditë`;
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
}

export function PostCard(props: {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShareOpen?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const { post, onLike, onComment, onShareOpen, isOwner, onEdit, onArchive, onDelete } = props;
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const [liked, setLiked] = useState(post.likes?.includes(user?.id || ''));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(!!post.saved);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userPausedMusic, setUserPausedMusic] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments?.length || 0);
  const [inViewport, setInViewport] = useState(false);
  const lastTapRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOptionsMenu) return;
    const close = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) setShowOptionsMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showOptionsMenu]);

  const handleLike = async () => {
    if (!user) return;
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!liked);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try {
      await api(`/api/posts/${post._id}/pelqim`, { method: 'POST' });
      onLike?.();
    } catch (_) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      toastError('Nuk u pelqy. Provo përsëri.');
    }
  };

  const handleSave = async () => {
    const prevSaved = saved;
    setSaved(!saved);
    try {
      await api(`/api/posts/${post._id}/ruaj`, { method: 'POST' });
      toast(saved ? 'U hoq nga ruajturat' : 'Ruajtuar');
    } catch (_) {
      setSaved(prevSaved);
      toastError('Nuk u ruajt. Provo përsëri.');
    }
  };

  const media = post.media && post.media[0];
  const isVideo = (media && media.type === 'video') || post.type === 'reel';
  const hasMusic = !!post.music?.url;

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.45),
      { threshold: [0, 0.45, 0.6] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!inViewport) {
      audio?.pause();
      video?.pause();
      setMusicPlaying(false);
      return;
    }
    if (isVideo && video) {
      video.play().catch(() => {});
    }
    if (hasMusic && audio && !userPausedMusic) {
      audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    }
  }, [inViewport, hasMusic, userPausedMusic, isVideo, post._id]);

  useEffect(() => {
    setUserPausedMusic(false);
    setMusicPlaying(false);
  }, [post._id]);

  const setAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.currentTarget;
    if (t) t.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.user?.username;
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      if (!liked) {
        handleLike();
        setShowDoubleTapHeart(true);
        setTimeout(() => setShowDoubleTapHeart(false), 800);
      }
    }
    lastTapRef.current = now;
  }, [liked]);

  const handleMediaPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Mos e trajto double-tap kur përdoruesi prek butona/link brenda medias (p.sh. arrows).
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a')) return;
    if (e.pointerType !== 'touch') return;
    handleDoubleTap();
  };

  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/post/${post._id}` : '';

  const handleShareClick = () => {
    if (onShareOpen) {
      onShareOpen();
      return;
    }
    setShowShareModal(true);
  };

  const shareOrCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator && postUrl) {
        await (navigator as Navigator & { share: (data: { url: string }) => Promise<void> }).share({ url: postUrl });
        setShowShareModal(false);
        toast('U nda me sukses');
        return;
      }
    } catch (_) {
      // fallback to clipboard
    }
    navigator.clipboard
      .writeText(postUrl)
      .then(() => {
        setShowShareModal(false);
        toast('Linku u kopjua');
      })
      .catch(() => toastError('Nuk u kopjua linku.'));
  };

  const toggleMusic = () => {
    if (!post.music?.url) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
      setUserPausedMusic(true);
    } else {
      audio.play().then(() => {
        setMusicPlaying(true);
        setUserPausedMusic(false);
      }).catch(() => {});
    }
  };

  return (
    <article ref={articleRef} className="post-block overflow-hidden relative border-b border-[var(--border)] md:border-b-0 md:mb-4">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/profili/${post.user?.username}`} className="flex-shrink-0">
          <img
            src={post.user?.avatar || ''}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--border)]"
            onError={setAvatarError}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profili/${post.user?.username}`}
            className="font-semibold text-[14px] text-[var(--text)] truncate block hover:opacity-80 transition-opacity"
          >
            {post.user?.username}
            {post.user?.isVerified && <VerifiedBadge size={14} className="ml-1" />}
          </Link>
          {post.createdAt && (
            <span className="text-[12px] text-[var(--text-secondary)] hidden">{timeAgo(post.createdAt)}</span>
          )}
        </div>
        <div className="relative ml-auto" ref={optionsRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowOptionsMenu((v) => !v); }}
            className="p-2 -mr-2 text-[var(--text-muted)] rounded-full hover:bg-[var(--bg)] transition-colors"
            aria-label="Më shumë"
          >
            <IconMore />
          </button>
          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-1 py-1.5 min-w-[200px] ig-dropdown z-50">
              {isOwner && (
                <>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onEdit?.(); }} className="w-full text-left px-4 py-3 text-[14px] text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                    Redakto
                  </button>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onArchive?.(); }} className="w-full text-left px-4 py-3 text-[14px] text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                    Arkivo
                  </button>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onDelete?.(); }} className="w-full text-left px-4 py-3 text-[14px] text-[var(--danger)] hover:bg-[var(--bg)] transition-colors">
                    Fshi postimin
                  </button>
                  <div className="border-t border-[var(--border)] my-0.5" />
                </>
              )}
              <Link href={`/post/${post._id}`} className="block px-4 py-3 text-[14px] text-[var(--text)] hover:bg-[var(--bg)] transition-colors" onClick={() => setShowOptionsMenu(false)}>
                Shko te postimi
              </Link>
              <button type="button" onClick={() => { shareOrCopy(); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-3 text-[14px] text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                Ndaj / Kopjo linkun
              </button>
              <Link href={`/profili/${post.user?.username}`} className="block px-4 py-3 text-[14px] text-[var(--text)] hover:bg-[var(--bg)] transition-colors" onClick={() => setShowOptionsMenu(false)}>
                Shiko profilin
              </Link>
              {!isOwner && (
                <>
                  <div className="border-t border-[var(--border)] my-0.5" />
                  <ReportButton reportedPost={post._id} className="block w-full text-left px-4 py-3 text-[14px] text-[var(--danger)] hover:bg-[var(--bg)] transition-colors" />
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Share modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center ig-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="w-full max-w-[400px] liquid-glass-strong rounded-t-2xl sm:rounded-2xl p-5 pb-8 safe-area-pb" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4 sm:hidden" />
            <p className="text-[15px] font-semibold text-[var(--text)] mb-4">Ndaj postimin</p>
            <div className="space-y-1">
              <button type="button" onClick={shareOrCopy} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg)] text-[var(--text)] text-[14px] transition-colors">
                <IconShare />
                Ndaj / Kopjo linkun
              </button>
              <Link href={`/post/${post._id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg)] text-[var(--text)] text-[14px] transition-colors">
                <IconComment />
                Shko te postimi
              </Link>
            </div>
            <button type="button" onClick={() => setShowShareModal(false)} className="w-full mt-3 py-3 text-[14px] font-semibold text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg)] transition-colors">
              Anulo
            </button>
          </div>
        </div>
      )}

      {/* Media – raport dinamik, foto e plotë pa prerje */}
      <div
        className="relative w-full bg-black cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
        onPointerUp={handleMediaPointerUp}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleDoubleTap()}
        aria-label="Dy klik për pelqim"
      >
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-double-tap">
            <span className="inline-block scale-150 text-white [&_svg]:w-20 [&_svg]:h-20 drop-shadow-2xl">
              <IconHeart filled />
            </span>
          </div>
        )}
        {isVideo ? (
          <PostMediaFrame
            ref={videoRef}
            src={media?.url || ''}
            type="video"
            videoProps={{
              controls: !hasMusic,
              playsInline: true,
              loop: hasMusic,
              muted: hasMusic,
              preload: 'metadata',
            }}
          />
        ) : (
          <>
            <PostMediaFrame
              src={(post.media && post.media[currentMedia]?.url) || media?.url || ''}
              type="image"
            />
            {post.media && post.media.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setCurrentMedia((i) => (i === 0 ? (post.media?.length ?? 1) - 1 : i - 1)); }}
                  aria-label="Para"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setCurrentMedia((i) => (i === (post.media?.length ?? 1) - 1 ? 0 : i + 1)); }}
                  aria-label="Pas"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {post.media.map((_, idx) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentMedia ? 'bg-white w-3' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {hasMusic && (
          <>
            <audio ref={audioRef} src={post.music!.url} loop preload="metadata" />
            <div className="absolute bottom-3 left-3 right-3 z-[5] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <MusicSticker
                title={post.music!.title || 'Muzikë'}
                artist={post.music!.artist}
                playing={musicPlaying}
                onClick={toggleMusic}
              />
            </div>
          </>
        )}
      </div>

      {/* Actions & caption */}
      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center mb-1.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleLike} className={`transition-all ${liked ? 'text-[var(--primary)]' : 'text-[var(--text)] hover:opacity-70'}`} aria-label={liked ? 'Hiq pelqimin' : 'Pelqej'}>
              <IconHeart filled={liked} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onComment) {
                  onComment();
                } else {
                  setCommentOpen(true);
                }
              }}
              className="text-[var(--text)] hover:opacity-70 transition-opacity"
              aria-label="Komentet"
            >
              <IconComment />
            </button>
            <button type="button" onClick={handleShareClick} className="text-[var(--text)] hover:opacity-70 transition-opacity" aria-label="Ndaj">
              <IconShare />
            </button>
          </div>
          <button type="button" onClick={handleSave} className={`ml-auto transition-all ${saved ? 'text-[var(--text)]' : 'text-[var(--text)] hover:opacity-70'}`} aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj'}>
            <IconBookmark filled={saved} />
          </button>
        </div>
        {likesCount > 0 && (
          <p className="text-[14px] font-semibold text-[var(--text)] mb-1">
            {likesCount === 1 ? '1 pelqim' : `${likesCount} pelqime`}
          </p>
        )}
        {post.caption && (
          <p className="text-[14px] text-[var(--text)] leading-[18px]">
            <Link href={`/profili/${post.user?.username}`} className="font-semibold mr-1.5 hover:opacity-80 transition-opacity">
              {post.user?.username}
            {post.user?.isVerified && <VerifiedBadge size={14} className="ml-1" />}
            </Link>
            {post.caption}
          </p>
        )}
        {(commentsCount || 0) > 0 && (
          <button
            type="button"
            onClick={() => setCommentOpen(true)}
            className="text-[14px] text-[var(--text-muted)] mt-1.5 block hover:text-[var(--text-secondary)] text-left"
          >
            Shiko të gjitha {commentsCount === 1 ? '1 komentin' : `${commentsCount} komente`}
          </button>
        )}
        {post.createdAt && (
          <p className="text-[10px] text-[var(--text-secondary)] uppercase mt-2 tracking-wide">{timeAgo(post.createdAt)}</p>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <p className="text-[13px] mt-1.5 flex flex-wrap gap-x-1">
            {post.hashtags.map((h) => (
              <Link key={h} href={`/explore/hashtag/${h}`} className="ig-link font-normal hover:underline">
                #{h}
              </Link>
            ))}
          </p>
        )}
      </div>

      <CommentSheet
        postId={post._id}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        onCountChange={setCommentsCount}
      />
    </article>
  );
}

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { IconHeart, IconComment, IconShare, IconBookmark, IconMore } from '@/components/Icons';
import { ReportButton } from '@/components/ReportButton';

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const lastTapRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/post/${post._id}` : '';

  const handleShareClick = () => {
    if (onShareOpen) {
      onShareOpen();
      return;
    }
    setShowShareModal(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(postUrl).then(() => {
      setShowShareModal(false);
      toast('Linku u kopjua');
    }).catch(() => toastError('Nuk u kopjua linku.'));
  };

  const toggleMusic = () => {
    if (!post.music?.url) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
    }
  };

  const handleMusicEnded = () => setMusicPlaying(false);

  return (
    <article className="post-block overflow-hidden relative bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm">
      <header className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
        <Link href={`/profili/${post.user?.username}`} className="flex-shrink-0">
          <img
            src={post.user?.avatar || ''}
            alt=""
            className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--border)]"
            onError={setAvatarError}
          />
        </Link>
        <Link
          href={`/profili/${post.user?.username}`}
          className="font-semibold text-[14px] text-[var(--text)] truncate flex-1 min-w-0"
        >
          {post.user?.username}
        </Link>
        <div className="relative ml-auto" ref={optionsRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowOptionsMenu((v) => !v); }}
            className="p-2 -mr-2 text-[var(--text)] rounded-full hover:bg-[var(--bg)] transition-colors"
            aria-label="Më shumë"
          >
            <IconMore />
          </button>
          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-lg z-50">
              {isOwner && (
                <>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onEdit?.(); }} className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--bg)]">
                    Redakto
                  </button>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onArchive?.(); }} className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--bg)]">
                    Arkivo
                  </button>
                  <button type="button" onClick={() => { setShowOptionsMenu(false); onDelete?.(); }} className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--danger)] hover:bg-[var(--bg)]">
                    Fshi postimin
                  </button>
                  <div className="border-t border-[var(--border)] my-1" />
                </>
              )}
              <Link href={`/post/${post._id}`} className="block px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--bg)]" onClick={() => setShowOptionsMenu(false)}>
                Shko te postimi
              </Link>
              <button type="button" onClick={() => { copyLink(); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--bg)]">
                Kopjo linkun
              </button>
              <Link href={`/profili/${post.user?.username}`} className="block px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--bg)]" onClick={() => setShowOptionsMenu(false)}>
                Shiko profilin
              </Link>
              {!isOwner && (
                <>
                  <div className="border-t border-[var(--border)] my-1" />
                  <ReportButton reportedPost={post._id} className="block w-full text-left px-4 py-2.5 text-[14px] text-[var(--danger)] hover:bg-[var(--bg)]" />
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {showShareModal && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowShareModal(false)}>
          <div className="w-full max-w-[400px] bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl p-4 pb-8 safe-area-pb" onClick={(e) => e.stopPropagation()}>
            <p className="text-[14px] font-semibold text-[var(--text)] mb-3">Ndaj postimin</p>
            <button type="button" onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg)] text-[var(--text)] text-[14px]">
              <IconShare />
              Kopjo linkun
            </button>
            <Link href={`/post/${post._id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg)] text-[var(--text)] text-[14px]">
              <IconComment />
              Shko te postimi
            </Link>
            <button type="button" onClick={() => setShowShareModal(false)} className="w-full mt-2 py-3 text-[14px] font-semibold text-[var(--text-muted)]">
              Anulo
            </button>
          </div>
        </div>
      )}

      <div
        className="relative aspect-square bg-black cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
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
          <video
            src={media?.url}
            controls
            playsInline
            className="w-full h-full object-contain"
            preload="metadata"
          />
        ) : (
          <>
            <img
              src={(post.media && post.media[currentMedia]?.url) || media?.url || ''}
              alt=""
              className="w-full h-full object-cover"
            />
            {post.media && post.media.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-black"
                  onClick={() => setCurrentMedia((i) => (i === 0 ? (post.media?.length ?? 1) - 1 : i - 1))}
                  aria-label="Para"
                >
                  <span className="text-lg font-bold">‹</span>
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-black"
                  onClick={() => setCurrentMedia((i) => (i === (post.media?.length ?? 1) - 1 ? 0 : i + 1))}
                  aria-label="Pas"
                >
                  <span className="text-lg font-bold">›</span>
                </button>
              </>
            )}
          </>
        )}
        {/* Muzikë – shirit si Instagram */}
        {post.music?.url && (
          <>
            <audio
              ref={audioRef}
              src={post.music.url}
              onEnded={handleMusicEnded}
              preload="metadata"
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0"
                aria-label={musicPlaying ? 'Ndalo muzikën' : 'Luaj muzikën'}
              >
                {musicPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-white/90 text-xs">♪</span>
                <span className="text-white text-[13px] truncate">
                  {post.music.title || 'Muzikë'}
                  {post.music.artist ? ` · ${post.music.artist}` : ''}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-4 mb-2">
          <button type="button" onClick={handleLike} className="p-2 -ml-2 text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label={liked ? 'Hiq pelqimin' : 'Pelqej'}>
            <IconHeart filled={liked} />
          </button>
          <Link href={`/post/${post._id}`} className="p-2 text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label="Komentet">
            <IconComment />
          </Link>
          <button type="button" onClick={handleShareClick} className="p-2 text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label="Ndaj">
            <IconShare />
          </button>
          <button type="button" onClick={handleSave} className="ml-auto p-2 text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj'}>
            <IconBookmark filled={saved} />
          </button>
        </div>
        {likesCount > 0 && (
          <p className="text-[14px] font-semibold text-[var(--text)] mb-0.5">
            {likesCount === 1 ? '1 pelqim' : `${likesCount} pelqime`}
          </p>
        )}
        {post.caption && (
          <p className="text-[14px] text-[var(--text)] leading-[18px]">
            <Link href={`/profili/${post.user?.username}`} className="font-semibold mr-1">
              {post.user?.username}
            </Link>
            {post.caption}
          </p>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <p className="text-[14px] text-[var(--primary)] mt-1">
            {post.hashtags.map((h) => (
              <Link key={h} href={`/explore/hashtag/${h}`} className="mr-1">
                #{h}
              </Link>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

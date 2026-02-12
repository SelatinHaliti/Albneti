'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { PostCard } from './PostCard';
import { StoryRing } from '@/components/StoryRing';
import { SkeletonPostBlock, SkeletonStoryRing } from '@/components/Skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { useSearchParams } from 'next/navigation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type StoryGroup = {
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  stories: { _id: string; mediaUrl: string; type: string; createdAt?: string }[];
};

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  hashtags?: string[];
  likes: string[];
  comments: unknown[];
  createdAt: string;
  saved?: boolean;
};

type FeedResponse = { posts: Post[]; hasMore: boolean; nextCursor: string | null };

export default function FeedPage() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const feedMode = searchParams.get('feed') === 'following' ? 'following' : 'for_you';
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [storyOrder, setStoryOrder] = useState<'default' | 'latest'>('default');
  const touchStartY = useRef(0);

  useDocumentTitle(feedMode === 'following' ? 'Ndiqet' : 'Kryefaja');

  const sortedStories = [...stories].sort((a, b) => {
    if (storyOrder === 'latest') {
      const aLast = a.stories[a.stories.length - 1]?.createdAt;
      const bLast = b.stories[b.stories.length - 1]?.createdAt;
      return new Date(bLast || 0).getTime() - new Date(aLast || 0).getTime();
    }
    return 0;
  });

  const fetchFeed = useCallback(async (cursor: string | null, signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: '12', feed: feedMode === 'following' ? 'following' : 'for_you' });
    if (cursor) params.set('cursor', cursor);
    return api<FeedResponse>(`/api/posts/feed?${params.toString()}`, { signal, timeout: 20000 });
  }, [feedMode]);

  const refreshFeed = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setError(null);
    setRefreshing(true);
    try {
      const [feedRes, storiesRes] = await Promise.all([
        fetchFeed(null, signal),
        api<{ stories: StoryGroup[] }>('/api/stories', { signal }),
      ]);
      if (signal.aborted) return;
      setPosts(feedRes.posts || []);
      setStories(storiesRes.stories || []);
      setHasMore(feedRes.hasMore ?? false);
      setNextCursor(feedRes.nextCursor ?? null);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setError('Nuk u lidh. Provo përsëri.');
    } finally {
      setRefreshing(false);
      setPullY(0);
    }
  }, [fetchFeed]);

  useEffect(() => {
    if (!user) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [feedRes, storiesRes] = await Promise.all([
          fetchFeed(null, signal),
          api<{ stories: StoryGroup[] }>('/api/stories', { signal }),
        ]);
        if (signal.aborted) return;
        setPosts(feedRes.posts || []);
        setStories(storiesRes.stories || []);
        setHasMore(feedRes.hasMore ?? false);
        setNextCursor(feedRes.nextCursor ?? null);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        setPosts([]);
        setStories([]);
        setError('Nuk u ngarkua feed-i. Provo përsëri.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { abortRef.current?.abort(); };
  }, [user, feedMode, fetchFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeed(nextCursor);
      setPosts((p) => [...p, ...(res.posts || [])]);
      setHasMore(res.hasMore ?? false);
      setNextCursor(res.nextCursor ?? null);
    } catch (_) {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, nextCursor, fetchFeed]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px', threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (typeof window === 'undefined' || window.scrollY > 10) return;
      const y = e.touches[0].clientY;
      const diff = y - touchStartY.current;
      if (diff > 0) setPullY(Math.min(diff * 0.4, 80));
    };
    const onTouchEnd = () => {
      if (pullY > 55) refreshFeed();
      else setPullY(0);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY, refreshFeed]);

  return (
    <div className="max-w-[600px] mx-auto min-h-screen bg-[var(--bg)] w-full border-x border-[var(--border)] md:rounded-lg md:border md:shadow-sm md:min-h-[calc(100vh-2rem)] md:my-4">
      {pullY > 0 && (
        <div className="flex justify-center py-3 bg-[var(--bg)] sticky top-0 z-10 rounded-t-lg" style={{ paddingTop: Math.min(pullY, 60) }}>
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}
      {/* Story ring vetëm në "Kryefaja" */}
      {feedMode !== 'following' && (
        <div className="bg-[var(--bg-card)] rounded-t-lg overflow-hidden border-b border-[var(--border)]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[15px] font-semibold text-[var(--text)]">Story</span>
            {!loading && stories.length > 0 && (
              <button
                type="button"
                onClick={() => setStoryOrder((o) => (o === 'latest' ? 'default' : 'latest'))}
                className="text-[13px] font-semibold text-[var(--primary)] hover:underline"
              >
                {storyOrder === 'latest' ? 'Kryesor' : 'Fundi'}
              </button>
            )}
          </div>
          {loading ? <SkeletonStoryRing /> : stories.length > 0 ? <StoryRing groups={sortedStories} currentUserId={user?.id} /> : null}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 pb-6 pt-2">
          {[1, 2, 3].map((i) => (
            <SkeletonPostBlock key={i} />
          ))}
        </div>
      ) : error && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[var(--bg-card)] rounded-b-lg">
          <p className="text-[15px] font-semibold text-[var(--text)]">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); refreshFeed(); }}
            className="mt-5 px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            Provo përsëri
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[var(--bg-card)] rounded-b-lg">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-5 shadow-inner">
            <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          {feedMode === 'following' ? (
            <>
              <p className="text-[16px] font-semibold text-[var(--text)]">Nuk ka postime nga ndjekjet</p>
              <p className="text-[14px] text-[var(--text-muted)] mt-2 max-w-[300px]">Këtu shfaqen vetëm postet e përdoruesve që ndiqni. Shkoni te <strong>Për ty</strong> për të parë të gjitha postet e platformës.</p>
              <Link href="/feed" className="mt-5 px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-[var(--primary)] text-white hover:opacity-90">
                Shiko Për ty
              </Link>
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-[var(--text)]">Ende nuk ka postime</p>
              <p className="text-[14px] text-[var(--text-muted)] mt-2 max-w-[280px]">Bëhu i pari që poston. Kush poston, e sheh gjithkush.</p>
              <Link href="/krijo/post" className="mt-5 px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-[var(--primary)] text-white hover:opacity-90">
                Posto
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6 pb-8 pt-4 px-1">
            <AnimatePresence>
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </AnimatePresence>
          </div>
          <div ref={loadMoreRef} className="min-h-[1px]" />
          {error && (
            <div className="flex flex-col items-center py-5 px-4">
              <p className="text-[14px] text-[var(--text-muted)]">{error}</p>
              <button type="button" onClick={refreshFeed} className="mt-2 text-[14px] font-semibold text-[var(--primary)] hover:underline">Provo përsëri</button>
            </div>
          )}
          {loadingMore && (
            <div className="flex justify-center py-8 bg-[var(--bg)]">
              <div className="w-7 h-7 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/Skeleton';

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  hashtags?: string[];
  likes: string[];
  comments: unknown[];
};

type Hashtag = { tag: string; count: number };

function ExploreGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-px md:gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const user = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'postime' | 'hashtag'>('postime');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useDocumentTitle('Eksploro');

  const loadExplore = useCallback(async (pageNum: number, append: boolean, signal?: AbortSignal) => {
    setError(null);
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const [postsRes, tagsRes] = await Promise.all([
        api<{ posts: Post[]; hasMore?: boolean }>(`/api/explore/postime?limit=20&page=${pageNum}`, { signal }),
        pageNum === 1 ? api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending', { signal }) : Promise.resolve({ hashtags }),
      ]);
      const newPosts = postsRes.posts || [];
      setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      setHasMore(postsRes.hasMore ?? false);
      if (pageNum === 1 && tagsRes.hashtags) setHashtags(tagsRes.hashtags);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setPosts((prev) => (pageNum === 1 ? [] : prev));
      setError('Nuk u ngarkua. Provo përsëri.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (pageNum === 1) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadExplore(1, false);
  }, [user, loadExplore]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || loading || loadingMore || activeTab !== 'postime' || posts.length < 6) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setPage((p) => p + 1); } },
      { rootMargin: '200px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, activeTab, posts.length]);

  useEffect(() => {
    if (page <= 1) return;
    loadExplore(page, true);
  }, [page, loadExplore]);

  const onRefresh = useCallback(() => {
    setPullY(0);
    setRefreshing(true);
    setPage(1);
    loadExplore(1, false).then(() => setRefreshing(false));
  }, [loadExplore]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      if (typeof window === 'undefined' || window.scrollY > 10) return;
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0) setPullY(Math.min(diff * 0.4, 80));
    };
    const onTouchEnd = () => {
      if (pullY > 55) onRefresh();
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
  }, [pullY, onRefresh]);

  return (
    <div className="max-w-[470px] md:max-w-4xl mx-auto px-0 md:px-4 py-4 bg-[var(--bg)] w-full min-h-screen">
      {pullY > 0 && (
        <div className="flex justify-center py-2 bg-[var(--bg)] sticky top-0 z-10" style={{ paddingTop: Math.min(pullY, 60) }}>
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      <div className="px-4 mb-4">
        <Link
          href="/kerko"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-[10px] bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] text-[14px] hover:border-[var(--text-secondary)] transition-colors"
        >
          <span className="[&_svg]:w-5 [&_svg]:h-5 text-[var(--text-muted)] flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <span>Kërko</span>
        </Link>
      </div>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('postime')}
          className={`px-4 py-2.5 rounded-[8px] text-[14px] font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'postime'
              ? 'bg-[var(--text)] text-[var(--bg-card)]'
              : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
          }`}
        >
          Postime
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hashtag')}
          className={`px-4 py-2.5 rounded-[8px] text-[14px] font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'hashtag'
              ? 'bg-[var(--text)] text-[var(--bg-card)]'
              : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
          }`}
        >
          Hashtag
        </button>
      </div>

      {activeTab === 'hashtag' && (
        <div className="flex flex-wrap gap-2 px-4 mb-6">
          {hashtags.map((h) => (
            <Link
              key={h.tag}
              href={`/explore/hashtag/${h.tag}`}
              className="px-4 py-2 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm font-medium hover:bg-[var(--border)] transition"
            >
              #{h.tag} <span className="text-[var(--text-muted)]">({h.count})</span>
            </Link>
          ))}
        </div>
      )}

      {loading && activeTab === 'postime' ? (
        <ExploreGridSkeleton />
      ) : error && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-[var(--text)] font-medium mb-3">{error}</p>
          <button type="button" onClick={() => loadExplore(1, false)} className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-[14px] font-semibold">
            Provo përsëri
          </button>
        </div>
      ) : activeTab === 'postime' ? (
        <>
          <div className="grid grid-cols-3 gap-px md:gap-0.5">
            {posts.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.25) }}
              >
                <Link href={`/post/${post._id}`} className="block aspect-square bg-black">
                  <img src={post.media?.[0]?.url || ''} alt="" className="w-full h-full object-cover" />
                </Link>
              </motion.div>
            ))}
          </div>
          <div ref={loadMoreRef} className="min-h-[2px]" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

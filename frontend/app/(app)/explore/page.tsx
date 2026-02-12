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
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
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
    <div className="max-w-[560px] md:max-w-4xl mx-auto px-0 md:px-4 py-4 bg-[var(--bg)] w-full min-h-screen">
      {pullY > 0 && (
        <div className="flex justify-center py-2 bg-[var(--bg)] sticky top-0 z-10" style={{ paddingTop: Math.min(pullY, 60) }}>
          <div className="w-7 h-7 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 mb-4">
        <Link
          href="/kerko"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-[14px] hover:border-[var(--text-secondary)] transition-colors shadow-[var(--shadow-sm)]"
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

      {/* Tab pills */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {[
          { key: 'postime', label: 'Postime' },
          { key: 'hashtag', label: 'Hashtag' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as 'postime' | 'hashtag')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
              activeTab === t.key
                ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hashtags grid */}
      {activeTab === 'hashtag' && (
        <div className="flex flex-wrap gap-2 px-4 mb-6">
          {hashtags.map((h) => (
            <Link
              key={h.tag}
              href={`/explore/hashtag/${h.tag}`}
              className="group px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] text-[13px] font-medium hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-all shadow-[var(--shadow-sm)]"
            >
              <span className="text-[var(--primary)] group-hover:font-semibold">#{h.tag}</span>
              <span className="text-[var(--text-muted)] ml-1.5">({h.count})</span>
            </Link>
          ))}
          {hashtags.length === 0 && !loading && (
            <p className="text-[14px] text-[var(--text-muted)] px-1">Nuk ka hashtag trending ende.</p>
          )}
        </div>
      )}

      {/* Posts grid */}
      {loading && activeTab === 'postime' ? (
        <div className="px-1 md:px-0">
          <ExploreGridSkeleton />
        </div>
      ) : error && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]">
            <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-[var(--text)] mb-1">{error}</p>
          <button type="button" onClick={() => loadExplore(1, false)} className="mt-4 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold hover:opacity-90 shadow-md shadow-[var(--primary)]/20 transition-opacity">
            Provo përsëri
          </button>
        </div>
      ) : activeTab === 'postime' ? (
        <>
          <div className="grid grid-cols-3 gap-1 px-1 md:px-0">
            {posts.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.25) }}
              >
                <Link
                  href={`/post/${post._id}`}
                  className="block aspect-square bg-[var(--border)] rounded-lg overflow-hidden relative group"
                >
                  <img src={post.media?.[0]?.url || ''} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-3 text-white text-[13px] font-semibold">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                        {post.likes?.length || 0}
                      </span>
                    </div>
                  </div>
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

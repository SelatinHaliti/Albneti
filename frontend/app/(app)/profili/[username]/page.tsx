'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { IconGrid } from '@/components/Icons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type User = {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  followers: unknown[];
  following: unknown[];
};

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  likes: string[];
  comments: unknown[];
  saved?: boolean;
};

type ProfileTab = 'postime' | 'ruajturat' | 'tagged' | 'arkivuara';

export default function ProfilePage() {
  const params = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<{ user: User; posts: Post[]; isFollowing: boolean; isOwnProfile: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('postime');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingTagged, setLoadingTagged] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [hasStory, setHasStory] = useState(false);

  useDocumentTitle(profile?.user?.username ? `@${profile.user.username}` : null);

  useEffect(() => {
    const username = params?.username as string;
    if (!username) return;
    (async () => {
      try {
        const res = await api<{ user: User; posts: Post[]; isFollowing: boolean; isOwnProfile: boolean }>(
          `/api/users/${username}`
        );
        setProfile(res);
        setFollowing(res.isFollowing);
      } catch (_) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.username]);

  useEffect(() => {
    if (tab !== 'ruajturat' || !currentUser) return;
    setLoadingSaved(true);
    api<{ posts: Post[] }>('/api/users/me/ruajturat')
      .then((r) => setSavedPosts(r.posts || []))
      .catch(() => setSavedPosts([]))
      .finally(() => setLoadingSaved(false));
  }, [tab, currentUser]);

  useEffect(() => {
    if (tab !== 'tagged' || !currentUser) return;
    setLoadingTagged(true);
    api<{ posts: Post[] }>('/api/users/me/tagged')
      .then((r) => setTaggedPosts(r.posts || []))
      .catch(() => setTaggedPosts([]))
      .finally(() => setLoadingTagged(false));
  }, [tab, currentUser]);

  useEffect(() => {
    if (tab !== 'arkivuara' || !currentUser) return;
    setLoadingArchived(true);
    api<{ posts: Post[] }>('/api/posts/arkivuara')
      .then((r) => setArchivedPosts(r.posts || []))
      .catch(() => setArchivedPosts([]))
      .finally(() => setLoadingArchived(false));
  }, [tab, currentUser]);

  useEffect(() => {
    if (!profile?.user || profile.isOwnProfile) return;
    api<{ stories: { user: { _id: string }; stories: unknown[] }[] }>('/api/stories')
      .then((r) => setHasStory(r.stories?.some((g) => g.user._id === profile.user._id) ?? false))
      .catch(() => setHasStory(false));
  }, [profile?.user?._id, profile?.isOwnProfile]);

  const toastError = useToastStore((s) => s.error);
  const handleFollow = async () => {
    if (!profile?.user || profile.isOwnProfile) return;
    const prevFollowing = following;
    setFollowing(!following);
    setProfile((p) =>
      p
        ? {
            ...p,
            user: {
              ...p.user,
              followers: following ? p.user.followers.slice(0, -1) : [...p.user.followers, {}],
            },
          }
        : null
    );
    try {
      await api(`/api/users/${profile.user._id}/ndiq`, { method: 'POST' });
    } catch (_) {
      setFollowing(prevFollowing);
      setProfile((p) =>
        p
          ? {
              ...p,
              user: {
                ...p.user,
                followers: prevFollowing ? [...p.user.followers, {}] : p.user.followers.slice(0, -1),
              },
            }
          : null
      );
      toastError('Nuk u ndryshua. Provo përsëri.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[935px] mx-auto px-4 py-8">
        <div className="flex gap-8 items-start">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[var(--border)] animate-shimmer flex-shrink-0" />
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-5 w-36 bg-[var(--border)] animate-shimmer rounded-lg" />
            <div className="flex gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-16 bg-[var(--border)] animate-shimmer rounded" />
              ))}
            </div>
            <div className="h-3 w-48 bg-[var(--border)] animate-shimmer rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-[var(--border)] animate-shimmer rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[935px] mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-sm)]">
          <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <p className="text-[16px] font-semibold text-[var(--text)]">Përdoruesi nuk u gjet</p>
        <p className="text-[14px] text-[var(--text-muted)] mt-1">Kjo faqe nuk ekziston ose është fshirë.</p>
        <Link href="/feed" className="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold hover:opacity-90 shadow-md shadow-[var(--primary)]/20 transition-opacity">
          Kthehu në feed
        </Link>
      </div>
    );
  }

  const { user, posts, isOwnProfile } = profile;
  const displayUser = isOwnProfile && currentUser
    ? {
        ...user,
        fullName: currentUser.fullName ?? user.fullName,
        bio: currentUser.bio ?? user.bio,
        website: currentUser.website ?? user.website,
        location: currentUser.location ?? user.location,
        avatar: currentUser.avatar ?? user.avatar,
      }
    : user;
  const displayPosts = tab === 'postime' ? posts : tab === 'ruajturat' ? savedPosts : tab === 'tagged' ? taggedPosts : archivedPosts;
  const showTabs = isOwnProfile;
  const isLoadingGrid = tab === 'ruajturat' ? loadingSaved : tab === 'tagged' ? loadingTagged : tab === 'arkivuara' ? loadingArchived : false;

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'postime', label: 'Postime' },
    ...(showTabs
      ? [
          { key: 'ruajturat' as ProfileTab, label: 'Të ruajturat' },
          { key: 'tagged' as ProfileTab, label: 'Etiketuar' },
          { key: 'arkivuara' as ProfileTab, label: 'Arkivuara' },
        ]
      : []),
  ];

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-center sm:items-start mb-8 sm:mb-10"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {hasStory && !isOwnProfile ? (
            <Link href={`/story/${user._id}`} className="block group">
              <div className="story-ring w-[88px] h-[88px] sm:w-[150px] sm:h-[150px] group-hover:opacity-90 transition-all">
                <div className="story-ring-inner">
                  <img
                    src={displayUser.avatar || ''}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayUser.username;
                    }}
                  />
                </div>
              </div>
            </Link>
          ) : (
            <img
              src={displayUser.avatar || ''}
              alt=""
              className="w-[88px] h-[88px] sm:w-[150px] sm:h-[150px] rounded-full object-cover ring-4 ring-[var(--bg)] shadow-[var(--shadow-md)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayUser.username;
              }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-5">
            <h1 className="text-[22px] sm:text-[28px] font-semibold text-[var(--text)] leading-tight">{user.username}</h1>
            {isOwnProfile ? (
              <Link
                href="/profili/redakto"
                className="px-5 py-2 rounded-xl text-[13px] font-semibold border border-[var(--border)] text-[var(--text)] bg-[var(--bg-card)] hover:bg-[var(--bg)] transition-colors shadow-[var(--shadow-sm)]"
              >
                Redakto profilin
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link
                  href={`/mesazhe/te-rinj?username=${encodeURIComponent(user.username)}`}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold border border-[var(--border)] text-[var(--text)] bg-[var(--bg-card)] hover:bg-[var(--bg)] transition-colors shadow-[var(--shadow-sm)]"
                >
                  Mesazh
                </Link>
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-xl text-[13px] font-semibold transition-all shadow-[var(--shadow-sm)] ${
                    following
                      ? 'border border-[var(--border)] text-[var(--text)] bg-[var(--bg-card)] hover:bg-[var(--bg)]'
                      : 'bg-[var(--primary)] text-white hover:opacity-90 shadow-md shadow-[var(--primary)]/20'
                  }`}
                >
                  {following ? 'Çndiq' : 'Ndiq'}
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-8 sm:gap-10 mb-5 justify-center sm:justify-start">
            {[
              { count: tab === 'postime' ? posts?.length || 0 : tab === 'ruajturat' ? savedPosts.length : taggedPosts.length, label: 'postime' },
              { count: user.followers?.length || 0, label: 'ndjekës' },
              { count: user.following?.length || 0, label: 'ndjek' },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <span className="text-[17px] font-bold text-[var(--text)] block">{stat.count}</span>
                <span className="text-[13px] text-[var(--text-muted)]">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Bio */}
          <div className="space-y-0.5">
            {displayUser.fullName && <p className="text-[14px] font-semibold text-[var(--text)]">{displayUser.fullName}</p>}
            {displayUser.bio && <p className="text-[14px] text-[var(--text)] leading-relaxed">{displayUser.bio}</p>}
            {displayUser.website && (
              <a
                href={/^https?:\/\//i.test(displayUser.website) ? displayUser.website : `https://${displayUser.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[var(--primary)] font-medium break-all hover:underline"
              >
                {displayUser.website}
              </a>
            )}
            {displayUser.location && (
              <p className="text-[13px] text-[var(--text-muted)] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {displayUser.location}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-t border-[var(--border)]">
        <div className="flex justify-center sm:justify-start">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative text-[12px] font-semibold py-4 px-5 uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? 'text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <motion.span
                  layoutId="profile-tab"
                  className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--text)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {isLoadingGrid ? (
          <div className="grid grid-cols-3 gap-1 py-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-[var(--border)] animate-shimmer rounded-lg" />
            ))}
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]">
              <span className="[&>svg]:w-8 [&>svg]:h-8 text-[var(--text-muted)]">
                <IconGrid />
              </span>
            </div>
            <p className="text-[15px] font-medium text-[var(--text)]">
              {tab === 'postime' && 'Ende nuk ka postime'}
              {tab === 'ruajturat' && 'Nuk keni postime të ruajtura'}
              {tab === 'tagged' && 'Nuk jeni etiketuar ende'}
              {tab === 'arkivuara' && 'Nuk keni postime të arkivuara'}
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              {tab === 'postime' && 'Kur të postoni, postimet tuaja shfaqen këtu.'}
              {tab === 'ruajturat' && 'Postimet që ruani shfaqen këtu.'}
              {tab === 'tagged' && 'Kur dikush t\'ju etiketojë, shfaqet këtu.'}
              {tab === 'arkivuara' && 'Postimet e arkivuara mund ti riktheni.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 py-1">
            {displayPosts.map((post) => (
              <Link
                key={post._id}
                href={`/post/${post._id}`}
                className="aspect-square block bg-[var(--border)] rounded-lg overflow-hidden relative group"
              >
                <img
                  src={post.media?.[0]?.url || ''}
                  alt=""
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-white text-[14px] font-semibold">
                    <span className="flex items-center gap-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      {post.likes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                      {(post.comments as unknown[])?.length || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

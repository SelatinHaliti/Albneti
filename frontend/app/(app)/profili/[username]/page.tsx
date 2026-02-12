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
      <div className="max-w-[935px] mx-auto px-4 py-6">
        <div className="flex gap-8 items-start">
          <div className="w-28 h-28 rounded-full bg-[var(--border)] animate-shimmer flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-4 w-32 bg-[var(--border)] animate-shimmer rounded" />
            <div className="flex gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-16 bg-[var(--border)] animate-shimmer rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-[var(--border)] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[935px] mx-auto px-4 py-16 text-center text-[var(--text-muted)]">
        <p>Përdoruesi nuk u gjet.</p>
        <Link href="/feed" className="text-[var(--primary)] mt-2 inline-block text-[14px] font-semibold">
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

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-start mb-6 sm:mb-8"
      >
        {hasStory && !isOwnProfile ? (
          <Link href={`/story/${user._id}`} className="flex-shrink-0 group">
            <div className="story-ring w-[77px] h-[77px] sm:w-[150px] sm:h-[150px] group-hover:opacity-90 transition-opacity">
              <div className="story-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
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
            className="w-[77px] h-[77px] sm:w-[150px] sm:h-[150px] rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--border)]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayUser.username;
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h1 className="text-[20px] sm:text-[28px] font-normal text-[var(--text)] leading-tight">{user.username}</h1>
            {isOwnProfile ? (
              <Link
                href="/profili/redakto"
                className="px-5 py-2 rounded-[8px] text-[14px] font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
              >
                Redakto profilin
              </Link>
            ) : (
              <>
                <Link
                  href={`/mesazhe/te-rinj?username=${encodeURIComponent(user.username)}`}
                  className="px-5 py-2 rounded-[8px] text-[14px] font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                >
                  Mesazh
                </Link>
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`px-5 py-2 rounded-[8px] text-[14px] font-semibold transition-colors ${following ? 'border border-[var(--border)] text-[var(--text)] bg-[var(--bg)] hover:bg-[var(--border)]' : 'bg-[var(--primary)] text-white hover:opacity-90'}`}
                >
                  {following ? 'Çndiq' : 'Ndiq'}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-8 sm:gap-10 mb-4 text-[14px]">
            <span className="text-[var(--text)]">
              <strong className="font-semibold">{tab === 'postime' ? posts?.length || 0 : tab === 'ruajturat' ? savedPosts.length : taggedPosts.length}</strong>
              <span className="text-[var(--text-muted)] font-normal"> postime</span>
            </span>
            <span className="text-[var(--text)]">
              <strong className="font-semibold">{user.followers?.length || 0}</strong>
              <span className="text-[var(--text-muted)] font-normal"> ndjekës</span>
            </span>
            <span className="text-[var(--text)]">
              <strong className="font-semibold">{user.following?.length || 0}</strong>
              <span className="text-[var(--text-muted)] font-normal"> ndjek</span>
            </span>
          </div>
          {displayUser.fullName && <p className="text-[14px] font-semibold text-[var(--text)]">{displayUser.fullName}</p>}
          {displayUser.bio && <p className="text-[14px] text-[var(--text)] mt-0.5">{displayUser.bio}</p>}
          {displayUser.website && (
            <a
              href={/^https?:\/\//i.test(displayUser.website) ? displayUser.website : `https://${displayUser.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-[var(--primary)] block mt-0.5 break-all"
            >
              {displayUser.website}
            </a>
          )}
          {displayUser.location && <p className="text-[14px] text-[var(--text)] mt-0.5">{displayUser.location}</p>}
        </div>
      </motion.div>

      <div className="border-t border-[var(--border)]">
        {showTabs && (
          <div className="flex gap-0">
            <button
              type="button"
              onClick={() => setTab('postime')}
              className={`text-[12px] font-semibold py-4 px-4 -mb-px border-t-2 border-transparent uppercase tracking-wider transition-colors ${
                tab === 'postime'
                  ? 'border-[var(--text)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Postime
            </button>
            <button
              type="button"
              onClick={() => setTab('ruajturat')}
              className={`text-[12px] font-semibold py-4 px-4 -mb-px border-t-2 border-transparent uppercase tracking-wider transition-colors ${
                tab === 'ruajturat'
                  ? 'border-[var(--text)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Të ruajturat
            </button>
            <button
              type="button"
              onClick={() => setTab('tagged')}
              className={`text-[12px] font-semibold py-4 px-4 -mb-px border-t-2 border-transparent uppercase tracking-wider transition-colors ${
                tab === 'tagged'
                  ? 'border-[var(--text)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Të etiketuarat
            </button>
            <button
              type="button"
              onClick={() => setTab('arkivuara')}
              className={`text-[12px] font-semibold py-4 px-4 -mb-px border-t-2 border-transparent uppercase tracking-wider transition-colors ${
                tab === 'arkivuara'
                  ? 'border-[var(--text)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Arkivuara
            </button>
          </div>
        )}
        {!showTabs && (
          <div className="flex gap-0">
            <button type="button" className="text-[12px] font-semibold text-[var(--text)] border-t-2 border-[var(--text)] py-4 px-4 -mb-px uppercase tracking-wider">
              Postime
            </button>
          </div>
        )}

        {isLoadingGrid ? (
          <div className="grid grid-cols-3 gap-px sm:gap-0.5 py-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-[var(--border)] animate-shimmer" />
            ))}
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <span className="mb-3 text-[var(--text-muted)] [&>svg]:w-16 [&>svg]:h-16">
              <IconGrid />
            </span>
            <p className="text-sm font-medium">
              {tab === 'postime' && 'Ende nuk ka postime'}
              {tab === 'ruajturat' && 'Nuk keni postime të ruajtura'}
              {tab === 'tagged' && 'Nuk jeni etiketuar ende'}
              {tab === 'arkivuara' && 'Nuk keni postime të arkivuara'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px sm:gap-0.5">
            {displayPosts.map((post) => (
              <Link key={post._id} href={`/post/${post._id}`} className="aspect-square block bg-black">
                <img
                  src={post.media?.[0]?.url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

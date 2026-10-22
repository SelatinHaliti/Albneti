'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';

type StoryGroup = { user: { _id: string; username: string; avatar?: string; fullName?: string }; stories: { _id: string; mediaUrl: string; type: string }[]; hasCloseFriendsOnly?: boolean };

type StoryRingProps = {
  groups: StoryGroup[];
  currentUserId?: string;
};

export function StoryRing({ groups, currentUserId }: StoryRingProps) {
  const me = useAuthStore((s) => s.user);
  const ownGroup = currentUserId ? groups.find((g) => g.user._id === currentUserId) : null;
  const others = currentUserId ? groups.filter((g) => g.user._id !== currentUserId) : groups;

  return (
    <div className="flex gap-4 overflow-x-auto py-3 px-4 scrollbar-hide">
      {/* Storya ime – si Instagram: së pari, + ose shiko */}
      {currentUserId && (
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          {ownGroup ? (
            <Link href={`/story/${ownGroup.user._id}`} className="group">
              <div className="story-ring group-hover:opacity-90 transition-opacity">
                <div className="story-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={ownGroup.user.avatar || ''}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + ownGroup.user.username;
                    }}
                  />
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/krijo/story" className="story-add" aria-label="Shto story">
              <img
                src={me?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.username || 'albnet'}`}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (me?.username || 'albnet');
                }}
              />
              <span className="story-add__plus" aria-hidden>+</span>
            </Link>
          )}
          <span className="text-[12px] text-[var(--text)] truncate max-w-[74px] leading-tight text-center">
            {ownGroup ? 'Storya të mia' : 'Shto story'}
          </span>
        </div>
      )}

      {others.map((group) => (
        <Link
          key={group.user._id}
          href={`/story/${group.user._id}`}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
        >
          <div className={`story-ring group-hover:opacity-90 transition-opacity ${group.hasCloseFriendsOnly ? 'story-ring--close-friends' : ''}`}>
            <div className="story-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={group.user.avatar || ''}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + group.user.username;
                }}
              />
            </div>
          </div>
          <span className="text-[12px] text-[var(--text)] truncate max-w-[74px] leading-tight text-center">
            {group.user.username}
          </span>
        </Link>
      ))}
    </div>
  );
}

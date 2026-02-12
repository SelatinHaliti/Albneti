'use client';

import Link from 'next/link';

type StoryGroup = {
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  stories: { _id: string; mediaUrl: string; type: string }[];
};

type StoryRingProps = {
  groups: StoryGroup[];
  currentUserId?: string;
};

export function StoryRing({ groups, currentUserId }: StoryRingProps) {
  const ownGroup = currentUserId ? groups.find((g) => g.user._id === currentUserId) : null;
  const others = currentUserId ? groups.filter((g) => g.user._id !== currentUserId) : groups;

  return (
    <div className="flex gap-6 overflow-x-auto py-4 px-5 bg-[var(--bg-card)] scrollbar-hide">
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
            <Link
              href="/krijo/story"
              className="flex flex-col items-center justify-center w-[66px] h-[66px] rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text-muted)] transition-colors"
            >
              <span className="text-2xl text-[var(--text-muted)] leading-none">+</span>
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
          <div className="story-ring group-hover:opacity-90 transition-opacity">
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

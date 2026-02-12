'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-[var(--border)] rounded ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <div className={`animate-shimmer bg-[var(--border)] rounded-full ${className}`} aria-hidden />;
}

export function SkeletonPostBlock() {
  return (
    <div className="post-block overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <SkeletonCircle className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="aspect-square w-full" />
    </div>
  );
}

export function SkeletonStoryRing() {
  return (
    <div className="flex gap-5 overflow-hidden py-4 px-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <SkeletonCircle className="w-[66px] h-[66px]" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { PostCard } from '@/components/PostCard';

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  likes: string[];
  comments: unknown[];
};

export default function HashtagPage() {
  const params = useParams();
  const tag = (params?.tag as string)?.replace(/^#/, '') || '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;
    (async () => {
      try {
        const res = await api<{ posts: Post[] }>(`/api/explore/hashtag/${encodeURIComponent(tag)}`);
        setPosts(res.posts || []);
      } catch (_) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tag]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explore" className="text-primary-500 text-sm mb-4 inline-block">← Eksploro</Link>
      <h1 className="text-2xl font-bold dark:text-white mb-6">#{tag}</h1>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Nuk u gjetën postime për këtë hashtag.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { PostCard } from '@/components/PostCard';
import { ReportButton } from '@/components/ReportButton';
import { IconHeart } from '@/components/Icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Comment = {
  _id: string;
  user: { _id?: string; username: string; avatar?: string };
  text: string;
  likes: string[];
};

type Post = {
  _id: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string };
  type: string;
  media: { url: string; type: string }[];
  caption: string;
  hashtags?: string[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
  saved?: boolean;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useAuthStore((s) => s.user);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useDocumentTitle(post ? `@${post.user?.username}` : 'Postimi');

  const fetchPost = async () => {
    if (!id) return;
    try {
      const res = await api<{ post: Post }>(`/api/posts/${id}`);
      setPost(res.post);
    } catch (_) {
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPost();
  }, [id]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api<{ comment: Comment }>(`/api/posts/${id}/koment`, {
        method: 'POST',
        body: { text: commentText },
      });
      setPost((p) =>
        p ? { ...p, comments: [...(p.comments || []), res.comment] } : null
      );
      setCommentText('');
    } catch (_) {}
    setSubmitting(false);
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!post || !user) return;
    try {
      const res = await api<{ liked: boolean; likesCount: number }>(
        `/api/posts/${id}/koment/${commentId}/pelqim`,
        { method: 'POST' }
      );
      setPost((p) => {
        if (!p) return null;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c._id === commentId
              ? {
                  ...c,
                  likes: res.liked
                    ? [...(c.likes || []), user.id]
                    : (c.likes || []).filter((lid) => lid !== user.id),
                }
              : c
          ),
        };
      });
    } catch (_) {}
  };

  const isPostOwner = !!user && !!post && post.user?._id === user.id;

  const handleEditOpen = () => {
    setEditCaption(post?.caption ?? '');
    setEditHashtags((post?.hashtags ?? []).join(', '));
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editSaving || !id) return;
    setEditSaving(true);
    try {
      await api(`/api/posts/${id}`, {
        method: 'PUT',
        body: {
          caption: editCaption,
          hashtags: editHashtags.trim() ? editHashtags.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean) : [],
        },
      });
      setShowEditModal(false);
      fetchPost();
    } catch (_) {}
    setEditSaving(false);
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await api(`/api/posts/${id}/arkivo`, { method: 'PUT' });
      router.push(post?.user?.username ? `/profili/${post.user.username}` : '/profili/redakto');
    } catch (_) {}
  };

  const handleDelete = async () => {
    if (!id || !confirm('A jeni të sigurt që dëshironi ta fshini këtë postim? Ky veprim nuk mund të zhbëhet.')) return;
    try {
      await api(`/api/posts/${id}`, { method: 'DELETE' });
      router.push('/feed');
    } catch (_) {}
  };

  const deleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await api(`/api/posts/${id}/koment/${commentId}`, { method: 'DELETE' });
      setPost((p) => (p ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) } : null));
    } catch (_) {}
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditingCommentText(c.text);
  };

  const saveEditComment = async () => {
    if (!id || !editingCommentId || editingCommentText.trim() === '') return;
    try {
      const res = await api<{ comment: Comment }>(`/api/posts/${id}/koment/${editingCommentId}`, {
        method: 'PUT',
        body: { text: editingCommentText },
      });
      setPost((p) =>
        p
          ? {
              ...p,
              comments: p.comments.map((c) => (c._id === editingCommentId ? res.comment : c)),
            }
          : null
      );
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="max-w-[470px] mx-auto px-0 py-0">
        <div className="post-block">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[var(--border)] animate-shimmer" />
            <div className="h-3 w-24 rounded bg-[var(--border)] animate-shimmer" />
          </div>
          <div className="aspect-square bg-[var(--border)] animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-[470px] mx-auto px-4 py-16 text-center text-[var(--text-muted)]">
        <p>Postimi nuk u gjet.</p>
        <Link href="/feed" className="text-[var(--primary)] mt-2 inline-block text-sm font-semibold">
          Kthehu në feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[470px] mx-auto bg-[var(--bg)]">
      <PostCard
        post={post}
        isOwner={isPostOwner}
        onEdit={handleEditOpen}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEditModal(false)}>
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-[400px] bg-[var(--bg-card)] rounded-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Redakto postimin</h3>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Përshkrimi</label>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              maxLength={2200}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] resize-none"
              placeholder="Shto një përshkrim..."
            />
            <label className="block text-sm font-medium text-[var(--text-muted)] mt-3 mb-1">Hashtag (të ndara me presje)</label>
            <input
              type="text"
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)]"
              placeholder="albnet, foto"
            />
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)]">
                Anulo
              </button>
              <button type="submit" disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold disabled:opacity-50">
                {editSaving ? 'Duke ruajtur...' : 'Ruaj'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Komentet - stil Instagram, pa kartë të veçantë */}
      <div className="post-block border-t-0 -mt-px">
        <div className="px-[14px] py-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--text-muted)]">
            Komentet ({post.comments?.length || 0})
          </h3>
          {user && <ReportButton reportedPost={post._id} className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]" />}
        </div>
        <div className="px-[14px] max-h-72 overflow-y-auto space-y-3 scrollbar-hide">
          {post.comments?.map((c) => {
            const commentLiked = user && (c.likes || []).includes(user.id);
            const canModifyComment = user && (post.user?._id === user.id || c.user?._id === user.id);
            const isEditing = editingCommentId === c._id;
            return (
              <div key={c._id} className="flex gap-3 py-1">
                <Link href={`/profili/${c.user?.username}`} className="flex-shrink-0">
                  <img
                    src={c.user?.avatar || ''}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover bg-[var(--border)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + c.user?.username;
                    }}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={saveEditComment} className="text-xs font-semibold text-[var(--primary)]">
                          Ruaj
                        </button>
                        <button type="button" onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} className="text-xs text-[var(--text-muted)]">
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--text)]">
                        <Link href={`/profili/${c.user?.username}`} className="font-semibold mr-1.5">
                          {c.user?.username}
                        </Link>
                        {c.text}
                      </p>
                      {c.likes?.length > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">{c.likes.length} pelqime</span>
                      )}
                    </>
                  )}
                </div>
                {user && !isEditing && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(c._id)}
                      className={`p-1 ${commentLiked ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}
                      aria-label={commentLiked ? 'Hiq pelqimin' : 'Pelqej'}
                    >
                      <IconHeart filled={!!commentLiked} />
                    </button>
                    {canModifyComment && (
                      <div className="flex items-center">
                        {String(c.user?._id) === user.id && (
                          <button type="button" onClick={() => startEditComment(c)} className="p-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
                            Ndrysho
                          </button>
                        )}
                        <button type="button" onClick={() => deleteComment(c._id)} className="p-1 text-xs text-[var(--danger)]">
                          Fshi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {user && (
          <form onSubmit={submitComment} className="flex items-center gap-2 px-[14px] py-3 border-t border-[var(--border)]">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Shto një koment..."
              className="flex-1 py-2 bg-transparent text-[14px] text-[var(--text)] placeholder-[var(--text-muted)] border-0 focus:ring-0"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="text-[14px] font-semibold text-[var(--primary)] disabled:opacity-50"
            >
              Dërgo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

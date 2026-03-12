import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Post, PostImageItem, Note } from '../types';
import { postsApi } from '../lib/api';
import { Header } from '../components/Header';
import { PostForm, PostFormValues } from '../components/PostForm';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId || isNaN(postId)) {
      navigate('/chadam', { replace: true });
      return;
    }

    postsApi
      .getById(postId)
      .then((data) => {
        if (data.userId !== user?.id && !isAdmin) {
          toast.error('수정 권한이 없습니다.');
          navigate(`/chadam/${postId}`, { replace: true });
          return;
        }
        setPost(data);
      })
      .catch(() => {
        toast.error('게시글을 불러오는 데 실패했습니다.');
        navigate('/chadam', { replace: true });
      })
      .finally(() => setIsLoadingPost(false));
  }, [postId, user, isAdmin, navigate]);

  if (isLoadingPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) return null;

  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    try {
      await postsApi.update(postId, {
        ...values,
        isPinned: isAdmin ? values.isPinned : undefined,
        sponsorNote: values.isSponsored ? values.sponsorNote.trim() || undefined : undefined,
        taggedNoteIds: values.taggedNoteIds,
      });
      toast.success('게시글이 수정되었습니다.');
      navigate(`/chadam/${postId}`, { replace: true });
    } catch {
      toast.error('게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialTaggedNotes = (post.taggedNotes ?? []).map((n: Note) => ({
    id: n.id,
    teaName: n.teaName,
    overallRating: n.overallRating,
  }));

  const initialImages: PostImageItem[] = (post.images ?? []).map((img) => ({
    url: img.url,
    thumbnailUrl: img.thumbnailUrl ?? undefined,
    caption: img.caption ?? undefined,
  }));

  return (
    <div className="min-h-screen">
      <Header showBack title="게시글 수정" showProfile />
      <PostForm
        mode="edit"
        initialValues={{
          title: post.title,
          content: post.content,
          category: post.category,
          isAnonymous: post.isAnonymous ?? false,
          isPinned: post.isPinned ?? false,
          isSponsored: post.isSponsored,
          sponsorNote: post.sponsorNote ?? '',
          images: initialImages,
          taggedNotes: initialTaggedNotes,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

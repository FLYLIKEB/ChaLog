import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi } from '../lib/api';
import { Header } from '../components/Header';
import { PostForm, PostFormValues } from '../components/PostForm';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function NewPost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    try {
      const post = await postsApi.create({
        ...values,
        isPinned: values.isPinned || undefined,
        sponsorNote: values.isSponsored ? values.sponsorNote.trim() || undefined : undefined,
        images: values.images.length > 0 ? values.images : undefined,
        taggedNoteIds: values.taggedNoteIds.length > 0 ? values.taggedNoteIds : undefined,
      });
      toast.success('게시글이 작성되었습니다.');
      navigate(`/chadam/${post.id}`, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.error(msg && typeof msg === 'string' ? msg : '게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="새 게시글" showProfile showLogo />
      <PostForm mode="create" onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Post, PostCategory, POST_CATEGORY_LABELS } from '../types';
import { postsApi } from '../lib/api';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';

const CATEGORIES: PostCategory[] = ['brewing_question', 'recommendation', 'tool', 'tea_room_review'];

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('brewing_question');
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorNote, setSponsorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId || isNaN(postId)) {
      navigate('/chadam', { replace: true });
      return;
    }

    const fetchPost = async () => {
      try {
        const data = await postsApi.getById(postId);
        if (data.userId !== user?.id) {
          toast.error('수정 권한이 없습니다.');
          navigate(`/chadam/${postId}`, { replace: true });
          return;
        }
        setPost(data);
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setIsSponsored(data.isSponsored);
        setSponsorNote(data.sponsorNote ?? '');
      } catch {
        toast.error('게시글을 불러오는 데 실패했습니다.');
        navigate('/chadam', { replace: true });
      } finally {
        setIsLoadingPost(false);
      }
    };

    fetchPost();
  }, [postId, user, navigate]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(undefined);
    return () => registerRefresh(undefined);
  }, [registerRefresh]);

  if (isLoadingPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await postsApi.update(postId, {
        title: title.trim(),
        content: content.trim(),
        category,
        isSponsored,
        sponsorNote: isSponsored ? sponsorNote.trim() || undefined : undefined,
      });
      toast.success('게시글이 수정되었습니다.');
      navigate(`/chadam/${postId}`, { replace: true });
    } catch {
      toast.error('게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="게시글 수정" showProfile />

      <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-5">
        {/* 카테고리 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  category === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {POST_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="edit-title">
            제목 <span className="text-destructive">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={200}
            className={cn(
              'w-full text-sm border border-border rounded-lg px-3 py-2.5',
              'focus:outline-none focus:ring-2 focus:ring-ring bg-background',
              'placeholder:text-muted-foreground',
            )}
          />
          <span className="text-xs text-muted-foreground text-right">{title.length}/200</span>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="edit-content">
            내용 <span className="text-destructive">*</span>
          </label>
          <textarea
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={8}
            className={cn(
              'w-full text-sm border border-border rounded-lg px-3 py-2.5 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-ring bg-background',
              'placeholder:text-muted-foreground',
            )}
          />
        </div>

        {/* 광고/협찬 */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSponsored}
              onChange={(e) => setIsSponsored(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">광고/협찬 게시글</span>
          </label>

          {isSponsored && (
            <input
              type="text"
              value={sponsorNote}
              onChange={(e) => setSponsorNote(e.target.value)}
              placeholder="협찬 다실 또는 내용을 입력하세요 (선택)"
              maxLength={300}
              className={cn(
                'w-full text-sm border border-border rounded-lg px-3 py-2.5',
                'focus:outline-none focus:ring-2 focus:ring-ring bg-background',
                'placeholder:text-muted-foreground',
              )}
            />
          )}
        </div>

        {/* 제출 버튼 */}
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              수정 중...
            </>
          ) : (
            '게시글 수정'
          )}
        </Button>
      </form>
    </div>
  );
}

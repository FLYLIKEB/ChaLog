import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PostCategory, POST_CATEGORY_LABELS } from '../types';
import { postsApi, CreatePostRequest } from '../lib/api';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';

const CATEGORIES: PostCategory[] = ['brewing_question', 'recommendation', 'tool', 'tea_room_review'];

export function NewPost() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('brewing_question');
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorNote, setSponsorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    const dto: CreatePostRequest = {
      title: title.trim(),
      content: content.trim(),
      category,
      isSponsored,
      sponsorNote: isSponsored ? sponsorNote.trim() || undefined : undefined,
    };

    setIsSubmitting(true);
    try {
      const post = await postsApi.create(dto);
      toast.success('게시글이 작성되었습니다.');
      navigate(`/community/${post.id}`, { replace: true });
    } catch {
      toast.error('게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(undefined);
    return () => registerRefresh(undefined);
  }, [registerRefresh]);

  return (
    <div className="min-h-screen">
      <Header showBack title="새 게시글" showProfile showLogo />

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
          <label className="text-sm font-medium text-foreground" htmlFor="title">
            제목 <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
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
          <label className="text-sm font-medium text-foreground" htmlFor="content">
            내용 <span className="text-destructive">*</span>
          </label>
          <textarea
            id="content"
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
              placeholder="협찬 브랜드 또는 내용을 입력하세요 (선택)"
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
              작성 중...
            </>
          ) : (
            '게시글 작성'
          )}
        </Button>
      </form>
    </div>
  );
}

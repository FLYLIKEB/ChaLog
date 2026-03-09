import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PostCategory, POST_CATEGORY_LABELS, PostImageItem } from '../types';
import { postsApi, CreatePostRequest } from '../lib/api';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { PostImageUploader } from '../components/PostImageUploader';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';

type WriteGroupKey = 'qna' | 'review' | 'announcement' | 'report';

const WRITE_GROUPS: Array<{
  key: WriteGroupKey;
  label: string;
  categories: Array<{ value: PostCategory; label: string; hint?: string }>;
}> = [
  {
    key: 'qna',
    label: '질문·토론',
    categories: [
      { value: 'brewing_question', label: POST_CATEGORY_LABELS.brewing_question, hint: '우림법, 온도, 시간 등' },
      { value: 'recommendation', label: POST_CATEGORY_LABELS.recommendation, hint: '차 추천 요청' },
      { value: 'tool', label: POST_CATEGORY_LABELS.tool, hint: '도구·기구 관련' },
    ],
  },
  {
    key: 'review',
    label: '리뷰',
    categories: [{ value: 'tea_room_review', label: POST_CATEGORY_LABELS.tea_room_review }],
  },
  {
    key: 'announcement',
    label: '공지',
    categories: [{ value: 'announcement', label: POST_CATEGORY_LABELS.announcement }],
  },
  {
    key: 'report',
    label: '제보',
    categories: [{ value: 'bug_report', label: POST_CATEGORY_LABELS.bug_report }],
  },
];

export function NewPost() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<WriteGroupKey>('qna');
  const [category, setCategory] = useState<PostCategory>('brewing_question');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorNote, setSponsorNote] = useState('');
  const [images, setImages] = useState<PostImageItem[]>([]);
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
      isAnonymous,
      isPinned: isAdmin ? isPinned : undefined,
      isSponsored,
      sponsorNote: isSponsored ? sponsorNote.trim() || undefined : undefined,
      images: images.length > 0 ? images : undefined,
    };

    setIsSubmitting(true);
    try {
      const post = await postsApi.create(dto);
      toast.success('게시글이 작성되었습니다.');
      navigate(`/chadam/${post.id}`, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.error(msg && typeof msg === 'string' ? msg : '게시글 작성에 실패했습니다.');
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
        {/* 카테고리 선택 (2단계) */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">어떤 주제인가요?</label>
          <div className="flex flex-wrap gap-2">
            {WRITE_GROUPS.filter((g) => g.key !== 'announcement' || isAdmin).map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => {
                  setSelectedGroup(g.key);
                  setCategory(g.categories[0].value);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  selectedGroup === g.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">세부 주제</span>
            <div className="flex flex-wrap gap-2">
              {WRITE_GROUPS.find((g) => g.key === selectedGroup)?.categories.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  title={hint}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                    category === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
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

        {/* 사진 */}
        <PostImageUploader images={images} onChange={setImages} maxImages={5} />

        {/* 공지 고정 (관리자만) */}
        {isAdmin && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium text-foreground">공지로 고정</span>
            </label>
          </div>
        )}

        {/* 익명 */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">익명으로 작성</span>
          </label>
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

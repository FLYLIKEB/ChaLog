import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Post, PostCategory, POST_CATEGORY_LABELS, PostImageItem } from '../types';
import { postsApi } from '../lib/api';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { PostImageUploader } from '../components/PostImageUploader';
import { useAuth } from '../contexts/AuthContext';
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

function getGroupFromCategory(cat: PostCategory): WriteGroupKey {
  const g = WRITE_GROUPS.find((group) => group.categories.some((c) => c.value === cat));
  return g?.key ?? 'qna';
}

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
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
        setSelectedGroup(getGroupFromCategory(data.category));
        setIsAnonymous(data.isAnonymous ?? false);
        setIsPinned(data.isPinned ?? false);
        setIsSponsored(data.isSponsored);
        setSponsorNote(data.sponsorNote ?? '');
        setImages(
          (data.images ?? []).map((img) => ({
            url: img.url,
            thumbnailUrl: img.thumbnailUrl ?? undefined,
            caption: img.caption ?? undefined,
          })),
        );
      } catch {
        toast.error('게시글을 불러오는 데 실패했습니다.');
        navigate('/chadam', { replace: true });
      } finally {
        setIsLoadingPost(false);
      }
    };

    fetchPost();
  }, [postId, user, navigate]);

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
        isAnonymous,
        isPinned: isAdmin ? isPinned : undefined,
        isSponsored,
        sponsorNote: isSponsored ? sponsorNote.trim() || undefined : undefined,
        images,
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
        {/* 카테고리 선택 (등록과 동일한 2단계) */}
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
          <label className="text-sm font-medium text-foreground" htmlFor="edit-title">
            제목 <span className="text-destructive">*</span>
          </label>
          <Input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={200}
          />
          <span className="text-xs text-muted-foreground text-right">{title.length}/200</span>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="edit-content">
            내용 <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={8}
          />
        </div>

        {/* 사진 */}
        <PostImageUploader images={images} onChange={setImages} maxImages={5} />

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
            <Input
              type="text"
              value={sponsorNote}
              onChange={(e) => setSponsorNote(e.target.value)}
              placeholder="협찬 다실 또는 내용을 입력하세요 (선택)"
              maxLength={300}
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

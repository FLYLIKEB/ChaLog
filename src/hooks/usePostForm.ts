import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostCategory, POST_CATEGORY_LABELS, PostImageItem } from '../types';
import { postsApi, CreatePostRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export type WriteGroupKey = 'qna' | 'review' | 'announcement' | 'report';

export const WRITE_GROUPS: Array<{
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
      { value: 'discussion', label: POST_CATEGORY_LABELS.discussion, hint: '자유 주제 토론' },
    ],
  },
  {
    key: 'review',
    label: '리뷰',
    categories: [
      { value: 'tea_review', label: POST_CATEGORY_LABELS.tea_review, hint: '차 시음 후기' },
      { value: 'tool_review', label: POST_CATEGORY_LABELS.tool_review, hint: '다기·도구 후기' },
      { value: 'tea_room_review', label: POST_CATEGORY_LABELS.tea_room_review, hint: '찻집·카페 방문기' },
    ],
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

export function getGroupFromCategory(cat: PostCategory): WriteGroupKey {
  const g = WRITE_GROUPS.find((group) => group.categories.some((c) => c.value === cat));
  return g?.key ?? 'qna';
}

interface UsePostFormOptions {
  mode: 'new';
}

interface UsePostFormEditOptions {
  mode: 'edit';
  postId: number;
}

type UsePostFormParams = UsePostFormOptions | UsePostFormEditOptions;

export interface UsePostFormReturn {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  selectedGroup: WriteGroupKey;
  setSelectedGroup: React.Dispatch<React.SetStateAction<WriteGroupKey>>;
  category: PostCategory;
  setCategory: React.Dispatch<React.SetStateAction<PostCategory>>;
  isAnonymous: boolean;
  setIsAnonymous: React.Dispatch<React.SetStateAction<boolean>>;
  isPinned: boolean;
  setIsPinned: React.Dispatch<React.SetStateAction<boolean>>;
  isSponsored: boolean;
  setIsSponsored: React.Dispatch<React.SetStateAction<boolean>>;
  sponsorNote: string;
  setSponsorNote: React.Dispatch<React.SetStateAction<string>>;
  images: PostImageItem[];
  setImages: React.Dispatch<React.SetStateAction<PostImageItem[]>>;
  isSubmitting: boolean;
  isLoadingPost: boolean;
  taggedNoteIds: number[];
  setTaggedNoteIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function usePostForm(params: UsePostFormParams): UsePostFormReturn {
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
  const [isLoadingPost, setIsLoadingPost] = useState(params.mode === 'edit');
  const [taggedNoteIds, setTaggedNoteIds] = useState<number[]>([]);

  const editPostId = params.mode === 'edit' ? params.postId : null;

  useEffect(() => {
    if (editPostId === null) return;

    if (!editPostId || isNaN(editPostId)) {
      navigate('/chadam', { replace: true });
      return;
    }

    const fetchPost = async () => {
      try {
        const data = await postsApi.getById(editPostId);
        if (data.userId !== user?.id) {
          toast.error('수정 권한이 없습니다.');
          navigate(`/chadam/${editPostId}`, { replace: true });
          return;
        }
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
  }, [editPostId, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (params.mode === 'new') {
        const dto: CreatePostRequest = {
          title: title.trim(),
          content: content.trim(),
          category,
          isAnonymous,
          isPinned: isAdmin ? isPinned : undefined,
          isSponsored,
          sponsorNote: isSponsored ? sponsorNote.trim() || undefined : undefined,
          images: images.length > 0 ? images : undefined,
          taggedNoteIds: taggedNoteIds.length > 0 ? taggedNoteIds : undefined,
        };
        const post = await postsApi.create(dto);
        toast.success('게시글이 작성되었습니다.');
        navigate(`/chadam/${post.id}`, { replace: true });
      } else {
        const { postId } = params;
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
      }
    } catch (err: unknown) {
      if (params.mode === 'new') {
        const msg = (err as { message?: string })?.message;
        toast.error(msg && typeof msg === 'string' ? msg : '게시글 작성에 실패했습니다.');
      } else {
        toast.error('게시글 수정에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    content,
    setContent,
    selectedGroup,
    setSelectedGroup,
    category,
    setCategory,
    isAnonymous,
    setIsAnonymous,
    isPinned,
    setIsPinned,
    isSponsored,
    setIsSponsored,
    sponsorNote,
    setSponsorNote,
    images,
    setImages,
    isSubmitting,
    isLoadingPost,
    taggedNoteIds,
    setTaggedNoteIds,
    handleSubmit,
  };
}

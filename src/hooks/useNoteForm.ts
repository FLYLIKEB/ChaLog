import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesApi } from '../lib/api';
import { Note, RatingSchema, RatingAxis } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_MIN, RATING_MAX, NAVIGATION_DELAY } from '../constants';
import { useTeaSelector } from './useTeaSelector';

interface UseNoteFormOptions {
  mode: 'new' | 'edit';
  noteId?: number;
  preselectedTeaId?: number | null;
  isSampleMode?: boolean;
}

export function useNoteForm({
  mode,
  noteId,
  preselectedTeaId,
  isSampleMode = false,
}: UseNoteFormOptions) {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

  const teaSelector = useTeaSelector(
    isSampleMode ? undefined : preselectedTeaId ?? undefined,
  );

  const [schemas, setSchemas] = useState<RatingSchema[]>([]);
  const [pinnedSchemaIds, setPinnedSchemaIds] = useState<number[]>([]);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<number[]>([]);
  const [axes, setAxes] = useState<RatingAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number | null>(() =>
    isSampleMode ? RATING_DEFAULT : null,
  );
  const [memo, setMemo] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageThumbnails, setImageThumbnails] = useState<(string | null)[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);

  // edit-only state
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [note, setNote] = useState<Note | null>(null);

  const initialSchemaSet = useRef(false);

  const SAMPLE_TEA_ID = -1;
  const selectedTea = isSampleMode ? SAMPLE_TEA_ID : teaSelector.selectedTea;

  const defaultSchema = schemas.length > 0 ? schemas[0] : null;

  // Fetch schemas
  useEffect(() => {
    const shouldFetch = mode === 'edit' || overallRating !== null;
    if (!shouldFetch) return;

    const fetchSchemas = async () => {
      try {
        const res = await notesApi.getActiveSchemas();
        const list = res?.schemas ?? [];
        const pinned = res?.pinnedSchemaIds ?? [];
        if (list.length > 0) {
          setSchemas(list);
          setPinnedSchemaIds(pinned);
        } else {
          logger.error('No active schema found');
          toast.error('활성 평가 스키마를 찾을 수 없습니다.');
        }
      } catch (error) {
        logger.error('Failed to fetch schemas:', error);
        toast.error('평가 스키마를 불러오는데 실패했습니다.');
      }
    };
    fetchSchemas();
  }, [mode === 'new' ? overallRating : 'edit']);

  // Fetch note data for edit mode
  useEffect(() => {
    if (mode !== 'edit') return;
    if (isAuthLoading) return;

    if (!isAuthenticated || !user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!noteId || isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      navigate('/my-notes');
      return;
    }

    const fetchNote = async () => {
      try {
        setIsLoading(true);
        const noteData = await notesApi.getById(noteId);
        const normalizedNote = noteData as Note;

        if (normalizedNote.userId !== user.id) {
          toast.error('이 차록을 수정할 권한이 없습니다.');
          navigate(`/note/${noteId}`);
          return;
        }

        setNote(normalizedNote);
        teaSelector.selectTea(normalizedNote.teaId, normalizedNote.teaName);
        setOverallRating(normalizedNote.overallRating ?? null);

        const noteSchemaIds = (normalizedNote as Note & { schemaIds?: number[] }).schemaIds;
        const schemaIdsToLoad =
          noteSchemaIds && noteSchemaIds.length > 0
            ? noteSchemaIds
            : normalizedNote.schema
              ? [normalizedNote.schema.id]
              : [];

        if (schemaIdsToLoad.length > 0) {
          setSelectedSchemaIds(schemaIdsToLoad);

          try {
            const axesBySchema = await Promise.all(
              schemaIdsToLoad.map(async (schemaId) => {
                const axesData = (await notesApi.getSchemaAxes(schemaId)) as RatingAxis[];
                return Array.isArray(axesData) ? axesData : [];
              }),
            );
            const allAxes = axesBySchema.flat();
            setAxes(allAxes);

            if (normalizedNote.axisValues && normalizedNote.axisValues.length > 0) {
              const initialValues: Record<number, number> = {};
              normalizedNote.axisValues.forEach((av) => {
                initialValues[av.axisId] = av.valueNumeric;
              });
              setAxisValues(initialValues);
            } else {
              const initialValues: Record<number, number> = {};
              allAxes.forEach((axis: RatingAxis) => {
                initialValues[axis.id] = RATING_DEFAULT;
              });
              setAxisValues(initialValues);
            }
          } catch (error) {
            logger.error('Failed to fetch axes:', error);
          }
        }

        initialSchemaSet.current = true;

        setMemo(normalizedNote.memo || '');
        const noteImages = normalizedNote.images || [];
        setImages(noteImages);
        const noteThumbnails = normalizedNote.imageThumbnails || [];
        setImageThumbnails(
          noteThumbnails.length === noteImages.length
            ? noteThumbnails
            : noteImages.map(() => null),
        );
        setTags(normalizedNote.tags || []);
        setIsPublic(normalizedNote.isPublic);
      } catch (error: unknown) {
        logger.error('Failed to fetch note:', error);
        const err = error as { statusCode?: number };
        if (err?.statusCode === 403) {
          toast.error('이 차록을 수정할 권한이 없습니다.');
        } else if (err?.statusCode === 404) {
          toast.error('차록을 찾을 수 없습니다.');
        } else {
          toast.error('차록을 불러오는데 실패했습니다.');
        }
        navigate('/my-notes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [noteId, isAuthenticated, user, isAuthLoading]);

  // Fetch axes when selectedSchemaIds changes (template change only, not initial load)
  useEffect(() => {
    if (selectedSchemaIds.length === 0) {
      setAxes([]);
      setAxisValues({});
      return;
    }
    if (mode === 'edit' && !initialSchemaSet.current && note) {
      initialSchemaSet.current = true;
      return;
    }
    if (mode === 'new' && overallRating === null) return;

    const fetchAxes = async () => {
      try {
        const axesBySchema = await Promise.all(
          selectedSchemaIds.map(async (schemaId) => {
            const axesData = (await notesApi.getSchemaAxes(schemaId)) as RatingAxis[];
            return Array.isArray(axesData) ? axesData : [];
          }),
        );
        const allAxes = axesBySchema.flat();
        setAxes(allAxes);

        if (mode === 'new') {
          const initialValues: Record<number, number> = {};
          allAxes.forEach((axis: RatingAxis) => {
            initialValues[axis.id] = RATING_DEFAULT;
          });
          setAxisValues(initialValues);
        } else {
          setAxisValues((prev) => {
            const next: Record<number, number> = {};
            allAxes.forEach((axis: RatingAxis) => {
              next[axis.id] = prev[axis.id] ?? RATING_DEFAULT;
            });
            return next;
          });
        }
      } catch (error) {
        logger.error('Failed to fetch schema axes:', error);
        toast.error('평가 축 정보를 불러오는데 실패했습니다.');
      }
    };
    fetchAxes();
  }, [selectedSchemaIds.join(',')]);

  const handleTemplateAdded = (schema: RatingSchema) => {
    setSchemas((prev) => [schema, ...prev]);
    setPinnedSchemaIds((prev) => [schema.id, ...prev]);
    setSelectedSchemaIds((prev) => (prev.includes(schema.id) ? prev : [schema.id, ...prev]));
  };

  const handleSave = async () => {
    if (isSampleMode) {
      toast.success('체험 완료! 차록 작성 화면을 둘러보셨나요?');
      setTimeout(() => navigate('/'), NAVIGATION_DELAY);
      return;
    }

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!selectedTea) {
      toast.error('차를 선택해주세요.');
      return;
    }

    if (mode === 'edit' && noteId && isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      return;
    }

    if (mode === 'new' && overallRating === null) {
      toast.error('0.5~5점 평점을 선택해주세요.');
      return;
    }

    const schemaIdsToSend =
      selectedSchemaIds.length > 0
        ? selectedSchemaIds
        : mode === 'new' && defaultSchema
          ? [defaultSchema.id]
          : [];

    if (schemaIdsToSend.length === 0) {
      toast.error(
        mode === 'new' ? '최소 1개의 평가 스키마를 선택해주세요.' : '평가 스키마를 선택해주세요.',
      );
      return;
    }

    try {
      setIsSaving(true);

      const axisValuesArray =
        selectedSchemaIds.length > 0 && axes.length > 0
          ? axes
              .filter((axis) => axisValues[axis.id] !== undefined)
              .map((axis) => ({
                axisId: axis.id,
                value: Math.max(
                  axis.minValue ?? RATING_MIN,
                  Math.min(axis.maxValue ?? RATING_MAX, axisValues[axis.id]),
                ),
              }))
          : [];

      const processedMemo = memo && memo.trim() ? memo.trim() : null;

      const imagePayload = images.length > 0 ? images : null;
      const thumbnailPayload =
        images.length > 0 && imageThumbnails.length === images.length
          ? imageThumbnails.map((t, i) => t ?? images[i])
          : images.length > 0
            ? images
            : null;

      if (mode === 'new') {
        await notesApi.create({
          teaId: selectedTea,
          schemaIds: schemaIdsToSend,
          overallRating: overallRating!,
          isRatingIncluded: true,
          axisValues: axisValuesArray,
          memo: processedMemo,
          images: imagePayload,
          imageThumbnails: thumbnailPayload,
          tags: tags.length > 0 ? tags : undefined,
          isPublic,
        });
        toast.success('기록이 저장되었습니다.');
        setTimeout(() => navigate('/my-notes'), NAVIGATION_DELAY);
      } else {
        const calculatedOverallRating =
          overallRating ??
          (axisValuesArray.length > 0
            ? axisValuesArray.reduce((sum, av) => sum + av.value, 0) / axisValuesArray.length
            : null);

        await notesApi.update(noteId!, {
          teaId: selectedTea,
          schemaIds: schemaIdsToSend,
          overallRating: calculatedOverallRating,
          isRatingIncluded: true,
          axisValues: axisValuesArray,
          memo: processedMemo,
          images: imagePayload,
          imageThumbnails: thumbnailPayload,
          tags: tags.length > 0 ? tags : undefined,
          isPublic,
        });
        toast.success('차록이 수정되었습니다.');
        setTimeout(() => navigate(`/note/${noteId}`, { replace: true }), NAVIGATION_DELAY);
      }
    } catch (error: unknown) {
      logger.error('Failed to save note:', error);
      const err = error as { statusCode?: number; message?: string };
      if (mode === 'edit' && err?.statusCode === 403) {
        toast.error('이 차록을 수정할 권한이 없습니다.');
      } else {
        toast.error(error instanceof Error ? error.message : mode === 'new' ? '저장에 실패했습니다.' : '수정에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // tea selector
    teaSelector,
    selectedTea,
    // schema/axes
    schemas,
    pinnedSchemaIds,
    setPinnedSchemaIds,
    selectedSchemaIds,
    setSelectedSchemaIds,
    axes,
    axisValues,
    setAxisValues,
    // form fields
    overallRating,
    setOverallRating,
    memo,
    setMemo,
    images,
    imageThumbnails,
    setImagesAndThumbnails: (newImages: string[], newThumbnails: (string | null)[]) => {
      setImages(newImages);
      setImageThumbnails(newThumbnails);
    },
    tags,
    setTags,
    isPublic,
    setIsPublic,
    // ui state
    isSaving,
    addTemplateOpen,
    setAddTemplateOpen,
    // edit-only
    isLoading,
    note,
    // handlers
    handleTemplateAdded,
    handleSave,
  };
}

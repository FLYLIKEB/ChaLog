import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { usersApi } from '../lib/api';
import { ONBOARDING_FLAVOR_TAGS, ONBOARDING_TEA_TYPES } from '../constants';
import { OnboardingTagSelector } from '../components/OnboardingTagSelector';
import { RatingGuideModal } from '../components/RatingGuideModal';
import { toast } from 'sonner';

type OnboardingStep = 1 | 2 | 3;

export function Onboarding() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, refreshOnboardingStatus } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [selectedTeaTypes, setSelectedTeaTypes] = useState<string[]>([]);
  const [selectedFlavorTags, setSelectedFlavorTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepLabel = useMemo(
    () => (step === 1 ? '1/3' : step === 2 ? '2/3' : '3/3'),
    [step],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchPreference = async () => {
      try {
        setIsLoading(true);
        const preference = await usersApi.getOnboardingPreference(user.id);
        setSelectedTeaTypes(preference.preferredTeaTypes ?? []);
        setSelectedFlavorTags(preference.preferredFlavorTags ?? []);
      } catch (error) {
        toast.error('온보딩 정보를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreference();
  }, [authLoading, navigate, user]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(undefined);
    return () => registerRefresh(undefined);
  }, [registerRefresh]);

  const toggleTeaType = (tag: string) => {
    setSelectedTeaTypes((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const toggleFlavorTag = (tag: string) => {
    setSelectedFlavorTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleNextToStep2 = () => {
    if (selectedTeaTypes.length === 0) {
      toast.error('관심 차종을 최소 1개 선택해주세요.');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (selectedFlavorTags.length === 0) {
      toast.error('향미를 최소 1개 선택해주세요.');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }
    if (selectedFlavorTags.length === 0) {
      toast.error('향미를 최소 1개 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await usersApi.updateOnboardingPreference(user.id, {
        preferredTeaTypes: selectedTeaTypes,
        preferredFlavorTags: selectedFlavorTags,
      });
      toast.success('온보딩이 완료되었습니다.');
      await refreshOnboardingStatus(user.id);
    } catch (error) {
      toast.error('온보딩 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen">
        <Header title="온보딩" showProfile />
        <div className="p-6 text-center text-sm text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      <Header title="온보딩" showProfile />
      <div className="px-4 pb-6 pt-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs text-gray-500">{stepLabel}</span>
            <h1 className="text-2xl font-bold text-foreground">차 취향을 알려주세요</h1>
            <p className="text-sm text-muted-foreground">
              맞춤차를 위해 관심 차종과 향미를 선택해주세요.
            </p>
          </div>

          {step === 1 && (
            <>
              <OnboardingTagSelector
                title="관심 차종"
                description="자주 마시는 차 종류를 선택해주세요."
                tags={ONBOARDING_TEA_TYPES}
                selectedTags={selectedTeaTypes}
                onToggle={toggleTeaType}
              />
              <Button type="button" className="w-full" onClick={handleNextToStep2}>
                다음
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <OnboardingTagSelector
                title="향미"
                description="좋아하는 향미를 선택해주세요."
                tags={ONBOARDING_FLAVOR_TAGS}
                selectedTags={selectedFlavorTags}
                onToggle={toggleFlavorTag}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleNextToStep3}
                >
                  다음
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  평가 방법 안내
                </h2>
                <p className="text-sm text-muted-foreground">
                  차록에서는 <strong>전체 평점(1~5점)</strong>과{' '}
                  <strong>축별 평가</strong>(풍부함, 강도, 부드러움 등)로 차를
                  기록해요. 같은 조건에서 비교하면 일관된 평가가 가능합니다.
                </p>
                <p className="text-sm text-muted-foreground">
                  차록 작성 시 각 축 옆 (i) 아이콘을 누르면 설명을 볼 수 있어요.{' '}
                  <RatingGuideModal
                    trigger={
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                      >
                        자세한 가이드 보기
                      </button>
                    }
                  />
                </p>
                <Link
                  to="/note/new?sample=1"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                >
                  샘플 평가 체험
                </Link>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '완료'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

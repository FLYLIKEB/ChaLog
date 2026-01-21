import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../lib/api';
import { ONBOARDING_FLAVOR_TAGS, ONBOARDING_TEA_TYPES } from '../constants';
import { OnboardingTagSelector } from '../components/OnboardingTagSelector';
import { toast } from 'sonner';

type OnboardingStep = 1 | 2;

export function Onboarding() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [selectedTeaTypes, setSelectedTeaTypes] = useState<string[]>([]);
  const [selectedFlavorTags, setSelectedFlavorTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepLabel = useMemo(() => (step === 1 ? '1/2' : '2/2'), [step]);

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
        if (preference.hasCompletedOnboarding) {
          navigate('/', { replace: true });
          return;
        }
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

  const handleNext = () => {
    if (selectedTeaTypes.length === 0) {
      toast.error('관심 차종을 최소 1개 선택해주세요.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }
    if (selectedFlavorTags.length === 0) {
      toast.error('향미 태그를 최소 1개 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await usersApi.updateOnboardingPreference(user.id, {
        preferredTeaTypes: selectedTeaTypes,
        preferredFlavorTags: selectedFlavorTags,
      });
      toast.success('온보딩이 완료되었습니다.');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('온보딩 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="온보딩" />
        <div className="p-6 text-center text-sm text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <Header title="온보딩" />
      <div className="px-4 pb-6 pt-4 sm:max-w-md sm:mx-auto">
        <div className="bg-white rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs text-gray-500">{stepLabel}</span>
            <h1 className="text-2xl font-bold text-gray-900">차 취향을 알려주세요</h1>
            <p className="text-sm text-gray-600">
              맞춤 추천을 위해 관심 차종과 향미 태그를 선택해주세요.
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
              <Button type="button" className="w-full" onClick={handleNext}>
                다음
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <OnboardingTagSelector
                title="향미 태그"
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

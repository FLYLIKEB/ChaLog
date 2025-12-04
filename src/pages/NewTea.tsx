import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { NAVIGATION_DELAY, TEA_TYPES } from '../constants';

export function NewTea() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const searchQuery = searchParams.get('searchQuery');

  const [name, setName] = useState(searchQuery || '');
  const [type, setType] = useState('');
  const [year, setYear] = useState('');
  const [seller, setSeller] = useState('');
  const [origin, setOrigin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateTeaId, setDuplicateTeaId] = useState<number | null>(null);
  const [typeTouched, setTypeTouched] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 중복 확인 (debounce 500ms)
  useEffect(() => {
    if (!name.trim() || name.trim().length < 2) {
      setDuplicateWarning(null);
      setDuplicateTeaId(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const teas = await teasApi.getAll(name.trim());
        const teaArray = Array.isArray(teas) ? teas : [];
        
        // 정확히 일치하는 차 이름 찾기
        const exactMatch = teaArray.find(
          tea => tea.name.toLowerCase().trim() === name.toLowerCase().trim()
        );

        if (exactMatch) {
          setDuplicateWarning(`"${exactMatch.name}"과(와) 동일한 이름의 차가 이미 등록되어 있습니다.`);
          setDuplicateTeaId(exactMatch.id);
        } else {
          setDuplicateWarning(null);
          setDuplicateTeaId(null);
        }
      } catch (error) {
        logger.error('Failed to check duplicate:', error);
        // 중복 확인 실패해도 계속 진행 가능
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 필수 필드 검증
    if (!name.trim()) {
      toast.error('차 이름을 입력해주세요.');
      return;
    }

    if (!type.trim()) {
      setTypeTouched(true);
      toast.error('차 종류를 입력해주세요.');
      return;
    }

    // 연도 검증
    if (year.trim()) {
      const yearNum = parseInt(year.trim(), 10);
      if (isNaN(yearNum) || yearNum < 1900) {
        toast.error('연도는 1900년 이상이어야 합니다.');
        return;
      }
    }

    try {
      setIsLoading(true);

      const teaData = {
        name: name.trim(),
        type: type.trim(),
        year: year.trim() ? parseInt(year.trim(), 10) : undefined,
        seller: seller.trim() || undefined,
        origin: origin.trim() || undefined,
      };

      const createdTea = await teasApi.create(teaData);
      const teaId = createdTea?.id;

      if (!teaId) {
        throw new Error('차 등록에 실패했습니다.');
      }

      toast.success('차가 등록되었습니다.');

      // returnTo 파라미터가 있으면 해당 페이지로 이동하고 teaId 전달
      if (returnTo) {
        setTimeout(() => {
          navigate(`${returnTo}?teaId=${teaId}`);
        }, NAVIGATION_DELAY);
      } else {
        // 기본적으로 차 상세 페이지로 이동
        setTimeout(() => {
          navigate(`/tea/${teaId}`);
        }, NAVIGATION_DELAY);
      }
    } catch (error) {
      logger.error('Failed to create tea:', error);
      const errorMessage = error instanceof Error ? error.message : '차 등록에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExisting = () => {
    if (duplicateTeaId) {
      if (returnTo) {
        navigate(`${returnTo}?teaId=${duplicateTeaId}`);
      } else {
        navigate(`/tea/${duplicateTeaId}`);
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack title="새 차 등록" />
      
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-white rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">새 차 등록</h1>
            <p className="text-gray-600 text-sm">
              마신 차를 등록하고 노트를 작성해보세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 차 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                차 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="예: 정산소종"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
              {isCheckingDuplicate && (
                <p className="text-xs text-gray-500">중복 확인 중...</p>
              )}
              {duplicateWarning && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800">{duplicateWarning}</p>
                      {duplicateTeaId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={handleUseExisting}
                        >
                          기존 차 사용하기
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 차 종류 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">
                차 종류 <span className="text-red-500">*</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="group" aria-label="차 종류 선택">
                {TEA_TYPES.map((teaType) => (
                  <Button
                    key={teaType}
                    type="button"
                    variant={type === teaType ? 'default' : 'outline'}
                    onClick={() => {
                      setType(teaType);
                      setTypeTouched(true);
                    }}
                    disabled={isLoading}
                    className="w-full"
                    aria-pressed={type === teaType}
                  >
                    {teaType}
                  </Button>
                ))}
              </div>
              {!type && typeTouched && (
                <p className="text-xs text-red-500">차 종류를 선택해주세요.</p>
              )}
              {!type && !typeTouched && (
                <p className="text-xs text-gray-500">차 종류를 선택해주세요.</p>
              )}
            </div>

            {/* 연도 */}
            <div className="space-y-2">
              <Label htmlFor="year">연도</Label>
              <Input
                id="year"
                type="number"
                placeholder="예: 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isLoading}
                min="1900"
              />
              <p className="text-xs text-gray-500">1900년 이상 입력해주세요</p>
            </div>

            {/* 구매처 */}
            <div className="space-y-2">
              <Label htmlFor="seller">구매처</Label>
              <Input
                id="seller"
                type="text"
                placeholder="예: OO 찻집"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* 산지 */}
            <div className="space-y-2">
              <Label htmlFor="origin">산지</Label>
              <Input
                id="origin"
                type="text"
                placeholder="예: 중국, 한국, 일본"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* 제출 버튼 */}
            <Button type="submit" className="w-full" disabled={isLoading || isCheckingDuplicate}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                '등록하기'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, Store } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SellerCombobox } from '../components/SellerCombobox';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { logger } from '../lib/logger';
import { NAVIGATION_DELAY, TEA_TYPES, YEAR_OPTIONS, COMMON_ORIGINS } from '../constants';

export function NewTea() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const searchQuery = searchParams.get('searchQuery');
  const sellerParam = searchParams.get('seller');

  const [name, setName] = useState(searchQuery || '');
  const [type, setType] = useState('');
  const [yearSelect, setYearSelect] = useState<string>('__none__');
  const [yearCustom, setYearCustom] = useState('');
  const [seller, setSeller] = useState(sellerParam || '');
  const [origin, setOrigin] = useState('');
  const [price, setPrice] = useState('');
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

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(undefined);
    return () => registerRefresh(undefined);
  }, [registerRefresh]);

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

    const yearValue = yearSelect === 'custom' ? yearCustom.trim() : (yearSelect === '__none__' ? '' : yearSelect);
    if (yearValue) {
      const yearNum = parseInt(yearValue, 10);
      if (isNaN(yearNum) || yearNum < 1900) {
        toast.error('연도는 1900년 이상이어야 합니다.');
        return;
      }
    }

    try {
      setIsLoading(true);

      const priceNum = price.trim() ? parseInt(price.replace(/,/g, ''), 10) : undefined;
      if (price.trim() && (isNaN(priceNum!) || priceNum! < 0)) {
        toast.error('가격을 올바르게 입력해주세요.');
        setIsLoading(false);
        return;
      }

      const teaData = {
        name: name.trim(),
        type: type.trim(),
        year: yearValue ? parseInt(yearValue, 10) : undefined,
        seller: seller.trim() || undefined,
        origin: origin.trim() || undefined,
        price: priceNum,
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
    <div className="min-h-screen">
      <Header showBack title="새 차 등록" showProfile />
      
      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6 border border-border">
          <div>
            <h1 className="text-2xl font-bold mb-2">새 차 등록</h1>
            <p className="text-muted-foreground text-sm">
              마신 차를 등록하고 차록을 작성해보세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 차 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                차 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="예: 정산소종, 다즐링, 동정미록"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
              {isCheckingDuplicate && (
                <p className="text-xs text-muted-foreground">중복 확인 중...</p>
              )}
              {duplicateWarning && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800 dark:text-amber-200">{duplicateWarning}</p>
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
                <p className="text-xs text-destructive">차 종류를 선택해주세요.</p>
              )}
              {!type && !typeTouched && (
                <p className="text-xs text-muted-foreground">1개 선택</p>
              )}
            </div>

            {/* 연도 */}
            <div className="space-y-2" role="group" aria-labelledby="year-label">
              <Label id="year-label" htmlFor="year-select">제조 연도 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <Select
                value={yearSelect}
                onValueChange={(v) => setYearSelect(v)}
                disabled={isLoading}
              >
                <SelectTrigger id="year-select" className="w-full" aria-label="연도 선택">
                  <SelectValue placeholder="연도를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안 함</SelectItem>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">그 외 (직접 입력)</SelectItem>
                </SelectContent>
              </Select>
              {yearSelect === 'custom' && (
                <Input
                  id="year-custom"
                  type="number"
                  placeholder="1900~1989년"
                  value={yearCustom}
                  onChange={(e) => setYearCustom(e.target.value)}
                  disabled={isLoading}
                  min={1900}
                  max={1989}
                  className="mt-2"
                  aria-label="연도 직접 입력"
                />
              )}
            </div>

            {/* 구매처 */}
            <div className="space-y-2">
              <Label htmlFor="seller">구매처 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <div className="flex gap-2">
                <SellerCombobox
                  id="seller"
                  value={seller}
                  onChange={setSeller}
                  disabled={isLoading}
                  placeholder="검색하거나 새 찻집 이름 입력"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isLoading}
                  onClick={() => navigate('/teahouse/new?returnTo=/tea/new')}
                  aria-label="찻집 추가"
                  title="찻집 추가"
                >
                  <Store className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                기존 찻집을 선택하거나, 새 찻집 추가 버튼으로 등록할 수 있어요.
              </p>
            </div>

            {/* 가격 */}
            <div className="space-y-2">
              <Label htmlFor="price">가격 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                placeholder="예: 15000"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                disabled={isLoading}
                aria-label="가격 (원)"
              />
            </div>

            {/* 산지 */}
            <div className="space-y-2">
              <Label>산지 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ORIGINS.map((o) => (
                  <Button
                    key={o}
                    type="button"
                    variant={origin === o ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrigin(origin === o ? '' : o)}
                    disabled={isLoading}
                    className="h-8"
                  >
                    {o}
                  </Button>
                ))}
              </div>
              <Input
                type="text"
                placeholder="직접 입력 (예: 윈난, 다즐링)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={isLoading}
                className="mt-1"
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


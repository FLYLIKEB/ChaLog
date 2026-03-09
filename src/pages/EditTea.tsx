import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { TeaTypeSelector } from '../components/TeaTypeSelector';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { logger } from '../lib/logger';
import { CURRENT_YEAR, YEAR_OPTIONS, getOriginsForTeaType, COMMON_PRICES, COMMON_WEIGHTS, formatPriceToKorean } from '../constants';

export function EditTea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const teaId = id ? parseInt(id, 10) : NaN;

  const [tea, setTea] = useState<Tea | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [yearSelect, setYearSelect] = useState<string>('__none__');
  const [yearCustom, setYearCustom] = useState('');
  const [seller, setSeller] = useState('');
  const [origin, setOrigin] = useState('');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTea, setIsLoadingTea] = useState(true);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [typeTouched, setTypeTouched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!teaId || isNaN(teaId)) {
      navigate('/sasaek', { replace: true });
      return;
    }

    const fetchTea = async () => {
      try {
        setIsLoadingTea(true);
        const data = await teasApi.getById(teaId);
        setTea(data);
        setName(data.name);
        setType(data.type);
        if (data.year) {
          const yearStr = String(data.year);
          if (YEAR_OPTIONS.includes(data.year)) {
            setYearSelect(yearStr);
          } else {
            setYearSelect('custom');
            setYearCustom(yearStr);
          }
        } else {
          setYearSelect('__none__');
        }
        setSeller(data.seller ?? '');
        setOrigin(data.origin ?? '');
        setPrice(data.price != null && data.price > 0 ? String(data.price) : '');
        setWeight(data.weight != null && data.weight > 0 ? String(data.weight) : '');
      } catch (error) {
        logger.error('Failed to fetch tea:', error);
        toast.error('차 정보를 불러오는데 실패했습니다.');
        navigate(`/tea/${teaId}`, { replace: true });
      } finally {
        setIsLoadingTea(false);
      }
    };

    fetchTea();
  }, [teaId, navigate]);

  useEffect(() => {
    if (!name.trim() || name.trim().length < 2 || !tea) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const teas = await teasApi.getAll(name.trim());
        const teaArray = Array.isArray(teas) ? teas : [];

        const exactMatch = teaArray.find(
          (t) =>
            t.name.toLowerCase().trim() === name.toLowerCase().trim() && t.id !== teaId,
        );

        if (exactMatch) {
          setDuplicateWarning(
            `"${exactMatch.name}"과(와) 동일한 이름의 차가 이미 등록되어 있습니다.`,
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        logger.error('Failed to check duplicate:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [name, teaId, tea]);

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

    if (!name.trim()) {
      toast.error('차 이름을 입력해주세요.');
      return;
    }

    if (!type.trim()) {
      setTypeTouched(true);
      toast.error('차 종류를 선택해주세요.');
      return;
    }

    const yearValue =
      yearSelect === 'custom'
        ? yearCustom.trim()
        : yearSelect === '__none__'
          ? ''
          : yearSelect;
    if (yearValue) {
      const yearNum = parseInt(yearValue, 10);
      if (isNaN(yearNum) || yearNum < 1900) {
        toast.error('연도는 1900년 이상이어야 합니다.');
        return;
      }
    }

    const priceNum = price.trim() ? parseInt(price.replace(/,/g, ''), 10) : undefined;
    if (price.trim() && (isNaN(priceNum!) || priceNum! < 0)) {
      toast.error('가격을 올바르게 입력해주세요.');
      return;
    }

    const weightNum = weight.trim() ? parseInt(weight.replace(/,/g, ''), 10) : undefined;
    if (weight.trim() && (isNaN(weightNum!) || weightNum! < 0)) {
      toast.error('무게를 올바르게 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);

      const teaData = {
        name: name.trim(),
        type: type.trim(),
        year: yearValue ? parseInt(yearValue, 10) : undefined,
        seller: seller.trim() || undefined,
        origin: origin.trim() || undefined,
        price: priceNum,
        weight: weightNum,
      };

      await teasApi.update(teaId, teaData);
      toast.success('차 정보가 수정되었습니다.');
      navigate(`/tea/${teaId}`, { replace: true });
    } catch (error) {
      logger.error('Failed to update tea:', error);
      const errorMessage =
        (error && typeof error === 'object' && 'message' in error && (error as { message?: string }).message) ||
        (error instanceof Error ? error.message : '차 수정에 실패했습니다.');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoadingTea) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!tea) return null;

  return (
    <div className="min-h-screen">
      <Header showBack title="차 정보 수정" showProfile />

      <div className="p-4 pb-24 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-5 border border-border">
          <form id="edit-tea-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 차 이름 · 차 종류 우선 */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                차 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
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
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {duplicateWarning}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">
                차 종류 <span className="text-red-500">*</span>
              </div>
              <TeaTypeSelector
                value={type}
                onChange={(v) => {
                  setType(v);
                  setTypeTouched(true);
                }}
                disabled={isLoading}
                error={typeTouched && !type}
              />
              {!type && typeTouched && (
                <p className="text-xs text-destructive">차 종류를 선택해주세요.</p>
              )}
            </div>

            {/* 차종류 선택 시에만 표시: 연도, 구매처, 가격, 무게, 산지 */}
            {type && (
            <>
            <div className="space-y-2" role="group" aria-labelledby="edit-year-label">
              <Label id="edit-year-label" htmlFor="edit-year-select">
                제조 연도 <span className="text-muted-foreground font-normal">(선택)</span>
              </Label>
              <div className="flex flex-wrap gap-2 mb-1">
                <Button
                  type="button"
                  variant={yearSelect === String(CURRENT_YEAR) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYearSelect(String(CURRENT_YEAR))}
                  disabled={isLoading}
                  className="h-6 px-2 text-xs"
                >
                  올해
                </Button>
                <Button
                  type="button"
                  variant={yearSelect === String(CURRENT_YEAR - 1) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYearSelect(String(CURRENT_YEAR - 1))}
                  disabled={isLoading}
                  className="h-6 px-2 text-xs"
                >
                  작년
                </Button>
                <Button
                  type="button"
                  variant={yearSelect === '__none__' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYearSelect('__none__')}
                  disabled={isLoading}
                  className="h-6 px-2 text-xs"
                >
                  선택 안 함
                </Button>
              </div>
              <Select
                value={yearSelect}
                onValueChange={(v) => setYearSelect(v)}
                disabled={isLoading}
              >
                <SelectTrigger id="edit-year-select" className="w-full" aria-label="연도 선택">
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
                  id="edit-year-custom"
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

            <div className="space-y-2">
              <Label htmlFor="edit-seller">
                구매처 <span className="text-muted-foreground font-normal">(선택)</span>
              </Label>
              <div className="flex gap-2">
                <SellerCombobox
                  id="edit-seller"
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
                  onClick={() =>
                    navigate(`/teahouse/new?returnTo=/tea/${teaId}/edit`)
                  }
                  aria-label="찻집 추가"
                  title="찻집 추가"
                >
                  <Store className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">
                가격 <span className="text-muted-foreground font-normal">(선택)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_PRICES.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseInt(price.replace(/,/g, ''), 10) || 0;
                      setPrice(String(current + p));
                    }}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs"
                  >
                    +{formatPriceToKorean(p)}원
                  </Button>
                ))}
              </div>
              <Input
                id="edit-price"
                type="text"
                inputMode="numeric"
                placeholder="직접 입력 (예: 15000)"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value.replace(/[^0-9,]/g, ''))
                }
                disabled={isLoading}
                aria-label="가격 (원)"
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-weight">
                무게 <span className="text-muted-foreground font-normal">(선택)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_WEIGHTS.map((w) => (
                  <Button
                    key={w}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseInt(weight.replace(/,/g, ''), 10) || 0;
                      setWeight(String(current + w));
                    }}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs"
                  >
                    +{w}g
                  </Button>
                ))}
              </div>
              <Input
                id="edit-weight"
                type="text"
                inputMode="numeric"
                placeholder="직접 입력 (예: 50)"
                value={weight}
                onChange={(e) =>
                  setWeight(e.target.value.replace(/[^0-9,]/g, ''))
                }
                disabled={isLoading}
                aria-label="무게 (g)"
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-origin" className="text-xs">산지 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <div className="flex flex-wrap gap-2">
                {getOriginsForTeaType(type).map((o) => (
                  <Button
                    key={o}
                    type="button"
                    variant={origin === o ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrigin(origin === o ? '' : o)}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs"
                  >
                    {o}
                  </Button>
                ))}
              </div>
              <Input
                id="edit-origin"
                type="text"
                placeholder="직접 입력 (예: 윈난, 다즐링)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
            </div>
            </>
            )}
          </form>
        </div>
      </div>

      {/* 저장 버튼 - 하단 고정 플로팅 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 dark:bg-background/90 backdrop-blur-sm z-40 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2">
        <Button
          type="submit"
          form="edit-tea-form"
          className="w-full opacity-70 hover:opacity-100 transition-opacity"
          disabled={isLoading || isCheckingDuplicate || !!duplicateWarning}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              수정 중...
            </>
          ) : (
            '수정하기'
          )}
        </Button>
      </div>
    </div>
  );
}

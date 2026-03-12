import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { TeaBasicInfoForm } from '../components/tea-form/TeaBasicInfoForm';
import { TeaYearSection } from '../components/tea-form/TeaYearSection';
import { TeaSellerSection } from '../components/tea-form/TeaSellerSection';
import { TeaPriceWeightSection } from '../components/tea-form/TeaPriceWeightSection';
import { TeaOriginSection } from '../components/tea-form/TeaOriginSection';
import { teasApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { NAVIGATION_DELAY, CURRENT_YEAR, guessTeaTypeFromName } from '../constants';

export function NewTea() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const searchQuery = searchParams.get('searchQuery');
  const sellerParam = searchParams.get('seller');

  const [name, setName] = useState(searchQuery || '');
  const [type, setType] = useState('');
  const [yearSelect, setYearSelect] = useState<string>(String(CURRENT_YEAR));
  const [yearCustom, setYearCustom] = useState('');
  const [seller, setSeller] = useState(sellerParam || '');
  const [origin, setOrigin] = useState('');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateTeaId, setDuplicateTeaId] = useState<number | null>(null);
  const [typeTouched, setTypeTouched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (typeTouched) return;
    const guessed = guessTeaTypeFromName(name);
    setType(guessed || '');
  }, [name, typeTouched]);

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
        const exactMatch = teaArray.find(
          (tea) => tea.name.toLowerCase().trim() === name.toLowerCase().trim()
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
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [name]);

  const handleUseExisting = () => {
    if (!duplicateTeaId) return;
    navigate(returnTo ? `${returnTo}?teaId=${duplicateTeaId}` : `/tea/${duplicateTeaId}`, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('로그인이 필요합니다.'); navigate('/login'); return; }
    if (!name.trim()) { toast.error('차 이름을 입력해주세요.'); return; }
    if (!type.trim()) { setTypeTouched(true); toast.error('차 종류를 입력해주세요.'); return; }

    const yearValue = yearSelect === 'custom' ? yearCustom.trim() : (yearSelect === '__none__' ? '' : yearSelect);
    if (yearValue) {
      const yearNum = parseInt(yearValue, 10);
      if (isNaN(yearNum) || yearNum < 1900) { toast.error('연도는 1900년 이상이어야 합니다.'); return; }
    }

    try {
      setIsLoading(true);
      const priceNum = price.trim() ? parseInt(price.replace(/,/g, ''), 10) : undefined;
      if (price.trim() && (isNaN(priceNum!) || priceNum! < 0)) {
        toast.error('가격을 올바르게 입력해주세요.');
        setIsLoading(false);
        return;
      }
      const weightNum = weight.trim() ? parseInt(weight.replace(/,/g, ''), 10) : undefined;
      if (weight.trim() && (isNaN(weightNum!) || weightNum! < 0)) {
        toast.error('무게를 올바르게 입력해주세요.');
        setIsLoading(false);
        return;
      }

      const createdTea = await teasApi.create({
        name: name.trim(),
        type: type.trim(),
        year: yearValue ? parseInt(yearValue, 10) : undefined,
        seller: seller.trim() || undefined,
        origin: origin.trim() || undefined,
        price: priceNum,
        weight: weightNum,
      });
      const teaId = createdTea?.id;
      if (!teaId) throw new Error('차 등록에 실패했습니다.');
      toast.success('차가 등록되었습니다.');
      setTimeout(() => {
        navigate(returnTo ? `${returnTo}?teaId=${teaId}` : `/tea/${teaId}`, { replace: true });
      }, NAVIGATION_DELAY);
    } catch (error) {
      logger.error('Failed to create tea:', error);
      const errorMessage =
        (error && typeof error === 'object' && 'message' in error && (error as { message?: string }).message) ||
        (error instanceof Error ? error.message : '차 등록에 실패했습니다.');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen">
      <Header showBack title="새 차 등록" showProfile />
      <div className="p-4 pb-24 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-5 border border-border">
          <form id="tea-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
            <TeaBasicInfoForm
              name={name}
              onNameChange={setName}
              type={type}
              onTypeChange={(v) => { setType(v); setTypeTouched(true); }}
              typeTouched={typeTouched}
              isLoading={isLoading}
              isCheckingDuplicate={isCheckingDuplicate}
              duplicateWarning={duplicateWarning}
              duplicateTeaId={duplicateTeaId}
              onUseExisting={handleUseExisting}
            />
            {type && (
              <>
                <TeaYearSection
                  yearSelect={yearSelect}
                  onYearSelectChange={setYearSelect}
                  yearCustom={yearCustom}
                  onYearCustomChange={setYearCustom}
                  isLoading={isLoading}
                />
                <TeaSellerSection seller={seller} onSellerChange={setSeller} isLoading={isLoading} />
                <TeaPriceWeightSection
                  price={price}
                  onPriceChange={setPrice}
                  weight={weight}
                  onWeightChange={setWeight}
                  isLoading={isLoading}
                />
                <TeaOriginSection type={type} origin={origin} onOriginChange={setOrigin} isLoading={isLoading} />
              </>
            )}
          </form>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 dark:bg-background/90 backdrop-blur-sm z-40 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2">
        <Button
          type="submit"
          form="tea-form"
          className="w-full opacity-70 hover:opacity-100 transition-opacity"
          disabled={isLoading || isCheckingDuplicate}
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />등록 중...</>
          ) : '등록하기'}
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Store } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { teasApi } from '../lib/api';
import { logger } from '../lib/logger';
import { toast } from 'sonner';
import { NAVIGATION_DELAY } from '../constants';
import { EmptyState } from '../components/EmptyState';

export function EditShop() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!name || !isAuthenticated) return;
    const fetchSeller = async () => {
      try {
        setIsFetching(true);
        const detail = await teasApi.getSellerByName(decodeURIComponent(name));
        if (detail) {
          setAddress(detail.address ?? '');
          setMapUrl(detail.mapUrl ?? '');
          setWebsiteUrl(detail.websiteUrl ?? '');
          setPhone(detail.phone ?? '');
          setDescription(detail.description ?? '');
          setBusinessHours(detail.businessHours ?? '');
        }
      } catch (error) {
        logger.error('Failed to fetch seller:', error);
        toast.error('찻집 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchSeller();
  }, [name, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !name) return;
    const decodedName = decodeURIComponent(name);
    try {
      setIsLoading(true);
      const result = await teasApi.updateSeller(decodedName, {
        address: address.trim() || undefined,
        mapUrl: mapUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
        businessHours: businessHours.trim() || undefined,
      });
      if (!result) {
        toast.error('찻집을 찾을 수 없습니다. sellers 테이블에 등록된 찻집만 수정할 수 있어요.');
        return;
      }
      toast.success('찻집 정보가 수정되었습니다.');
      setTimeout(() => {
        navigate(`/teahouse/${encodeURIComponent(decodedName)}`);
      }, NAVIGATION_DELAY);
    } catch (error) {
      logger.error('Failed to update seller:', error);
      const msg = error instanceof Error ? error.message : '찻집 수정에 실패했습니다.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!name) {
    return (
      <div className="min-h-screen pb-20">
        <Header title="찻집 수정" showBack showProfile />
        <EmptyState
          type="search"
          message="찻집을 찾을 수 없어요."
          action={{ label: '사색하기', onClick: () => navigate('/sasaek') }}
        />
      </div>
    );
  }

  const displayName = decodeURIComponent(name);

  return (
    <div className="min-h-screen">
      <Header showBack title="찻집 수정" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6 border border-border">
          <div>
            <h1 className="text-2xl font-bold mb-2">찻집 수정</h1>
            <p className="text-muted-foreground text-sm">
              {displayName}의 정보를 수정해주세요. 찻집 이름은 변경할 수 없어요.
            </p>
          </div>

          {isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label className="text-muted-foreground">찻집 이름</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-muted/50 text-muted-foreground">
                  <Store className="w-4 h-4 shrink-0" />
                  <span>{displayName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="예: 서울시 강남구 ..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapUrl">지도 URL <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <Input
                  id="mapUrl"
                  type="url"
                  placeholder="예: https://map.naver.com/..."
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">웹사이트 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="예: https://..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="예: 02-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessHours">영업시간 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <Input
                  id="businessHours"
                  type="text"
                  placeholder="예: 10:00 - 21:00"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">소개 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                <textarea
                  id="description"
                  placeholder="찻집 소개를 입력해주세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4 mr-2" />
                    수정하기
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

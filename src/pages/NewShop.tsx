import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export function NewShop() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('찻집 이름을 입력해주세요.');
      return;
    }
    try {
      setIsLoading(true);
      await teasApi.createSeller({
        name: trimmed,
        address: address.trim() || undefined,
        mapUrl: mapUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
        businessHours: businessHours.trim() || undefined,
      });
      toast.success('찻집이 등록되었습니다.');
      if (returnTo) {
        setTimeout(() => {
          const params = new URLSearchParams();
          params.set('seller', trimmed);
          params.set('returnTo', returnTo);
          navigate(`/tea/new?${params.toString()}`);
        }, NAVIGATION_DELAY);
      } else {
        setTimeout(() => {
          navigate(`/teahouse/${encodeURIComponent(trimmed)}`);
        }, NAVIGATION_DELAY);
      }
    } catch (error) {
      logger.error('Failed to create seller:', error);
      const msg = error instanceof Error ? error.message : '찻집 등록에 실패했습니다.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="찻집 추가" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6 border border-border">
          <div>
            <h1 className="text-2xl font-bold mb-2">찻집 추가</h1>
            <p className="text-muted-foreground text-sm">
              새 찻집을 등록하면 바로 찻집 목록에 추가돼요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="shop-name">
                찻집 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="shop-name"
                type="text"
                placeholder="예: OO 찻집, OO몰"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
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
                  등록하기
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

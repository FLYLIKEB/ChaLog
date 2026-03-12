import { toast } from 'sonner';

export function useShare() {
  const share = async (title: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // AbortError는 사용자가 취소한 것이므로 무시
        if (err instanceof Error && err.name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  return { share };
}

async function copyToClipboard(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('링크가 복사되었습니다');
  } catch {
    toast.error('링크 복사에 실패했습니다');
  }
}

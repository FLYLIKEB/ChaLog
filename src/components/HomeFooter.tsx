import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { UserAvatar } from './ui/UserAvatar';
import { toast } from 'sonner';

interface Contributor {
  id: number;
  name: string;
}

interface HomeFooterProps {
  recentContributors: Contributor[];
}

export function HomeFooter({ recentContributors }: HomeFooterProps) {
  return (
    <>
      {recentContributors.length > 0 && (
        <div className="mt-8 pt-4 border-t border-black/5">
          <p className="text-[10px] text-muted-foreground mb-2 px-1">최근 기여자</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-hide">
            {recentContributors.map((c) => (
              <Link
                key={c.id}
                to={`/user/${c.id}`}
                className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <UserAvatar name={c.name} size="xs" className="shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-12 pt-8 pb-6 border-t border-black/5">
        {import.meta.env.VITE_KAKAO_OPEN_CHAT_URL && (
          <a
            href={import.meta.env.VITE_KAKAO_OPEN_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 w-full max-w-sm mx-auto py-4 px-5 rounded-2xl bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#191919] transition-all duration-200 mb-5 card-shadow hover:shadow-[0_4px_16px_rgba(254,229,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 border border-[#FEE500]/80"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#191919]/8 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#191919]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#191919]">
                  차에 대해 이야기해요
                </p>
                <p className="text-xs text-[#191919]/70 mt-0.5">
                  오픈채팅에서 만나요
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#191919]/60 group-hover:text-[#191919] group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
          <span>차멍 v0.1</span>
          <span className="text-border/60">·</span>
          <button type="button" onClick={() => toast.info('준비 중입니다.')} className="text-[11px] font-normal hover:text-foreground/70 transition-colors">
            이용약관
          </button>
          <span className="text-border/60">·</span>
          <button type="button" onClick={() => toast.info('준비 중입니다.')} className="text-[11px] font-normal hover:text-foreground/70 transition-colors">
            개인정보처리방침
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-3">© 2026 차멍. All rights reserved.</p>
      </footer>
    </>
  );
}

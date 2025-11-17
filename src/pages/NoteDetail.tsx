import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash2, Globe, Lock } from 'lucide-react';
import { Header } from '../components/Header';
import { DetailFallback } from '../components/DetailFallback';
import { RatingVisualization } from '../components/RatingVisualization';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { mockNotes, mockTeas, currentUser } from '../lib/mockData';
import { toast } from 'sonner';

export function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const note = mockNotes.find(n => n.id === id);
  const tea = note ? mockTeas.find(t => t.id === note.teaId) : null;
  const isMyNote = note?.userId === currentUser.id;

  if (!note || !tea) {
    return <DetailFallback title="노트 상세" message="노트를 찾을 수 없습니다." />;
  }

  const handleTogglePublic = () => {
    toast.success(note.isPublic ? '노트가 비공개로 전환되었습니다.' : '노트가 공개되었습니다.');
  };

  const handleDelete = () => {
    toast.success('노트가 삭제되었습니다.');
    setTimeout(() => navigate('/my-notes'), 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="노트 상세" />
      
      <div className="p-4 space-y-6">
        {/* 차 정보 요약 */}
        <section className="bg-white rounded-lg p-4">
          <button
            onClick={() => navigate(`/tea/${tea.id}`)}
            className="text-left w-full"
          >
            <h2 className="mb-2">{tea.name}</h2>
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              <span>{tea.type}</span>
              {tea.year && <span>· {tea.year}년</span>}
              {tea.seller && <span>· {tea.seller}</span>}
            </div>
          </button>
        </section>

        {/* 평균 평점 */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              <span className="text-2xl">{note.rating.toFixed(1)}</span>
            </div>
            <Badge variant={note.isPublic ? 'default' : 'secondary'}>
              {note.isPublic ? (
                <><Globe className="w-3 h-3 mr-1" /> 공개</>
              ) : (
                <><Lock className="w-3 h-3 mr-1" /> 비공개</>
              )}
            </Badge>
          </div>
          
          <p className="text-xs text-gray-500 mb-4">
            {note.createdAt.toLocaleDateString('ko-KR')} · {note.userName}
          </p>

          <RatingVisualization ratings={note.ratings} />
        </section>

        {/* 메모 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="mb-3">메모</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{note.memo}</p>
        </section>

        {/* 내 노트일 때만 노출되는 액션 */}
        {isMyNote && (
          <section className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTogglePublic}
              className="flex-1"
            >
              {note.isPublic ? '비공개로 전환' : '공개하기'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="px-4"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </section>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>노트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

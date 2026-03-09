import React, { useState } from 'react';
import { Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { commentsApi } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface CommentListProps {
  postId: number;
  comments: Comment[];
  onCommentsChange: (comments: Comment[]) => void;
}

export function CommentList({ postId, comments, onCommentsChange }: CommentListProps) {
  const { user } = useAuth();
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const comment = await commentsApi.create(postId, newContent.trim());
      onCommentsChange([...comments, comment]);
      setNewContent('');
    } catch {
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSave = async (commentId: number) => {
    if (!editContent.trim()) return;
    try {
      const updated = await commentsApi.update(commentId, editContent.trim());
      onCommentsChange(comments.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch {
      toast.error('댓글 수정에 실패했습니다.');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId);
      onCommentsChange(comments.filter((c) => c.id !== commentId));
      toast.success('댓글이 삭제되었습니다.');
    } catch {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">
        댓글 {comments.length}개
      </h3>

      {/* 댓글 목록 */}
      <div className="flex flex-col divide-y divide-border/40">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            첫 번째 댓글을 남겨보세요.
          </p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{comment.user?.name}</span>
                  <span>·</span>
                  <span>{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>

                {editingId === comment.id ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      autoFocus
                      className="min-h-0"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSave(comment.id)}
                        className="h-7 px-2 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        저장
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCancel}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                )}
              </div>

              {/* 작성자 본인 액션 */}
              {user?.id === comment.userId && editingId !== comment.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditStart(comment)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="댓글 수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="댓글 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 댓글 작성 폼 */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{newContent.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!newContent.trim() || isSubmitting}
              className="h-8 px-4 text-xs"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              댓글 작성
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          댓글을 작성하려면 로그인이 필요합니다.
        </p>
      )}
    </div>
  );
}

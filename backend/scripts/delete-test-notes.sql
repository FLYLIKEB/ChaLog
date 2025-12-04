-- 테스트 노트 데이터 삭제 SQL 스크립트
-- 주의: 이 스크립트는 메모(memo) 필드에 "테스트"가 포함된 모든 노트를 삭제합니다.

-- 삭제 전 확인
SELECT 
  n.id,
  n.memo,
  u.name as userName,
  t.name as teaName,
  n.createdAt
FROM notes n
JOIN users u ON n.userId = u.id
JOIN teas t ON n.teaId = t.id
WHERE n.memo LIKE '%테스트%'
ORDER BY n.createdAt DESC;

-- 메모에 "테스트"가 포함된 노트 삭제
-- CASCADE 설정으로 인해 관련된 note_likes, note_tags, note_bookmarks도 자동 삭제됩니다.
DELETE FROM notes
WHERE memo LIKE '%테스트%';

-- 삭제 후 확인
SELECT COUNT(*) as remainingNotes
FROM notes
WHERE memo LIKE '%테스트%';


-- notes 테이블에 images 컬럼 추가
-- 사용법: mysql -u [username] -p [database] < add-images-column.sql

ALTER TABLE notes 
ADD COLUMN images JSON NULL 
AFTER memo;


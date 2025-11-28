-- 마이그레이션 완료 스크립트
-- 현재 상태에서 INT 타입으로 완전히 전환

-- 1. Users 테이블 수정 (id 컬럼이 없는 경우)
-- 먼저 현재 상태 확인
SELECT 'Users 테이블 상태 확인' AS step;

-- Users에 id 컬럼이 없으면 추가
SET @user_has_id = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @user_sql = IF(@user_has_id = 0, 
  'ALTER TABLE `users` ADD COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST',
  'SELECT 1');
PREPARE stmt_user FROM @user_sql;
EXECUTE stmt_user;
DEALLOCATE PREPARE stmt_user;

-- 2. Teas 테이블 정리
-- new_id가 있으면 id로 변경, 기존 id(varchar) 제거
SET @tea_has_new_id = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teas' AND COLUMN_NAME = 'new_id');
SET @tea_has_old_id = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teas' AND COLUMN_NAME = 'id' AND DATA_TYPE = 'varchar');

-- 외래키 제약조건 제거
SET @fk1 = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' 
            AND CONSTRAINT_NAME != 'PRIMARY' AND COLUMN_NAME = 'teaId' LIMIT 1);
SET @fk2 = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' 
            AND CONSTRAINT_NAME != 'PRIMARY' AND COLUMN_NAME = 'userId' LIMIT 1);

SET @sql_fk1 = IF(@fk1 IS NOT NULL, CONCAT('ALTER TABLE `notes` DROP FOREIGN KEY `', @fk1, '`'), 'SELECT 1');
SET @sql_fk2 = IF(@fk2 IS NOT NULL, CONCAT('ALTER TABLE `notes` DROP FOREIGN KEY `', @fk2, '`'), 'SELECT 1');

PREPARE stmt_fk1 FROM @sql_fk1;
EXECUTE stmt_fk1;
DEALLOCATE PREPARE stmt_fk1;

PREPARE stmt_fk2 FROM @sql_fk2;
EXECUTE stmt_fk2;
DEALLOCATE PREPARE stmt_fk2;

-- Notes의 기존 varchar 외래키 컬럼 제거
ALTER TABLE `notes` DROP COLUMN IF EXISTS `teaId`;
ALTER TABLE `notes` DROP COLUMN IF EXISTS `userId`;

-- new_teaId, new_userId를 teaId, userId로 변경
ALTER TABLE `notes` CHANGE COLUMN `new_teaId` `teaId` INT NOT NULL;
ALTER TABLE `notes` CHANGE COLUMN `new_userId` `userId` INT NOT NULL;

-- Teas 테이블 정리
ALTER TABLE `teas` DROP PRIMARY KEY;
ALTER TABLE `teas` DROP COLUMN IF EXISTS `id`;
ALTER TABLE `teas` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY;

-- 3. 인덱스 재생성
CREATE INDEX IF NOT EXISTS `IDX_notes_teaId` ON `notes` (`teaId`);
CREATE INDEX IF NOT EXISTS `IDX_notes_userId` ON `notes` (`userId`);

-- 4. 외래키 재생성
ALTER TABLE `notes` 
  ADD CONSTRAINT `FK_notes_tea` FOREIGN KEY (`teaId`) REFERENCES `teas`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notes_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;

-- 5. AUTO_INCREMENT 설정
SET @max_user_id = (SELECT COALESCE(MAX(id), 0) FROM `users`);
SET @max_tea_id = (SELECT COALESCE(MAX(id), 0) FROM `teas`);
SET @max_note_id = (SELECT COALESCE(MAX(id), 0) FROM `notes`);

SET @sql_user_ai = CONCAT('ALTER TABLE `users` AUTO_INCREMENT = ', @max_user_id + 1);
SET @sql_tea_ai = CONCAT('ALTER TABLE `teas` AUTO_INCREMENT = ', @max_tea_id + 1);
SET @sql_note_ai = CONCAT('ALTER TABLE `notes` AUTO_INCREMENT = ', @max_note_id + 1);

PREPARE stmt_user_ai FROM @sql_user_ai;
EXECUTE stmt_user_ai;
DEALLOCATE PREPARE stmt_user_ai;

PREPARE stmt_tea_ai FROM @sql_tea_ai;
EXECUTE stmt_tea_ai;
DEALLOCATE PREPARE stmt_tea_ai;

PREPARE stmt_note_ai FROM @sql_note_ai;
EXECUTE stmt_note_ai;
DEALLOCATE PREPARE stmt_note_ai;

SELECT '✅ 마이그레이션 완료!' AS status;


-- ============================================
-- UUID에서 INT AUTO_INCREMENT로 마이그레이션
-- ============================================
-- 주의: 이 스크립트는 기존 데이터를 보존하면서 ID 타입을 변경합니다.
-- 실행 전 반드시 데이터베이스 백업을 수행하세요!

-- 1. 외래키 제약조건 제거 (동적 쿼리로 처리)
-- MySQL에서는 IF EXISTS를 직접 지원하지 않으므로, 존재하는 경우에만 제거
SET @fk1 = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' 
            AND CONSTRAINT_NAME != 'PRIMARY' AND COLUMN_NAME = 'teaId' LIMIT 1);
SET @fk2 = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' 
            AND CONSTRAINT_NAME != 'PRIMARY' AND COLUMN_NAME = 'userId' LIMIT 1);

SET @sql1 = IF(@fk1 IS NOT NULL, CONCAT('ALTER TABLE `notes` DROP FOREIGN KEY `', @fk1, '`'), 'SELECT 1');
SET @sql2 = IF(@fk2 IS NOT NULL, CONCAT('ALTER TABLE `notes` DROP FOREIGN KEY `', @fk2, '`'), 'SELECT 1');

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 2. 임시 매핑 테이블 생성 (UUID -> INT 매핑 저장용)
CREATE TABLE IF NOT EXISTS `_uuid_to_int_mapping_users` (
  `uuid` VARCHAR(36) NOT NULL PRIMARY KEY,
  `int_id` INT AUTO_INCREMENT UNIQUE,
  INDEX `idx_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `_uuid_to_int_mapping_teas` (
  `uuid` VARCHAR(36) NOT NULL PRIMARY KEY,
  `int_id` INT AUTO_INCREMENT UNIQUE,
  INDEX `idx_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `_uuid_to_int_mapping_notes` (
  `uuid` VARCHAR(36) NOT NULL PRIMARY KEY,
  `int_id` INT AUTO_INCREMENT UNIQUE,
  INDEX `idx_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. UUID를 INT로 매핑 (기존 데이터 순서 유지)
INSERT INTO `_uuid_to_int_mapping_users` (`uuid`)
SELECT `id` FROM `users` ORDER BY `createdAt`;

INSERT INTO `_uuid_to_int_mapping_teas` (`uuid`)
SELECT `id` FROM `teas` ORDER BY `createdAt`;

INSERT INTO `_uuid_to_int_mapping_notes` (`uuid`)
SELECT `id` FROM `notes` ORDER BY `createdAt`;

-- 4. 임시 컬럼 추가
ALTER TABLE `users` ADD COLUMN `new_id` INT AUTO_INCREMENT UNIQUE FIRST;
ALTER TABLE `teas` ADD COLUMN `new_id` INT AUTO_INCREMENT UNIQUE FIRST;
ALTER TABLE `notes` ADD COLUMN `new_id` INT AUTO_INCREMENT UNIQUE FIRST;
ALTER TABLE `notes` ADD COLUMN `new_teaId` INT NULL AFTER `new_id`;
ALTER TABLE `notes` ADD COLUMN `new_userId` INT NULL AFTER `new_teaId`;

-- 5. 매핑 테이블을 사용하여 새 ID 할당
UPDATE `users` u
INNER JOIN `_uuid_to_int_mapping_users` m ON u.id = m.uuid
SET u.new_id = m.int_id;

UPDATE `teas` t
INNER JOIN `_uuid_to_int_mapping_teas` m ON t.id = m.uuid
SET t.new_id = m.int_id;

UPDATE `notes` n
INNER JOIN `_uuid_to_int_mapping_notes` m ON n.id = m.uuid
SET n.new_id = m.int_id;

-- 6. Notes의 외래키 업데이트
UPDATE `notes` n
INNER JOIN `_uuid_to_int_mapping_teas` m ON n.teaId = m.uuid
SET n.new_teaId = m.int_id;

UPDATE `notes` n
INNER JOIN `_uuid_to_int_mapping_users` m ON n.userId = m.uuid
SET n.new_userId = m.int_id;

-- 7. 기존 인덱스 및 제약조건 제거
ALTER TABLE `users` DROP PRIMARY KEY;
ALTER TABLE `teas` DROP PRIMARY KEY;
ALTER TABLE `notes` DROP PRIMARY KEY;

-- 인덱스는 존재하는 경우에만 제거 (동적 쿼리)
SET @idx1 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_users_email' LIMIT 1);
SET @idx2 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND INDEX_NAME = 'IDX_notes_teaId' LIMIT 1);
SET @idx3 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND INDEX_NAME = 'IDX_notes_userId' LIMIT 1);
SET @idx4 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND INDEX_NAME = 'IDX_notes_isPublic' LIMIT 1);
SET @idx5 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND INDEX_NAME = 'IDX_notes_createdAt' LIMIT 1);
SET @idx6 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teas' AND INDEX_NAME = 'IDX_teas_name' LIMIT 1);
SET @idx7 = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teas' AND INDEX_NAME = 'IDX_teas_type' LIMIT 1);

SET @sql_idx1 = IF(@idx1 IS NOT NULL, CONCAT('DROP INDEX `', @idx1, '` ON `users`'), 'SELECT 1');
SET @sql_idx2 = IF(@idx2 IS NOT NULL, CONCAT('DROP INDEX `', @idx2, '` ON `notes`'), 'SELECT 1');
SET @sql_idx3 = IF(@idx3 IS NOT NULL, CONCAT('DROP INDEX `', @idx3, '` ON `notes`'), 'SELECT 1');
SET @sql_idx4 = IF(@idx4 IS NOT NULL, CONCAT('DROP INDEX `', @idx4, '` ON `notes`'), 'SELECT 1');
SET @sql_idx5 = IF(@idx5 IS NOT NULL, CONCAT('DROP INDEX `', @idx5, '` ON `notes`'), 'SELECT 1');
SET @sql_idx6 = IF(@idx6 IS NOT NULL, CONCAT('DROP INDEX `', @idx6, '` ON `teas`'), 'SELECT 1');
SET @sql_idx7 = IF(@idx7 IS NOT NULL, CONCAT('DROP INDEX `', @idx7, '` ON `teas`'), 'SELECT 1');

PREPARE stmt_idx1 FROM @sql_idx1; EXECUTE stmt_idx1; DEALLOCATE PREPARE stmt_idx1;
PREPARE stmt_idx2 FROM @sql_idx2; EXECUTE stmt_idx2; DEALLOCATE PREPARE stmt_idx2;
PREPARE stmt_idx3 FROM @sql_idx3; EXECUTE stmt_idx3; DEALLOCATE PREPARE stmt_idx3;
PREPARE stmt_idx4 FROM @sql_idx4; EXECUTE stmt_idx4; DEALLOCATE PREPARE stmt_idx4;
PREPARE stmt_idx5 FROM @sql_idx5; EXECUTE stmt_idx5; DEALLOCATE PREPARE stmt_idx5;
PREPARE stmt_idx6 FROM @sql_idx6; EXECUTE stmt_idx6; DEALLOCATE PREPARE stmt_idx6;
PREPARE stmt_idx7 FROM @sql_idx7; EXECUTE stmt_idx7; DEALLOCATE PREPARE stmt_idx7;

-- 8. 기존 컬럼 삭제
ALTER TABLE `notes` DROP COLUMN `teaId`;
ALTER TABLE `notes` DROP COLUMN `userId`;
ALTER TABLE `notes` DROP COLUMN `id`;
ALTER TABLE `teas` DROP COLUMN `id`;
ALTER TABLE `users` DROP COLUMN `id`;

-- 9. 새 컬럼을 기본 컬럼으로 변경
ALTER TABLE `users` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY;
ALTER TABLE `teas` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY;
ALTER TABLE `notes` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY;
ALTER TABLE `notes` CHANGE COLUMN `new_teaId` `teaId` INT NOT NULL;
ALTER TABLE `notes` CHANGE COLUMN `new_userId` `userId` INT NOT NULL;

-- 10. 인덱스 재생성
CREATE INDEX `IDX_users_email` ON `users` (`email`);
CREATE INDEX `IDX_teas_name` ON `teas` (`name`);
CREATE INDEX `IDX_teas_type` ON `teas` (`type`);
CREATE INDEX `IDX_notes_teaId` ON `notes` (`teaId`);
CREATE INDEX `IDX_notes_userId` ON `notes` (`userId`);
CREATE INDEX `IDX_notes_isPublic` ON `notes` (`isPublic`);
CREATE INDEX `IDX_notes_createdAt` ON `notes` (`createdAt`);

-- 11. 외래키 재생성
ALTER TABLE `notes` 
  ADD CONSTRAINT `FK_notes_tea` FOREIGN KEY (`teaId`) REFERENCES `teas`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notes_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;

-- 12. AUTO_INCREMENT 값 설정 (기존 최대값 + 1)
SET @max_user_id = (SELECT COALESCE(MAX(id), 0) FROM `users`);
SET @max_tea_id = (SELECT COALESCE(MAX(id), 0) FROM `teas`);
SET @max_note_id = (SELECT COALESCE(MAX(id), 0) FROM `notes`);

SET @sql_user = CONCAT('ALTER TABLE `users` AUTO_INCREMENT = ', @max_user_id + 1);
SET @sql_tea = CONCAT('ALTER TABLE `teas` AUTO_INCREMENT = ', @max_tea_id + 1);
SET @sql_note = CONCAT('ALTER TABLE `notes` AUTO_INCREMENT = ', @max_note_id + 1);

PREPARE stmt_user FROM @sql_user;
EXECUTE stmt_user;
DEALLOCATE PREPARE stmt_user;

PREPARE stmt_tea FROM @sql_tea;
EXECUTE stmt_tea;
DEALLOCATE PREPARE stmt_tea;

PREPARE stmt_note FROM @sql_note;
EXECUTE stmt_note;
DEALLOCATE PREPARE stmt_note;

-- 13. 임시 매핑 테이블 삭제
DROP TABLE IF EXISTS `_uuid_to_int_mapping_users`;
DROP TABLE IF EXISTS `_uuid_to_int_mapping_teas`;
DROP TABLE IF EXISTS `_uuid_to_int_mapping_notes`;

-- 완료!
SELECT '✅ 마이그레이션 완료!' AS status;


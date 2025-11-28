-- ChaLog 데이터베이스 테이블 생성 스크립트
-- 사용법: mysql -h localhost -P 3307 -u admin -p chalog < scripts/create-tables.sql
-- 또는 환경 변수 사용: DATABASE_URL=mysql://admin:password@localhost:3307/chalog node scripts/create-tables.js

-- Users 테이블
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `IDX_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teas 테이블
CREATE TABLE IF NOT EXISTS `teas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `year` INT NULL,
  `type` VARCHAR(255) NOT NULL,
  `seller` VARCHAR(255) NULL,
  `origin` VARCHAR(255) NULL,
  `averageRating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `reviewCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `IDX_teas_name` (`name`),
  INDEX `IDX_teas_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes 테이블
CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teaId` INT NOT NULL,
  `userId` INT NOT NULL,
  `rating` DECIMAL(3,2) NOT NULL,
  `ratings` JSON NOT NULL,
  `memo` TEXT NOT NULL,
  `isPublic` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `IDX_notes_teaId` (`teaId`),
  INDEX `IDX_notes_userId` (`userId`),
  INDEX `IDX_notes_isPublic` (`isPublic`),
  INDEX `IDX_notes_createdAt` (`createdAt`),
  FOREIGN KEY (`teaId`) REFERENCES `teas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Note Likes 테이블
CREATE TABLE IF NOT EXISTS `note_likes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `noteId` INT NOT NULL,
  `userId` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_note_user` (`noteId`, `userId`),
  INDEX `IDX_note_likes_noteId` (`noteId`),
  INDEX `IDX_note_likes_userId` (`userId`),
  FOREIGN KEY (`noteId`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


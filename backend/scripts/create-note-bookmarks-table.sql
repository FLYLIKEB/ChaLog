-- Note Bookmarks 테이블
CREATE TABLE IF NOT EXISTS `note_bookmarks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `noteId` INT NOT NULL,
  `userId` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_note_user_bookmark` (`noteId`, `userId`),
  INDEX `IDX_note_bookmarks_noteId` (`noteId`),
  INDEX `IDX_note_bookmarks_userId` (`userId`),
  FOREIGN KEY (`noteId`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



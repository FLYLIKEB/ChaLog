-- tags 테이블과 note_tags 연결 테이블 생성
-- 사용법: mysql -u [user] -p [database] < scripts/create-tags-tables.sql

-- tags 테이블 생성
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- note_tags 연결 테이블 생성
CREATE TABLE IF NOT EXISTS note_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  noteId INT NOT NULL,
  tagId INT NOT NULL,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_note_tag (noteId, tagId),
  INDEX idx_noteId (noteId),
  INDEX idx_tagId (tagId),
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


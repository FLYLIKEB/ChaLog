-- Migration: 블라인드 세션 라운드 시스템 (#158)
-- blind_tasting_sessions.teaId → NULL 허용 (라운드별로 차 관리)
ALTER TABLE blind_tasting_sessions MODIFY COLUMN teaId INT NULL;

-- 라운드별 차 및 상태 관리
CREATE TABLE IF NOT EXISTS blind_session_rounds (
  id INT NOT NULL AUTO_INCREMENT,
  sessionId INT NOT NULL,
  teaId INT NOT NULL,
  roundOrder INT NOT NULL,
  status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  startedAt DATETIME NULL,
  completedAt DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_bsr_session FOREIGN KEY (sessionId) REFERENCES blind_tasting_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsr_tea FOREIGN KEY (teaId) REFERENCES teas(id) ON DELETE CASCADE
);

-- 라운드별 참가자 기록 연결
CREATE TABLE IF NOT EXISTS blind_session_participant_notes (
  id INT NOT NULL AUTO_INCREMENT,
  participantId INT NOT NULL,
  roundId INT NOT NULL,
  noteId INT NULL,
  submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bspn_participant FOREIGN KEY (participantId) REFERENCES blind_session_participants(id) ON DELETE CASCADE,
  CONSTRAINT fk_bspn_round FOREIGN KEY (roundId) REFERENCES blind_session_rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bspn_note FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE SET NULL
);

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagCategory1773474193846 implements MigrationInterface {
    name = 'AddTagCategory1773474193846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`FK_password_resets_userId\` ON \`password_resets\``);
        await queryRunner.query(`DROP INDEX \`FK_posts_userId\` ON \`posts\``);
        await queryRunner.query(`DROP INDEX \`FK_post_reports_reporterId\` ON \`post_reports\``);
        await queryRunner.query(`DROP INDEX \`FK_comments_postId\` ON \`comments\``);
        await queryRunner.query(`DROP INDEX \`FK_comments_userId\` ON \`comments\``);
        await queryRunner.query(`DROP INDEX \`IDX_blind_session_participants_sessionId\` ON \`blind_session_participants\``);
        await queryRunner.query(`DROP INDEX \`IDX_blind_session_participants_userId\` ON \`blind_session_participants\``);
        await queryRunner.query(`DROP INDEX \`noteId\` ON \`blind_session_participants\``);
        await queryRunner.query(`DROP INDEX \`UQ_blind_session_participants_session_user\` ON \`blind_session_participants\``);
        await queryRunner.query(`DROP INDEX \`fk_bspn_note\` ON \`blind_session_participant_notes\``);
        await queryRunner.query(`DROP INDEX \`fk_bspn_participant\` ON \`blind_session_participant_notes\``);
        await queryRunner.query(`DROP INDEX \`fk_bspn_round\` ON \`blind_session_participant_notes\``);
        await queryRunner.query(`DROP INDEX \`fk_bsr_session\` ON \`blind_session_rounds\``);
        await queryRunner.query(`DROP INDEX \`fk_bsr_tea\` ON \`blind_session_rounds\``);
        await queryRunner.query(`DROP INDEX \`IDX_blind_tasting_sessions_hostId\` ON \`blind_tasting_sessions\``);
        await queryRunner.query(`DROP INDEX \`IDX_blind_tasting_sessions_status\` ON \`blind_tasting_sessions\``);
        await queryRunner.query(`DROP INDEX \`teaId\` ON \`blind_tasting_sessions\``);
        await queryRunner.query(`DROP INDEX \`UQ_blind_tasting_sessions_inviteCode\` ON \`blind_tasting_sessions\``);
        await queryRunner.query(`DROP INDEX \`UQ_c25bc63d248ca90e8dcc1d92d06\` ON \`refresh_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_audit_logs_action\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_audit_logs_adminId\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_audit_logs_createdAt\` ON \`audit_logs\``);
        // Add category column to tags (idempotent)
        const [colRows] = await queryRunner.query(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND COLUMN_NAME = 'category'`);
        if (Number(colRows.cnt) === 0) {
            await queryRunner.query(`ALTER TABLE \`tags\` ADD \`category\` varchar(20) NOT NULL DEFAULT 'general'`);
        }
        // Seed flavor tags (idempotent)
        const flavorTags = ['꽃향', '과일향', '견과향', '허브향', '우디향', '스모키향', '꿀향', '시트러스향', '스파이시향', '민트향'];
        for (const name of flavorTags) {
            const existing = await queryRunner.query(`SELECT id FROM \`tags\` WHERE \`name\` = ? LIMIT 1`, [name]);
            if (existing.length === 0) {
                await queryRunner.query(`INSERT INTO \`tags\` (\`name\`, \`category\`) VALUES (?, 'flavor')`, [name]);
            } else {
                await queryRunner.query(`UPDATE \`tags\` SET \`category\` = 'flavor' WHERE \`name\` = ?`, [name]);
            }
        }
        await queryRunner.query(`ALTER TABLE \`password_resets\` ADD UNIQUE INDEX \`IDX_7f6aae0fcc807c9e7194ca5cc4\` (\`tokenHash\`)`);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` CHANGE \`createdAt\` \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` CHANGE \`createdAt\` \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` CHANGE \`createdAt\` \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`tokenHash\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`tokenHash\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD UNIQUE INDEX \`IDX_c25bc63d248ca90e8dcc1d92d0\` (\`tokenHash\`)`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`createdAt\` \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`CREATE INDEX \`IDX_485ebd115d7891009ef74142ca\` ON \`tea_wishlists\` (\`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_3f82647610d8c8964b4edbda60\` ON \`tea_wishlists\` (\`teaId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_f6d2e7bbe89d4d2bb8d9aeaba9\` ON \`tea_wishlists\` (\`teaId\`, \`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_92e2382a7f43d4e9350d591fb6\` ON \`post_images\` (\`postId\`)`);
        await queryRunner.query(`ALTER TABLE \`password_resets\` ADD CONSTRAINT \`FK_d95569f623f28a0bf034a55099e\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` ADD CONSTRAINT \`FK_2cb2d20d688b9bb828dd6ff566b\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` ADD CONSTRAINT \`FK_99116e60a8543f91cbde0aad562\` FOREIGN KEY (\`schemaId\`) REFERENCES \`rating_schema\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`teas\` ADD CONSTRAINT \`FK_1c485b6b74287fbc93221ff305c\` FOREIGN KEY (\`sellerId\`) REFERENCES \`sellers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` ADD CONSTRAINT \`FK_3f82647610d8c8964b4edbda603\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` ADD CONSTRAINT \`FK_485ebd115d7891009ef74142ca9\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_session_steeps\` ADD CONSTRAINT \`FK_faf4e470429cd6e70cce197e253\` FOREIGN KEY (\`sessionId\`) REFERENCES \`tea_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` ADD CONSTRAINT \`FK_8f928a87387a4332e80ba51ce56\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` ADD CONSTRAINT \`FK_e2fd96d3530a0950e35c7d06b33\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` ADD CONSTRAINT \`FK_c9ffb463a670be3b398b9d9321e\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_images\` ADD CONSTRAINT \`FK_92e2382a7f43d4e9350d591fb6a\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` ADD CONSTRAINT \`FK_eb77aa981951b86b443635e90aa\` FOREIGN KEY (\`sessionId\`) REFERENCES \`blind_tasting_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` ADD CONSTRAINT \`FK_cc08133acd21548c252d85c1878\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` ADD CONSTRAINT \`FK_62f4b02ff699eb737a218e05c36\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` ADD CONSTRAINT \`FK_41a1614b2edb16501fb3da0285f\` FOREIGN KEY (\`participantId\`) REFERENCES \`blind_session_participants\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` ADD CONSTRAINT \`FK_0cca861dfa108152f135df33dd9\` FOREIGN KEY (\`roundId\`) REFERENCES \`blind_session_rounds\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` ADD CONSTRAINT \`FK_0731579ea21abf3f3467ad67ee5\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_rounds\` ADD CONSTRAINT \`FK_2834aac794799727b55507845a8\` FOREIGN KEY (\`sessionId\`) REFERENCES \`blind_tasting_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_session_rounds\` ADD CONSTRAINT \`FK_c0a5f55d3b0af62ea512f110329\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` ADD CONSTRAINT \`FK_bb54a646e566b4fc78a0336d15d\` FOREIGN KEY (\`hostId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` ADD CONSTRAINT \`FK_bf029e3e665d1b3c2866de83a25\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` DROP FOREIGN KEY \`FK_bf029e3e665d1b3c2866de83a25\``);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` DROP FOREIGN KEY \`FK_bb54a646e566b4fc78a0336d15d\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_rounds\` DROP FOREIGN KEY \`FK_c0a5f55d3b0af62ea512f110329\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_rounds\` DROP FOREIGN KEY \`FK_2834aac794799727b55507845a8\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` DROP FOREIGN KEY \`FK_0731579ea21abf3f3467ad67ee5\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` DROP FOREIGN KEY \`FK_0cca861dfa108152f135df33dd9\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participant_notes\` DROP FOREIGN KEY \`FK_41a1614b2edb16501fb3da0285f\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` DROP FOREIGN KEY \`FK_62f4b02ff699eb737a218e05c36\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` DROP FOREIGN KEY \`FK_cc08133acd21548c252d85c1878\``);
        await queryRunner.query(`ALTER TABLE \`blind_session_participants\` DROP FOREIGN KEY \`FK_eb77aa981951b86b443635e90aa\``);
        await queryRunner.query(`ALTER TABLE \`post_images\` DROP FOREIGN KEY \`FK_92e2382a7f43d4e9350d591fb6a\``);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_c9ffb463a670be3b398b9d9321e\``);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_e2fd96d3530a0950e35c7d06b33\``);
        await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_8f928a87387a4332e80ba51ce56\``);
        await queryRunner.query(`ALTER TABLE \`tea_session_steeps\` DROP FOREIGN KEY \`FK_faf4e470429cd6e70cce197e253\``);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` DROP FOREIGN KEY \`FK_485ebd115d7891009ef74142ca9\``);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` DROP FOREIGN KEY \`FK_3f82647610d8c8964b4edbda603\``);
        await queryRunner.query(`ALTER TABLE \`teas\` DROP FOREIGN KEY \`FK_1c485b6b74287fbc93221ff305c\``);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` DROP FOREIGN KEY \`FK_99116e60a8543f91cbde0aad562\``);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` DROP FOREIGN KEY \`FK_2cb2d20d688b9bb828dd6ff566b\``);
        await queryRunner.query(`ALTER TABLE \`password_resets\` DROP FOREIGN KEY \`FK_d95569f623f28a0bf034a55099e\``);
        await queryRunner.query(`DROP INDEX \`IDX_92e2382a7f43d4e9350d591fb6\` ON \`post_images\``);
        await queryRunner.query(`DROP INDEX \`IDX_f6d2e7bbe89d4d2bb8d9aeaba9\` ON \`tea_wishlists\``);
        await queryRunner.query(`DROP INDEX \`IDX_3f82647610d8c8964b4edbda60\` ON \`tea_wishlists\``);
        await queryRunner.query(`DROP INDEX \`IDX_485ebd115d7891009ef74142ca\` ON \`tea_wishlists\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP INDEX \`IDX_c25bc63d248ca90e8dcc1d92d0\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`tokenHash\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`tokenHash\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`password_resets\` DROP INDEX \`IDX_7f6aae0fcc807c9e7194ca5cc4\``);
        await queryRunner.query(`CREATE INDEX \`IDX_audit_logs_createdAt\` ON \`audit_logs\` (\`createdAt\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_audit_logs_adminId\` ON \`audit_logs\` (\`adminId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_audit_logs_action\` ON \`audit_logs\` (\`action\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_c25bc63d248ca90e8dcc1d92d06\` ON \`refresh_tokens\` (\`tokenHash\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_blind_tasting_sessions_inviteCode\` ON \`blind_tasting_sessions\` (\`inviteCode\`)`);
        await queryRunner.query(`CREATE INDEX \`teaId\` ON \`blind_tasting_sessions\` (\`teaId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_blind_tasting_sessions_status\` ON \`blind_tasting_sessions\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_blind_tasting_sessions_hostId\` ON \`blind_tasting_sessions\` (\`hostId\`)`);
        await queryRunner.query(`CREATE INDEX \`fk_bsr_tea\` ON \`blind_session_rounds\` (\`teaId\`)`);
        await queryRunner.query(`CREATE INDEX \`fk_bsr_session\` ON \`blind_session_rounds\` (\`sessionId\`)`);
        await queryRunner.query(`CREATE INDEX \`fk_bspn_round\` ON \`blind_session_participant_notes\` (\`roundId\`)`);
        await queryRunner.query(`CREATE INDEX \`fk_bspn_participant\` ON \`blind_session_participant_notes\` (\`participantId\`)`);
        await queryRunner.query(`CREATE INDEX \`fk_bspn_note\` ON \`blind_session_participant_notes\` (\`noteId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_blind_session_participants_session_user\` ON \`blind_session_participants\` (\`sessionId\`, \`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`noteId\` ON \`blind_session_participants\` (\`noteId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_blind_session_participants_userId\` ON \`blind_session_participants\` (\`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_blind_session_participants_sessionId\` ON \`blind_session_participants\` (\`sessionId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_comments_userId\` ON \`comments\` (\`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_comments_postId\` ON \`comments\` (\`postId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_post_reports_reporterId\` ON \`post_reports\` (\`reporterId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_posts_userId\` ON \`posts\` (\`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_password_resets_userId\` ON \`password_resets\` (\`userId\`)`);
        await queryRunner.query(`ALTER TABLE \`tags\` DROP COLUMN \`category\``);
    }

}

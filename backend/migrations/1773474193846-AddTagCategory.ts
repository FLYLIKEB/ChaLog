import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagCategory1773474193846 implements MigrationInterface {
    name = 'AddTagCategory1773474193846'

    private static readonly IDENTIFIER_PATTERN = /^[a-zA-Z0-9_]+$/;

    private validateIdentifier(value: string): void {
        if (!AddTagCategory1773474193846.IDENTIFIER_PATTERN.test(value)) {
            throw new Error(`Invalid SQL identifier: ${value}`);
        }
    }

    private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
        this.validateIdentifier(tableName);
        this.validateIdentifier(indexName);
        const result = await queryRunner.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
            [tableName, indexName],
        );
        if (Number(result[0].cnt) > 0) {
            await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
        }
    }

    private async createIndexIfNotExists(queryRunner: QueryRunner, tableName: string, indexName: string, columns: string, unique = false): Promise<void> {
        this.validateIdentifier(tableName);
        this.validateIdentifier(indexName);
        const result = await queryRunner.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
            [tableName, indexName],
        );
        if (Number(result[0].cnt) === 0) {
            const uniqueStr = unique ? 'UNIQUE ' : '';
            await queryRunner.query(`CREATE ${uniqueStr}INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
        }
    }

    private async dropForeignKeyIfExists(queryRunner: QueryRunner, tableName: string, fkName: string): Promise<void> {
        this.validateIdentifier(tableName);
        this.validateIdentifier(fkName);
        const result = await queryRunner.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
            [tableName, fkName],
        );
        if (Number(result[0].cnt) > 0) {
            await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fkName}\``);
        }
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.dropIndexIfExists(queryRunner, 'password_resets', 'FK_password_resets_userId');
        await this.dropIndexIfExists(queryRunner, 'posts', 'FK_posts_userId');
        await this.dropIndexIfExists(queryRunner, 'post_reports', 'FK_post_reports_reporterId');
        await this.dropIndexIfExists(queryRunner, 'comments', 'FK_comments_postId');
        await this.dropIndexIfExists(queryRunner, 'comments', 'FK_comments_userId');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participants', 'IDX_blind_session_participants_sessionId');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participants', 'IDX_blind_session_participants_userId');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participants', 'noteId');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participants', 'UQ_blind_session_participants_session_user');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_note');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_participant');
        await this.dropIndexIfExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_round');
        await this.dropIndexIfExists(queryRunner, 'blind_session_rounds', 'fk_bsr_session');
        await this.dropIndexIfExists(queryRunner, 'blind_session_rounds', 'fk_bsr_tea');
        await this.dropIndexIfExists(queryRunner, 'blind_tasting_sessions', 'IDX_blind_tasting_sessions_hostId');
        await this.dropIndexIfExists(queryRunner, 'blind_tasting_sessions', 'IDX_blind_tasting_sessions_status');
        await this.dropIndexIfExists(queryRunner, 'blind_tasting_sessions', 'teaId');
        await this.dropIndexIfExists(queryRunner, 'blind_tasting_sessions', 'UQ_blind_tasting_sessions_inviteCode');
        await this.dropIndexIfExists(queryRunner, 'refresh_tokens', 'UQ_c25bc63d248ca90e8dcc1d92d06');
        await this.dropIndexIfExists(queryRunner, 'audit_logs', 'IDX_audit_logs_action');
        await this.dropIndexIfExists(queryRunner, 'audit_logs', 'IDX_audit_logs_adminId');
        await this.dropIndexIfExists(queryRunner, 'audit_logs', 'IDX_audit_logs_createdAt');
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
        await this.dropForeignKeyIfExists(queryRunner, 'blind_tasting_sessions', 'FK_bf029e3e665d1b3c2866de83a25');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_tasting_sessions', 'FK_bb54a646e566b4fc78a0336d15d');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_rounds', 'FK_c0a5f55d3b0af62ea512f110329');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_rounds', 'FK_2834aac794799727b55507845a8');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participant_notes', 'FK_0731579ea21abf3f3467ad67ee5');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participant_notes', 'FK_0cca861dfa108152f135df33dd9');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participant_notes', 'FK_41a1614b2edb16501fb3da0285f');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participants', 'FK_62f4b02ff699eb737a218e05c36');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participants', 'FK_cc08133acd21548c252d85c1878');
        await this.dropForeignKeyIfExists(queryRunner, 'blind_session_participants', 'FK_eb77aa981951b86b443635e90aa');
        await this.dropForeignKeyIfExists(queryRunner, 'post_images', 'FK_92e2382a7f43d4e9350d591fb6a');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_sessions', 'FK_c9ffb463a670be3b398b9d9321e');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_sessions', 'FK_e2fd96d3530a0950e35c7d06b33');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_sessions', 'FK_8f928a87387a4332e80ba51ce56');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_session_steeps', 'FK_faf4e470429cd6e70cce197e253');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_wishlists', 'FK_485ebd115d7891009ef74142ca9');
        await this.dropForeignKeyIfExists(queryRunner, 'tea_wishlists', 'FK_3f82647610d8c8964b4edbda603');
        await this.dropForeignKeyIfExists(queryRunner, 'teas', 'FK_1c485b6b74287fbc93221ff305c');
        await this.dropForeignKeyIfExists(queryRunner, 'note_schemas', 'FK_99116e60a8543f91cbde0aad562');
        await this.dropForeignKeyIfExists(queryRunner, 'note_schemas', 'FK_2cb2d20d688b9bb828dd6ff566b');
        await this.dropForeignKeyIfExists(queryRunner, 'password_resets', 'FK_d95569f623f28a0bf034a55099e');
        await this.dropIndexIfExists(queryRunner, 'post_images', 'IDX_92e2382a7f43d4e9350d591fb6');
        await this.dropIndexIfExists(queryRunner, 'tea_wishlists', 'IDX_f6d2e7bbe89d4d2bb8d9aeaba9');
        await this.dropIndexIfExists(queryRunner, 'tea_wishlists', 'IDX_3f82647610d8c8964b4edbda60');
        await this.dropIndexIfExists(queryRunner, 'tea_wishlists', 'IDX_485ebd115d7891009ef74142ca');
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await this.dropIndexIfExists(queryRunner, 'refresh_tokens', 'IDX_c25bc63d248ca90e8dcc1d92d0');
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`tokenHash\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`tokenHash\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`blind_tasting_sessions\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`tea_wishlists\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`note_schemas\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await this.dropIndexIfExists(queryRunner, 'password_resets', 'IDX_7f6aae0fcc807c9e7194ca5cc4');
        await this.createIndexIfNotExists(queryRunner, 'audit_logs', 'IDX_audit_logs_createdAt', '`createdAt`');
        await this.createIndexIfNotExists(queryRunner, 'audit_logs', 'IDX_audit_logs_adminId', '`adminId`');
        await this.createIndexIfNotExists(queryRunner, 'audit_logs', 'IDX_audit_logs_action', '`action`');
        await this.createIndexIfNotExists(queryRunner, 'refresh_tokens', 'UQ_c25bc63d248ca90e8dcc1d92d06', '`tokenHash`', true);
        await this.createIndexIfNotExists(queryRunner, 'blind_tasting_sessions', 'UQ_blind_tasting_sessions_inviteCode', '`inviteCode`', true);
        await this.createIndexIfNotExists(queryRunner, 'blind_tasting_sessions', 'teaId', '`teaId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_tasting_sessions', 'IDX_blind_tasting_sessions_status', '`status`');
        await this.createIndexIfNotExists(queryRunner, 'blind_tasting_sessions', 'IDX_blind_tasting_sessions_hostId', '`hostId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_rounds', 'fk_bsr_tea', '`teaId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_rounds', 'fk_bsr_session', '`sessionId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_round', '`roundId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_participant', '`participantId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participant_notes', 'fk_bspn_note', '`noteId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participants', 'UQ_blind_session_participants_session_user', '`sessionId`, `userId`', true);
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participants', 'noteId', '`noteId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participants', 'IDX_blind_session_participants_userId', '`userId`');
        await this.createIndexIfNotExists(queryRunner, 'blind_session_participants', 'IDX_blind_session_participants_sessionId', '`sessionId`');
        await this.createIndexIfNotExists(queryRunner, 'comments', 'FK_comments_userId', '`userId`');
        await this.createIndexIfNotExists(queryRunner, 'comments', 'FK_comments_postId', '`postId`');
        await this.createIndexIfNotExists(queryRunner, 'post_reports', 'FK_post_reports_reporterId', '`reporterId`');
        await this.createIndexIfNotExists(queryRunner, 'posts', 'FK_posts_userId', '`userId`');
        await this.createIndexIfNotExists(queryRunner, 'password_resets', 'FK_password_resets_userId', '`userId`');
        await queryRunner.query(`ALTER TABLE \`tags\` DROP COLUMN \`category\``);
    }

}

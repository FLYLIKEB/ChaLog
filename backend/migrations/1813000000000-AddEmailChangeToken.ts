import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddEmailChangeToken1813000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_change_tokens',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'tokenHash', type: 'varchar', length: '64', isUnique: true, isNullable: false },
          { name: 'newEmail', type: 'varchar', length: '255', isNullable: false },
          { name: 'expiresAt', type: 'timestamp', isNullable: false },
          { name: 'usedAt', type: 'timestamp', isNullable: true, default: null },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_change_tokens', true);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatTables1703000000000 implements MigrationInterface {
  name = 'CreateChatTables1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customerId" uuid NOT NULL,
        "adminId" uuid,
        "subject" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        "unreadCount" integer NOT NULL DEFAULT '0',
        "lastMessageAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )
    `);

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "content" text NOT NULL,
        "type" character varying NOT NULL DEFAULT 'text',
        "fileName" character varying,
        "fileUrl" character varying,
        "fileSize" integer,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id")
      )
    `);

    // Create chat_templates table
    await queryRunner.query(`
      CREATE TABLE "chat_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_templates" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ADD CONSTRAINT "FK_conversations_customerId" 
      FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ADD CONSTRAINT "FK_conversations_adminId" 
      FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "messages" 
      ADD CONSTRAINT "FK_messages_conversationId" 
      FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "messages" 
      ADD CONSTRAINT "FK_messages_senderId" 
      FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_templates" 
      ADD CONSTRAINT "FK_chat_templates_createdById" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_conversations_customerId" ON "conversations" ("customerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_adminId" ON "conversations" ("adminId")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_status" ON "conversations" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_lastMessageAt" ON "conversations" ("lastMessageAt")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_messages_conversationId" ON "messages" ("conversationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_senderId" ON "messages" ("senderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_createdAt" ON "messages" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_isRead" ON "messages" ("isRead")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_messages_isRead"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_senderId"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_conversationId"`);
    
    await queryRunner.query(`DROP INDEX "IDX_conversations_lastMessageAt"`);
    await queryRunner.query(`DROP INDEX "IDX_conversations_status"`);
    await queryRunner.query(`DROP INDEX "IDX_conversations_adminId"`);
    await queryRunner.query(`DROP INDEX "IDX_conversations_customerId"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "chat_templates" DROP CONSTRAINT "FK_chat_templates_createdById"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_senderId"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversationId"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_adminId"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_customerId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "chat_templates"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
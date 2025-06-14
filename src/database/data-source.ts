import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { Conversation } from '../modules/chat/entities/conversation.entity';
import { Message } from '../modules/chat/entities/message.entity';
import { ChatTemplate } from '../modules/chat/entities/chat-template.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestjs_backend',
  synchronize: false,
  logging: true,
  entities: [User, Payment, Conversation, Message, ChatTemplate],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
});
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Payment } from '../modules/payments/entities/payment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestjs_backend',
  synchronize: false,
  logging: true,
  entities: [User, Payment],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
});
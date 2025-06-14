# NestJS Backend System

A robust, production-ready backend system built with NestJS, featuring PostgreSQL, Redis, RabbitMQ, Stripe payments, and Resend email services.

## 🚀 Features

- **NestJS Framework**: Modern Node.js framework with TypeScript support
- **PostgreSQL Database**: Reliable relational database with TypeORM
- **Redis Caching**: High-performance caching for improved response times
- **RabbitMQ Messaging**: Asynchronous message queuing system
- **Stripe Integration**: Secure payment processing
- **Resend Email Service**: Modern email delivery platform
- **JWT Authentication**: Secure user authentication and authorization
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation
- **Error Handling**: Global exception filters and logging
- **Request Validation**: DTO validation with class-validator
- **Health Checks**: Application health monitoring endpoints
- **Docker Support**: Containerized development and deployment
- **Testing**: Unit and integration tests with Jest

## 📋 Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL
- Redis
- RabbitMQ

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nestjs-backend-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=password
   DB_NAME=nestjs_backend

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0

   # RabbitMQ Configuration
   RABBITMQ_URL=amqp://localhost:5672

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key

   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Resend Configuration
   RESEND_API_KEY=re_your_resend_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   CORS_ORIGIN=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   ```

## 🐳 Docker Development

1. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## 📚 API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## 🗄️ Database

### Run Migrations
```bash
npm run migration:run
```

### Generate Migration
```bash
npm run migration:generate -- MigrationName
```

### Revert Migration
```bash
npm run migration:revert
```

## 📁 Project Structure

```
src/
├── common/                 # Shared utilities and decorators
│   ├── filters/           # Exception filters
│   └── interceptors/      # Request/response interceptors
├── config/                # Configuration files
├── database/              # Database configuration and migrations
├── modules/               # Feature modules
│   ├── auth/             # Authentication module
│   ├── users/            # User management
│   ├── payments/         # Stripe payment integration
│   ├── emails/           # Resend email service
│   ├── queues/           # RabbitMQ message queues
│   └── health/           # Health check endpoints
├── app.module.ts         # Root application module
└── main.ts              # Application entry point
```

## 🔐 Authentication

The system uses JWT-based authentication:

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **Protected Routes**: Include `Authorization: Bearer <token>` header

## 💳 Payments

Stripe integration for payment processing:

1. **Create Payment Intent**: `POST /api/v1/payments/create-intent`
2. **Confirm Payment**: `POST /api/v1/payments/confirm/:paymentIntentId`
3. **Webhook Endpoint**: `POST /api/v1/payments/webhook`

## 📧 Email Service

Resend integration for email delivery:

- Welcome emails
- Password reset emails
- Payment confirmation emails
- Custom email sending

## 🔄 Message Queues

RabbitMQ integration for asynchronous processing:

- Email queue processing
- Background job execution
- Event-driven architecture

## 📊 Monitoring and Logging

- **Winston Logger**: Structured logging with file and console output
- **Health Checks**: Database, memory, and disk monitoring
- **Request Logging**: Automatic request/response logging
- **Error Tracking**: Global exception handling

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: DTO validation
- **Password Hashing**: bcrypt encryption

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Production
```bash
docker build -t nestjs-backend .
docker run -p 3000:3000 nestjs-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the test files for usage examples

## 📝 Changelog

### v1.0.0
- Initial release with full feature set
- NestJS framework setup
- Database integration with TypeORM
- Redis caching implementation
- RabbitMQ message queuing
- Stripe payment processing
- Resend email service
- JWT authentication
- Comprehensive API documentation
- Docker support
- Testing suite
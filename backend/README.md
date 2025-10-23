# Dar Blockchain PM - Backend

Enterprise-grade Project Management Tool backend built with NestJS, TypeScript, MongoDB, and JWT authentication.

## 🚀 Features Implemented

### ✅ Core Infrastructure
- **NestJS Framework** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT Authentication** with refresh tokens
- **Role-Based Access Control** (Admin, PM, Developer, Viewer)
- **Swagger API Documentation**
- **Request Validation** with class-validator
- **Error Handling** with custom filters
- **Logging** with custom interceptors
- **Rate Limiting** with Throttler
- **File Upload** support (avatars, attachments)

### ✅ Database Schemas
- **User** - Authentication, roles, preferences
- **Project** - Project management with members
- **Issue** - Tasks, bugs, stories with time tracking
- **Sprint** - Sprint planning and tracking
- **Comment** - Issue comments with threading
- **Attachment** - File attachments for issues
- **Notification** - Real-time notifications
- **ActivityLog** - Audit trail for all changes

### ✅ Implemented Modules
- **Auth Module** - Complete authentication system
- **Users Module** - User management with CRUD

### 🔄 Modules To Implement
- **Projects Module** - Project CRUD, member management
- **Issues Module** - Issue tracking, filtering, time logs
- **Sprints Module** - Sprint management, velocity tracking
- **Comments Module** - Comment system with mentions
- **Notifications Module** - Notification center
- **Attachments Module** - File management
- **Activity Logs Module** - Change tracking
- **Reports Module** - Analytics and statistics
- **Mail Module** - Email notifications
- **WebSocket Module** - Real-time updates

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB Atlas account (or local MongoDB)

## 🛠️ Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

3. **Edit `.env` file with your configuration:**
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dar-pm-db
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
CORS_ORIGIN=http://localhost:3000
MAIL_HOST=smtp.gmail.com
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

## 🚀 Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Seed Database
```bash
npm run seed
```

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:3001/api/docs
- **API Base**: http://localhost:3001

## 🔐 Authentication Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "developer"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <access_token>
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

## 👥 User Endpoints

### Get All Users
```http
GET /users
Authorization: Bearer <access_token>
```

### Get User by ID
```http
GET /users/:id
Authorization: Bearer <access_token>
```

### Search Users
```http
GET /users/search?q=john
Authorization: Bearer <access_token>
```

### Update User
```http
PATCH /users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe"
}
```

### Upload Avatar
```http
POST /users/:id/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

avatar: <file>
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── dto/              # Data transfer objects
│   │   ├── guards/           # Auth guards (JWT, Roles)
│   │   ├── strategies/       # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/                # Users module
│   │   ├── dto/
│   │   ├── schemas/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── projects/             # Projects module (TODO)
│   ├── issues/               # Issues module (TODO)
│   ├── sprints/              # Sprints module (TODO)
│   ├── comments/             # Comments module (TODO)
│   ├── notifications/        # Notifications module (TODO)
│   ├── attachments/          # Attachments module (TODO)
│   ├── activity-logs/        # Activity logs module (TODO)
│   ├── reports/              # Reports module (TODO)
│   ├── mail/                 # Mail module (TODO)
│   ├── websocket/            # WebSocket module (TODO)
│   ├── common/               # Common utilities
│   │   ├── decorators/       # Custom decorators
│   │   ├── enums/            # Enums
│   │   ├── filters/          # Exception filters
│   │   ├── interceptors/     # Interceptors
│   │   └── interfaces/       # Interfaces
│   ├── config/               # Configuration
│   ├── database/             # Database module & seeds
│   ├── uploads/              # File uploads
│   ├── app.module.ts         # Main application module
│   └── main.ts               # Application entry point
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
└── README.md
```

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT secret key | `your-secret-key` |
| `JWT_EXPIRATION` | JWT expiration time | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-refresh-secret` |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | `30d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `UPLOAD_DIRECTORY` | Upload directory path | `./uploads` |
| `MAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP user | `your-email@gmail.com` |
| `MAIL_PASSWORD` | SMTP password | `your-app-password` |
| `THROTTLE_TTL` | Rate limit TTL (seconds) | `60` |
| `THROTTLE_LIMIT` | Rate limit max requests | `100` |

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure access and refresh tokens
- **Role-Based Access**: Fine-grained permissions
- **Input Validation**: DTOs with class-validator
- **Rate Limiting**: Throttle guard protection
- **CORS**: Configurable origin policy
- **File Upload Validation**: Type and size checks

## 📝 Next Steps

To complete the backend, implement the following modules (service, controller, module files):

1. **Projects Module** - Use Users module as reference
2. **Issues Module** - Core functionality with time tracking
3. **Sprints Module** - Sprint management
4. **Comments Module** - Commenting system
5. **Notifications Module** - Notification center
6. **Attachments Module** - File handling
7. **Activity Logs Module** - Audit trail
8. **Reports Module** - Analytics endpoints
9. **Mail Module** - NodeMailer integration
10. **WebSocket Module** - Socket.io gateway

All schemas, DTOs, enums, and interfaces are already created. Just implement the service/controller logic following the Users module pattern.

## 📖 Additional Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Passport JWT](http://www.passportjs.org/packages/passport-jwt/)

## 🤝 Support

For issues or questions, contact Dar Blockchain Company development team.

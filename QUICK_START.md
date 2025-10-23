# Quick Start Guide - Dar Blockchain PM

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies (2 minutes)

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### Step 2: Configure Environment (1 minute)

```bash
# Backend
cd backend
cp .env.example .env
```

Edit `backend/.env` - **ONLY CHANGE THIS LINE**:
```env
DATABASE_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/dar-pm-db
```

Keep everything else as default for development.

```bash
# Frontend
cd frontend
cp .env.local.example .env.local
```

No changes needed for local development.

### Step 3: Start Development (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

Wait for: `🚀 Dar Blockchain PM Backend is running!`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Test It Works (1 minute)

Open your browser:
- **API Docs**: http://localhost:3001/api/docs
- **Frontend**: http://localhost:3000 (when implemented)

Test registration in Swagger:
1. Go to http://localhost:3001/api/docs
2. Find `POST /auth/register`
3. Click "Try it out"
4. Use this test data:
```json
{
  "email": "admin@darblockchain.com",
  "password": "Admin123!@#",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```
5. Click "Execute"
6. You should get a 201 response with access token!

---

## 📝 What Works Right Now

### ✅ Backend APIs (Fully Functional)
- `POST /auth/register` - Create new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `GET /users` - List users
- `GET /users/:id` - Get user
- `GET /users/search?q=name` - Search users
- `PATCH /users/:id` - Update user
- `POST /users/:id/avatar` - Upload avatar
- `DELETE /users/:id` - Delete user

### 🔧 What Needs Implementation
- Projects endpoints (schema & DTOs ready)
- Issues endpoints (schema & DTOs ready)
- Sprints endpoints (schema & DTOs ready)
- Comments endpoints (schema & DTOs ready)
- All other features

---

## 🎯 Your First Task: Add Projects Module

**Time**: ~30 minutes

1. **Create service** (`backend/src/projects/projects.service.ts`)
   - Copy structure from `backend/src/users/users.service.ts`
   - Replace `User` with `Project`
   - Schema already exists at `backend/src/projects/schemas/project.schema.ts`

2. **Create controller** (`backend/src/projects/projects.controller.ts`)
   - Copy structure from `backend/src/users/users.controller.ts`
   - Update endpoints for projects
   - DTOs already exist at `backend/src/projects/dto/`

3. **Create module** (`backend/src/projects/projects.module.ts`)
   - Copy structure from `backend/src/users/users.module.ts`
   - Update imports

4. **Register in app** (`backend/src/app.module.ts`)
   - Add `ProjectsModule` to imports array

5. **Test in Swagger**
   - Restart backend: `npm run start:dev`
   - Visit http://localhost:3001/api/docs
   - Look for "Projects" section
   - Try creating a project!

---

## 📚 Key Files Reference

### Backend
```
backend/src/
├── auth/                    ✅ Complete authentication
├── users/                   ✅ Complete user management
├── projects/                🔧 Schema & DTOs ready
├── issues/                  🔧 Schema & DTOs ready
├── sprints/                 🔧 Schema & DTOs ready
├── common/
│   ├── enums/              ✅ All enums defined
│   ├── interfaces/         ✅ All interfaces ready
│   ├── decorators/         ✅ @CurrentUser, @Roles, @Public
│   ├── guards/             ✅ JWT & Roles guards
│   └── filters/            ✅ Error handling
├── config/configuration.ts  ✅ Environment config
├── database/database.module.ts  ✅ MongoDB setup
├── app.module.ts           ✅ Main module
└── main.ts                 ✅ Entry point
```

### Frontend
```
frontend/src/
├── types/                  ✅ All TypeScript types
│   ├── user.ts
│   ├── project.ts
│   ├── issue.ts
│   └── ... (all ready)
├── app/                    🔧 To implement
├── components/             🔧 To implement
├── lib/                    🔧 To implement
└── hooks/                  🔧 To implement
```

---

## 💡 Quick Tips

### Backend Development
- **Always reference**: `backend/src/users/` for patterns
- **DTOs are ready**: Just use them in controllers
- **Schemas are ready**: Just inject them in services
- **Swagger updates automatically**: Just add @Api decorators

### Testing Endpoints
```bash
# Get auth token first
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@darblockchain.com","password":"Admin123!@#"}'

# Use token in requests
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3001 (backend)
npx kill-port 3001

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

**MongoDB connection fails:**
- Check DATABASE_URL in `.env`
- Ensure IP is whitelisted in MongoDB Atlas
- Verify username/password are correct

**TypeScript errors:**
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

---

## 📖 Full Documentation

- **SUMMARY.md** - Complete project overview
- **DEVELOPMENT_GUIDE.md** - Detailed how-to guide
- **PROJECT_STATUS.md** - Progress tracking
- **backend/README.md** - Backend documentation
- **Root README.md** - Project introduction

---

## 🎯 Next Steps (In Order)

1. ✅ Get backend running
2. ✅ Test authentication endpoints
3. 🔄 Implement Projects module
4. 🔄 Implement Issues module
5. 🔄 Implement Sprints module
6. 🔄 Create seed scripts
7. 🔄 Build frontend API client
8. 🔄 Build frontend login page
9. 🔄 Build frontend dashboard

---

## 🆘 Need Help?

1. Check **DEVELOPMENT_GUIDE.md** for detailed examples
2. Look at **backend/src/users/** for working code
3. Review **PROJECT_STATUS.md** for what's done
4. Check Swagger docs: http://localhost:3001/api/docs

---

**Remember**: All schemas, DTOs, enums, and interfaces are already created. You just need to implement the service and controller logic using the Users module as a template!

🚀 **Let's build something amazing!**

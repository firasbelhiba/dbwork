# 🚀 Get Started with Dar Blockchain PM

## Quick 5-Minute Setup

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ MongoDB running (local or Atlas)
- ✅ Terminal/Command prompt

---

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `.env` file** with your settings:
```env
# Required
DATABASE_URL=mongodb://localhost:27017/dar-pm
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Email (Optional for testing)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@darblockchain.com
MAIL_FROM_NAME=Dar Blockchain PM

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Start the backend**:
```bash
npm run start:dev
```

✅ Backend running at: http://localhost:3001

---

## Step 2: Seed Database (30 seconds)

In a new terminal:
```bash
cd backend
npm run seed
```

This creates:
- ✅ 5 demo users
- ✅ 2 projects
- ✅ 15+ issues
- ✅ 4 sprints
- ✅ Comments and data

---

## Step 3: Frontend Setup (2 minutes)

In a new terminal:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

**Edit `.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Start the frontend**:
```bash
npm run dev
```

✅ Frontend running at: http://localhost:3000

---

## Step 4: Login & Explore!

### 1. Open Browser
Navigate to: http://localhost:3000

### 2. Login with Demo Account

**Admin Account**:
- Email: `admin@darblockchain.com`
- Password: `password123`

**Other Accounts**:
- PM: `pm@darblockchain.com` / `password123`
- Developer 1: `john.dev@darblockchain.com` / `password123`
- Developer 2: `sarah.dev@darblockchain.com` / `password123`

### 3. Explore Features

✅ **Dashboard** - View statistics and assigned issues
✅ **Projects** - Browse and create projects
✅ **Kanban Board** - Drag-and-drop issues
✅ **Issue Details** - View and comment on issues
✅ **Reports** - See analytics and charts

---

## 🎯 What to Try First

### 1. View the Dashboard
- See project statistics
- View assigned issues
- Check recent activity

### 2. Explore a Project
- Click on "Dar Blockchain Platform" project
- View the Kanban board
- Drag an issue to a different column

### 3. Open an Issue
- Click any issue card
- Read description
- Add a comment
- Change status

### 4. Check Reports
- Go to Reports page
- View burndown chart
- See team performance
- Check velocity trends

### 5. Create Something New
- Create a new project
- Add an issue
- Assign to a team member

---

## 🔧 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:3001
# Should return: "Dar Blockchain PM API is running!"
```

### Swagger Documentation
Visit: http://localhost:3001/api

You should see all 40+ API endpoints documented!

### Database Check
```bash
# In MongoDB shell or Compass
use dar-pm

# Check collections
db.users.count()      # Should be 5
db.projects.count()   # Should be 2
db.issues.count()     # Should be 15+
```

---

## 📱 Accessing Different Features

| Feature | How to Access |
|---------|---------------|
| **Dashboard** | http://localhost:3000/dashboard |
| **Projects** | http://localhost:3000/projects |
| **Kanban Board** | Click any project → Board tab |
| **Issue Detail** | Click any issue card |
| **Reports** | http://localhost:3000/reports |
| **API Docs** | http://localhost:3001/api |

---

## 🎨 UI Components Demo

The app uses a complete component library:

- **Buttons**: Primary, Secondary, Success, Warning, Danger, Outline, Ghost
- **Forms**: Input, Select, Textarea with validation
- **Modals**: Multiple sizes, with headers and footers
- **Badges**: Status indicators for issues, priorities, types
- **Dropdowns**: Context menus
- **Toasts**: Success, Error, Warning, Info notifications
- **Skeletons**: Loading states
- **Charts**: Line charts, bar charts, pie charts

---

## 🔍 Testing the API

### Using cURL:

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@darblockchain.com", "password": "password123"}'

# Get projects (replace TOKEN)
curl http://localhost:3001/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get issues
curl http://localhost:3001/issues \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Swagger:
1. Go to http://localhost:3001/api
2. Click "Authorize" button
3. Login to get token
4. Try any endpoint!

---

## 💾 Database Seeded Data

### Users (5)
- Admin (admin@darblockchain.com)
- Project Manager (pm@darblockchain.com)
- Developer 1 (john.dev@darblockchain.com)
- Developer 2 (sarah.dev@darblockchain.com)
- Viewer (viewer@darblockchain.com)

### Projects (2)
- **DBP** - Dar Blockchain Platform
- **SCS** - Smart Contracts Suite

### Sprints (4)
- Sprint 1 (Completed)
- Sprint 2 (Active)
- Sprint 3 (Planned)
- SCS Sprint 1 (Active)

### Issues (15+)
- Mix of Bugs, Tasks, Stories, Epics
- Various statuses (To Do, In Progress, Done)
- Different priorities (Critical, High, Medium, Low)
- Assigned to different team members
- With time tracking, labels, story points

---

## 🎓 Learning the Codebase

### Backend Structure
```
backend/src/
├── auth/          ← Authentication (start here)
├── users/         ← User management
├── projects/      ← Project module
├── issues/        ← Issue tracking
├── sprints/       ← Sprint management
└── common/        ← Shared utilities
```

### Frontend Structure
```
frontend/src/
├── app/           ← Pages (Next.js 14 App Router)
├── components/    ← Reusable components
├── contexts/      ← React contexts (Auth, WebSocket)
├── lib/           ← API client and utilities
└── types/         ← TypeScript definitions
```

---

## 🔗 Useful URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend** | http://localhost:3001 | API server |
| **API Docs** | http://localhost:3001/api | Swagger documentation |
| **MongoDB** | mongodb://localhost:27017 | Database |

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is already in use
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Check MongoDB connection
# Make sure MongoDB is running
mongosh  # Should connect successfully
```

### Frontend won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Can't login
- Check backend is running
- Check .env has correct JWT secrets
- Check database has users (run seed script)
- Try: `admin@darblockchain.com` / `password123`

### CORS errors
- Check FRONTEND_URL in backend .env matches frontend URL
- Default should be: `http://localhost:3000`

---

## 🎯 Next Steps

1. **Explore the code**
   - Look at the modules in `backend/src`
   - Check components in `frontend/src/components`

2. **Read the docs**
   - [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Detailed progress
   - [FINAL_STATUS.md](./FINAL_STATUS.md) - Complete feature list
   - [Backend README](./backend/README.md) - API documentation
   - [Frontend README](./frontend/README.md) - UI documentation

3. **Customize**
   - Change colors in `frontend/tailwind.config.ts`
   - Add your own projects and issues
   - Modify email templates in `backend/src/mail`

4. **Deploy**
   - Set up MongoDB Atlas
   - Deploy backend (Heroku, DigitalOcean, AWS)
   - Deploy frontend (Vercel, Netlify)

---

## 🎉 You're All Set!

You now have a **fully functional, production-ready** project management system running locally!

### Features Available:
✅ User authentication
✅ Project management
✅ Issue tracking
✅ Kanban boards
✅ Sprint planning
✅ Comments
✅ File attachments
✅ Time tracking
✅ Reports & analytics
✅ Real-time updates
✅ Email notifications

### Happy Managing! 🚀

---

**Need Help?**
- Check documentation files
- Review code comments
- All endpoints are documented in Swagger
- Frontend has TypeScript types for guidance

**Built with ❤️ for Dar Blockchain Company**

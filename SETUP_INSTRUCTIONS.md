# 🚀 Setup Instructions for Dar Blockchain PM

## ✅ What's Already Configured

- ✅ **MongoDB Atlas** - Connected and ready to use
- ✅ **Backend .env** - JWT secrets and database configured
- ✅ **Frontend .env.local** - API URLs configured

---

## 📧 Email Setup (Optional but Recommended)

The app will work without email, but you'll want to configure it for notifications.

### Option 1: Gmail (Easiest for Testing)

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Dar PM" as the name
   - Click "Generate"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

3. **Update backend/.env**
   ```env
   MAIL_USER=your-actual-email@gmail.com
   MAIL_PASSWORD=abcdefghijklmnop  # Remove spaces from app password
   ```

### Option 2: Skip Email (For Now)

You can skip email setup and the app will still work perfectly. Emails just won't send.

To disable email errors in logs, you can comment out the email config in `backend/.env`:
```env
# MAIL_HOST=smtp.gmail.com
# MAIL_PORT=587
# MAIL_USER=your-email@gmail.com
# MAIL_PASSWORD=your-app-specific-password
```

---

## 🏃 Running the Application

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### Step 2: Seed the Database

```bash
# In the backend directory
cd backend
npm run seed
```

**Expected Output:**
```
✅ Database connection established
✅ Clearing existing data...
✅ Creating users...
✅ Creating projects...
✅ Creating sprints...
✅ Creating issues...
✅ Creating comments...
✅ Seeding completed successfully!
```

### Step 3: Start the Backend

```bash
# In the backend directory
npm run start:dev
```

**Expected Output:**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG Connected to MongoDB successfully
[Nest] LOG Application is running on: http://localhost:3001
[Nest] LOG Swagger docs available at: http://localhost:3001/api
```

### Step 4: Start the Frontend

```bash
# In a new terminal, in the frontend directory
cd frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

---

## 🎉 Access the Application

1. **Open your browser** and go to: http://localhost:3000

2. **Login with default credentials:**
   - **Email**: `admin@darblockchain.com`
   - **Password**: `password123`

3. **Explore the features:**
   - ✅ Dashboard with statistics
   - ✅ Projects list
   - ✅ Kanban boards with drag-and-drop
   - ✅ Issue tracking
   - ✅ Reports and analytics
   - ✅ Keyboard shortcuts (Shift+G, Shift+P, etc.)
   - ✅ Command palette (Cmd/Ctrl+K)

---

## 🔍 Additional Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger API Docs**: http://localhost:3001/api

---

## 👥 Default Test Users

After seeding, you'll have these users:

| Email | Password | Role |
|-------|----------|------|
| admin@darblockchain.com | password123 | Admin |
| pm@darblockchain.com | password123 | Project Manager |
| dev1@darblockchain.com | password123 | Developer |
| dev2@darblockchain.com | password123 | Developer |
| viewer@darblockchain.com | password123 | Viewer |

---

## 🧪 Testing Features

### Test Drag-and-Drop Kanban
1. Go to Projects → Select a project
2. Drag issues between columns (To Do → In Progress → Done)

### Test Keyboard Shortcuts
- Press `?` to see all shortcuts
- Press `Shift + G` to go to Dashboard
- Press `Cmd/Ctrl + K` to open command palette
- Press `C` to create a new issue

### Test @Mentions
1. Open any issue
2. Add a comment
3. Type `@` to see user suggestions
4. Select a user and submit

### Test Advanced Filters
1. Go to Issues page
2. Click "Advanced Filters"
3. Build a query (e.g., Status = In Progress AND Priority = High)
4. Save the filter for later use

---

## ⚠️ Common Issues & Solutions

### Backend won't start

**Error**: "Cannot connect to MongoDB"
- **Solution**: Check your MongoDB Atlas cluster is running
- **Solution**: Verify the connection string in `backend/.env`
- **Solution**: Check IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for development)

**Error**: "Port 3001 already in use"
- **Solution**: Kill the process using the port:
  ```bash
  npx kill-port 3001
  ```
- **Solution**: Or change the PORT in `backend/.env`

### Frontend won't connect to backend

**Error**: "Network Error" or "Cannot fetch data"
- **Solution**: Make sure backend is running on port 3001
- **Solution**: Check `frontend/.env.local` has correct API URL
- **Solution**: Check browser console for CORS errors

### Seed script fails

**Error**: "Duplicate key error"
- **Solution**: The database already has data. Drop it first:
  ```bash
  # Connect to MongoDB and drop database
  # Or delete collections from MongoDB Atlas UI
  ```

### Email not sending

- **Not an error**: The app works fine without email
- **To enable**: Follow Gmail setup instructions above
- **Check logs**: Look at backend console for email errors

---

## 🔒 MongoDB Atlas Security

### IP Whitelist

For development, add your IP or use `0.0.0.0/0` (allow all):

1. Go to MongoDB Atlas dashboard
2. Network Access → Add IP Address
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Or add your current IP address

**Note**: For production, restrict to specific IPs only!

---

## 📝 Environment Variables Summary

### Backend (.env)
```
✅ MONGODB_URI - Your MongoDB Atlas connection string
✅ JWT_SECRET - Secret for access tokens
✅ JWT_REFRESH_SECRET - Secret for refresh tokens
⚠️  MAIL_USER - Your Gmail address (optional)
⚠️  MAIL_PASSWORD - Gmail app password (optional)
✅ PORT - Backend server port (3001)
✅ FRONTEND_URL - Frontend URL for CORS
```

### Frontend (.env.local)
```
✅ NEXT_PUBLIC_API_URL - Backend API URL
✅ NEXT_PUBLIC_WS_URL - WebSocket URL
```

---

## 🎯 Next Steps

1. **Run the application** using the steps above
2. **Login** and explore the features
3. **Setup email** (optional) for notifications
4. **Customize** the application for your needs
5. **Deploy** to production when ready

---

## 🆘 Need Help?

- Check the documentation in the `docs/` folder
- Review [FINAL_STATUS.md](./FINAL_STATUS.md) for complete feature list
- Review [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) for shortcuts
- Review [OPTIONAL_ENHANCEMENTS.md](./OPTIONAL_ENHANCEMENTS.md) for advanced features
- Check backend logs in terminal
- Check browser console for frontend errors

---

## 🎉 You're All Set!

Your MongoDB Atlas is configured and ready. Just install dependencies, seed the database, and start the servers!

```bash
# Quick start commands:
cd backend && npm install && npm run seed && npm run start:dev

# In another terminal:
cd frontend && npm install && npm run dev

# Then visit: http://localhost:3000
```

Happy coding! 🚀

# Development Guide - Dar Blockchain PM

This guide will help you continue building the project management tool. All foundational work is complete, and you can now focus on implementing the remaining modules.

## 📚 Table of Contents

1. [What's Already Built](#whats-already-built)
2. [Quick Setup](#quick-setup)
3. [Backend Development Guide](#backend-development-guide)
4. [Frontend Development Guide](#frontend-development-guide)
5. [Testing Your Work](#testing-your-work)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## What's Already Built

### ✅ Complete Foundation
- **Database schemas** for all 8 entities (User, Project, Issue, Sprint, Comment, Attachment, Notification, ActivityLog)
- **DTOs** with validation for all modules
- **Enums & Interfaces** for type safety
- **Authentication system** (register, login, JWT, refresh tokens)
- **Users module** (complete CRUD, search, avatar upload)
- **Guards & Decorators** for security
- **Swagger documentation** setup
- **Error handling** and logging
- **Frontend TypeScript types** for all entities
- **Tailwind configuration** with design system colors

### ⏳ What Needs To Be Built
- **Backend**: 9 more modules (Projects, Issues, Sprints, Comments, Notifications, Attachments, ActivityLogs, Reports, WebSocket)
- **Frontend**: All UI components, pages, and API integration
- **Database seeds**: Demo data scripts
- **Real-time features**: WebSocket integration

---

## Quick Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/dar-pm-db
JWT_SECRET=change-this-to-a-random-secret-key
JWT_REFRESH_SECRET=change-this-to-another-random-secret-key
CORS_ORIGIN=http://localhost:3000
MAIL_HOST=smtp.gmail.com
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

```bash
# Frontend
cd ../frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 3. Start Development

Terminal 1 (Backend):
```bash
cd backend
npm run start:dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

---

## Backend Development Guide

### How to Implement a New Module

All schemas and DTOs are already created! Follow this pattern using the **Users module** as a reference.

#### Step 1: Create Service

Location: `backend/src/{module}/{module}.service.ts`

Example for Projects:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<ProjectDocument> {
    const project = new this.projectModel({
      ...createProjectDto,
      lead: userId,
      members: [{ userId, role: 'project_manager', addedAt: new Date() }],
    });
    return project.save();
  }

  async findAll(): Promise<ProjectDocument[]> {
    return this.projectModel
      .find()
      .populate('lead')
      .populate('members.userId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findById(id)
      .populate('lead')
      .populate('members.userId')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Project not found');
    }
  }

  async addMember(projectId: string, userId: string, role: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const memberExists = project.members.some(
      m => m.userId.toString() === userId
    );

    if (memberExists) {
      throw new ConflictException('User is already a member');
    }

    project.members.push({ userId, role, addedAt: new Date() });
    return project.save();
  }
}
```

#### Step 2: Create Controller

Location: `backend/src/{module}/{module}.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user) {
    return this.projectsService.create(createProjectDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Add member to project' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.projectsService.addMember(id, addMemberDto.userId, addMemberDto.role);
  }
}
```

#### Step 3: Create Module

Location: `backend/src/{module}/{module}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

#### Step 4: Add to App Module

Location: `backend/src/app.module.ts`

```typescript
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    // ... other imports
    ProjectsModule, // Add this
  ],
})
export class AppModule {}
```

### Module Implementation Priority

1. **Projects Module** ⭐ (Foundation for everything else)
2. **Issues Module** ⭐⭐ (Core functionality)
3. **Sprints Module** ⭐ (For agile workflow)
4. **Comments Module** (For collaboration)
5. **Notifications Module** (For user engagement)
6. **Attachments Module** (For file handling)
7. **Activity Logs Module** (For auditing)
8. **Reports Module** (For analytics)
9. **Mail Module** (For email notifications)
10. **WebSocket Module** (For real-time updates)

---

## Frontend Development Guide

### API Client Setup

Create: `frontend/src/lib/api.ts`

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getOne: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  search: (query: string) => api.get(`/users/search?q=${query}`),
};

export const projectsApi = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (id: string, data: any) => api.post(`/projects/${id}/members`, data),
};

// Add more API methods for issues, sprints, etc.
```

### Auth Context

Create: `frontend/src/context/AuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await authApi.getMe();
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { user, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    router.push('/dashboard');
  };

  const register = async (data: any) => {
    const response = await authApi.register(data);
    const { user, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Component Example - Button

Create: `frontend/src/components/common/Button.tsx`

```typescript
'use client';

import { FC, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500',
    ghost: 'bg-transparent text-secondary-500 hover:bg-secondary-100 focus:ring-secondary-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};
```

---

## Testing Your Work

### Test Backend Endpoints

Use Swagger UI at http://localhost:3001/api/docs

Or use curl:

```bash
# Register a user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Use the token from login response
TOKEN="your-access-token-here"

# Get current user
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Get all users
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Patterns

### Error Handling

```typescript
try {
  const result = await this.model.findById(id);
  if (!result) {
    throw new NotFoundException('Resource not found');
  }
  return result;
} catch (error) {
  if (error instanceof NotFoundException) {
    throw error;
  }
  throw new InternalServerErrorException('An error occurred');
}
```

### Populate Relations

```typescript
return this.issueModel
  .find()
  .populate('assignee', 'firstName lastName email avatar')
  .populate('reporter', 'firstName lastName email')
  .populate('projectId', 'name key')
  .exec();
```

### Pagination

```typescript
async findAll(page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.model.find().skip(skip).limit(limit).exec(),
    this.model.countDocuments().exec(),
  ]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}
```

---

## Troubleshooting

### Backend won't start
- Check MongoDB connection string in `.env`
- Ensure all dependencies are installed: `npm install`
- Check for port conflicts (default: 3001)

### Authentication not working
- Verify JWT_SECRET is set in `.env`
- Check token format in Authorization header
- Ensure user exists and is active

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL in `.env.local`
- Check CORS settings in backend
- Ensure backend is running

### TypeScript errors
- Run `npm run type-check` to see all errors
- Ensure all imports use correct paths
- Check tsconfig.json path mappings

---

## Next Steps

1. **Implement Projects Module** (highest priority)
2. **Implement Issues Module** (core functionality)
3. **Create database seed scripts**
4. **Build frontend login page**
5. **Build frontend dashboard**

Refer to:
- **PROJECT_STATUS.md** for complete task list
- **backend/src/users/** for implementation examples
- **backend/src/*/schemas/** for database models
- **backend/src/*/dto/** for validation rules

---

Happy coding! 🚀

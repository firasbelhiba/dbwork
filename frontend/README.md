# Dar Blockchain PM - Frontend

Modern, responsive project management frontend built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **State Management**: React Context API
- **Form Validation**: Built-in with controlled components

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── dashboard/          # Dashboard page
│   │   ├── login/              # Login page
│   │   ├── projects/           # Projects pages
│   │   │   └── [id]/           # Dynamic project detail
│   │   ├── issues/             # Issues pages
│   │   │   └── [id]/           # Dynamic issue detail
│   │   ├── reports/            # Reports & analytics
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home page with redirect
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── common/             # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── kanban/             # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── IssueCard.tsx
│   │   │   └── SortableIssueCard.tsx
│   │   └── charts/             # Chart components
│   │       ├── BurndownChart.tsx
│   │       ├── VelocityChart.tsx
│   │       └── IssueStatsPieChart.tsx
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── WebSocketContext.tsx # Real-time connection
│   ├── hooks/                  # Custom React hooks
│   │   ├── useDebounce.ts
│   │   └── useToast.ts
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # Axios API client
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
│       ├── user.ts
│       ├── project.ts
│       ├── issue.ts
│       ├── sprint.ts
│       ├── comment.ts
│       └── notification.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🎨 Features

### Authentication
- ✅ JWT-based authentication
- ✅ Auto token refresh
- ✅ Protected routes
- ✅ User context with hooks

### Dashboard
- ✅ Statistics overview
- ✅ Assigned issues list
- ✅ My projects list
- ✅ Real-time data

### Projects
- ✅ Projects list with create
- ✅ Project detail with Kanban board
- ✅ Sprint selector
- ✅ Team members display

### Kanban Board
- ✅ Drag-and-drop functionality
- ✅ 4 status columns (To Do, In Progress, In Review, Done)
- ✅ Issue cards with badges
- ✅ Real-time updates ready
- ✅ Optimistic UI updates

### Issues
- ✅ Issue detail page
- ✅ Comments section
- ✅ Status management
- ✅ Time tracking display
- ✅ Assignee & reporter info
- ✅ Labels and metadata

### Reports & Analytics
- ✅ Project progress metrics
- ✅ Issue statistics with pie charts
- ✅ Velocity trend chart
- ✅ Sprint burndown chart
- ✅ Team performance table
- ✅ Time tracking summary

### UI Components
- ✅ Button (8 variants)
- ✅ Input with validation
- ✅ Select dropdown
- ✅ Textarea
- ✅ Modal dialog
- ✅ Badge (status indicators)
- ✅ Dropdown menu
- ✅ Toast notifications
- ✅ Loading spinner
- ✅ Skeleton loaders

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm 9+
- Backend server running on `http://localhost:3001`

### Installation

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Set up environment variables**:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Run development server**:
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🎯 Available Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to dashboard or login |
| `/login` | Login page |
| `/dashboard` | Main dashboard with stats |
| `/projects` | Projects list |
| `/projects/[id]` | Project detail with Kanban |
| `/issues/[id]` | Issue detail with comments |
| `/reports` | Analytics and charts |

## 🔑 Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@darblockchain.com | password123 | Admin |
| pm@darblockchain.com | password123 | Project Manager |
| john.dev@darblockchain.com | password123 | Developer |
| sarah.dev@darblockchain.com | password123 | Developer |

## 📦 API Integration

### API Client (`src/lib/api.ts`)

Complete API client with:
- ✅ Automatic token refresh
- ✅ Request/response interceptors
- ✅ Error handling
- ✅ All endpoint methods

Example usage:
```typescript
import { projectsAPI, issuesAPI } from '@/lib/api';

// Fetch projects
const response = await projectsAPI.getAll();
const projects = response.data;

// Create issue
await issuesAPI.create({
  title: 'New issue',
  description: 'Description',
  projectId: 'xxx',
  type: 'task',
  priority: 'medium',
  status: 'todo',
});
```

### Context Usage

```typescript
// Authentication
const { user, login, logout } = useAuth();

// WebSocket
const { socket, joinProject, leaveProject } = useWebSocket();
```

## 🎨 Theming

### Colors (Tailwind)
```css
Primary: #0052CC (blue)
Secondary: #172B4D (dark blue)
Success: #00875A (green)
Warning: #FF991F (orange)
Danger: #DE350B (red)
```

### Component Variants
```typescript
<Button variant="primary" size="md">Click me</Button>
<Badge variant="success">Active</Badge>
```

## 🔄 Real-time Features

WebSocket connection automatically established on login:

```typescript
// Join project room
joinProject(projectId);

// Listen for events
socket?.on('issue:updated', (data) => {
  // Handle real-time update
});
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Responsive grid layouts
- Mobile-friendly navigation

## 🧪 Development Tips

### Hot Reload
Next.js automatically reloads on file changes

### TypeScript
All components are fully typed. Use the types from `src/types/`

### Styling
Use Tailwind utility classes. Custom styles in `globals.css`

### State Management
- Use Context for global state (Auth, WebSocket)
- Use local state for component-specific data
- Use custom hooks for reusable logic

## 🚧 Roadmap

### Upcoming Features
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts (Cmd+K command palette)
- [ ] Markdown support in descriptions
- [ ] @mentions autocomplete
- [ ] File drag-and-drop
- [ ] Mobile app (PWA)
- [ ] Offline support
- [ ] Advanced filtering
- [ ] Saved filters
- [ ] Custom fields
- [ ] Issue templates

## 📄 License

MIT

## 👥 Team

Dar Blockchain Company

---

**Built with ❤️ using Next.js 14 and TypeScript**

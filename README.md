# Ridgeline

A full-stack project management and team collaboration platform built from scratch. Three separate portals — Administrator, Project Manager, and Team Member — each with their own dashboard, permissions, and workflow. All backed by a single API with role-based access control enforced server-side.

---

## What it does

Organizations use Ridgeline to plan projects, assign tasks, track progress, and keep teams aligned without the noise. Every role sees exactly what they need — nothing more, nothing less.

**Administrators** have full control. They manage users, create projects, assign managers, and monitor everything from a single dashboard with charts and overdue task tracking.

**Project Managers** run the projects assigned to them. They build their team, create and assign tasks, set priorities and deadlines, and watch progress move through the kanban board.

**Team Members** focus on their work. They see their assigned tasks, update statuses, attach files, and communicate with their manager through per-task discussion threads.

---

## Features

- Role-based authentication with JWT and bcrypt
- Three separate portal experiences on one codebase
- Project workspace with Overview, Tasks (kanban), and Team tabs
- Task discussion threads with real-time notifications via SSE
- File attachments on tasks (up to 5 MB, stored in the database)
- Activity timeline showing everything that happened across the workspace
- Calendar view with tasks mapped to due dates
- Dark and light theme with persistence
- Notification center with type filtering and mark-as-read
- Dashboard charts using Recharts — bar charts, pie charts, progress bars
- Search, filter, and sort on every list view
- Password change, profile editing, account deactivation
- Deadline approaching notifications (checked hourly)
- Toast notifications for every user action

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7, Recharts |
| Backend | Node.js, Express 5 |
| Database | Turso (libSQL) in production, SQLite locally |
| Auth | JWT (7-day tokens), bcrypt |
| Validation | Zod with field-level error messages |
| Deployment | Vercel (frontend + API functions) |

---

## Project structure

```
ridgeline/
├── api/
│   └── index.js           Vercel serverless entry point
├── server/
│   └── src/
│       ├── db/            schema.sql, connection.js, seed.js
│       ├── routes/        auth, adminUsers, projects, tasks, comments,
│       │                  notifications, dashboard, activity, attachments
│       ├── middleware/    auth guard, error handler
│       └── utils/         jwt, validators, access control,
│                          notifications, activity log, deadline check
└── web/
    └── src/
        ├── pages/
        │   ├── shared/    Login, Register, Dashboard, Projects,
        │   │              ProjectDetail, TaskDetail, Notifications,
        │   │              Profile, Timeline, Calendar, NotFound
        │   ├── admin/     Users
        │   └── member/    MyTasks
        ├── components/    AppLayout, RequireRole, Badges, Modal
        ├── context/       AuthContext, ThemeContext, ToastContext
        └── lib/           api.js, format.js
```

---

## Running locally

Requires Node.js 22+.

```bash
# Install dependencies for both server and web
npm run install:all

# Terminal 1 — API (auto-migrates and seeds on first run)
npm run dev:server

# Terminal 2 — React dev server
npm run dev:web
```

App runs at `http://localhost:5173`, API at `http://localhost:4000`.

---

## Deploying to Vercel

You need a free Turso database for production. Turso is a hosted SQLite-compatible database that works with the serverless environment Vercel uses.

**1. Create a Turso database**

Go to [turso.tech](https://turso.tech), sign up with GitHub, create a database called `ridgeline`, then generate an auth token. You'll need the database URL and token.

**2. Push to GitHub**

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/ridgeline.git
git push -u origin main
```

**3. Deploy on Vercel**

Go to [vercel.com](https://vercel.com), import the repo, and before deploying add these environment variables:

```
TURSO_DATABASE_URL   libsql://ridgeline-yourname.turso.io
TURSO_AUTH_TOKEN     your-token-here
JWT_SECRET           any-long-random-string
```

Click Deploy. The app migrates the schema and seeds demo data automatically on the first request.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator | admin@ridgeline.test | Admin@123 |
| Project Manager | manager1@ridgeline.test | Manager@123 |
| Project Manager | manager2@ridgeline.test | Manager@123 |
| Team Member | member1@ridgeline.test | Member@123 |
| Team Member | member2@ridgeline.test | Member@123 |
| Team Member | member3@ridgeline.test | Member@123 |
| Team Member | member4@ridgeline.test | Member@123 |

---

## Database schema

```
users              id, name, email, password_hash, role, title, is_active
projects           id, name, description, dates, priority, status, manager_id
project_members    project_id, user_id
tasks              id, project_id, title, description, assignee_id, priority, status, due_date
task_comments      id, task_id, user_id, message
task_attachments   id, task_id, user_id, filename, stored_as (base64), mime_type, size_bytes
notifications      id, user_id, type, message, project_id, task_id, is_read
activity_log       id, actor_id, action, entity, detail, project_id, task_id
```

---

## Security

Every write endpoint re-validates the caller's role from the database on each request. Project managers can only touch their own projects — this is enforced server-side, not just in the UI. Team members can only update tasks assigned to them. Self-registration always creates a `member` role; admins and managers are provisioned through the Admin Portal only.

---

Built for an internship evaluation. Original application — not a clone of Trello, Asana, Jira, or any other platform.

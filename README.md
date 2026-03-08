# Reminder OS

A production-ready personal reminder system with recurring schedules, advance notifications, ntfy push delivery, and a full calendar view. Built with Next.js 15, MongoDB, and the RRULE standard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Pages & UI](#pages--ui)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [Scheduling & Job Processing](#scheduling--job-processing)
- [Recurrence System](#recurrence-system)
- [ntfy Integration](#ntfy-integration)
- [Calendar & iCal Export](#calendar--ical-export)
- [Security](#security)
- [Production Deployment](#production-deployment)
- [Project Structure](#project-structure)

---

## Features

- **Reminder types** — One-time, recurring (RRULE), deadline, and habit reminders
- **Advance notifications** — Multiple offsets per reminder (e.g. "15 minutes before" and "1 day before")
- **Multiple delivery targets** — Send each reminder to several ntfy topics simultaneously
- **Push notifications via ntfy** — Supports public ntfy.sh or self-hosted instances with optional Bearer token auth
- **Calendar view** — FullCalendar month/week/day views with urgency colour-coding
- **iCal / WebCal export** — RFC 5545 compliant feed for Apple Calendar, Outlook, Google Calendar
- **User-friendly recurrence UI** — Visual picker for daily/weekly/monthly/yearly rules with excluded dates
- **Notification history** — Paginated delivery log with retry tracking
- **Session authentication** — Single-user login with HMAC-SHA256 signed cookies
- **Resilient scheduling** — Trigger.dev primary + in-process poller fallback with exponential backoff retry

---

## Tech Stack

| Category | Package | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.2.0 |
| UI | React | 19.0.0 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 3.4.16 |
| Icons | Lucide React | 0.511.0 |
| Toasts | Sonner | 2.0.3 |
| Database | Mongoose | 8.9.1 |
| Validation | Zod | 3.24.1 |
| Forms | React Hook Form | 7.54.2 |
| Recurrence | rrule | 2.8.1 |
| Calendar | FullCalendar (daygrid, timegrid) | 6.1.19 |
| Background jobs | Trigger.dev SDK | 3.3.12 |
| Date utilities | date-fns | 4.1.0 |
| Class merging | tailwind-merge + clsx | 2.5.5 / 2.1.1 |

---

## Architecture Overview

```
Browser
  └── Next.js App Router (app/)
        ├── Server Components (dashboard stats, SSR)
        ├── Client Components (forms, calendar, tables)
        └── Route Handlers (app/api/)
              ├── Auth       → /api/auth/login, /api/auth/logout
              ├── Reminders  → /api/reminders, /api/reminders/[id]
              ├── Categories → /api/categories, /api/categories/[id]
              ├── Publishers → /api/publishers, /api/publishers/[id]
              ├── Calendar   → /api/calendar, /api/calendar/ical
              ├── History    → /api/history
              └── Internal   → /api/internal/process-due, /api/trigger

MongoDB (via Mongoose)
  ├── Reminder       — reminder config + nextTriggerAt
  ├── Category       — organisation tags with colour + icon
  ├── Publisher      — ntfy server/topic config (tokens encrypted at rest)
  └── DeliveryJob    — work queue (idempotent, TTL 90 days)

Job Execution (hybrid)
  ├── Trigger.dev    — cloud-managed delayed tasks (primary)
  └── In-process     — setInterval poller every 30 s (fallback)

ntfy
  └── HTTP header API → X-Title, X-Priority, X-Tags, X-Actions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5.0+ (local or Atlas)
- An ntfy server (public `https://ntfy.sh` or self-hosted)

### Installation

```bash
git clone <repo-url>
cd nextjs-reminder-app
npm install
```

### Configure environment

Copy `.env` and fill in the required values:

```bash
cp .env .env.local
```

Edit `.env.local` — see [Environment Variables](#environment-variables) for the full reference.

### Start MongoDB

```bash
# Local
mongod

# Or use MongoDB Atlas — update MONGODB_URI to your SRV connection string
```

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

### Seed sample data (optional)

```bash
npm run seed
```

Creates example reminders (doctor appointment, workout, bill payment, deadline, habit).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | MongoDB connection string |
| `APP_PASSWORD` | ✅ | — | Login password — **change this** |
| `APP_SECRET` | ✅ | — | Session signing secret (32+ chars random string) |
| `INTERNAL_JOB_SECRET` | ✅ | — | Protects `/api/internal/*` + used as ntfy token encryption key |
| `APP_USERNAME` | | `admin` | Login username |
| `NEXT_PUBLIC_APP_URL` | | `http://localhost:3000` | Public app URL (used for links) |
| `NTFY_DEFAULT_SERVER_URL` | | `https://ntfy.sh` | Default ntfy server URL |
| `TRIGGER_SECRET_KEY` | | — | Trigger.dev API key (optional, falls back to in-process poller) |
| `TRIGGER_PROJECT_REF` | | — | Trigger.dev project reference |

> **Security:** All three of `APP_PASSWORD`, `APP_SECRET`, and `INTERNAL_JOB_SECRET` should be long, random strings in production. Never commit real values to source control.

---

## Authentication

Authentication uses a custom session system with no external library dependencies.

**Flow:**
1. User submits username + password at `/login`
2. `POST /api/auth/login` validates against `APP_USERNAME` / `APP_PASSWORD`
3. On success, a signed session token is set as an **HTTP-only cookie** (`reminder_session`, 7-day expiry)
4. `middleware.ts` validates the token on every request and redirects to `/login` if invalid

**Token format:** `base64url(JSON payload) . HMAC-SHA256 signature`

The token payload contains `{ sub, iat, exp }`. Signing uses the **Web Crypto API** (`crypto.subtle`) so it works in both Node.js and the Edge Runtime.

**Public routes** (no auth required):
- `/login`
- `/api/auth/login`
- `/api/calendar/ical` (iCal feed — must be public for calendar app subscriptions)

---

## Pages & UI

### Dashboard `/`
Stats overview (total reminders, active, due in 24 h, failed deliveries) plus a quick-start guide.

### Reminders `/reminders`
- **Create form** — collapsible panel with all fields: title, type, dates, category, urgency, icon, reminder offsets, delivery targets, and recurrence settings
- **Reminders table** — lists all reminders with urgency/status badges, next notification time (accounting for offsets), and inline actions (edit, pause/resume, archive, delete)

### Edit Reminder `/reminders/[id]`
Full edit form pre-filled from the database. Saving cancels existing pending jobs and re-enqueues new ones.

### Categories `/categories`
Create and manage categories with name, hex colour, icon, and description. Categories are used to organise reminders.

### Settings `/settings`
Manage **ntfy publishers** (delivery targets):
- Server URL and topic
- Auth mode: none or Bearer token (token stored AES-256-GCM encrypted)
- Mark one as default
- Test button sends a live notification immediately

### Calendar `/calendar`
- Month / week / day views via FullCalendar
- Events coloured by urgency (green → blue → orange → red)
- Click any event to see details and link to the edit page
- **Upcoming sidebar** — next 14 days grouped by date
- **Subscribe button** — download `.ics`, open via `webcal://`, or copy HTTPS URL for Google Calendar

### History `/history`
Paginated delivery log (20 rows/page) showing every job attempt with status, scheduled time, sent time, attempt count, and last error.

---

## API Reference

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password}` | Creates session cookie |
| POST | `/api/auth/logout` | — | Clears session cookie |

### Reminders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reminders` | List all reminders |
| POST | `/api/reminders` | Create reminder |
| GET | `/api/reminders/:id` | Get single reminder |
| PATCH | `/api/reminders/:id` | Partial update |
| DELETE | `/api/reminders/:id` | Delete reminder + all associated jobs |

**Create/update body:**
```jsonc
{
  "title": "Take medication",          // required, 1–140 chars
  "description": "With food",          // optional
  "type": "recurring",                 // one_time | recurring | deadline | habit
  "status": "active",                  // active | paused | completed | archived
  "categoryId": "<objectId>",          // optional
  "urgency": "high",                   // low | medium | high | critical
  "iconKey": "Pill",
  "timezone": "Europe/Istanbul",
  "allDay": false,
  "startAt": "2026-03-10T08:00:00Z",
  "endAt": null,
  "rrule": "FREQ=DAILY;INTERVAL=1",    // recurring only
  "excludedDates": ["2026-03-15T00:00:00Z"],
  "reminderOffsets": [
    { "value": 15, "unit": "minutes" },
    { "value": 1,  "unit": "hours" }
  ],
  "deliveries": [
    {
      "publisherId": "<objectId>",
      "priority": 4,
      "tags": ["health"],
      "clickUrl": "https://example.com"
    }
  ]
}
```

### Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Publishers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/publishers` | List publishers (tokens shown as `***`) |
| POST | `/api/publishers` | Create publisher |
| PATCH | `/api/publishers/:id` | Update publisher |
| DELETE | `/api/publishers/:id` | Delete publisher |

### Calendar & History

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/calendar?from=ISO&to=ISO` | Events in date range |
| GET | `/api/calendar/ical` | RFC 5545 iCal feed (public, no auth) |
| GET | `/api/history?page=N` | Paginated delivery jobs (20/page) |
| POST | `/api/test-notification` | Send test notification `{publisherId}` |

---

## Database Models

### Reminder

| Field | Type | Notes |
|---|---|---|
| `title` | String | Required, trimmed |
| `description` | String | Default `""` |
| `type` | Enum | `one_time` `recurring` `deadline` `habit` |
| `status` | Enum | `active` `paused` `completed` `archived` |
| `categoryId` | ObjectId | Ref → Category |
| `urgency` | Enum | `low` `medium` `high` `critical` |
| `iconKey` | String | Lucide icon name |
| `timezone` | String | IANA timezone |
| `allDay` | Boolean | |
| `startAt` | Date | Required |
| `endAt` | Date | Optional |
| `rrule` | String | RRULE text (recurring only) |
| `excludedDates` | Date[] | Skipped occurrences |
| `reminderOffsets` | `[{value, unit}]` | Advance notification times |
| `deliveries` | `[{publisherId, priority, tags, clickUrl}]` | ntfy targets |
| `lastTriggeredAt` | Date | Last fired occurrence |
| `nextTriggerAt` | Date | Computed next occurrence |

### DeliveryJob (work queue)

| Field | Type | Notes |
|---|---|---|
| `reminderId` | ObjectId | Ref → Reminder |
| `status` | Enum | `pending` `processing` `sent` `failed` `cancelled` |
| `scheduledFor` | Date | When to execute |
| `idempotencyKey` | String | `sha256(reminderId:triggerAt:offsetMinutes)` — unique |
| `attemptCount` | Number | Incremented each try |
| `lastError` | String | Last error message |
| `sentAt` | Date | Timestamp when sent successfully |
| `payload` | Object | `{triggerAt, offsetMinutes}` |
| `expireAt` | Date | TTL — auto-deleted 90 days after creation |

### Publisher

| Field | Type | Notes |
|---|---|---|
| `name` | String | Unique |
| `serverUrl` | String | e.g. `https://ntfy.sh` |
| `topic` | String | ntfy topic name |
| `authMode` | Enum | `none` or `token` |
| `encryptedToken` | String | AES-256-GCM encrypted Bearer token |
| `isDefault` | Boolean | |

### Category

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, unique |
| `color` | String | Hex colour e.g. `#3b82f6` |
| `defaultIconKey` | String | Lucide icon name |
| `description` | String | Optional |

---

## Scheduling & Job Processing

### Flow

```
Create / update reminder
  │
  ├─ computeAndPersistNextTrigger()
  │    └─ getNextOccurrence(reminder, from = startAt − 1 ms*)
  │         └─ rrulestr(rrule, {dtstart}).after(from, inclusive)
  │              → skips excludedDates
  │
  └─ enqueueOccurrenceJobs()
       ├─ For each reminderOffset + base (0 min):
       │    scheduledFor = nextTriggerAt − offsetMinutes
       │    idempotencyKey = sha256(id:triggerAt:offset)
       │    DeliveryJob.create(...)
       │
       └─ Schedule execution:
            ├─ tryTriggerDev(jobId, delayMs)      → cloud delayed task
            └─ scheduleViaTimeout(jobId, delayMs)  → setTimeout fallback
```

> \* When a reminder has never been triggered, the scheduler starts from `startAt − 1 ms` so the very first occurrence is never skipped even if a few seconds pass between save and compute.

### Retry policy

Failed jobs are retried up to **5 times** with exponential backoff:

| Attempt | Delay |
|---|---|
| 1 | 10 s |
| 2 | 20 s |
| 3 | 40 s |
| 4 | 80 s |
| 5 | 160 s → marked `failed` |

### Poller fallback

When Trigger.dev is not configured, an in-process `setInterval` runs every **30 seconds**, querying for jobs where `status = "pending"` and `scheduledFor ≤ now`. This starts automatically on first database connection.

---

## Recurrence System

Uses the [rrule](https://github.com/jakubroztocil/rrule) library (RFC 5545 compliant).

### Supported patterns

| Pattern | RRULE |
|---|---|
| Every day | `FREQ=DAILY` |
| Every weekday | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| Every Monday & Wednesday | `FREQ=WEEKLY;BYDAY=MO,WE` |
| Every 2 weeks | `FREQ=WEEKLY;INTERVAL=2` |
| Monthly on the 15th | `FREQ=MONTHLY;BYMONTHDAY=15` |
| 10 occurrences only | `FREQ=DAILY;COUNT=10` |
| Until a date | `FREQ=WEEKLY;UNTIL=20261231T235959Z` |

### UI picker

The recurrence form generates RRULE strings visually:
- **Frequency**: Daily / Weekly / Monthly / Yearly
- **Interval**: "Every N ..."
- **Weekly days**: Mon–Sun toggle pills
- **Monthly**: "On day N of the month"
- **End condition**: Never / After N occurrences / On date
- **Skip dates**: Date pills with × to remove; date input to add new ones

---

## ntfy Integration

[ntfy](https://ntfy.sh) is a simple HTTP-based push notification service. Reminder OS publishes using the **HTTP header API**:

```http
POST https://ntfy.sh/your-topic
Content-Type: text/plain; charset=utf-8
X-Title: Take medication
X-Priority: 4
X-Tags: bell,pill
X-Actions: view, Open link, https://example.com

Take medication

📅 Event: Mon, Mar 10, 2026, 8:00 AM
⏱ Advance notice: 15m before
⚡ Priority: High
```

### Urgency → ntfy priority

| Urgency | Priority | Tag |
|---|---|---|
| Low | 2 | `white_check_mark` |
| Medium | 3 | `bell` |
| High | 4 | `warning` |
| Critical | 5 | `rotating_light` |

### Bearer token storage

If a publisher requires authentication, the Bearer token is stored **encrypted at rest** using AES-256-GCM. The key is derived from `INTERNAL_JOB_SECRET`. Tokens are never returned to the client — the API replaces them with `***`.

---

## Calendar & iCal Export

### Calendar view

- Powered by **FullCalendar** — month, week, and day views
- Events coloured by urgency
- Clicking an event opens a detail popup with type, urgency, dates, and a link to edit
- Upcoming sidebar lists the next 14 days grouped by date
- Fully responsive — on mobile the toolbar simplifies and the sidebar stacks below the calendar

### iCal feed

A public RFC 5545 iCal feed is available at:

```
GET /api/calendar/ical
```

Includes all active, paused, and completed reminders. Maps urgency to iCal `PRIORITY` (1 = critical, 9 = low) and status to iCal `STATUS`.

### Subscribing

| Method | How |
|---|---|
| Download `.ics` | Click "Download .ics file" — works on localhost |
| Apple / Outlook (live sync) | Click "Subscribe via webcal://" — requires HTTPS host |
| Google Calendar | Copy HTTPS URL → Other calendars → From URL |

> The iCal endpoint is intentionally **public** so calendar apps can subscribe without a session cookie.

---

## Security

| Concern | Approach |
|---|---|
| Session auth | HMAC-SHA256 signed tokens in HTTP-only cookies |
| ntfy token storage | AES-256-GCM encrypted at rest, key from `INTERNAL_JOB_SECRET` |
| Internal endpoints | `x-internal-secret` header required |
| Input validation | Zod schemas on all API inputs |
| Idempotency | SHA-256 keyed delivery jobs — safe to retry / replay |
| Middleware | All routes protected except `/login` and `/api/calendar/ical` |

---

## Production Deployment

### Build

```bash
npm run build
npm start
```

### Checklist

- [ ] Set strong values for `APP_PASSWORD`, `APP_SECRET`, `INTERNAL_JOB_SECRET`
- [ ] Use MongoDB Atlas or a managed MongoDB instance with `MONGODB_URI`
- [ ] Set `NEXT_PUBLIC_APP_URL` to your public domain
- [ ] Enable HTTPS (required for secure cookies and webcal subscriptions)
- [ ] Configure Trigger.dev (`TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`) for reliable job scheduling
- [ ] Ensure `/api/trigger` is publicly reachable for Trigger.dev webhooks
- [ ] Ensure `/api/calendar/ical` is publicly reachable for calendar subscriptions

### Trigger.dev setup (optional but recommended)

Without Trigger.dev, jobs are scheduled via in-process `setTimeout` and lost on server restart. With Trigger.dev, jobs survive restarts and are cloud-managed.

```bash
npm install -g @trigger.dev/cli
npx trigger deploy
```

---

## Project Structure

```
.
├── app/
│   ├── login/                      # Login page (no sidebar)
│   ├── page.tsx                    # Dashboard (server component)
│   ├── layout.tsx                  # Root layout (AppShell)
│   ├── globals.css                 # Tailwind base + FullCalendar overrides
│   ├── (pages)/
│   │   ├── reminders/
│   │   │   ├── page.tsx            # Reminders list + create form
│   │   │   └── [id]/page.tsx       # Edit reminder
│   │   ├── categories/page.tsx
│   │   ├── settings/page.tsx       # ntfy publishers
│   │   ├── calendar/page.tsx
│   │   └── history/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── reminders/route.ts
│       ├── reminders/[id]/route.ts
│       ├── categories/route.ts
│       ├── categories/[id]/route.ts
│       ├── publishers/route.ts
│       ├── publishers/[id]/route.ts
│       ├── calendar/route.ts
│       ├── calendar/ical/route.ts
│       ├── history/route.ts
│       ├── test-notification/route.ts
│       ├── internal/process-due/route.ts
│       └── trigger/route.ts
├── components/
│   ├── app-shell.tsx               # Sidebar + logout (conditional)
│   ├── nav-links.tsx               # Active-link navigation
│   ├── reminder-calendar.tsx       # FullCalendar wrapper + event popup
│   ├── reminders-table.tsx         # Reminder list table
│   ├── forms/
│   │   ├── reminder-form.tsx       # Create reminder form
│   │   ├── recurrence-picker.tsx   # RRULE visual builder
│   │   ├── offset-picker.tsx       # Advance notification rows
│   │   ├── urgency-picker.tsx      # Priority selector
│   │   └── icon-picker.tsx         # Icon grid
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── badge.tsx
│       └── confirm-dialog.tsx
├── lib/
│   ├── auth/session.ts             # Token create / verify (Web Crypto)
│   ├── db/mongoose.ts              # Connection + poller startup
│   ├── models/
│   │   ├── reminder.ts
│   │   ├── category.ts
│   │   ├── publisher.ts
│   │   └── delivery-job.ts
│   ├── services/
│   │   ├── scheduler.ts            # Enqueue jobs + Trigger.dev
│   │   ├── job-processor.ts        # Execute jobs + retry logic
│   │   ├── ntfy.ts                 # ntfy HTTP client
│   │   ├── poller.ts               # 30 s interval poller
│   │   ├── reconcile.ts            # Due-jobs query
│   │   └── recurrence.ts           # RRULE parsing + occurrence calc
│   ├── validators/
│   │   ├── reminder.ts
│   │   ├── category.ts
│   │   ├── publisher.ts
│   │   └── common.ts
│   └── utils/
│       ├── cn.ts                   # tailwind-merge + clsx
│       ├── crypto.ts               # AES-256-GCM encrypt/decrypt
│       └── http.ts                 # ok() / badRequest() / serverError()
├── middleware.ts                   # Auth guard
├── trigger/
│   ├── client.ts
│   └── tasks.ts                    # process-reminder-job, reconcile-due-jobs
├── scripts/seed.ts
└── .env                            # Environment variables template
```

---

## License

MIT

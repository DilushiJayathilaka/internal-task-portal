# Internal Task Portal

A small internal task portal built with Next.js 16, Prisma, and PostgreSQL.

- **Part 1:** signup/login/logout, a protected task area, task list, create/edit/delete tasks, change status.
- **Part 2:** filter tasks by status and assignee, a task details screen, evidence upload, admin review & approval.

[`Task_2.pdf`](./Task_2.pdf) is the Part 2 design deliverable (process flow map + sprint plan) that this
implementation follows.

## Stack

- **Next.js 16** (App Router, Server Actions, Route Handlers, `proxy.ts`)
- **React 19** / TypeScript
- **Prisma 7** (`@prisma/adapter-pg`) → **PostgreSQL**
- **Vercel Blob** for evidence file storage
- **Tailwind CSS 4** + **shadcn/ui** (`Select`)
- **dnd-kit** for drag-and-drop status changes
- Custom session auth: **bcryptjs** + **jose** (JWT cookie) + **zod** (validation)

## Getting started

> **Note — demo scope:** Part 2 is implemented as a happy-path flow for demonstration purposes, not a
> fully hardened production feature set. The actual system design and sprint plan requested by the brief
> are documented separately in [`Task_2.pdf`](./Task_2.pdf).

> **Test environment:** a live deployment is available at
> **[internal-task-portal.vercel.app](https://internal-task-portal.vercel.app)**, with a dedicated admin
> account for testing:
>
> | Email | Password |
> | --- | --- |
> | `dilushijayathilaka@gmail.com` | `admin@123` |
>
> These credentials are for testing/demo purposes only.

**1. Start PostgreSQL**

```bash
docker compose up -d
```

Starts Postgres 16 on `localhost:5432` with credentials matching `.env.example`. Or point `DATABASE_URL` at
your own instance instead.

**2. Configure environment**

```bash
cp .env.example .env
```

**3. Install, migrate, seed**

```bash
npm install
npm run db:migrate
npm run db:seed   # optional demo data
```

Demo logins (password **Demo1234!**):

| Email | Role |
| --- | --- |
| `demo@example.com` | Creates/owns tasks |
| `assignee@example.com` | Does the work, uploads evidence |
| `admin@example.com` | Reviews evidence, approves completion |

**4. (Optional) Evidence file storage** — see [below](#evidence-storage-setup). Everything else works
without it.

**5. Run it**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

**Other scripts:** `npm run build` · `npm run db:studio` · `npm run db:deploy` · `npm run lint` ·
`npm run make-admin -- <email>` (promote a user to admin)

## Evidence storage setup

Evidence files are stored in **Vercel Blob**, as a **private** store (uploads use `access: "private"`, so
files are only ever readable through this app, not a raw URL).

1. Vercel project → **Storage → Create Database → Blob**.
2. Locally, copy the generated `BLOB_READ_WRITE_TOKEN` into `.env` (or `vercel env pull .env.local`).

Without this token, everything else works normally — only evidence upload fails, with a clear error message.

## Managing user roles

Every user is `USER` or `ADMIN`. `ADMIN` unlocks the Admin Review tab, approving/rejecting evidence, marking
a task `DONE`, and a Users tab for managing everyone else's role.

Admins can promote/demote from the **Users** page in the app. There's no self-service "make me admin," and
an admin can't change their own role — both enforced server-side. To create the *first* admin:

```bash
npm run make-admin -- someone@example.com
```

(Or flip the `role` column via `npm run db:studio`.)

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup   # signup/login (Server Actions)
    (portal)/tasks/               # task list + task detail screen
    (portal)/users/               # admin: manage user roles
    api/tasks/                    # task CRUD, evidence upload/download, approve/request-changes
    api/users/                    # user directory, role changes
  actions/auth.ts                 # signup, login, logout
  components/                     # forms, sidebar, task board/card, detail view, dialogs
  lib/
    dal.ts                        # session/role checks (the real auth gate)
    task-status.ts                # allowed status transitions
    task-dto.ts, types.ts         # Prisma -> client-safe data shapes
    blob.ts                       # evidence file storage
    prisma.ts, session.ts, password.ts, validation.ts, format.ts, rate-limit.ts, user-directory.ts
  proxy.ts                        # route protection + security headers
prisma/schema.prisma               # User, Task, TaskEvidence
```

## Key decisions

- **Shared portal:** every authenticated user sees every task; no ownership restriction on edit/delete.
  Only evidence upload (assignee-only) and approval (`ADMIN`-only) are role-gated.
- **Status flow:** `TODO → IN_PROGRESS → EVIDENCE_SUBMITTED → DONE`, enforced server- and client-side.
  `EVIDENCE_SUBMITTED`/`DONE` are only reachable via evidence upload / admin approval — never a plain status
  edit or drag-and-drop, and approval requires evidence to actually exist.
- **Owner vs. assignee:** the creator (owner) can manage a task; the assignee does the work and uploads
  evidence — they can be different people, which is what makes admin review meaningful.
- **Single approver:** one admin approving is enough to mark a task Done (brief says "an admin user,"
  singular).
- **Role changes take effect immediately** (re-read from the database, not the session cookie) — see
  `lib/dal.ts`.

## Security

- Passwords hashed with bcrypt; sessions are signed JWTs in an `httpOnly` cookie.
- Every Route Handler re-checks auth itself (`proxy.ts`'s check is optimistic/fast-path only).
- Evidence upload/approval/role-change endpoints all re-verify role server-side, not just in the UI.
- Evidence files are private blobs, readable only through an authenticated download route.
- Security headers + a strict CSP, and basic rate limiting on login/signup (`lib/rate-limit.ts`).

## What's left for production

- Distributed rate limiting (current one is in-memory, single-process).
- Database-backed sessions (so a compromised token can be revoked).
- Malware scanning on uploaded evidence.
- Notifications, and automated tests (everything here was verified manually end-to-end).

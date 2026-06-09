# CinePortal — Backend API

[![Express.js](https://img.shields.io/badge/Express-5.2-000000?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.6-5C3EFB)](https://www.better-auth.com/)
[![Stripe](https://img.shields.io/badge/Stripe-22-635BFF?logo=stripe)](https://stripe.com/)

RESTful API server for CinePortal — a movie and series review portal. Provides endpoints for media management, user reviews, watchlists, Stripe subscriptions, and Cloudinary image uploads.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Deployment](#deployment)

---

## Features

- **Media API** — CRUD for movies and series with full metadata (cast, genres, streaming platforms, Cloudinary posters)
- **Reviews** — Create, moderate, and like community reviews with spoiler flags
- **Comments** — Threaded comments on reviews with likes
- **Watchlist** — Per-user watchlist toggle
- **Authentication** — Email/password + Google OAuth via Better Auth; email verification with Nodemailer
- **Subscriptions** — Stripe Checkout, webhook processing, and subscription lifecycle management (monthly / yearly)
- **Admin** — Dashboard stats, review moderation, user management (ban / role), media management
- **File Uploads** — Signed Cloudinary upload credentials (API secret never exposed to client)
- **Security** — Helmet headers, CORS, rate limiting, JWT-based sessions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 20 |
| Framework | Express.js 5.2 |
| Language | TypeScript 5 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (NeonDB) |
| Auth | Better Auth 1.6 |
| Payments | Stripe 22 |
| Email | Nodemailer (Gmail SMTP) |
| File Storage | Cloudinary |
| Validation | Zod v4 |
| Security | Helmet, CORS, bcryptjs |
| Logging | Morgan |
| Dev | tsx, nodemon |

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma           # Prisma data model
├── src/
│   ├── config/
│   │   ├── auth.ts             # Better Auth configuration
│   │   ├── database.ts         # Prisma client singleton
│   │   ├── env.ts              # Validated environment config
│   │   └── email.ts            # Nodemailer transporter
│   ├── middleware/
│   │   ├── auth.middleware.ts  # authenticate, requireVerified, requireAdmin
│   │   └── error.middleware.ts # Global error handler
│   ├── modules/
│   │   ├── admin/              # Admin routes and controller
│   │   ├── comments/           # Comment CRUD and likes
│   │   ├── media/              # Movie/series CRUD
│   │   ├── payments/           # Stripe checkout and webhooks
│   │   ├── reviews/            # Review CRUD, likes, moderation
│   │   ├── stats/              # Platform-wide public stats
│   │   ├── upload/             # Cloudinary signed upload
│   │   ├── users/              # User profile and dashboard stats
│   │   └── watchlist/          # Watchlist toggle
│   ├── routes/
│   │   └── index.ts            # Centralised route registration
│   ├── types/
│   │   └── index.ts            # Shared TypeScript interfaces
│   ├── utils/
│   │   └── response.ts         # sendResponse, getPagination, buildMeta
│   ├── app.ts                  # Express app setup
│   └── server.ts               # HTTP server bootstrap
├── .env                        # Local environment variables (not committed)
├── .env.example                # Example environment variables
├── tsconfig.json
└── package.json
```

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- A PostgreSQL database (NeonDB recommended for serverless deployments)
- A Stripe account (test keys are fine for development)
- A Cloudinary account (free tier works)
- Gmail account with App Password enabled (for email sending)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd assignment-5/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in all required values — see [Environment Variables](#environment-variables).

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 5. (Optional) Seed the database

If a seed file is present:

```bash
npx tsx prisma/seed.ts
```

### 6. Start the development server

```bash
npm run dev
```

The API will be available at [http://localhost:5000](http://localhost:5000).

---

## Environment Variables

```env
# ── Server ───────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ─────────────────────────────────────────────────────────────────
# NeonDB / Supabase / Railway connection string
DATABASE_URL="postgresql://user:password@host:5432/cineportal?sslmode=require"

# ── Better Auth ──────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=your_random_secret_minimum_32_characters
# Full origin the server is reachable at (protocol + host + optional port)
BETTER_AUTH_URL=http://localhost:5000

# ── Google OAuth (optional) ──────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# ── Email (Gmail SMTP) ───────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
# Gmail App Password — spaces are stripped automatically
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM="CinePortal <your_email@gmail.com>"

# ── Frontend ─────────────────────────────────────────────────────────────────
# Used in CORS allowed origins and email verification links
FRONTEND_URL=http://localhost:3000

# ── Cloudinary ───────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Required** (server refuses to start if missing): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## Available Scripts

```bash
npm run dev       # Start development server with nodemon (auto-restart on changes)
npm run build     # Compile TypeScript to /dist
npm run start     # Run the compiled production build
npm run lint      # Run ESLint
```

---

## API Reference

All responses follow this envelope:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

`meta` is only present on paginated endpoints. Error responses set `success: false` and include an `error` field.

---

### Authentication

All authentication routes are managed by Better Auth at `/api/auth/*`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register with email and password |
| POST | `/api/auth/sign-in/email` | Sign in with email and password |
| POST | `/api/auth/sign-out` | Invalidate session |
| POST | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/forget-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/sign-in/google` | Initiate Google OAuth flow |
| GET | `/api/auth/callback/google` | Google OAuth callback |

---

### Users

> Requires: authenticated session + verified email

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/profile` | Get the authenticated user's profile |
| PATCH | `/api/users/profile` | Update name or profile image |
| GET | `/api/users/dashboard-stats` | Personal stats (reviews, watchlist, subscription) |

---

### Movies & Series

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/movies` | Public | List all media; supports `?search=`, `?type=`, `?genre=`, `?page=`, `?limit=` |
| GET | `/api/movies/featured` | Public | Featured / top-rated titles for the homepage |
| GET | `/api/movies/:id` | Public | Single media item with reviews and stats |
| POST | `/api/movies` | Admin | Create new movie or series |
| PATCH | `/api/movies/:id` | Admin | Update existing media |
| DELETE | `/api/movies/:id` | Admin | Delete media |

---

### Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews` | Public | All approved reviews (paginated) |
| GET | `/api/reviews/:id` | Public | Single review |
| GET | `/api/reviews/my` | Verified user | The authenticated user's reviews |
| POST | `/api/reviews` | Verified user | Submit a new review |
| PATCH | `/api/reviews/:id` | Verified user | Edit own review |
| DELETE | `/api/reviews/:id` | Verified user | Delete own review |
| POST | `/api/reviews/:id/like` | Verified user | Toggle like on a review |

---

### Comments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/comments/review/:reviewId` | Public | All comments for a review (threaded) |
| POST | `/api/comments` | Verified user | Add comment (or reply) to a review |
| PATCH | `/api/comments/:id` | Verified user | Edit own comment |
| DELETE | `/api/comments/:id` | Verified user | Delete own comment |
| POST | `/api/comments/:id/like` | Verified user | Toggle like on a comment |

---

### Watchlist

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/watchlist` | Verified user | Get the user's watchlist |
| POST | `/api/watchlist/toggle` | Verified user | Add or remove a media item |
| DELETE | `/api/watchlist/:mediaId` | Verified user | Remove specific item |

---

### Payments & Subscriptions

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/checkout` | Verified user | Create Stripe Checkout session |
| GET | `/api/payments/subscription` | Verified user | Get current subscription status |
| POST | `/api/payments/subscription/sync` | Verified user | Force-sync subscription from Stripe |
| POST | `/api/payments/subscription/cancel` | Verified user | Cancel at period end |
| POST | `/api/payments/webhook` | Public (Stripe-signed) | Process Stripe webhook events |

---

### Admin

> Requires: `ADMIN` role

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Platform-wide statistics |
| GET | `/api/admin/media` | All media including unpublished |
| GET | `/api/admin/reviews` | All reviews (any status) |
| GET | `/api/admin/reviews/pending` | Reviews awaiting moderation |
| PATCH | `/api/admin/reviews/:id/moderate` | Approve or unpublish a review |
| GET | `/api/admin/users` | All registered users |
| PATCH | `/api/admin/users/:id/role` | Promote or demote user role |
| PATCH | `/api/admin/users/:id/ban` | Ban or unban a user |
| DELETE | `/api/admin/users/:id` | Permanently delete a user |
| GET | `/api/admin/subscriptions` | All subscription records |
| DELETE | `/api/admin/comments/:id` | Delete any comment |

---

### Upload

> Requires: `ADMIN` role

| Method | Path | Description |
|---|---|---|
| GET | `/api/upload/signature` | Returns signed Cloudinary upload credentials (timestamp, signature, api_key, cloud_name). The client posts the image directly to Cloudinary — the API secret never leaves the server. |

---

### Stats

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stats` | Public | Platform stats (total users, titles, reviews). Cached 5 minutes. |

---

## Database Schema

```
User ──< Session
User ──< Account          (OAuth providers)
User ──< Review ──< Comment ──< CommentLike
                  ──< ReviewLike
User ──< Watchlist >── Media
User ── Subscription
Media ──< Review
```

### Models

| Model | Key Fields |
|---|---|
| `User` | id, name, email, role (USER/ADMIN), banned |
| `Media` | id, title, type (MOVIE/SERIES), genre[], releaseYear, director, cast[], streamingPlatforms[], posterUrl, trailerUrl, pricing, isPublished |
| `Review` | id, rating (1–5), content, tags[], hasSpoiler, status (PENDING/APPROVED/UNPUBLISHED) |
| `Comment` | id, content, parentId (for replies) |
| `Subscription` | id, plan (FREE/MONTHLY/YEARLY), status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd |
| `Watchlist` | id, userId, mediaId |

---

## Authentication

CinePortal uses [Better Auth](https://www.better-auth.com/) for session management.

- Sessions are stored in the database and identified via a `session` cookie.
- Three middleware guards are applied to routes:
  - `authenticate` — validates the session cookie and attaches `req.user`
  - `requireVerified` — rejects requests from users whose email is not verified
  - `requireAdmin` — rejects requests from non-`ADMIN` users
- Google OAuth is supported. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable it.

---

## Deployment

### Deploy to Railway (recommended for Express)

1. Create a new project in [Railway](https://railway.app/) and connect your GitHub repo.
2. Set the **root directory** to `backend` and the **start command** to `npm run start`.
3. Add a PostgreSQL plugin or connect your NeonDB URL.
4. Set all environment variables from `.env.example` in the Railway variables panel.
5. Railway auto-deploys on every push to your main branch.

### Deploy to Render

1. Create a new **Web Service** and connect your repo.
2. Set **Root Directory** to `backend`, **Build Command** to `npm run build`, **Start Command** to `node dist/server.js`.
3. Add environment variables in the Render dashboard.

### Stripe Webhooks in Production

1. In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), add a webhook endpoint pointing to `https://your-backend.com/api/payments/webhook`.
2. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

### Database Migrations in Production

Run migrations as part of your deploy pipeline:

```bash
npx prisma migrate deploy
```

> Never run `migrate dev` in production — use `migrate deploy` which only applies pending migrations without generating new ones.

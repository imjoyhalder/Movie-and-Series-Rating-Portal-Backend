# API Documentation

**Base URL:** `http://localhost:5000/api`  
**Content-Type:** `application/json` (except Stripe webhook — raw body)  
**Authentication:** Bearer token via `Authorization: Bearer <token>` header or `accessToken` httpOnly cookie

---

## Access Control

| Level | Requirement |
|---|---|
| PUBLIC | No token required |
| USER | Valid access token (`authenticate`) |
| VERIFIED USER | Valid access token + email verified (`authenticate + requireVerified`) |
| ADMIN | Valid access token + email verified + `role: ADMIN` (`authenticate + requireVerified + requireAdmin`) |

> All mutating USER routes require a verified email. Unverified users receive `403 Forbidden` with message `"Please verify your email address before proceeding"`.

---

## Response Format

```json
{
  "success": true,
  "message": "Descriptive message",
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Error envelope uses `"success": false` with an `"error"` field.

---

## Health Check

### `GET /health`

**Access:** PUBLIC

**Response:**
```json
{ "status": "ok", "timestamp": "2026-04-23T00:00:00.000Z" }
```

---

## Auth — `/api/auth`

### `POST /api/auth/register`

Register a new account. Sends a verification email — the user must verify before logging in.

**Access:** PUBLIC

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret123"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 characters |
| `email` | string | Valid email |
| `password` | string | 8+ chars, 1 uppercase, 1 number |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account."
}
```

---

### `GET /api/auth/verify-email?token=<token>`

Verify email using the token sent during registration. Auto-logs in the user on success.

**Access:** PUBLIC

**Query Params:**

| Param | Type | Description |
|---|---|---|
| `token` | string | Token from the verification email |

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully. You are now logged in.",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" },
    "accessToken": "eyJ..."
  }
}
```

---

### `POST /api/auth/resend-verification`

Resend the email verification link. Silent if email is not found (prevents enumeration).

**Access:** PUBLIC

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If that email exists and is unverified, a new verification link has been sent"
}
```

---

### `POST /api/auth/login`

Log in with email and password. Requires a verified email. Sets `refreshToken` httpOnly cookie.

**Access:** PUBLIC

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Secret123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" },
    "accessToken": "eyJ..."
  }
}
```

> **Note:** Returns `403 Forbidden` with `"Please verify your email address before logging in"` if email is not verified.

---

### `POST /api/auth/refresh`

Exchange the refresh token cookie for a new access token.

**Access:** PUBLIC (refresh token in cookie or body)

**Request Body (alternative to cookie):**
```json
{ "refreshToken": "eyJ..." }
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": { "accessToken": "eyJ..." }
}
```

---

### `POST /api/auth/logout`

Invalidate the session and clear the refresh token cookie.

**Access:** PUBLIC (token optional)

**Response:** `200 OK`
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### `POST /api/auth/forgot-password`

Send a password reset link to the given email. Silent if not found.

**Access:** PUBLIC

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response:** `200 OK`
```json
{ "success": true, "message": "If that email exists, a reset link has been sent" }
```

---

### `POST /api/auth/reset-password`

Reset password using the token from the reset email. Invalidates all existing sessions.

**Access:** PUBLIC

**Request Body:**
```json
{
  "token": "abc123resettoken",
  "password": "NewSecret123"
}
```

| Field | Type | Rules |
|---|---|---|
| `token` | string | Required |
| `password` | string | 8+ chars, 1 uppercase, 1 number |

**Response:** `200 OK`
```json
{ "success": true, "message": "Password reset successfully" }
```

---

### `GET /api/auth/google`

Initiate Google OAuth flow. Redirects the browser to Google's consent screen.

**Access:** PUBLIC

**Response:** `302 Redirect` → Google OAuth consent page

> Set this as the `href` of a "Login with Google" button. Do not call via `fetch`/`axios` — use a direct browser navigation.

---

### `GET /api/auth/google/callback`

Google OAuth callback. Handled server-side — exchanges the authorization code, creates or links the account, issues tokens, and redirects to the frontend.

**Access:** PUBLIC (called by Google, not by client code)

**Response:** `302 Redirect` → `{FRONTEND_URL}/auth/callback?token=<accessToken>`

The `refreshToken` is set as an httpOnly cookie. The frontend reads `token` from the query string and stores it as the access token.

> On error: redirects to `{FRONTEND_URL}/login?error=google_auth_failed`

**Google account linking behavior:**
- New Google user → account created with `isEmailVerified: true`
- Existing email user (password) → Google ID linked to the account, email marked verified
- Returning Google user → login as usual

---

## Users — `/api/users`

All endpoints require **VERIFIED USER** access.

### `GET /api/users/profile`

Get the authenticated user's profile.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "avatar": null,
    "subscription": { "plan": "FREE", "status": "ACTIVE" }
  }
}
```

---

### `PATCH /api/users/profile`

Update the authenticated user's profile.

**Access:** VERIFIED USER

**Request Body:** _(all fields optional)_
```json
{
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.png"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 characters |
| `avatar` | string | Valid URL |

**Response:** `200 OK`
```json
{ "success": true, "message": "Profile updated", "data": { ...updatedUser } }
```

---

### `PATCH /api/users/change-password`

Change the authenticated user's password.

**Access:** VERIFIED USER

**Request Body:**
```json
{
  "currentPassword": "OldSecret123",
  "newPassword": "NewSecret456"
}
```

| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | Required |
| `newPassword` | string | 8+ chars, 1 uppercase, 1 number |

**Response:** `200 OK`
```json
{ "success": true, "message": "Password changed successfully" }
```

---

## Movies / Media — `/api/movies`

### `GET /api/movies/featured`

**Access:** PUBLIC

**Response:** `200 OK`
```json
{ "success": true, "data": [ { "id": "...", "title": "...", "type": "MOVIE", ... } ] }
```

---

### `GET /api/movies`

Browse and search published media.

**Access:** PUBLIC

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title/synopsis |
| `type` | `MOVIE` \| `SERIES` | Filter by type |
| `genre` | string | Filter by genre |
| `minYear` | number | Minimum release year |
| `maxYear` | number | Maximum release year |
| `pricing` | `free` \| `premium` | Filter by pricing tier |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { ...media } ],
  "meta": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### `GET /api/movies/:id`

Get a single media item.

**Access:** PUBLIC

---

### `POST /api/movies`

Create a media entry.

**Access:** ADMIN

**Request Body:**
```json
{
  "title": "Inception",
  "synopsis": "A thief who steals corporate secrets...",
  "type": "MOVIE",
  "genre": ["Sci-Fi", "Thriller"],
  "releaseYear": 2010,
  "director": "Christopher Nolan",
  "cast": ["Leonardo DiCaprio"],
  "streamingPlatforms": ["Netflix"],
  "posterUrl": "https://example.com/poster.jpg",
  "trailerUrl": "https://youtube.com/watch?v=...",
  "streamingUrl": "https://example.com/stream/inception",
  "pricing": "premium"
}
```

| Field | Type | Rules |
|---|---|---|
| `title` | string | Required |
| `synopsis` | string | 10+ characters |
| `type` | enum | `MOVIE` or `SERIES` |
| `genre` | string[] | 1+ items |
| `releaseYear` | integer | 1888 – current year + 2 |
| `director` | string | Required |
| `cast` | string[] | 1+ items |
| `streamingPlatforms` | string[] | 1+ items |
| `posterUrl` | string | Valid URL (optional) |
| `trailerUrl` | string | Valid URL (optional) |
| `streamingUrl` | string | Valid URL (optional) |
| `pricing` | enum | `free` or `premium` (default: `free`) |

**Response:** `201 Created`

---

### `PATCH /api/movies/:id`

Update a media entry.

**Access:** ADMIN

**Request Body:** same fields as POST (all optional) + `isPublished: boolean`

---

### `DELETE /api/movies/:id`

Delete a media entry.

**Access:** ADMIN

---

## Reviews — `/api/reviews`

### `GET /api/reviews`

List all approved reviews.

**Access:** PUBLIC

**Query Parameters:** `page`, `limit`, `mediaId`

---

### `GET /api/reviews/my`

Get the authenticated user's own reviews.

**Access:** VERIFIED USER

---

### `GET /api/reviews/:id`

Get a single review.

**Access:** PUBLIC

---

### `POST /api/reviews`

Submit a review. One review per user per media item.

**Access:** VERIFIED USER

**Request Body:**
```json
{
  "mediaId": "clx...",
  "rating": 8,
  "content": "This movie was brilliant...",
  "tags": ["must-watch"],
  "hasSpoiler": false
}
```

| Field | Type | Rules |
|---|---|---|
| `mediaId` | string | Required |
| `rating` | integer | 1–10 |
| `content` | string | 10–5000 characters |
| `tags` | string[] | Optional (default: `[]`) |
| `hasSpoiler` | boolean | Optional (default: `false`) |

**Response:** `201 Created` — review starts with `status: "PENDING"` (requires admin approval)

---

### `PATCH /api/reviews/:id`

Update own review.

**Access:** VERIFIED USER

**Request Body:** same fields as POST (all optional)

---

### `DELETE /api/reviews/:id`

Delete own review.

**Access:** VERIFIED USER

---

### `POST /api/reviews/:id/like`

Toggle like on a review.

**Access:** VERIFIED USER

---

## Comments — `/api/comments`

### `GET /api/comments/review/:reviewId`

Get all comments for a review (threaded).

**Access:** PUBLIC

---

### `POST /api/comments`

Post a comment. Optionally reply to an existing comment.

**Access:** VERIFIED USER

**Request Body:**
```json
{
  "reviewId": "clx...",
  "content": "Great review!",
  "parentId": "clx..."
}
```

| Field | Type | Rules |
|---|---|---|
| `reviewId` | string | Required |
| `content` | string | 1–1000 characters |
| `parentId` | string | Optional — reply target |

---

### `PATCH /api/comments/:id`

Edit own comment.

**Access:** VERIFIED USER

**Request Body:**
```json
{ "content": "Updated text." }
```

---

### `DELETE /api/comments/:id`

Delete own comment.

**Access:** VERIFIED USER

---

## Watchlist — `/api/watchlist`

All endpoints require **VERIFIED USER** access.

### `GET /api/watchlist`

Get the user's watchlist.

**Access:** VERIFIED USER

---

### `POST /api/watchlist/toggle`

Add or remove a media item from the watchlist.

**Access:** VERIFIED USER

**Request Body:**
```json
{ "mediaId": "clx..." }
```

**Response:** `200 OK` — message is `"Added to watchlist"` or `"Removed from watchlist"`

---

### `DELETE /api/watchlist/:mediaId`

Remove a specific media item from the watchlist.

**Access:** VERIFIED USER

---

## Payments — `/api/payments`

### `POST /api/payments/webhook`

Stripe webhook — consumed by Stripe only, not by client apps.

**Access:** PUBLIC (verified by Stripe signature header)  
**Content-Type:** raw body (`application/json`)

---

### `POST /api/payments/checkout`

Create a Stripe Checkout session to start a subscription.

**Access:** VERIFIED USER

**Request Body:**
```json
{ "plan": "MONTHLY" }
```

| Field | Type | Values |
|---|---|---|
| `plan` | enum | `MONTHLY` or `YEARLY` |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }
}
```

---

### `GET /api/payments/subscription`

Get current subscription details.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "plan": "MONTHLY",
    "status": "ACTIVE",
    "currentPeriodEnd": "2026-05-23T00:00:00.000Z",
    "stripeSubscriptionId": "sub_..."
  }
}
```

---

### `POST /api/payments/subscription/cancel`

Cancel subscription at end of current billing period.

**Access:** VERIFIED USER

---

## Admin — `/api/admin`

All endpoints require **ADMIN** access (verified email + ADMIN role).

### `GET /api/admin/dashboard`

Platform statistics.

**Access:** ADMIN

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalUsers": 1200,
    "totalMedia": 85,
    "totalReviews": 430,
    "pendingReviews": 12,
    "totalComments": 980,
    "activeSubscriptions": 340,
    "averageRatingByMedia": [ { "mediaId": "...", "title": "...", "avgRating": 7.4 } ]
  }
}
```

---

### `GET /api/admin/reviews`

All reviews across all statuses.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `status` (`PENDING` | `APPROVED` | `UNPUBLISHED`)

---

### `GET /api/admin/reviews/pending`

Reviews awaiting moderation.

**Access:** ADMIN

---

### `PATCH /api/admin/reviews/:id/moderate`

Approve or unpublish a review.

**Access:** ADMIN

**Request Body:**
```json
{ "status": "APPROVED" }
```

| Field | Type | Values |
|---|---|---|
| `status` | enum | `APPROVED` or `UNPUBLISHED` |

---

### `GET /api/admin/users`

All registered users.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `role` (`USER` | `ADMIN`)

---

### `PATCH /api/admin/users/:id/role`

Promote or demote a user.

**Access:** ADMIN

**Request Body:**
```json
{ "role": "ADMIN" }
```

---

### `GET /api/admin/media`

All media including unpublished.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `type` (`MOVIE` | `SERIES`), `isPublished` (`true` | `false`)

---

### `DELETE /api/admin/comments/:id`

Hard-delete any comment (content moderation).

**Access:** ADMIN

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed or invalid token |
| `401 Unauthorized` | Missing or invalid access token |
| `403 Forbidden` | Email not verified, or insufficient role |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate entry (e.g. reviewing same media twice) |
| `500 Internal Server Error` | Unexpected server error |

**Validation error shape (`400`):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "Must contain at least one uppercase letter" }
  ]
}
```

**Unverified email error shape (`403`):**
```json
{
  "success": false,
  "message": "Please verify your email address before proceeding"
}
```

---

## Authentication Flow Summary

```
Registration
  POST /api/auth/register
        │
        ▼
  Email sent → user clicks link
        │
        ▼
  GET /api/auth/verify-email?token=xxx
        │
        ▼
  Verified + auto-logged in (accessToken returned)

Login (email/password)
  POST /api/auth/login  ──► 403 if email not verified
        │
        ▼
  accessToken (body) + refreshToken (httpOnly cookie)

Login (Google OAuth)
  GET /api/auth/google  ──► redirect to Google
        │
  Google redirects back
        │
        ▼
  GET /api/auth/google/callback
        │
        ▼
  redirect to {FRONTEND_URL}/auth/callback?token=<accessToken>
  refreshToken set as httpOnly cookie

Token Refresh
  POST /api/auth/refresh  ──► new accessToken
```

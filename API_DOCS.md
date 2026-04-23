# API Documentation

**Base URL:** `http://localhost:5000/api`  
**Content-Type:** `application/json` (except Stripe webhook — raw body)  
**Authentication:** Bearer token via `Authorization: Bearer <token>` header or session cookie

> Auth routes are handled entirely by **Better Auth** at `/api/auth/*`. All other routes are custom Express handlers.

---

## Access Control

| Level | Requirement |
|---|---|
| PUBLIC | No token required |
| USER | Valid session (`authenticate`) |
| VERIFIED USER | Valid session + email verified (`authenticate + requireVerified`) |
| ADMIN | Valid session + email verified + `role: ADMIN` (`authenticate + requireVerified + requireAdmin`) |

> Unverified users hitting VERIFIED USER routes get `403 Forbidden`: `"Please verify your email address before proceeding"`.

---

## Response Format

Custom domain routes (`/api/users`, `/api/movies`, etc.) return:

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

Better Auth routes (`/api/auth/*`) return their own JSON shapes as documented below.

Error responses use `"success": false` with an `"error"` field.

---

## Health Check

### `GET /health`

**Access:** PUBLIC

**Response:**
```json
{ "status": "ok", "timestamp": "2026-04-24T00:00:00.000Z" }
```

---

## Auth — `/api/auth`

All auth routes are handled by **Better Auth**. Use the Better Auth client SDK on the frontend, or call these endpoints directly.

---

### `POST /api/auth/sign-up/email`

Register a new account. Sends a verification email automatically — the user cannot sign in until they verify.

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
| `name` | string | Required |
| `email` | string | Valid email |
| `password` | string | 8+ characters |

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "emailVerified": false },
  "session": null
}
```

> Session is `null` until email is verified (`requireEmailVerification: true`).

---

### `GET /api/auth/verify-email?token=<token>`

Verify email using the token from the verification email. Auto-signs the user in on success (`autoSignInAfterVerification: true`).

**Access:** PUBLIC

**Query Params:**

| Param | Type | Description |
|---|---|---|
| `token` | string | Verification token from email link |

**Response:** `200 OK` — redirects or returns session with active token.

---

### `POST /api/auth/sign-in/email`

Sign in with email and password. Requires a verified email.

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
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "emailVerified": true, "role": "USER" },
  "session": { "token": "...", "expiresAt": "2026-05-24T00:00:00.000Z" }
}
```

> Returns `403` if email is not verified.

---

### `GET /api/auth/get-session`

Get the current session. Use this to check if the user is signed in.

**Access:** PUBLIC (returns `null` if not signed in)

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER", "emailVerified": true },
  "session": { "id": "...", "token": "...", "expiresAt": "2026-05-24T00:00:00.000Z", "userId": "..." }
}
```

Returns `{ "session": null, "user": null }` when not authenticated.

---

### `POST /api/auth/sign-out`

Invalidate the current session.

**Access:** USER

**Request Body:** _(none)_

**Response:** `200 OK`
```json
{ "success": true }
```

---

### `POST /api/auth/request-password-reset`

Send a password reset link to the given email. Silent if email not found (prevents enumeration).

**Access:** PUBLIC

**Request Body:**
```json
{
  "email": "john@example.com",
  "redirectTo": "http://localhost:3000/reset-password"
}
```

| Field | Type | Description |
|---|---|---|
| `email` | string | Account email |
| `redirectTo` | string | Frontend URL — Better Auth appends `?token=<token>` to this URL |

**Response:** `200 OK`
```json
{
  "status": true,
  "message": "If this email exists in our system, check your email for the reset link"
}
```

---

### `POST /api/auth/reset-password`

Reset password using the token from the reset email.

**Access:** PUBLIC

**Request Body:**
```json
{
  "newPassword": "NewSecret123",
  "token": "abc123resettoken"
}
```

| Field | Type | Rules |
|---|---|---|
| `newPassword` | string | 8+ characters |
| `token` | string | Token from reset email URL |

**Response:** `200 OK`
```json
{ "status": true }
```

---

### `POST /api/auth/change-password`

Change password for an already signed-in user.

**Access:** USER

**Request Body:**
```json
{
  "currentPassword": "OldSecret123",
  "newPassword": "NewSecret456"
}
```

**Response:** `200 OK`
```json
{ "status": true }
```

---

### `POST /api/auth/update-user`

Update name or profile image via Better Auth. Alternative to `PATCH /api/users/profile`.

**Access:** USER

**Request Body:** _(all optional)_
```json
{
  "name": "Jane Doe",
  "image": "https://example.com/avatar.png"
}
```

**Response:** `200 OK` — updated user object.

---

### `POST /api/auth/sign-in/social`

Initiate a social OAuth flow. Returns the provider's authorization URL — redirect the user's browser to it.

**Access:** PUBLIC

**Request Body:**
```json
{
  "provider": "google",
  "callbackURL": "http://localhost:3000/auth/callback"
}
```

| Field | Type | Description |
|---|---|---|
| `provider` | string | OAuth provider — `"google"` |
| `callbackURL` | string | Frontend URL to redirect to after OAuth completes |

**Response:** `200 OK`
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirect": true
}
```

Redirect the user's browser to `url`. Do not call this via background `fetch` — it must be a browser navigation.

---

### `GET /api/auth/callback/google`

Google OAuth callback — called by Google after the user grants consent. Handled entirely server-side: exchanges the authorization code, creates or links the account, issues a session, and redirects to `callbackURL`.

**Access:** PUBLIC (called by Google's OAuth server, not client code)

**Response:** `302 Redirect` → `callbackURL` with session cookie set

**Google account linking behavior:**
- New Google user → account created with `emailVerified: true`
- Existing email/password user with same email → Google linked to that account
- Returning Google user → signed in as usual

---

## Users — `/api/users`

### `GET /api/users/profile`

Get the authenticated user's profile including subscription and activity counts.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {
    "id": "clx...",
    "name": "John Doe",
    "email": "john@example.com",
    "image": null,
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "subscription": {
      "plan": "FREE",
      "status": "ACTIVE",
      "currentPeriodEnd": null,
      "cancelAtPeriodEnd": false
    },
    "_count": { "reviews": 5, "watchlist": 12 }
  }
}
```

---

### `PATCH /api/users/profile`

Update the authenticated user's name or profile image.

**Access:** VERIFIED USER

**Request Body:** _(all optional)_
```json
{
  "name": "Jane Doe",
  "image": "https://example.com/avatar.png"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 characters |
| `image` | string | Valid URL |

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated",
  "data": { "id": "clx...", "name": "Jane Doe", "email": "john@example.com", "image": "https://...", "role": "USER" }
}
```

> To change password, use `POST /api/auth/change-password`.

---

## Movies / Media — `/api/movies`

### `GET /api/movies/featured`

Returns two curated lists: top-reviewed media and newest additions.

**Access:** PUBLIC

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "topRated": [
      { "id": "clx...", "title": "Inception", "type": "MOVIE", "_count": { "reviews": 120 }, "..." }
    ],
    "newlyAdded": [
      { "id": "clx...", "title": "Oppenheimer", "type": "MOVIE", "_count": { "reviews": 40 }, "..." }
    ]
  }
}
```

Each list contains up to **6 items**.

---

### `GET /api/movies`

Browse and search published media with pagination.

**Access:** PUBLIC

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title, director, synopsis |
| `type` | `MOVIE` \| `SERIES` | Filter by media type |
| `genre` | string | Filter by genre (exact match in array) |
| `releaseYear` | number | Filter by exact release year |
| `streamingPlatform` | string | Filter by platform (exact match in array) |
| `pricing` | `free` \| `premium` | Filter by pricing tier |
| `sortBy` | `mostReviewed` \| _(omit)_ | Sort by review count desc; default is newest first |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "title": "Inception",
      "type": "MOVIE",
      "genre": ["Sci-Fi", "Thriller"],
      "releaseYear": 2010,
      "pricing": "premium",
      "_count": { "reviews": 120 }
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### `GET /api/movies/:id`

Get a single published media item with its 5 most recent approved reviews.

**Access:** PUBLIC

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "title": "Inception",
    "synopsis": "...",
    "type": "MOVIE",
    "genre": ["Sci-Fi", "Thriller"],
    "releaseYear": 2010,
    "director": "Christopher Nolan",
    "cast": ["Leonardo DiCaprio"],
    "streamingPlatforms": ["Netflix"],
    "posterUrl": "https://...",
    "trailerUrl": "https://...",
    "streamingUrl": "https://...",
    "pricing": "premium",
    "isPublished": true,
    "_count": { "reviews": 120 },
    "reviews": [
      {
        "id": "clx...",
        "rating": 9,
        "content": "Brilliant film...",
        "status": "APPROVED",
        "user": { "id": "...", "name": "John Doe", "image": null },
        "_count": { "likes": 12, "comments": 3 }
      }
    ]
  }
}
```

> Returns `404` if media is not found or not published.

---

### `POST /api/movies`

Create a new media entry.

**Access:** ADMIN

**Request Body:**
```json
{
  "title": "Inception",
  "synopsis": "A thief who steals corporate secrets through dream-sharing technology...",
  "type": "MOVIE",
  "genre": ["Sci-Fi", "Thriller"],
  "releaseYear": 2010,
  "director": "Christopher Nolan",
  "cast": ["Leonardo DiCaprio", "Tom Hardy"],
  "streamingPlatforms": ["Netflix"],
  "posterUrl": "https://example.com/poster.jpg",
  "trailerUrl": "https://youtube.com/watch?v=...",
  "streamingUrl": "https://example.com/stream/inception",
  "pricing": "premium"
}
```

| Field | Type | Rules |
|---|---|---|
| `title` | string | Required, max 200 chars |
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

**Response:** `201 Created` — full media object.

---

### `PATCH /api/movies/:id`

Update a media entry. All fields optional. Only ADMIN can toggle `isPublished`.

**Access:** ADMIN

**Request Body:** same fields as POST (all optional), plus:

| Field | Type | Description |
|---|---|---|
| `isPublished` | boolean | Publish or unpublish the media |

**Response:** `200 OK` — updated media object.

---

### `DELETE /api/movies/:id`

Delete a media entry.

**Access:** ADMIN

**Response:** `200 OK`
```json
{ "success": true, "message": "Media deleted" }
```

---

## Reviews — `/api/reviews`

### `GET /api/reviews`

List approved reviews with optional filtering and sorting.

**Access:** PUBLIC

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `mediaId` | string | Filter by media |
| `userId` | string | Filter by author |
| `sortBy` | `topRated` \| `mostLiked` \| _(omit)_ | Sort order; default is newest first |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "rating": 9,
      "content": "Brilliant film...",
      "tags": ["must-watch"],
      "hasSpoiler": false,
      "status": "APPROVED",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "user": { "id": "...", "name": "John Doe", "image": null },
      "media": { "id": "...", "title": "Inception", "posterUrl": "https://...", "type": "MOVIE" },
      "_count": { "likes": 12, "comments": 3 }
    }
  ],
  "meta": { "total": 80, "page": 1, "limit": 10, "totalPages": 8 }
}
```

---

### `GET /api/reviews/my`

Get the authenticated user's own reviews across all statuses (PENDING, APPROVED, UNPUBLISHED).

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "rating": 8,
      "content": "...",
      "status": "PENDING",
      "media": { "id": "...", "title": "Inception", "posterUrl": "...", "type": "MOVIE" },
      "_count": { "likes": 0, "comments": 1 }
    }
  ]
}
```

---

### `GET /api/reviews/:id`

Get a single review by ID.

**Access:** PUBLIC

**Response:** `200 OK` — same shape as a single item from `GET /api/reviews`.

---

### `POST /api/reviews`

Submit a review. One review per user per media item. Starts with `status: "PENDING"` pending admin approval.

**Access:** VERIFIED USER

**Request Body:**
```json
{
  "mediaId": "clx...",
  "rating": 8,
  "content": "This movie was brilliant because...",
  "tags": ["must-watch", "sci-fi"],
  "hasSpoiler": false
}
```

| Field | Type | Rules |
|---|---|---|
| `mediaId` | string | Required — must exist |
| `rating` | integer | 1–10 |
| `content` | string | 10–5000 characters |
| `tags` | string[] | Optional (default: `[]`) |
| `hasSpoiler` | boolean | Optional (default: `false`) |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Review submitted",
  "data": {
    "id": "clx...",
    "rating": 8,
    "content": "...",
    "status": "PENDING",
    "user": { "id": "...", "name": "John Doe", "image": null },
    "media": { "id": "...", "title": "Inception", "posterUrl": "...", "type": "MOVIE" }
  }
}
```

> Returns `409 Conflict` if the user has already reviewed this media.

---

### `PATCH /api/reviews/:id`

Update own review. Only allowed while review is in `PENDING` status — approved reviews cannot be edited.

**Access:** VERIFIED USER (own review only)

**Request Body:** _(all optional)_
```json
{
  "rating": 9,
  "content": "Updated text...",
  "tags": ["classic"],
  "hasSpoiler": true
}
```

**Response:** `200 OK` — updated review object.

> Returns `400` if the review is already `APPROVED`.

---

### `DELETE /api/reviews/:id`

Delete own review. Only allowed while review is in `PENDING` status — approved reviews cannot be deleted by the owner.

**Access:** VERIFIED USER (own review; ADMIN can delete any)

**Response:** `200 OK`
```json
{ "success": true, "message": "Review deleted" }
```

> Returns `400` if review is `APPROVED` and requester is not an admin.

---

### `POST /api/reviews/:id/like`

Toggle like on a review. Calling twice removes the like.

**Access:** VERIFIED USER

**Request Body:** _(none)_

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Review liked/unliked",
  "data": { "liked": true }
}
```

`"liked": true` means the like was added; `false` means it was removed.

---

## Comments — `/api/comments`

### `GET /api/comments/review/:reviewId`

Get all top-level comments for a review with nested replies (threaded).

**Access:** PUBLIC

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "content": "Great review!",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "user": { "id": "...", "name": "John Doe", "image": null },
      "replies": [
        {
          "id": "clx...",
          "content": "Agreed!",
          "user": { "id": "...", "name": "Jane Doe", "image": null }
        }
      ]
    }
  ]
}
```

---

### `POST /api/comments`

Post a comment on a review. Optionally reply to an existing comment.

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
| `reviewId` | string | Required — review must exist |
| `content` | string | 1–1000 characters |
| `parentId` | string | Optional — parent comment for replies |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Comment posted",
  "data": {
    "id": "clx...",
    "content": "Great review!",
    "user": { "id": "...", "name": "John Doe", "image": null },
    "replies": []
  }
}
```

---

### `PATCH /api/comments/:id`

Edit own comment's content.

**Access:** VERIFIED USER (own comment only)

**Request Body:**
```json
{ "content": "Updated comment text." }
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment updated",
  "data": { "id": "clx...", "content": "Updated comment text.", "user": { "..." } }
}
```

---

### `DELETE /api/comments/:id`

Delete own comment.

**Access:** VERIFIED USER (own comment; ADMIN can delete any via `/api/admin/comments/:id`)

**Response:** `200 OK`
```json
{ "success": true, "message": "Comment deleted" }
```

---

## Watchlist — `/api/watchlist`

All endpoints require **VERIFIED USER** access.

### `GET /api/watchlist`

Get the authenticated user's watchlist, ordered newest-added first.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "createdAt": "2026-04-10T00:00:00.000Z",
      "media": {
        "id": "clx...",
        "title": "Inception",
        "posterUrl": "https://...",
        "type": "MOVIE",
        "genre": ["Sci-Fi"],
        "releaseYear": 2010,
        "pricing": "premium"
      }
    }
  ]
}
```

---

### `POST /api/watchlist/toggle`

Add or remove a media item from the watchlist atomically. Calling twice toggles back.

**Access:** VERIFIED USER

**Request Body:**
```json
{ "mediaId": "clx..." }
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Added to watchlist",
  "data": { "added": true }
}
```

`"added": true` — item was added; `false` — item was removed and message is `"Removed from watchlist"`.

---

### `DELETE /api/watchlist/:mediaId`

Remove a specific media item from the watchlist by its ID.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Removed from watchlist" }
```

> Returns `404` if the item is not in the user's watchlist.

---

## Payments — `/api/payments`

### `POST /api/payments/webhook`

Stripe webhook endpoint — called by Stripe, not by client apps. Verifies the `Stripe-Signature` header before processing.

**Access:** PUBLIC (Stripe-signed, raw body)  
**Content-Type:** `application/json` (raw — no JSON parsing middleware)

**Handled events:**

| Event | Effect |
|---|---|
| `checkout.session.completed` | Upserts subscription with ACTIVE status |
| `customer.subscription.updated` | Updates subscription status / cancel flag |
| `customer.subscription.deleted` | Downgrades plan to FREE, sets CANCELLED |

All DB writes are wrapped in `prisma.$transaction()` — if the write fails Stripe will retry and the transaction prevents partial state.

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
  "data": {
    "sessionId": "cs_...",
    "url": "https://checkout.stripe.com/pay/cs_..."
  }
}
```

Redirect the user to `url` to complete payment.

---

### `GET /api/payments/subscription`

Get the authenticated user's current subscription.

**Access:** VERIFIED USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "plan": "MONTHLY",
    "status": "ACTIVE",
    "stripeCustomerId": "cus_...",
    "stripeSubscriptionId": "sub_...",
    "currentPeriodStart": "2026-04-01T00:00:00.000Z",
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

Returns `null` data if the user has no subscription record.

---

### `POST /api/payments/subscription/cancel`

Cancel subscription at end of the current billing period (`cancelAtPeriodEnd: true`). The subscription stays ACTIVE until `currentPeriodEnd`.

**Access:** VERIFIED USER

**Request Body:** _(none)_

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription will be cancelled at the end of the billing period",
  "data": { "cancelAtPeriodEnd": true, "..." }
}
```

> Returns `404` if no active subscription exists.

---

## Admin — `/api/admin`

All endpoints require **ADMIN** access (verified email + `role: ADMIN`).

### `GET /api/admin/dashboard`

Platform-wide statistics with recent activity.

**Access:** ADMIN

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1200,
      "totalMedia": 85,
      "totalReviews": 430,
      "pendingReviews": 12,
      "activeSubscriptions": 340
    },
    "recentReviews": [
      {
        "id": "clx...",
        "rating": 8,
        "content": "...",
        "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
        "media": { "id": "...", "title": "Inception" }
      }
    ],
    "topRatedMedia": [
      {
        "id": "clx...",
        "title": "Inception",
        "averageRating": 8.7,
        "_count": { "reviews": 120 }
      }
    ]
  }
}
```

`recentReviews` — last 5 reviews across all statuses.  
`topRatedMedia` — top 5 media by review count, each with computed `averageRating` of approved reviews.

---

### `GET /api/admin/reviews`

All reviews across all statuses with pagination.

**Access:** ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | `PENDING` \| `APPROVED` \| `UNPUBLISHED` | Filter by status (omit for all) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response:** `200 OK` — paginated list with `user` and `media` included.

---

### `GET /api/admin/reviews/pending`

Reviews awaiting moderation, newest first.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`

**Response:** `200 OK` — paginated list with `user` (id, name, email) and `media` (id, title, posterUrl).

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

**Response:** `200 OK` — updated review object.

---

### `GET /api/admin/users`

All registered users with subscription and review counts.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "subscription": { "plan": "FREE", "status": "ACTIVE" },
      "_count": { "reviews": 5 }
    }
  ],
  "meta": { "total": 1200, "page": 1, "limit": 10, "totalPages": 120 }
}
```

---

### `PATCH /api/admin/users/:id/role`

Promote or demote a user's role.

**Access:** ADMIN

**Request Body:**
```json
{ "role": "ADMIN" }
```

| Field | Type | Values |
|---|---|---|
| `role` | enum | `USER` or `ADMIN` |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "id": "clx...", "name": "John Doe", "email": "john@example.com", "role": "ADMIN" }
}
```

---

### `GET /api/admin/media`

All media including unpublished, with review and watchlist counts.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "title": "Inception",
      "type": "MOVIE",
      "isPublished": true,
      "pricing": "premium",
      "_count": { "reviews": 120, "watchlist": 340 }
    }
  ],
  "meta": { "total": 85, "page": 1, "limit": 10, "totalPages": 9 }
}
```

---

### `DELETE /api/admin/comments/:id`

Hard-delete any comment regardless of ownership (content moderation).

**Access:** ADMIN

**Response:** `200 OK`
```json
{ "success": true, "message": "Comment deleted" }
```

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed, or business rule violation (e.g. editing approved review) |
| `401 Unauthorized` | Missing or expired session |
| `403 Forbidden` | Email not verified, or insufficient role, or ownership violation |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate entry (e.g. reviewing the same media twice) |
| `500 Internal Server Error` | Unexpected server error |

**Validation error shape (`400`):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    { "field": "title", "message": "Title is required" },
    { "field": "rating", "message": "Too big: expected number to be <=10" }
  ]
}
```

**General error shape:**
```json
{
  "success": false,
  "message": "Review not found"
}
```

> In `NODE_ENV=development`, AppError responses also include a `stack` field for debugging.

---

## Authentication Flow Summary

```
Registration (email/password)
  POST /api/auth/sign-up/email
        │
        ▼
  Verification email sent — session is null until verified
        │
  User clicks link in email
        │
        ▼
  GET /api/auth/verify-email?token=xxx
        │
        ▼
  emailVerified = true, auto-signed in (session token returned)

Sign In (email/password)
  POST /api/auth/sign-in/email  ──► 403 if email not verified
        │
        ▼
  session token — use in Authorization: Bearer header or cookie

Sign In (Google OAuth)
  POST /api/auth/sign-in/social  { provider: "google", callbackURL: "..." }
        │
        ▼
  { url: "https://accounts.google.com/...", redirect: true }
        │
  Redirect browser to url
        │
  Google redirects back to server
        │
        ▼
  GET /api/auth/callback/google
        │
        ▼
  Account created/linked, session cookie set, redirect to callbackURL

Session Check
  GET /api/auth/get-session  ──► { user, session } or { user: null, session: null }

Sign Out
  POST /api/auth/sign-out  ──► session invalidated

Password Reset
  POST /api/auth/request-password-reset  ──► reset email sent
        │
  User clicks link, extracts token from URL
        │
        ▼
  POST /api/auth/reset-password  ──► password updated
```

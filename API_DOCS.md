# API Documentation

**Base URL:** `http://localhost:5000/api`  
**Content-Type:** `application/json` (except Stripe webhook — raw body)  
**Authentication:** Bearer token via `Authorization: Bearer <token>` header or `accessToken` httpOnly cookie

---

## Access Control

| Level | Requirement |
|---|---|
| PUBLIC | No token required |
| USER | Valid access token (`authenticate` middleware) |
| ADMIN | Valid access token with `role: ADMIN` (`authenticate + requireAdmin`) |

---

## Response Format

```json
{
  "success": true,
  "message": "Descriptive message",
  "data": { },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Error responses follow the same envelope with `"success": false` and an `"error"` field.

---

## Health Check

### `GET /health`

Check server status.

**Access:** PUBLIC  
**Response:**
```json
{ "status": "ok", "timestamp": "2026-04-23T00:00:00.000Z" }
```

---

## Auth — `/api/auth`

### `POST /api/auth/register`

Register a new user account.

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
| `email` | string | Valid email format |
| `password` | string | 8+ chars, at least 1 uppercase, 1 number |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" }
  }
}
```

---

### `POST /api/auth/login`

Log in with email and password. Sets `accessToken` and `refreshToken` as httpOnly cookies.

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

---

### `POST /api/auth/refresh`

Issue a new access token using the stored refresh token cookie.

**Access:** PUBLIC (refresh token in cookie)

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

Invalidate the current session and clear auth cookies.

**Access:** PUBLIC (token optional)

**Response:** `200 OK`
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### `POST /api/auth/forgot-password`

Send a password reset email with a one-time token.

**Access:** PUBLIC

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response:** `200 OK`
```json
{ "success": true, "message": "Password reset email sent" }
```

---

### `POST /api/auth/reset-password`

Reset password using the token from the reset email.

**Access:** PUBLIC

**Request Body:**
```json
{
  "token": "abc123resettoken",
  "password": "NewSecret123"
}
```

**Response:** `200 OK`
```json
{ "success": true, "message": "Password reset successful" }
```

---

## Users — `/api/users`

All endpoints require **USER** access.

### `GET /api/users/profile`

Get the authenticated user's profile.

**Access:** USER

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

**Access:** USER

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

**Access:** USER

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
| `newPassword` | string | 8+ chars, at least 1 uppercase, 1 number |

**Response:** `200 OK`
```json
{ "success": true, "message": "Password changed successfully" }
```

---

## Movies / Media — `/api/movies`

### `GET /api/movies/featured`

Get featured/promoted media items.

**Access:** PUBLIC

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "title": "...", "type": "MOVIE", ... } ]
}
```

---

### `GET /api/movies`

Browse and search all published media with optional filters.

**Access:** PUBLIC

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title/synopsis |
| `type` | `MOVIE` \| `SERIES` | Filter by media type |
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

Get a single media item by ID.

**Access:** PUBLIC

**Response:** `200 OK`
```json
{ "success": true, "data": { "id": "...", "title": "...", "reviews": [...] } }
```

---

### `POST /api/movies`

Create a new media entry.

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
  "cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
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
| `genre` | string[] | At least 1 item |
| `releaseYear` | integer | 1888 – (current year + 2) |
| `director` | string | Required |
| `cast` | string[] | At least 1 item |
| `streamingPlatforms` | string[] | At least 1 item |
| `posterUrl` | string | Valid URL (optional) |
| `trailerUrl` | string | Valid URL (optional) |
| `streamingUrl` | string | Valid URL (optional) |
| `pricing` | enum | `free` or `premium` (default: `free`) |

**Response:** `201 Created`
```json
{ "success": true, "message": "Media created", "data": { ...media } }
```

---

### `PATCH /api/movies/:id`

Update an existing media entry.

**Access:** ADMIN

**Request Body:** _(same fields as POST, all optional, plus)_
```json
{ "isPublished": true }
```

**Response:** `200 OK`
```json
{ "success": true, "message": "Media updated", "data": { ...updatedMedia } }
```

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

List all approved reviews (paginated).

**Access:** PUBLIC

**Query Parameters:** `page`, `limit`, `mediaId` (filter by media)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "rating": 8, "content": "...", "user": {...}, "media": {...} } ],
  "meta": { "total": 30, "page": 1, "limit": 10, "totalPages": 3 }
}
```

---

### `GET /api/reviews/my`

Get the authenticated user's own reviews.

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "data": [ { ...review } ] }
```

---

### `GET /api/reviews/:id`

Get a single review by ID.

**Access:** PUBLIC

**Response:** `200 OK`
```json
{ "success": true, "data": { "id": "...", "rating": 8, "content": "...", "likeCount": 12 } }
```

---

### `POST /api/reviews`

Submit a new review for a media item. One review per user per media item.

**Access:** USER

**Request Body:**
```json
{
  "mediaId": "clx...",
  "rating": 8,
  "content": "This movie was absolutely brilliant...",
  "tags": ["must-watch", "classic"],
  "hasSpoiler": false
}
```

| Field | Type | Rules |
|---|---|---|
| `mediaId` | string | Required — valid media ID |
| `rating` | integer | 1–10 |
| `content` | string | 10–5000 characters |
| `tags` | string[] | Optional (default: `[]`) |
| `hasSpoiler` | boolean | Optional (default: `false`) |

**Response:** `201 Created`
```json
{ "success": true, "message": "Review submitted for approval", "data": { ...review } }
```

---

### `PATCH /api/reviews/:id`

Update own review. Users can only edit their own reviews.

**Access:** USER

**Request Body:** _(all fields optional)_
```json
{
  "rating": 9,
  "content": "On reflection, even better than I first thought...",
  "tags": ["masterpiece"],
  "hasSpoiler": true
}
```

**Response:** `200 OK`
```json
{ "success": true, "message": "Review updated", "data": { ...updatedReview } }
```

---

### `DELETE /api/reviews/:id`

Delete own review.

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Review deleted" }
```

---

### `POST /api/reviews/:id/like`

Toggle like on a review (like if not liked, unlike if already liked).

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Review liked" }
```

---

## Comments — `/api/comments`

### `GET /api/comments/review/:reviewId`

Get all comments for a specific review (supports nested/threaded replies).

**Access:** PUBLIC

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "content": "Great review!",
      "user": { "id": "...", "name": "Jane" },
      "replies": [ { ...nestedComment } ]
    }
  ]
}
```

---

### `POST /api/comments`

Post a comment on a review. Optionally reply to an existing comment.

**Access:** USER

**Request Body:**
```json
{
  "reviewId": "clx...",
  "content": "I completely agree with this take.",
  "parentId": "clx..."
}
```

| Field | Type | Rules |
|---|---|---|
| `reviewId` | string | Required — valid review ID |
| `content` | string | 1–1000 characters |
| `parentId` | string | Optional — ID of comment being replied to |

**Response:** `201 Created`
```json
{ "success": true, "message": "Comment posted", "data": { ...comment } }
```

---

### `PATCH /api/comments/:id`

Edit own comment. Users can only edit their own comments.

**Access:** USER

**Request Body:**
```json
{ "content": "Updated comment text." }
```

| Field | Type | Rules |
|---|---|---|
| `content` | string | 1–1000 characters |

**Response:** `200 OK`
```json
{ "success": true, "message": "Comment updated", "data": { ...updatedComment } }
```

---

### `DELETE /api/comments/:id`

Delete own comment.

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Comment deleted" }
```

---

## Watchlist — `/api/watchlist`

All endpoints require **USER** access.

### `GET /api/watchlist`

Get the authenticated user's watchlist.

**Access:** USER

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "id": "...", "media": { "id": "...", "title": "Inception", "type": "MOVIE", ... } }
  ]
}
```

---

### `POST /api/watchlist/toggle`

Add a media item to the watchlist, or remove it if already present.

**Access:** USER

**Request Body:**
```json
{ "mediaId": "clx..." }
```

**Response:** `200 OK`
```json
{ "success": true, "message": "Added to watchlist" }
```
or
```json
{ "success": true, "message": "Removed from watchlist" }
```

---

### `DELETE /api/watchlist/:mediaId`

Remove a specific media item from the watchlist.

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Removed from watchlist" }
```

---

## Payments — `/api/payments`

### `POST /api/payments/webhook`

Stripe webhook endpoint. Raw body required — handled internally; do not call from your application.

**Access:** PUBLIC (Stripe-signed, verified by webhook secret)  
**Content-Type:** `application/json` (raw, not parsed)

> **Note:** This endpoint is consumed by Stripe only, not by client applications.

---

### `POST /api/payments/checkout`

Create a Stripe Checkout session to start a subscription.

**Access:** USER

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

Get the authenticated user's current subscription details.

**Access:** USER

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

Cancel the authenticated user's active subscription at the end of the current billing period.

**Access:** USER

**Response:** `200 OK`
```json
{ "success": true, "message": "Subscription cancelled" }
```

---

## Admin — `/api/admin`

All endpoints require **ADMIN** access.

### `GET /api/admin/dashboard`

Get platform-wide statistics for the admin dashboard.

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

Get all reviews across the platform (all statuses).

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `status` (`PENDING` | `APPROVED` | `UNPUBLISHED`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "status": "PENDING", "user": {...}, "media": {...} } ],
  "meta": { "total": 430, "page": 1, "limit": 10, "totalPages": 43 }
}
```

---

### `GET /api/admin/reviews/pending`

Get only reviews awaiting moderation.

**Access:** ADMIN

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "status": "PENDING", ... } ]
}
```

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

**Response:** `200 OK`
```json
{ "success": true, "message": "Review moderated", "data": { ...updatedReview } }
```

---

### `GET /api/admin/users`

Get all registered users.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `role` (`USER` | `ADMIN`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "name": "...", "email": "...", "role": "USER" } ],
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
{ "success": true, "message": "User role updated", "data": { ...updatedUser } }
```

---

### `GET /api/admin/media`

Get all media entries including unpublished ones.

**Access:** ADMIN

**Query Parameters:** `page`, `limit`, `type` (`MOVIE` | `SERIES`), `isPublished` (`true` | `false`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ { "id": "...", "title": "...", "isPublished": false, ... } ],
  "meta": { "total": 85, "page": 1, "limit": 10, "totalPages": 9 }
}
```

---

### `DELETE /api/admin/comments/:id`

Hard-delete any comment from the platform (content moderation).

**Access:** ADMIN

**Response:** `200 OK`
```json
{ "success": true, "message": "Comment deleted" }
```

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed — check the `error` field for details |
| `401 Unauthorized` | Missing or invalid access token |
| `403 Forbidden` | Valid token but insufficient role |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate entry (e.g., reviewing the same media twice) |
| `500 Internal Server Error` | Unexpected server error |

**Validation error shape:**
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

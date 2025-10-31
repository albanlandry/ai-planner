# 🔧 AI Planner - Backend API Documentation

This document provides comprehensive documentation for all backend API endpoints and resources.

---

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Calendars](#calendar-endpoints)
  - [Events](#event-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Features](#security-features)

---

## Base URL

```
Development: http://localhost:8000/api
Production: TBD
```

All API endpoints are prefixed with `/api`.

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. There are two types of tokens:

- **Access Token**: Short-lived token for API access (expires in 15 minutes)
- **Refresh Token**: Long-lived token for refreshing access tokens (expires in 7 days)

### Authentication Header

Include the access token in the `Authorization` header for protected endpoints:

```
Authorization: Bearer <access_token>
```

### Token Refresh

When an access token expires (401 Unauthorized), use the refresh token to obtain a new access token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

Response:
```json
{
  "accessToken": "<new_access_token>",
  "refreshToken": "<new_refresh_token>"
}
```

---

## API Endpoints

### Authentication Endpoints

#### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `name`: String, 2-255 characters (required)
- `password`: String, minimum 6 characters (required)

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Error Responses:**
- `409 Conflict`: User already exists with this email
- `400 Bad Request`: Validation error

---

#### Login User

Authenticate and receive access/refresh tokens.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `password`: String (required)

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Validation error

---

#### Refresh Token

Refresh an expired access token.

**Endpoint:** `POST /api/auth/refresh`

**Authentication:** Not required (uses refresh token in body)

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Success Response (200):**
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

**Error Responses:**
- `401 Unauthorized`: Refresh token required
- `401 Unauthorized`: User not found
- `403 Forbidden`: Invalid refresh token

---

#### Get Current User

Get the authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (Access Token)

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

#### Update User Profile

Update the authenticated user's profile.

**Endpoint:** `PUT /api/auth/me`

**Authentication:** Required (Access Token)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Validation Rules:**
- `name`: String, 2-255 characters (optional)
- `avatar_url`: Valid URI (optional)

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `400 Bad Request`: Validation error

---

#### Logout

Logout (client-side token removal).

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Not required

**Success Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Note:** This endpoint only confirms logout. Token removal should be handled on the client side.

---

### Calendar Endpoints

#### Get All Calendars

Get all calendars for the authenticated user.

**Endpoint:** `GET /api/calendars`

**Authentication:** Required (Access Token)

**Success Response (200):**
```json
{
  "calendars": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Work",
      "color": "#3B82F6",
      "is_primary": true,
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Personal",
      "color": "#EF4444",
      "is_primary": false,
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

#### Get Calendar by ID

Get a specific calendar by ID.

**Endpoint:** `GET /api/calendars/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Calendar UUID

**Success Response (200):**
```json
{
  "calendar": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Work",
    "color": "#3B82F6",
    "is_primary": true,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Calendar not found

---

#### Create Calendar

Create a new calendar.

**Endpoint:** `POST /api/calendars`

**Authentication:** Required (Access Token)

**Request Body:**
```json
{
  "name": "Work",
  "color": "#3B82F6",
  "is_primary": false
}
```

**Validation Rules:**
- `name`: String, 1-255 characters (required)
- `color`: String, hex color format `#RRGGBB` (optional, default: `#3B82F6`)
- `is_primary`: Boolean (optional, default: `false`)

**Success Response (201):**
```json
{
  "message": "Calendar created successfully",
  "calendar": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Work",
    "color": "#3B82F6",
    "is_primary": false,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `400 Bad Request`: Validation error

---

#### Update Calendar

Update an existing calendar.

**Endpoint:** `PUT /api/calendars/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Calendar UUID

**Request Body:**
```json
{
  "name": "Updated Work",
  "color": "#10B981",
  "is_primary": true
}
```

**Validation Rules:**
- `name`: String, 1-255 characters (optional)
- `color`: String, hex color format `#RRGGBB` (optional)
- `is_primary`: Boolean (optional)

**Success Response (200):**
```json
{
  "message": "Calendar updated successfully",
  "calendar": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Updated Work",
    "color": "#10B981",
    "is_primary": true,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Calendar not found
- `400 Bad Request`: Validation error

---

#### Delete Calendar

Delete a calendar.

**Endpoint:** `DELETE /api/calendars/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Calendar UUID

**Success Response (200):**
```json
{
  "message": "Calendar deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Calendar not found

**Note:** Deleting a calendar will cascade delete all associated events.

---

### Event Endpoints

#### Get Events

Get events for a specific date range.

**Endpoint:** `GET /api/events`

**Authentication:** Required (Access Token)

**Query Parameters:**
- `start_date`: ISO 8601 date string (required)
- `end_date`: ISO 8601 date string (required)
- `calendar_id`: Calendar UUID (optional)

**Example Request:**
```
GET /api/events?start_date=2025-01-01T00:00:00.000Z&end_date=2025-01-31T23:59:59.999Z&calendar_id=uuid
```

**Success Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "calendar_id": "uuid",
      "title": "Team Meeting",
      "description": "Weekly team sync",
      "start_time": "2025-01-15T10:00:00.000Z",
      "end_time": "2025-01-15T11:00:00.000Z",
      "is_all_day": false,
      "location": "Conference Room A",
      "attendees": [
        {
          "email": "colleague@example.com",
          "name": "Jane Doe"
        }
      ],
      "recurrence_rule": null,
      "calendar_name": "Work",
      "calendar_color": "#3B82F6",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `400 Bad Request`: Missing start_date or end_date
- `404 Not Found`: Calendar not found (if calendar_id provided)

---

#### Get Event by ID

Get a specific event by ID.

**Endpoint:** `GET /api/events/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Event UUID

**Success Response (200):**
```json
{
  "event": {
    "id": "uuid",
    "calendar_id": "uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "start_time": "2025-01-15T10:00:00.000Z",
    "end_time": "2025-01-15T11:00:00.000Z",
    "is_all_day": false,
    "location": "Conference Room A",
    "attendees": [
      {
        "email": "colleague@example.com",
        "name": "Jane Doe"
      }
    ],
    "recurrence_rule": null,
    "calendar_name": "Work",
    "calendar_color": "#3B82F6",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Event not found

---

#### Create Event

Create a new event.

**Endpoint:** `POST /api/events`

**Authentication:** Required (Access Token)

**Request Body:**
```json
{
  "calendar_id": "uuid",
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "start_time": "2025-01-15T10:00:00.000Z",
  "end_time": "2025-01-15T11:00:00.000Z",
  "is_all_day": false,
  "location": "Conference Room A",
  "attendees": [
    {
      "email": "colleague@example.com",
      "name": "Jane Doe"
    }
  ],
  "recurrence_rule": {
    "frequency": "weekly",
    "interval": 1,
    "end_date": "2025-12-31T23:59:59.999Z"
  }
}
```

**Validation Rules:**
- `calendar_id`: UUID (required)
- `title`: String, 1-255 characters (required)
- `description`: String, max 1000 characters (optional)
- `start_time`: ISO 8601 date string (required)
- `end_time`: ISO 8601 date string, must be after `start_time` (required)
- `is_all_day`: Boolean (optional, default: `false`)
- `location`: String, max 255 characters (optional)
- `attendees`: Array of objects with `email` and `name` (optional)
- `recurrence_rule`: Object with `frequency`, `interval`, `end_date`, `count` (optional)
  - `frequency`: One of `daily`, `weekly`, `monthly`, `yearly`
  - `interval`: Integer, minimum 1
  - `end_date`: ISO 8601 date string (optional)
  - `count`: Integer, minimum 1 (optional)

**Success Response (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "id": "uuid",
    "calendar_id": "uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "start_time": "2025-01-15T10:00:00.000Z",
    "end_time": "2025-01-15T11:00:00.000Z",
    "is_all_day": false,
    "location": "Conference Room A",
    "attendees": [
      {
        "email": "colleague@example.com",
        "name": "Jane Doe"
      }
    ],
    "recurrence_rule": {
      "frequency": "weekly",
      "interval": 1,
      "end_date": "2025-12-31T23:59:59.999Z"
    },
    "calendar_name": "Work",
    "calendar_color": "#3B82F6",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Calendar not found
- `400 Bad Request`: Validation error

---

#### Update Event

Update an existing event.

**Endpoint:** `PUT /api/events/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Event UUID

**Request Body:**
```json
{
  "title": "Updated Team Meeting",
  "description": "Updated description",
  "start_time": "2025-01-15T11:00:00.000Z",
  "end_time": "2025-01-15T12:00:00.000Z",
  "location": "Conference Room B",
  "calendar_id": "uuid"
}
```

**Validation Rules:**
- All fields are optional
- Same validation rules as create event
- If `calendar_id` is updated, user must have access to the new calendar

**Success Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": {
    "id": "uuid",
    "calendar_id": "uuid",
    "title": "Updated Team Meeting",
    "description": "Updated description",
    "start_time": "2025-01-15T11:00:00.000Z",
    "end_time": "2025-01-15T12:00:00.000Z",
    "is_all_day": false,
    "location": "Conference Room B",
    "attendees": [],
    "recurrence_rule": null,
    "calendar_name": "Work",
    "calendar_color": "#3B82F6",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T11:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Event not found or target calendar not found
- `400 Bad Request`: Validation error

---

#### Delete Event

Delete an event.

**Endpoint:** `DELETE /api/events/:id`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Event UUID

**Success Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Event not found

---

#### Duplicate Event

Duplicate an existing event.

**Endpoint:** `POST /api/events/:id/duplicate`

**Authentication:** Required (Access Token)

**Path Parameters:**
- `id`: Event UUID to duplicate

**Success Response (201):**
```json
{
  "message": "Event duplicated successfully",
  "event": {
    "id": "uuid",
    "calendar_id": "uuid",
    "title": "Team Meeting (Copy)",
    "description": "Weekly team sync",
    "start_time": "2025-01-15T10:00:00.000Z",
    "end_time": "2025-01-15T11:00:00.000Z",
    "is_all_day": false,
    "location": "Conference Room A",
    "attendees": [
      {
        "email": "colleague@example.com",
        "name": "Jane Doe"
      }
    ],
    "recurrence_rule": null,
    "calendar_name": "Work",
    "calendar_color": "#3B82F6",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Event not found

**Note:** The duplicated event will have "(Copy)" appended to the title and will be in the same calendar with the same start/end times.

---

### Health Check Endpoint

#### Health Check

Check server health and status.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Success Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

---

## Data Models

### User Model

```typescript
{
  id: string;              // UUID
  email: string;          // Unique email address
  name: string;           // User's display name
  avatar_url?: string;    // Optional avatar URL
  created_at: string;     // ISO 8601 timestamp
  updated_at: string;     // ISO 8601 timestamp
}
```

### Calendar Model

```typescript
{
  id: string;             // UUID
  user_id: string;        // UUID of calendar owner
  name: string;           // Calendar name
  color: string;          // Hex color code (#RRGGBB)
  is_primary: boolean;    // Whether this is the primary calendar
  created_at: string;     // ISO 8601 timestamp
  updated_at: string;      // ISO 8601 timestamp
}
```

### Event Model

```typescript
{
  id: string;                    // UUID
  calendar_id: string;            // UUID of parent calendar
  title: string;                 // Event title
  description?: string;           // Optional event description
  start_time: string;            // ISO 8601 timestamp
  end_time: string;              // ISO 8601 timestamp
  is_all_day: boolean;           // Whether event is all-day
  location?: string;             // Optional event location
  attendees?: Attendee[];        // Optional array of attendees
  recurrence_rule?: RecurrenceRule; // Optional recurrence rule
  calendar_name?: string;         // Calendar name (populated on fetch)
  calendar_color?: string;        // Calendar color (populated on fetch)
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}

// Attendee Object
{
  email: string;                  // Attendee email
  name: string;                   // Attendee name
}

// Recurrence Rule Object
{
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;               // Interval (e.g., every 2 weeks)
  end_date?: string;             // Optional end date (ISO 8601)
  count?: number;                // Optional number of occurrences
}
```

---

## Error Handling

The API uses standard HTTP status codes and returns errors in a consistent format:

### Error Response Format

```json
{
  "error": "Error message",
  "details": ["Detailed error messages"]  // Only for validation errors
}
```

### Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error or invalid request
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Valid token but insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Scenarios

#### Validation Error (400)
```json
{
  "error": "Validation error",
  "details": [
    "email must be a valid email",
    "password must be at least 6 characters"
  ]
}
```

#### Unauthorized (401)
```json
{
  "error": "Invalid credentials"
}
```

#### Not Found (404)
```json
{
  "error": "Calendar not found"
}
```

#### Rate Limit Exceeded (429)
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP address
- **Scope**: All `/api/*` endpoints
- **Response**: `429 Too Many Requests` when limit exceeded
- **Headers**: Rate limit information included in response headers

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623456789
```

---

## Security Features

### Authentication & Authorization

- JWT-based authentication with access and refresh tokens
- Token expiration and automatic refresh
- Protected endpoints require valid access token
- User can only access their own resources

### Input Validation

- All inputs validated using Joi schemas
- SQL injection prevention via parameterized queries
- XSS protection through input sanitization
- Type checking and format validation

### Security Headers

The API uses Helmet.js to set security headers:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### CORS Configuration

- Configurable CORS origin
- Credentials support enabled
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization

### Password Security

- Passwords hashed using bcrypt (10 rounds)
- Password never returned in API responses
- Minimum password length: 6 characters

---

## Additional Notes

### Date/Time Format

All dates and times are in **ISO 8601** format (UTC):
```
2025-01-15T10:00:00.000Z
```

### UUID Format

All IDs are UUIDs (v4):
```
550e8400-e29b-41d4-a716-446655440000
```

### JSON Response Format

- All responses are JSON
- Dates are ISO 8601 strings
- Boolean values are `true`/`false`
- Null values are represented as `null`

### Pagination

Currently, pagination is not implemented. All list endpoints return all matching resources. This is a known limitation and will be addressed in future updates.

### Cascade Deletes

- Deleting a calendar will automatically delete all associated events
- Deleting a user will automatically delete all associated calendars and events

---

## Version History

- **v1.0.0** (2025-01-15): Initial API documentation
  - Authentication endpoints
  - Calendar CRUD operations
  - Event CRUD operations
  - Token refresh functionality
  - Health check endpoint

---

## Support

For API support and issues, please refer to the main project documentation or create an issue in the project repository.


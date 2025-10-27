# Calendar Backend API

A Node.js/Express backend API for the Calendar application with PostgreSQL database.

## Features

- 🔐 JWT-based authentication
- 📅 Calendar and event management
- 🗄️ PostgreSQL database with migrations
- 🛡️ Input validation and security
- 🚀 Docker support
- 📊 Health checks and monitoring

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

3. **Start PostgreSQL database:**
   ```bash
   # Using Docker
   docker run --name calendar-db -e POSTGRES_DB=calendar_db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15-alpine
   ```

4. **Run migrations:**
   ```bash
   npm run migrate
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:8000`

### Using Docker Compose

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/logout` - Logout user

### Calendars
- `GET /api/calendars` - Get user's calendars
- `GET /api/calendars/:id` - Get specific calendar
- `POST /api/calendars` - Create new calendar
- `PUT /api/calendars/:id` - Update calendar
- `DELETE /api/calendars/:id` - Delete calendar

### Events
- `GET /api/events` - Get events (with date range filters)
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/duplicate` - Duplicate event

## Database Schema

The database includes the following tables:
- `users` - User accounts
- `calendars` - User calendars
- `events` - Calendar events
- `calendar_permissions` - Calendar sharing permissions

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | - |
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Environment | development |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
npm run migrate
```

### Code Structure
```
backend/
├── src/
│   ├── api/           # API routes
│   ├── config/        # Database configuration
│   ├── middleware/    # Express middleware
│   ├── models/        # Database models
│   └── utils/         # Utility functions
├── migrations/        # Database migrations
└── package.json
```

## Production Deployment

1. **Set production environment variables**
2. **Build Docker image:**
   ```bash
   docker build -t calendar-backend .
   ```
3. **Run with production database:**
   ```bash
   docker run -p 8000:8000 --env-file .env.production calendar-backend
   ```

## Health Check

The API provides a health check endpoint at `/health` that returns:
- Server status
- Uptime
- Environment information
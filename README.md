# 📅 AI Planner - Calendar Application

A modern, full-stack calendar application built with Next.js, Node.js, PostgreSQL, and Docker. Features real-time collaboration, drag-and-drop events, and responsive design.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone and Start
```bash
git clone <repository-url>
cd ai-planner

# Start all services with hot reloading
npm run docker:dev
```

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health

### 3. Development Commands
```bash
# Start in detached mode (background)
npm run docker:dev:detached

# View logs
npm run docker:logs

# View backend logs only
npm run docker:backend:logs

# View frontend logs only
npm run docker:frontend:logs

# Stop all services
npm run docker:down

# Clean up (remove volumes and containers)
npm run docker:clean

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

## 🏗️ Architecture

### Frontend (Next.js 16)
- **Framework**: Next.js with App Router
- **UI**: React 19 with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Backend (Node.js)
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Authentication**: JWT
- **Validation**: Joi

### Database Schema
- **Users**: User accounts and authentication
- **Calendars**: User calendars with color coding
- **Events**: Calendar events with full CRUD
- **Permissions**: Calendar sharing and access control

## 🔧 Development Features

### Hot Reloading
- **Frontend**: Next.js Fast Refresh
- **Backend**: Nodemon with file watching
- **Database**: Automatic migrations on startup

### File Watching
The Docker setup automatically watches for file changes:
- Frontend files trigger Next.js hot reload
- Backend files trigger nodemon restart
- Database migrations run automatically

### Environment Variables
Create `.env.local` for frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Backend environment is configured in `docker-compose.dev.yml`.

## 📱 Features

### ✅ Implemented
- [x] Weekly & Monthly View Toggle
- [x] Drag & Drop Events
- [x] Resizable Events (Bottom Handle)
- [x] Time Snapping (15-min intervals)
- [x] Color-Coded Events
- [x] Sidebar with Mini Calendar
- [x] Calendar Filtering
- [x] Team Member Avatars
- [x] Search Bar (UI)
- [x] Responsive Grid Layout
- [x] Zustand State Management
- [x] Modular Components
- [x] TypeScript Types
- [x] Next.js App Router
- [x] Backend API with PostgreSQL
- [x] JWT Authentication
- [x] Docker Development Environment

### 🔄 Real-time Features
- Event creation, updates, and deletion
- Calendar management
- User authentication
- Optimistic updates with rollback

## 🛠️ API Endpoints

### Authentication
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login user
POST /api/auth/refresh     # Refresh token
GET  /api/auth/me          # Get current user
PUT  /api/auth/me          # Update profile
POST /api/auth/logout      # Logout
```

### Calendars
```
GET    /api/calendars      # List user calendars
GET    /api/calendars/:id  # Get calendar details
POST   /api/calendars      # Create calendar
PUT    /api/calendars/:id  # Update calendar
DELETE /api/calendars/:id  # Delete calendar
```

### Events
```
GET    /api/events         # List events (with filters)
GET    /api/events/:id     # Get event details
POST   /api/events         # Create event
PUT    /api/events/:id     # Update event
DELETE /api/events/:id     # Delete event
POST   /api/events/:id/duplicate # Duplicate event
```

## 🐳 Docker Services

### Development Stack
- **Frontend**: Next.js with hot reload
- **Backend**: Node.js with nodemon
- **Database**: PostgreSQL 15
- **Cache**: Redis 7

### Production Stack
- **Frontend**: Optimized Next.js build
- **Backend**: Production Node.js
- **Database**: PostgreSQL with persistence
- **Cache**: Redis with persistence

## 📊 Database

### Tables
- `users` - User accounts
- `calendars` - User calendars
- `events` - Calendar events
- `calendar_permissions` - Sharing permissions

### Sample Data
The database is automatically seeded with:
- Default admin user
- Sample calendars (Personal, Work, Design)
- Sample events for testing

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- CORS protection
- Rate limiting
- SQL injection prevention
- XSS protection

## 🚀 Production Deployment

### Using Docker Compose
```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Environment Variables
Set production environment variables:
- Database credentials
- JWT secrets
- CORS origins
- Rate limiting settings

## 🧪 Testing

### Backend Tests
```bash
# Run backend tests
cd backend
npm test

# Run with coverage
npm run test:coverage
```

### Frontend Tests
```bash
# Run frontend tests
npm test

# Run E2E tests
npm run test:e2e
```

## 📈 Monitoring

### Health Checks
- Backend: `/health` endpoint
- Database: Connection monitoring
- Redis: Ping monitoring

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000
lsof -i :5432
```

**Docker issues:**
```bash
# Clean up Docker
npm run docker:clean

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

**Database connection:**
```bash
# Check database logs
docker-compose -f docker-compose.dev.yml logs db

# Connect to database
docker exec -it calendar_db_dev psql -U user -d calendar_db
```

### Getting Help
- Check the logs: `npm run docker:logs`
- Review the API documentation
- Check the database schema
- Verify environment variables
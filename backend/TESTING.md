# Testing Guide - Docker Environment

This guide explains how to run tests when the backend is running in Docker.

## Prerequisites

Make sure your Docker containers are running:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Running Tests

### 1. Run All Tests

Run all tests inside the backend container:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm test
```

### 2. Run Specific Test File

Run tests for a specific file (e.g., MCP server tests):
```bash
docker-compose -f docker-compose.dev.yml exec backend npm test -- src/__tests__/mcp/server.test.js
```

### 3. Run Tests in Watch Mode

Run tests in watch mode for development:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm run test:watch
```

### 4. Run Tests with Coverage

Generate test coverage report:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm run test:coverage
```

### 5. Run Tests Matching a Pattern

Run tests matching a specific pattern:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm test -- --testNamePattern="create_event"
```

### 6. Run Tests Verbosely

Run tests with verbose output:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm test -- --verbose
```

## Alternative: Run Tests in One-off Container

If you prefer to run tests in a fresh container without affecting the running service:

```bash
docker-compose -f docker-compose.dev.yml run --rm backend npm test
```

## Shortcuts

You can add these shortcuts to your `package.json` scripts section:

```json
{
  "scripts": {
    "docker:test": "docker-compose -f docker-compose.dev.yml exec backend npm test",
    "docker:test:watch": "docker-compose -f docker-compose.dev.yml exec backend npm run test:watch",
    "docker:test:coverage": "docker-compose -f docker-compose.dev.yml exec backend npm run test:coverage",
    "docker:test:mcp": "docker-compose -f docker-compose.dev.yml exec backend npm test -- src/__tests__/mcp/server.test.js"
  }
}
```

Then run:
```bash
npm run docker:test
npm run docker:test:mcp
```

## Test Output

Test results will be displayed in your terminal. Since the backend code is mounted as a volume, any test files you create or modify locally will be immediately available in the container.

## Notes

- **Unit Tests**: The MCP server tests are unit tests that mock all dependencies, so they don't require a database connection.
- **Integration Tests**: If you write integration tests that need the database, they will automatically use the Docker database container.
- **Environment Variables**: Tests use the same environment variables as the running backend service.
- **Coverage Reports**: Coverage reports are generated in `backend/coverage/` directory and are accessible from your host machine.

## Troubleshooting

### Tests not found
If you get "Cannot find module" errors, make sure:
1. The container is running: `docker-compose -f docker-compose.dev.yml ps`
2. The backend code is properly mounted (check `docker-compose.dev.yml` volumes)

### Permission issues
If you encounter permission errors, you may need to run:
```bash
docker-compose -f docker-compose.dev.yml exec backend chown -R nextjs:nodejs /app
```

### Database connection errors (for integration tests)
If you're running integration tests that need the database:
- Ensure the database container is healthy
- Check that `DATABASE_URL` is correctly set in the container
- The database is accessible at `db:5432` from within the backend container


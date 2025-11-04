# MCP Server Implementation Design

## Overview

The Model Context Protocol (MCP) server is integrated directly into the backend Express application, providing a standardized interface for AI models to interact with the application's data and services. Unlike traditional REST APIs, MCP capabilities are designed to be called as tools/functions by AI models, enabling more natural and context-aware interactions.

**Version**: 1.0.0  
**Status**: ✅ High Priority Features Implemented  
**Location**: `backend/src/mcp/server.js`

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Model / Client                         │
│  (OpenAI GPT, Claude, or other AI assistant)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │ POST /api/ai/mcp/execute
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Express Backend Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           API Router (ai.js)                          │  │
│  │  - authenticateToken middleware                       │  │
│  │  - Request validation                                 │  │
│  │  - Response formatting                                │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         MCP Server (server.js)                         │  │
│  │  - Capability registry                                │  │
│  │  - executeCapability()                                │  │
│  │  - Standardized response format                        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Capability Handlers                           │  │
│  │  - create_event, get_events, etc.                    │  │
│  │  - Business logic                                     │  │
│  │  - Validation                                         │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Models & Services                             │  │
│  │  - Event, Task, Calendar models                       │  │
│  │  - schedulingService, queryProcessor                  │  │
│  │  - Database operations                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
backend/src/
├── mcp/
│   └── server.js              # MCP server implementation
├── api/
│   └── ai.js                  # AI API routes (includes MCP endpoints)
├── models/
│   ├── Event.js
│   ├── Task.js
│   ├── Calendar.js
│   └── User.js
└── services/
    └── ai/
        ├── schedulingService.js
        └── queryProcessor.js
```

---

## Core Components

### 1. MCP Server (`backend/src/mcp/server.js`)

#### Responsibilities
- **Capability Registry**: Maintains a registry of all available capabilities
- **Execution Engine**: Executes capabilities with proper error handling
- **Response Standardization**: Ensures all responses follow a consistent format
- **Authorization**: Validates user access to resources

#### Key Functions

##### `executeCapability(capabilityName, userId, params)`
Main entry point for executing capabilities.

```javascript
// Flow:
1. Validate capability exists
2. Execute capability with userId context
3. Catch and format errors
4. Return standardized response
```

**Parameters**:
- `capabilityName` (String): Name of the capability to execute
- `userId` (UUID): Authenticated user ID from JWT token
- `params` (Object): Capability-specific parameters

**Returns**: Standardized response object
```javascript
{
  success: boolean,
  data: object | array | null,
  error: string | null,
  execution_time_ms: number
}
```

##### `createResponse(success, data, error, executionTimeMs)`
Creates standardized response format.

##### `validateCalendarAccess(userId, calendarId)`
Validates user has access to a calendar (for authorization).

##### `getAvailableCapabilities()`
Returns list of all registered capabilities with descriptions.

---

### 2. API Integration (`backend/src/api/ai.js`)

#### MCP Endpoints

##### `GET /api/ai/mcp/capabilities`
Lists all available MCP capabilities.

**Request**: None (authenticated via JWT)

**Response**:
```json
{
  "capabilities": [
    {
      "name": "create_event",
      "description": "MCP capability: create_event"
    },
    // ... more capabilities
  ],
  "count": 9
}
```

**Flow**:
```
Client Request
  ↓
JWT Authentication (authenticateToken middleware)
  ↓
mcpServer.getAvailableCapabilities()
  ↓
Return capability list
```

##### `POST /api/ai/mcp/execute`
Executes an MCP capability.

**Request Body**:
```json
{
  "capability": "create_event",
  "params": {
    "title": "Team Meeting",
    "start_time": "2025-02-01T14:00:00Z",
    "end_time": "2025-02-01T15:00:00Z",
    "calendar_id": "uuid"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "title": "Team Meeting",
    // ... event object
  },
  "error": null,
  "execution_time_ms": 125
}
```

**Flow**:
```
Client Request with JWT
  ↓
JWT Authentication (authenticateToken middleware)
  ↓
Extract user.id from decoded token
  ↓
Validate request body (capability, params)
  ↓
mcpServer.executeCapability(capability, user.id, params)
  ↓
Return standardized response
```

---

## Interaction Flows

### Flow 1: AI Model Calls a Capability

```
┌─────────────┐
│  AI Model   │
└──────┬──────┘
       │
       │ 1. POST /api/ai/mcp/execute
       │    Authorization: Bearer <token>
       │    {
       │      "capability": "create_event",
       │      "params": {...}
       │    }
       │
       ▼
┌─────────────────────────────────┐
│  Express Middleware Chain        │
│  1. CORS                         │
│  2. Body Parser                  │
│  3. authenticateToken            │
│     - Verify JWT                 │
│     - Extract user.id            │
│     - Attach to req.user         │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  AI Router (/api/ai.js)          │
│  POST /api/ai/mcp/execute        │
│  - Validate request body         │
│  - Extract capability & params   │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  MCP Server                      │
│  executeCapability()             │
│  - Check capability exists       │
│  - Call capability handler       │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Capability Handler              │
│  create_event()                  │
│  - Validate params               │
│  - Check calendar access         │
│  - Call Event.create()           │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Event Model                     │
│  - Database operation            │
│  - Return event object           │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Response Chain                  │
│  - Format response               │
│  - Calculate execution time      │
│  - Return to client              │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────┐
│  AI Model   │
│  (receives  │
│   response) │
└─────────────┘
```

### Flow 2: Capability with Authorization Check

```
┌─────────────────────────────────┐
│  create_event capability         │
└──────┬────────────────────────────┘
       │
       │ 1. Extract calendar_id from params
       │
       ▼
┌─────────────────────────────────┐
│  Calendar Access Validation     │
│  validateCalendarAccess()       │
│  - Calendar.findByIdAndUserId()│
│  - Check user ownership         │
└──────┬────────────────────────────┘
       │
       ├─── Access Denied ────┐
       │                      │
       │                      ▼
       │              ┌──────────────────┐
       │              │ Return Error     │
       │              │ "Calendar not   │
       │              │  found or access │
       │              │  denied"        │
       │              └──────────────────┘
       │
       └─── Access Granted ────┐
                               │
                               ▼
                    ┌──────────────────┐
                    │ Continue with    │
                    │ event creation   │
                    └──────────────────┘
```

### Flow 3: Query Capability with Context Loading

```
┌─────────────────────────────────┐
│  query_calendar capability      │
└──────┬────────────────────────────┘
       │
       │ 1. Load user context
       │
       ▼
┌─────────────────────────────────┐
│  Context Loading                 │
│  - Calendar.findByUserId()      │
│  - Event.findByUserId()         │
│  - Build context object         │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Query Processing               │
│  queryProcessor.processQuery()  │
│  - Filter events by date        │
│  - Call OpenAI for NL processing│
│  - Generate answer              │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Response Formatting            │
│  - Format answer                │
│  - Include relevant events      │
│  - Return to client             │
└─────────────────────────────────┘
```

---

## Capability Implementation Details

### Capability Template

Each capability follows this structure:

```javascript
async capabilityName(userId, params) {
  const startTime = Date.now();
  
  try {
    // 1. Validate required parameters
    if (!params.requiredField) {
      return createResponse(false, null, 'Missing required field', Date.now() - startTime);
    }
    
    // 2. Validate authorization (if needed)
    if (params.resourceId) {
      const hasAccess = await validateResourceAccess(userId, params.resourceId);
      if (!hasAccess) {
        return createResponse(false, null, 'Access denied', Date.now() - startTime);
      }
    }
    
    // 3. Execute business logic
    const result = await Model.method(params);
    
    // 4. Return success response
    return createResponse(true, result.toJSON(), null, Date.now() - startTime);
    
  } catch (error) {
    // 5. Handle errors
    console.error(`MCP ${capabilityName} error:`, error);
    return createResponse(false, null, error.message, Date.now() - startTime);
  }
}
```

### High Priority Capabilities

#### 1. `create_event`

**Flow**:
```
1. Validate: title, start_time, end_time
2. If calendar_id provided:
   - Validate calendar access
3. If no calendar_id:
   - Find user's primary calendar
   - Use as default
4. Create event via Event.create()
5. Return event object
```

**Authorization**: Calendar ownership or write permission

**Error Cases**:
- Missing required fields
- Calendar not found
- Access denied
- Database error

#### 2. `get_events`

**Flow**:
```
1. Validate: start_date, end_date
2. If calendar_id provided:
   - Validate calendar access
   - Call Event.findByCalendarId()
3. Else:
   - Call Event.findByUserId()
4. Apply limit
5. Return event array
```

**Authorization**: Event read access

**Error Cases**:
- Missing date range
- Invalid calendar access
- Database error

#### 3. `get_calendars`

**Flow**:
```
1. Call Calendar.findByUserId()
2. Return calendar array
```

**Authorization**: User authentication only

**Error Cases**:
- Database error

#### 4. `create_task`

**Flow**:
```
1. Validate: title (required)
2. If calendar_id provided:
   - Validate calendar access
3. Use defaults for optional fields
4. Create task via Task.create()
5. Return task object
```

**Authorization**: User authentication

**Error Cases**:
- Missing title
- Invalid calendar access
- Database error

#### 5. `get_tasks`

**Flow**:
```
1. Build filters object from params
2. Call Task.findByUserId() with filters
3. Apply additional filters (organization, team, due_date)
4. Apply limit
5. Return task array
```

**Authorization**: User authentication

**Error Cases**:
- Database error

#### 6. `detect_conflicts`

**Flow**:
```
1. Validate: start_time, end_time
2. Call schedulingService.detectConflicts()
3. Return conflict information
```

**Authorization**: User authentication

**Error Cases**:
- Missing time range
- Service error

#### 7. `query_calendar`

**Flow**:
```
1. Validate: query (required)
2. Load user context:
   - Get calendars
   - Get events (date range)
3. Call queryProcessor.processQuery()
4. Return answer and relevant events
```

**Authorization**: User authentication

**Error Cases**:
- Missing query
- OpenAI service error

#### 8. `query_tasks`

**Flow**:
```
1. Validate: query (required)
2. Load tasks with filters
3. Call queryProcessor.processQuery()
4. Return answer and relevant tasks
```

**Authorization**: User authentication

**Error Cases**:
- Missing query
- OpenAI service error

#### 9. `get_user_context`

**Flow**:
```
1. Get user info via User.findById()
2. If include_calendars:
   - Get calendars
3. If include_events:
   - Calculate date range (events_days_ahead)
   - Get events
4. If include_tasks:
   - Get pending tasks
   - Apply tasks_limit
5. Return comprehensive context
```

**Authorization**: User authentication

**Error Cases**:
- User not found
- Database error

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────┐
│  Client Request                 │
│  Authorization: Bearer <token>  │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  authenticateToken Middleware   │
│  - Extract token from header    │
│  - Verify JWT signature         │
│  - Decode token                 │
│  - Load user from database      │
│  - Attach to req.user           │
└──────┬────────────────────────────┘
       │
       ├─── Invalid ────┐
       │                │
       │                ▼
       │        ┌──────────────────┐
       │        │ 401 Unauthorized │
       │        └──────────────────┘
       │
       └─── Valid ────┐
                      │
                      ▼
            ┌──────────────────┐
            │ Continue to MCP   │
            │ Server            │
            └──────────────────┘
```

### Authorization Levels

1. **User Authentication**: All capabilities require valid JWT token
2. **Resource Ownership**: User must own the resource (calendar, event, task)
3. **Calendar Access**: User must have read/write/admin permission on calendar
4. **Organization/Team Membership**: User must be a member (for future capabilities)

### Authorization Checks

```javascript
// Example: Calendar access check
async function validateCalendarAccess(userId, calendarId) {
  const calendar = await Calendar.findByIdAndUserId(calendarId, userId);
  return calendar !== null;
}

// Example: Usage in capability
if (calendar_id) {
  const hasAccess = await validateCalendarAccess(userId, calendar_id);
  if (!hasAccess) {
    return createResponse(false, null, 'Calendar not found or access denied');
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow the standardized response format:

```javascript
{
  success: false,
  data: null,
  error: "Error message describing what went wrong",
  execution_time_ms: 125
}
```

### Error Categories

1. **Validation Errors** (400 Bad Request)
   - Missing required fields
   - Invalid parameter types
   - Invalid date formats

2. **Authorization Errors** (403 Forbidden)
   - Calendar access denied
   - Resource not found
   - Insufficient permissions

3. **Server Errors** (500 Internal Server Error)
   - Database connection errors
   - Service unavailability
   - Unexpected exceptions

### Error Handling Flow

```
Capability Execution
  ↓
try {
  // Business logic
} catch (error) {
  console.error(`MCP ${capabilityName} error:`, error);
  return createResponse(
    false,
    null,
    error.message,
    Date.now() - startTime
  );
}
```

### Error Logging

All errors are logged with:
- Capability name
- User ID
- Error message
- Stack trace (in development)

---

## Data Flow

### Request → Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Request                                                     │
│  {                                                           │
│    "capability": "create_event",                            │
│    "params": {                                               │
│      "title": "Meeting",                                     │
│      "start_time": "2025-02-01T14:00:00Z",                   │
│      "end_time": "2025-02-01T15:00:00Z"                      │
│    }                                                         │
│  }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Validation Layer                                            │
│  - Check capability exists                                   │
│  - Validate required params                                  │
│  - Type checking                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Authorization Layer                                         │
│  - Check user authentication                                 │
│  - Validate resource access                                  │
│  - Check permissions                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Business Logic Layer                                        │
│  - Execute capability logic                                  │
│  - Call models/services                                      │
│  - Transform data                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Response Formatting                                         │
│  - Calculate execution time                                  │
│  - Format response object                                    │
│  - Include metadata                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Response                                                     │
│  {                                                           │
│    "success": true,                                          │
│    "data": {                                                 │
│      "id": "event-uuid",                                     │
│      "title": "Meeting",                                     │
│      ...                                                      │
│    },                                                        │
│    "error": null,                                            │
│    "execution_time_ms": 125                                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Execution Time Tracking

Every capability tracks execution time:
```javascript
const startTime = Date.now();
// ... execution ...
const executionTime = Date.now() - startTime;
```

### Optimization Strategies

1. **Database Query Optimization**
   - Use indexes (already in place)
   - Limit result sets
   - Avoid N+1 queries

2. **Caching Opportunities**
   - User calendars (rarely change)
   - User preferences
   - Calendar permissions

3. **Async Operations**
   - All database operations are async
   - Parallel operations where possible

4. **Response Size**
   - Limit arrays (default: 100 items)
   - Pagination for large datasets
   - Filter early, limit late

---

## Security Considerations

### Input Validation

1. **Parameter Validation**
   - Required fields checked
   - Type validation
   - Format validation (ISO dates, UUIDs)

2. **SQL Injection Prevention**
   - Use parameterized queries (via models)
   - No direct SQL string concatenation

3. **XSS Prevention**
   - Input sanitization (if needed)
   - JSON responses (no HTML)

### Authorization

1. **User Context**
   - User ID always from JWT token (never from request)
   - Cannot impersonate other users

2. **Resource Access**
   - All resource access validated
   - Calendar ownership checked
   - Task ownership checked

3. **Rate Limiting**
   - Applied at API level
   - Prevents abuse

---

## Integration Points

### With Existing Services

1. **Event Model**
   - `Event.create()`
   - `Event.findByUserId()`
   - `Event.findByCalendarId()`

2. **Task Model**
   - `Task.create()`
   - `Task.findByUserId()`

3. **Calendar Model**
   - `Calendar.findByUserId()`
   - `Calendar.findByIdAndUserId()`

4. **Scheduling Service**
   - `schedulingService.detectConflicts()`

5. **Query Processor**
   - `queryProcessor.processQuery()`

### With AI Chat System

The MCP server can be called from:
1. **Direct API calls** (current implementation)
2. **AI chat endpoint** (future: tool calling)
3. **Socket.IO handler** (future: real-time tool calls)

---

## Future Enhancements

### Planned Features

1. **Tool Calling Integration**
   - OpenAI function calling
   - Claude tool use
   - Automatic tool discovery

2. **Streaming Responses**
   - For long-running operations
   - Progress updates

3. **Batch Operations**
   - Execute multiple capabilities
   - Transaction support

4. **Capability Versioning**
   - Support multiple versions
   - Backward compatibility

5. **Analytics & Monitoring**
   - Capability usage metrics
   - Performance monitoring
   - Error tracking

---

## Testing Strategy

### Unit Tests

- All capabilities have unit tests
- Mock all dependencies
- Test success and error cases
- Test authorization checks

### Integration Tests

- Test with real database (future)
- Test end-to-end flows
- Test authentication flow

### Test Coverage

Current coverage:
- ✅ All 9 high-priority capabilities
- ✅ Error handling
- ✅ Authorization checks
- ✅ Parameter validation

---

## Deployment Considerations

### Environment Variables

No additional environment variables required (uses existing backend config).

### Database Migrations

No database migrations required (uses existing schema).

### Dependencies

No new dependencies added (uses existing models and services).

### Monitoring

Log all capability executions:
- Capability name
- User ID
- Success/failure
- Execution time
- Error messages (if any)

---

## API Reference Summary

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/ai/mcp/capabilities` | List capabilities | Yes |
| POST | `/api/ai/mcp/execute` | Execute capability | Yes |

### Request Format

```json
{
  "capability": "string (required)",
  "params": {
    // Capability-specific parameters
  }
}
```

### Response Format

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": string | null,
  "execution_time_ms": number
}
```

---

**Last Updated**: 2025-01-31  
**Status**: ✅ Implementation Complete  
**Next Steps**: Implement medium-priority capabilities


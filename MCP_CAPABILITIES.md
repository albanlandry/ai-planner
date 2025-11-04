# MCP Server Capabilities for AI Assistant

## Overview

This document outlines the capabilities that should be exposed to an AI model via a Model Context Protocol (MCP) server integrated into the backend. These capabilities enable the AI assistant to interact with the application's data and services directly.

**Note**: The MCP server will be integrated directly into the backend (no child process), allowing the AI model to call these capabilities as tools/functions.

---

## Priority Levels

- **High Priority**: Core functionality required for basic AI assistant operations
- **Medium Priority**: Enhanced functionality that improves user experience
- **Low Priority**: Advanced features and helper utilities

---

# HIGH PRIORITY - Core Functionality

These capabilities are essential for basic AI assistant operations and should be implemented first.

---

## Calendar & Event Management

### Create Event ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `create_event`  
**Description**: Create a new calendar event from structured data  
**Parameters**:
```json
{
  "calendar_id": "uuid",
  "title": "string (required)",
  "description": "string | null",
  "start_time": "ISO 8601 datetime (required)",
  "end_time": "ISO 8601 datetime (required)",
  "is_all_day": "boolean (default: false)",
  "location": "string | null",
  "attendees": "array of strings | null",
  "recurrence_rule": "object | null"
}
```
**Returns**: Created event object with all fields  
**Authorization**: User must own the calendar or have write permission

### Get Events ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `get_events`  
**Description**: Retrieve events within a date range  
**Parameters**:
```json
{
  "start_date": "ISO 8601 datetime (required)",
  "end_date": "ISO 8601 datetime (required)",
  "calendar_id": "uuid | null (filter by calendar)",
  "limit": "number (default: 100)"
}
```
**Returns**: Array of event objects  
**Authorization**: User must have read access to events

### Get Calendars ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `get_calendars`  
**Description**: Retrieve all calendars accessible to the user  
**Parameters**: None  
**Returns**: Array of calendar objects (including shared calendars)  
**Authorization**: User must be authenticated

---

## Task Management

### Create Task ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `create_task`  
**Description**: Create a new task  
**Parameters**:
```json
{
  "title": "string (required)",
  "description": "string | null",
  "status": "todo | in_progress | done | cancelled (default: todo)",
  "priority": "low | medium | high | urgent (default: medium)",
  "due_date": "ISO 8601 datetime | null",
  "calendar_id": "uuid | null",
  "organization_id": "uuid | null",
  "team_id": "uuid | null"
}
```
**Returns**: Created task object  
**Authorization**: User must be authenticated

### Get Tasks ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `get_tasks`  
**Description**: Retrieve tasks with optional filters  
**Parameters**:
```json
{
  "status": "todo | in_progress | done | cancelled | null",
  "priority": "low | medium | high | urgent | null",
  "calendar_id": "uuid | null",
  "organization_id": "uuid | null",
  "team_id": "uuid | null",
  "due_date_from": "ISO 8601 datetime | null",
  "due_date_to": "ISO 8601 datetime | null",
  "limit": "number (default: 100)"
}
```
**Returns**: Array of task objects  
**Authorization**: User must be authenticated

---

## Scheduling & Conflict Detection

### Detect Conflicts ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `detect_conflicts`  
**Description**: Check if a proposed time slot has scheduling conflicts  
**Parameters**:
```json
{
  "start_time": "ISO 8601 datetime (required)",
  "end_time": "ISO 8601 datetime (required)",
  "exclude_event_id": "uuid | null (for updates)"
}
```
**Returns**:
```json
{
  "has_conflict": "boolean",
  "conflicts": "array of event objects",
  "conflict_count": "number"
}
```
**Authorization**: User must be authenticated

---

## Query & Information Retrieval

### Query Calendar ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `query_calendar`  
**Description**: Answer questions about calendar events using natural language  
**Parameters**:
```json
{
  "query": "string (required)",
  "date_range": {
    "start": "ISO 8601 datetime | null",
    "end": "ISO 8601 datetime | null"
  }
}
```
**Returns**:
```json
{
  "answer": "string (natural language response)",
  "events": "array of relevant event objects",
  "date_range": {
    "start": "ISO 8601 datetime | null",
    "end": "ISO 8601 datetime | null"
  }
}
```
**Authorization**: User must be authenticated

### Query Tasks ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `query_tasks`  
**Description**: Answer questions about tasks using natural language  
**Parameters**:
```json
{
  "query": "string (required)",
  "filters": {
    "status": "string | null",
    "priority": "string | null",
    "due_date_from": "ISO 8601 datetime | null",
    "due_date_to": "ISO 8601 datetime | null"
  }
}
```
**Returns**:
```json
{
  "answer": "string (natural language response)",
  "tasks": "array of relevant task objects"
}
```
**Authorization**: User must be authenticated

### Get User Context ✅
**Priority**: 🔴 **HIGH**  
**Status**: ✅ **IMPLEMENTED**  
**Capability**: `get_user_context`  
**Description**: Retrieve comprehensive user context (calendars, recent events, pending tasks)  
**Parameters**:
```json
{
  "include_events": "boolean (default: true)",
  "include_tasks": "boolean (default: true)",
  "include_calendars": "boolean (default: true)",
  "events_days_ahead": "number (default: 7)",
  "tasks_limit": "number (default: 10)"
}
```
**Returns**:
```json
{
  "calendars": "array of calendar objects",
  "events": "array of event objects",
  "tasks": "array of task objects",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  }
}
```
**Authorization**: User must be authenticated

---

# MEDIUM PRIORITY - Enhanced Functionality

These capabilities improve the user experience and enable more advanced AI assistant features.

---

## Calendar & Event Management

### Update Event
**Priority**: 🟡 **MEDIUM**  
**Capability**: `update_event`  
**Description**: Update an existing event  
**Parameters**:
```json
{
  "event_id": "uuid (required)",
  "calendar_id": "uuid | null",
  "title": "string | null",
  "description": "string | null",
  "start_time": "ISO 8601 datetime | null",
  "end_time": "ISO 8601 datetime | null",
  "is_all_day": "boolean | null",
  "location": "string | null",
  "attendees": "array of strings | null",
  "recurrence_rule": "object | null"
}
```
**Returns**: Updated event object  
**Authorization**: User must own the calendar or have write permission

### Delete Event
**Priority**: 🟡 **MEDIUM**  
**Capability**: `delete_event`  
**Description**: Delete an event  
**Parameters**:
```json
{
  "event_id": "uuid (required)"
}
```
**Returns**: Success confirmation  
**Authorization**: User must own the calendar or have admin permission

### Get Event by ID
**Priority**: 🟡 **MEDIUM**  
**Capability**: `get_event`  
**Description**: Retrieve a specific event by ID  
**Parameters**:
```json
{
  "event_id": "uuid (required)"
}
```
**Returns**: Event object or null  
**Authorization**: User must have read access to the event

---

## Task Management

### Update Task
**Priority**: 🟡 **MEDIUM**  
**Capability**: `update_task`  
**Description**: Update an existing task  
**Parameters**:
```json
{
  "task_id": "uuid (required)",
  "title": "string | null",
  "description": "string | null",
  "status": "todo | in_progress | done | cancelled | null",
  "priority": "low | medium | high | urgent | null",
  "due_date": "ISO 8601 datetime | null",
  "calendar_id": "uuid | null",
  "organization_id": "uuid | null",
  "team_id": "uuid | null"
}
```
**Returns**: Updated task object  
**Authorization**: User must own the task

### Delete Task
**Priority**: 🟡 **MEDIUM**  
**Capability**: `delete_task`  
**Description**: Delete a task  
**Parameters**:
```json
{
  "task_id": "uuid (required)"
}
```
**Returns**: Success confirmation  
**Authorization**: User must own the task

### Get Task by ID
**Priority**: 🟡 **MEDIUM**  
**Capability**: `get_task`  
**Description**: Retrieve a specific task by ID  
**Parameters**:
```json
{
  "task_id": "uuid (required)"
}
```
**Returns**: Task object or null  
**Authorization**: User must own the task

### Complete Task
**Priority**: 🟡 **MEDIUM**  
**Capability**: `complete_task`  
**Description**: Mark a task as completed (sets status to 'done' and completed_at timestamp)  
**Parameters**:
```json
{
  "task_id": "uuid (required)"
}
```
**Returns**: Updated task object  
**Authorization**: User must own the task

---

## Scheduling & Conflict Detection

### Find Available Slots
**Priority**: 🟡 **MEDIUM**  
**Capability**: `find_available_slots`  
**Description**: Find available time slots in a date range  
**Parameters**:
```json
{
  "start_date": "ISO 8601 datetime (required)",
  "end_date": "ISO 8601 datetime (required)",
  "duration_minutes": "number (default: 60)",
  "preferred_hours": "array of numbers (default: [9,10,11,14,15,16,17])"
}
```
**Returns**: Array of available time slot objects  
**Authorization**: User must be authenticated

### Suggest Meeting Time
**Priority**: 🟡 **MEDIUM**  
**Capability**: `suggest_meeting_time`  
**Description**: Get optimal meeting time suggestions  
**Parameters**:
```json
{
  "duration_minutes": "number (default: 60)",
  "preferred_date": "ISO 8601 date | natural language string | null",
  "preferred_times": "array of time strings (e.g., ['morning', '2pm', 'afternoon'])"
}
```
**Returns**:
```json
{
  "suggestions": "array of time slot objects",
  "count": "number",
  "date_range": {
    "start": "ISO 8601 datetime",
    "end": "ISO 8601 datetime"
  }
}
```
**Authorization**: User must be authenticated

---

## Calendar Management

### Create Calendar
**Priority**: 🟡 **MEDIUM**  
**Capability**: `create_calendar`  
**Description**: Create a new calendar  
**Parameters**:
```json
{
  "name": "string (required)",
  "color": "hex color string (default: #3B82F6)",
  "is_primary": "boolean (default: false)"
}
```
**Returns**: Created calendar object  
**Authorization**: User must be authenticated

### Update Calendar
**Priority**: 🟡 **MEDIUM**  
**Capability**: `update_calendar`  
**Description**: Update calendar properties  
**Parameters**:
```json
{
  "calendar_id": "uuid (required)",
  "name": "string | null",
  "color": "string | null",
  "is_primary": "boolean | null"
}
```
**Returns**: Updated calendar object  
**Authorization**: User must own the calendar

---

# LOW PRIORITY - Advanced Features

These capabilities provide advanced functionality and helper utilities that may not be immediately necessary for basic AI assistant operations.

---

## Organization & Team Management

### Get Organizations
**Priority**: 🟢 **LOW**  
**Capability**: `get_organizations`  
**Description**: Retrieve all organizations the user belongs to  
**Parameters**: None  
**Returns**: Array of organization objects with user role  
**Authorization**: User must be authenticated

### Get Teams
**Priority**: 🟢 **LOW**  
**Capability**: `get_teams`  
**Description**: Retrieve all teams the user belongs to  
**Parameters**:
```json
{
  "organization_id": "uuid | null (filter by organization)"
}
```
**Returns**: Array of team objects  
**Authorization**: User must be authenticated

### Get Organization Tasks
**Priority**: 🟢 **LOW**  
**Capability**: `get_organization_tasks`  
**Description**: Retrieve tasks associated with an organization  
**Parameters**:
```json
{
  "organization_id": "uuid (required)",
  "status": "string | null",
  "priority": "string | null"
}
```
**Returns**: Array of task objects  
**Authorization**: User must be a member of the organization

### Get Team Tasks
**Priority**: 🟢 **LOW**  
**Capability**: `get_team_tasks`  
**Description**: Retrieve tasks associated with a team  
**Parameters**:
```json
{
  "team_id": "uuid (required)",
  "status": "string | null",
  "priority": "string | null"
}
```
**Returns**: Array of task objects  
**Authorization**: User must be a member of the team

---

## User Context & Preferences

### Get User Preferences
**Priority**: 🟢 **LOW**  
**Capability**: `get_user_preferences`  
**Description**: Retrieve AI assistant preferences for the user  
**Parameters**: None  
**Returns**: User preferences object  
**Authorization**: User must be authenticated

### Update User Preferences
**Priority**: 🟢 **LOW**  
**Capability**: `update_user_preferences`  
**Description**: Update AI assistant preferences  
**Parameters**:
```json
{
  "preferred_model": "string | null",
  "max_tokens_per_request": "number | null",
  "enable_streaming": "boolean | null",
  "conversation_history_days": "number | null",
  "auto_summarize_conversations": "boolean | null",
  "preferences": "object | null (additional JSONB preferences)"
}
```
**Returns**: Updated preferences object  
**Authorization**: User must be authenticated

### Get Current User
**Priority**: 🟢 **LOW**  
**Capability**: `get_current_user`  
**Description**: Get current authenticated user information  
**Parameters**: None  
**Returns**: User object (id, name, email, role)  
**Authorization**: User must be authenticated

---

## AI Conversation Management

### Get Conversations
**Priority**: 🟢 **LOW**  
**Capability**: `get_conversations`  
**Description**: Retrieve user's AI conversation history  
**Parameters**:
```json
{
  "limit": "number (default: 50)"
}
```
**Returns**: Array of conversation objects  
**Authorization**: User must be authenticated

### Get Conversation
**Priority**: 🟢 **LOW**  
**Capability**: `get_conversation`  
**Description**: Retrieve a specific conversation with all messages  
**Parameters**:
```json
{
  "conversation_id": "uuid (required)"
}
```
**Returns**: Conversation object with messages array  
**Authorization**: User must own the conversation

### Delete Conversation
**Priority**: 🟢 **LOW**  
**Capability**: `delete_conversation`  
**Description**: Delete a conversation and all its messages  
**Parameters**:
```json
{
  "conversation_id": "uuid (required)"
}
```
**Returns**: Success confirmation  
**Authorization**: User must own the conversation

### Get Conversation Context
**Priority**: 🟢 **LOW**  
**Capability**: `get_conversation_context`  
**Description**: Retrieve conversation context for use in prompts  
**Parameters**:
```json
{
  "conversation_id": "uuid (required)",
  "max_messages": "number (default: 20)"
}
```
**Returns**: Conversation context object with recent messages  
**Authorization**: User must own the conversation

---

## Natural Language Processing (Helper Capabilities)

### Parse Date
**Priority**: 🟢 **LOW**  
**Capability**: `parse_date`  
**Description**: Parse natural language date/time strings to ISO format  
**Parameters**:
```json
{
  "date_string": "string (required)",
  "reference_date": "ISO 8601 datetime | null (default: now)"
}
```
**Returns**:
```json
{
  "parsed_date": "ISO 8601 datetime",
  "confidence": "number (0-1)"
}
```
**Authorization**: User must be authenticated

### Extract Event Details
**Priority**: 🟢 **LOW**  
**Capability**: `extract_event_details`  
**Description**: Extract structured event information from natural language (internal helper)  
**Parameters**:
```json
{
  "message": "string (required)",
  "context": {
    "calendars": "array",
    "events": "array"
  }
}
```
**Returns**: Extracted event data object with confidence score  
**Authorization**: User must be authenticated

### Extract Task Details
**Priority**: 🟢 **LOW**  
**Capability**: `extract_task_details`  
**Description**: Extract structured task information from natural language (internal helper)  
**Parameters**:
```json
{
  "message": "string (required)",
  "context": {
    "calendars": "array",
    "tasks": "array"
  }
}
```
**Returns**: Extracted task data object with confidence score  
**Authorization**: User must be authenticated

### Classify Intent
**Priority**: 🟢 **LOW**  
**Capability**: `classify_intent`  
**Description**: Classify user message intent (internal helper)  
**Parameters**:
```json
{
  "message": "string (required)",
  "conversation_id": "uuid | null",
  "context": "object"
}
```
**Returns**:
```json
{
  "intent": "string (CREATE_EVENT, CREATE_TASK, QUERY_CALENDAR, etc.)",
  "confidence": "number (0-1)",
  "entities": "object"
}
```
**Authorization**: User must be authenticated

---

## Implementation Notes

### MCP Server Integration

1. **Server Location**: Integrated directly into the Express backend (`backend/src/mcp/server.js`)
2. **Protocol**: MCP (Model Context Protocol) - standard tool calling format
3. **Authentication**: All capabilities require JWT authentication (user context from token)
4. **Error Handling**: All capabilities should return structured error responses
5. **Logging**: All capability calls should be logged for analytics

### Capability Invocation Pattern

```javascript
// Example: AI model calls a capability
{
  "tool": "create_event",
  "arguments": {
    "calendar_id": "uuid",
    "title": "Team Meeting",
    "start_time": "2025-02-01T14:00:00Z",
    "end_time": "2025-02-01T15:00:00Z"
  }
}
```

### Response Format

All capabilities should return responses in this format:
```json
{
  "success": "boolean",
  "data": "object | array | null",
  "error": "string | null",
  "execution_time_ms": "number"
}
```

### Authorization Rules

- **User-owned resources**: User can only access/modify their own resources
- **Shared resources**: User must have appropriate permissions (read/write/admin)
- **Organization/Team resources**: User must be a member
- **Context data**: User can only access their own context

---

## Summary by Priority

### High Priority (9 capabilities) ✅ **ALL IMPLEMENTED**
Core functionality required for basic AI assistant operations:
- ✅ `create_event` - Create calendar events
- ✅ `get_events` - Retrieve events
- ✅ `get_calendars` - Get user calendars
- ✅ `create_task` - Create tasks
- ✅ `get_tasks` - Retrieve tasks
- ✅ `detect_conflicts` - Check scheduling conflicts
- ✅ `query_calendar` - Answer calendar questions
- ✅ `query_tasks` - Answer task questions
- ✅ `get_user_context` - Get comprehensive user context

### Medium Priority (11 capabilities)
Enhanced functionality that improves user experience:
- `update_event` - Update events
- `delete_event` - Delete events
- `get_event` - Get specific event
- `update_task` - Update tasks
- `delete_task` - Delete tasks
- `get_task` - Get specific task
- `complete_task` - Mark task as completed
- `find_available_slots` - Find available time slots
- `suggest_meeting_time` - Suggest meeting times
- `create_calendar` - Create calendars
- `update_calendar` - Update calendars

### Low Priority (15 capabilities)
Advanced features and helper utilities:
- `get_organizations` - Get user organizations
- `get_teams` - Get user teams
- `get_organization_tasks` - Get org tasks
- `get_team_tasks` - Get team tasks
- `get_user_preferences` - Get AI preferences
- `update_user_preferences` - Update AI preferences
- `get_current_user` - Get user info
- `get_conversations` - Get conversation history
- `get_conversation` - Get specific conversation
- `delete_conversation` - Delete conversation
- `get_conversation_context` - Get conversation context
- `parse_date` - Parse natural language dates
- `extract_event_details` - Extract event from NL
- `extract_task_details` - Extract task from NL
- `classify_intent` - Classify user intent

---

## Benefits of MCP Integration

1. **Direct API Access**: AI model can call capabilities directly without going through REST endpoints
2. **Type Safety**: Structured parameters and return types
3. **Better Context**: AI model has access to full system capabilities
4. **Reduced Latency**: No HTTP overhead for internal calls
5. **Tool Discovery**: AI model can discover available capabilities dynamically
6. **Standard Protocol**: Uses MCP standard for compatibility with various AI models

---

**Last Updated**: 2025-01-31  
**Status**: ✅ High Priority Features Implemented

---

## Implementation Status

### ✅ High Priority Features (COMPLETED)

All 9 high priority capabilities have been implemented and are available via the MCP server.

**Location**: `backend/src/mcp/server.js`  
**API Endpoints**:
- `GET /api/ai/mcp/capabilities` - List available capabilities
- `POST /api/ai/mcp/execute` - Execute a capability

**Usage Example**:
```javascript
// Execute a capability
POST /api/ai/mcp/execute
Authorization: Bearer <token>
Content-Type: application/json

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

**Response Format**:
```json
{
  "success": true,
  "data": { /* capability result */ },
  "error": null,
  "execution_time_ms": 125
}
```


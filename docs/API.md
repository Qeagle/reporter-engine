# API Documentation

## Overview

Reporter Engine provides a comprehensive REST API for integrating with test automation frameworks. All endpoints return JSON responses and follow RESTful conventions.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-id",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

## Test Execution Endpoints

### Start Test Execution

Initializes a new test execution session.

```http
POST /tests/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "testSuite": "smoke-tests",
  "environment": "staging",
  "metadata": {
    "branch": "main",
    "commit": "abc123",
    "triggeredBy": "jenkins",
    "tags": ["smoke", "critical"]
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "executionId": "execution-uuid",
    "startTime": "2025-08-12T10:00:00.000Z"
  }
}
```

### Report Test Result

Reports the result of an individual test case.

```http
POST /tests/result
Authorization: Bearer <token>
Content-Type: application/json

{
  "executionId": "execution-uuid",
  "testName": "User Login Test",
  "status": "passed",
  "duration": 2500,
  "error": null,
  "stackTrace": null,
  "screenshots": ["screenshot1.png"],
  "videos": ["test-recording.mp4"],
  "traces": ["trace.zip"],
  "metadata": {
    "browser": "chrome",
    "viewport": "1920x1080",
    "retries": 0,
    "tags": ["login", "critical"]
  }
}
```

Status values: `passed`, `failed`, `skipped`

Response:
```json
{
  "success": true,
  "data": {
    "testId": "test-result-uuid"
  }
}
```

### Complete Test Execution

Marks a test execution as complete with final summary.

```http
POST /tests/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "executionId": "execution-uuid",
  "status": "completed",
  "summary": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0,
    "duration": 120000,
    "passRate": 92
  },
  "metadata": {
    "endTime": "2025-08-12T10:05:00.000Z",
    "artifacts": {
      "screenshots": 15,
      "videos": 2,
      "traces": 2
    }
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "reportId": "report-uuid",
    "reportUrl": "/reports/report-uuid"
  }
}
```

## File Upload

### Upload Test Artifacts

Upload screenshots, videos, traces, and other test artifacts.

```http
POST /tests/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "executionId": "execution-uuid",
  "testName": "User Login Test",
  "files": [File objects],
  "artifactType": "screenshot"
}
```

Supported artifact types: `screenshot`, `video`, `trace`, `log`, `other`

## Reports Endpoints

### List Reports

```http
GET /reports?projectId=project-uuid&limit=20&offset=0&sortBy=startTime&sortOrder=desc
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "report-uuid",
      "projectId": "project-uuid",
      "testSuite": "smoke-tests",
      "environment": "staging",
      "status": "completed",
      "startTime": "2025-08-12T10:00:00.000Z",
      "endTime": "2025-08-12T10:05:00.000Z",
      "summary": {
        "total": 25,
        "passed": 23,
        "failed": 2,
        "skipped": 0,
        "duration": 120000,
        "passRate": 92
      }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "pages": 5
  }
}
```

### Get Report Details

```http
GET /reports/:reportId
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "report-uuid",
    "projectId": "project-uuid",
    "testSuite": "smoke-tests",
    "environment": "staging",
    "status": "completed",
    "startTime": "2025-08-12T10:00:00.000Z",
    "endTime": "2025-08-12T10:05:00.000Z",
    "summary": {
      "total": 25,
      "passed": 23,
      "failed": 2,
      "skipped": 0,
      "duration": 120000,
      "passRate": 92
    },
    "tests": [
      {
        "id": "test-uuid",
        "name": "User Login Test",
        "status": "passed",
        "duration": 2500,
        "screenshots": ["screenshot1.png"],
        "metadata": {
          "browser": "chrome",
          "retries": 0
        }
      }
    ],
    "metadata": {
      "branch": "main",
      "commit": "abc123",
      "triggeredBy": "jenkins"
    }
  }
}
```

## Projects Endpoints

### List Projects

```http
GET /projects
Authorization: Bearer <token>
```

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Test Project",
  "description": "Description of the test project"
}
```

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:3001');

// Join a specific report for updates
socket.emit('join-report', 'report-uuid');

// Listen for test execution events
socket.on('test-execution-started', (data) => {
  console.log('Test execution started:', data);
});

socket.on('test-execution-completed', (data) => {
  console.log('Test execution completed:', data);
});

socket.on('test-result-added', (data) => {
  console.log('New test result:', data);
});
```

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific error details"
  }
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API requests are limited to:
- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated requests

## Examples

See the `/examples` directory for complete integration examples with popular testing frameworks.

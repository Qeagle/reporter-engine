# Reporter Engine 🚀

> **A modern, real-time test reporting and analytics platform for automated testing workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)

Reporter Engine is a comprehensive test reporting solution that provides real-time analytics, detailed test insights, and AI-powered test analysis. Built with modern web technologies, it offers a seamless experience for managing test execution reports across multiple projects.

![Dashboard Preview](docs/images/dashboard-preview.png)

## ✨ Features

### 🎯 Core Features
- **Real-time Test Reporting** - Live updates during test execution
- **Multi-Project Support** - Organize tests across different projects
- **Interactive Analytics** - Rich charts and metrics visualization
- **Test Artifacts Management** - Screenshots, videos, and trace files
- **AI-Powered Analysis** - Automated failure analysis and insights
- **REST API Integration** - Easy integration with any test framework

### 📊 Analytics & Reporting
- **Executive Dashboard** - High-level test metrics and trends
- **Detailed Reports** - Drill-down into individual test results
- **Historical Analysis** - Track performance over time
- **Pass/Fail Trends** - Visual representation of test health
- **Duration Metrics** - Performance analysis and optimization insights

### � Trend Analysis (New!)
- **Historical Pass/Fail Analysis** - Comprehensive trend visualization over multiple time periods
- **Flexible Time Ranges** - Analyze data across 7 days, 30 days, 90 days, 6 months, or 1 year
- **Multiple Grouping Options** - View trends by day, week, or month aggregation
- **Advanced Filtering** - Filter by project, test suite, environment, and branch
- **Interactive Charts** - Professional Chart.js visualizations including:
  - Pass/Fail trend lines showing test execution health over time
  - Pass rate percentage trends with area charts
  - Execution duration analysis with bar charts
- **Summary Metrics** - Key performance indicators including total runs, pass rates, average duration, and failure counts
- **Test Suite Performance** - Compare trends across different test suites
- **Environment Comparison** - Track stability across staging, production, and other environments
- **Flaky Test Detection** - Identify tests with inconsistent pass/fail patterns

### 🔬 Failure Analysis
- **Intelligent Classification** - Automatically categorize failures into:
  - Application Defects
  - Test Data Issues
  - Automation Script Errors
  - Environment Issues
  - Unknown/Unclassified
- **Manual Reclassification** - Override automatic classifications with manual input
- **Multiple Time Windows** - Analyze failures across 1 hour, 8 hours, 1 day, 7 days, 30 days, 60 days, 90 days, or custom ranges
- **Persistent Classifications** - Manual classifications are stored and prioritized over automatic ones
- **Real-time Summary Updates** - Summary cards update immediately after reclassification
- **Multi-View Analysis**:
  - **Test Case View** - Individual test failures with classification details
  - **Suite/Run View** - Aggregated failure counts by test suite and run
  - **Groups View** - Deduplicated failure groups by error signature

### 👥 User Management (New!)
- **User Invitations** - Invite users via email with role-based access
- **Project-based Access** - Assign users to specific projects with appropriate roles
- **Invitation Management** - Track, resend, and revoke invitations
- **Email Notifications** - Automatic invitation emails with secure tokens
- **Self-registration** - Users can accept invitations and create their own accounts

### 🔧 Developer Experience
- **WebSocket Integration** - Real-time updates without refresh
- **RESTful APIs** - Complete programmatic access
- **Webhook Support** - Integration with CI/CD pipelines
- **Export Capabilities** - PDF and data export functionality
- **Dark/Light Theme** - Customizable user interface

## 🏗️ Architecture

```
├── Frontend (React + TypeScript)
│   ├── Real-time dashboard with WebSocket updates
│   ├── Interactive charts and analytics
│   ├── Project and report management
│   └── User authentication and settings
│
├── Backend (Node.js + Express)
│   ├── RESTful API endpoints
│   ├── WebSocket server for real-time updates
│   ├── File upload and artifact management
│   └── AI integration for test analysis
│
└── Data Layer
    ├── JSON-based storage (easily replaceable)
    ├── File system for test artifacts
    └── Optional cloud storage integration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Qeagle/reporter-engine.git
   cd reporter-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration (minimum required):
   ```bash
   # Server Configuration
   NODE_ENV=development
   PORT=3001
   CLIENT_URL=http://localhost
   
   # JWT Authentication (IMPORTANT: Change in production!)
   JWT_SECRET=your-secret-key-change-in-production
   
   # Optional: AI features
   GROQ_API_KEY=your_groq_api_key_here
   
   # Optional: Email notifications
   SEND_EMAILS=false
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost (port 80)
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/api/health

### Initial Setup & Authentication

#### Option 1: Use Default Admin Account (Recommended)
The system comes with a pre-configured admin account:
- **Username**: `admin@example.com`
- **Password**: `admin123`

#### Option 2: Windows Installation Setup
If you're running on Windows and having issues with the default setup:

1. **Start Backend Server**
   ```bash
   cd reporter-engine
   node server/index.js
   ```

2. **Start Frontend (in separate terminal)**
   ```bash
   npm run frontend
   ```

3. **Get Authentication Token**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin@example.com", "password": "admin123"}'
   ```

   **Response:**
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 1,
       "username": "admin@example.com",
       "role": "admin"
     }
   }
   ```

4. **Use the token for subsequent API calls**
   ```bash
   Authorization: Bearer <your-token-here>
   ```

#### Creating Additional Users

1. **Create User Invitation (Admin Required)**
   ```bash
   curl -X POST http://localhost:3001/api/invitations/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{
       "email": "user@company.com",
       "projectId": 1,
       "projectRoleId": 2
     }'
   ```

2. **Accept Invitation (New User)**
   ```bash
   curl -X POST http://localhost:3001/api/invitations/<invitation-token>/accept \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "password": "securepassword"
     }'
   ```

## 📖 Usage Guide

### Authentication Setup

#### Getting Your First Token
Before using any API endpoints, you need to authenticate:

```bash
# Login with default admin account
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU4Mjg4NDEsImV4cCI6MTc1NTkxNTI0MX0.yH0a3zeAC1vrx57M6DRMTtoGaVZ-oET66jjv3wnH8A4",
  "user": {
    "id": 1,
    "username": "admin@example.com",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Save the token and use it in all subsequent API calls:**
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Complete Test Reporting Workflow

#### 1. Start a Test Execution
```bash
curl -X POST http://localhost:3001/api/tests/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "testSuite": "E2E Shopping Cart Tests",
    "environment": "staging",
    "framework": "Playwright",
    "project": {
      "id": 1,
      "name": "E-commerce Platform",
      "type": "web"
    },
    "tags": ["smoke", "critical", "cart"],
    "metadata": {
      "browser": "chromium",
      "headless": true,
      "viewport": "1920x1080",
      "parallel": 4
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "reportId": "ed1b5bca-47af-479d-8759-cd0824581aee",
  "message": "Test execution started successfully"
}
```

#### 2. Report Individual Test Results
```bash
curl -X POST http://localhost:3001/api/tests/result \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "executionId": "ed1b5bca-47af-479d-8759-cd0824581aee",
    "testName": "Add Product to Cart",
    "status": "passed",
    "duration": 2500,
    "error": null,
    "stackTrace": null,
    "screenshots": ["add-to-cart-success.png"],
    "videos": ["add-to-cart-flow.mp4"],
    "traces": ["add-to-cart-trace.json"],
    "metadata": {
      "productId": "prod-123",
      "price": "$29.99",
      "quantity": 2
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": 100
  },
  "message": "Test result reported successfully"
}
```

#### 3. Report Test Steps (Optional)
Add detailed step-by-step execution information:

```bash
curl -X POST http://localhost:3001/api/tests/step \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "reportId": "ed1b5bca-47af-479d-8759-cd0824581aee",
    "testName": "Add Product to Cart",
    "stepName": "Navigate to product page",
    "status": "passed",
    "duration": 800,
    "description": "Navigate to product detail page for iPhone 15"
  }'
```

**Response:**
```json
{
  "success": true,
  "step": {
    "id": 1394,
    "test_case_id": 100,
    "step_order": 1,
    "name": "Navigate to product page",
    "status": "passed",
    "duration": 800,
    "error": null,
    "category": "action"
  },
  "message": "Test step added successfully"
}
```

#### 4. Complete Test Execution
```bash
curl -X POST http://localhost:3001/api/tests/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "reportId": "ed1b5bca-47af-479d-8759-cd0824581aee",
    "summary": {
      "total": 3,
      "passed": 2,
      "failed": 1,
      "skipped": 0,
      "duration": 9300,
      "passRate": 67
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Test execution completed successfully",
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "skipped": 0,
    "duration": 9300,
    "passRate": 67
  }
}
```

### User Management

#### Create User Invitations (Admin Only)
```bash
curl -X POST http://localhost:3001/api/invitations/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "mahesh.peddyakudi@company.com",
    "projectId": 1,
    "projectRoleId": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": 1,
    "email": "mahesh.peddyakudi@company.com",
    "token": "inv_abc123def456",
    "projectId": 1,
    "projectRoleId": 2,
    "status": "pending"
  },
  "message": "Invitation created successfully"
}
```

#### Accept Invitation (New User)
```bash
curl -X POST http://localhost:3001/api/invitations/inv_abc123def456/accept \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mahesh Peddyakudi",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "Mahesh Peddyakudi",
    "email": "mahesh.peddyakudi@company.com",
    "role": "member"
  },
  "message": "Account created successfully"
}
```

### For Test Framework Integration

Reporter Engine provides REST APIs to integrate with any test automation framework:

### Failure Analysis Usage

#### Analyze Test Failures
The new failure analysis feature provides intelligent classification of test failures:

```bash
# Get failure analysis summary
GET http://localhost:3001/api/analysis/projects/{projectId}/summary?timeWindow=30

# Get classified test case failures
GET http://localhost:3001/api/analysis/projects/{projectId}/test-cases?timeWindow=7

# Get suite-level failure aggregation
GET http://localhost:3001/api/analysis/projects/{projectId}/suite-runs?timeWindow=1d

# Get deduplicated failure groups
GET http://localhost:3001/api/analysis/projects/{projectId}/groups?timeWindow=8h
```

#### Reclassify Failures
```bash
POST http://localhost:3001/api/analysis/test-cases/{testCaseId}/reclassify
Content-Type: application/json

{
  "primaryClass": "Application Defect",
  "subClass": "Logic Error"
}
```

#### Time Windows Supported
- `1h` - Last 1 hour
- `8h` - Last 8 hours  
- `1d` - Last 1 day
- `7` - Last 7 days
- `30` - Last 30 days
- `60` - Last 60 days
- `90` - Last 90 days
- `custom` - Custom date range

### User Management

#### Create User Invitations
```bash
POST http://localhost:3001/api/invitations/create
Content-Type: application/json

{
  "email": "user@company.com",
  "projectId": 123,
  "projectRoleId": 2
}
```

#### Accept Invitation
```bash
POST http://localhost:3001/api/invitations/{token}/accept
Content-Type: application/json

{
  "name": "John Doe",
  "password": "securepassword"
}
```

### Integration Examples

#### Playwright Integration
```typescript
// reporters/reporter-engine.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import axios from 'axios';

class ReporterEngineReporter implements Reporter {
  private executionId: string;
  private apiClient = axios.create({
    baseURL: 'http://localhost:3001/api'
  });

  async onBegin() {
    const response = await this.apiClient.post('/tests/start', {
      projectId: 'my-project',
      testSuite: process.env.TEST_SUITE || 'default',
      environment: process.env.NODE_ENV || 'test'
    });
    this.executionId = response.data.executionId;
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    await this.apiClient.post('/tests/result', {
      executionId: this.executionId,
      testName: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message
    });
  }

  async onEnd() {
    // Complete execution with summary
    await this.apiClient.post('/tests/complete', {
      executionId: this.executionId,
      summary: { /* test summary */ }
    });
  }
}
```

#### Cypress Integration
```javascript
// cypress/plugins/reporter-engine.js
const axios = require('axios');

module.exports = (on, config) => {
  let executionId;
  
  on('before:run', async () => {
    const response = await axios.post('http://localhost:3001/api/tests/start', {
      projectId: 'cypress-project',
      testSuite: 'e2e-tests'
    });
    executionId = response.data.executionId;
  });

  on('after:spec', async (spec, results) => {
    for (const test of results.tests) {
      await axios.post('http://localhost:3001/api/tests/result', {
        executionId,
        testName: test.title.join(' > '),
        status: test.state,
        duration: test.duration
      });
    }
  });
};
```

## 🔧 Configuration

### Troubleshooting

#### Windows Setup Issues

**Problem**: Cannot launch backend using `npm run dev`

**Solution 1**: Start services separately
```bash
# Terminal 1: Start backend
node server/index.js

# Terminal 2: Start frontend  
npm run frontend
```

**Solution 2**: Use different ports
```bash
# Backend on port 3001
PORT=3001 node server/index.js

# Frontend on port 3000 (if port 80 is occupied)
npm run frontend -- --port 3000
```

#### Authentication Issues

**Problem**: "Access denied. No token provided" when creating invitations

**Solution**: Get admin token first
```bash
# 1. Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@example.com", "password": "admin123"}'

# 2. Use the token in Authorization header
curl -X POST http://localhost:3001/api/invitations/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token-here>" \
  -d '{"email": "user@company.com", "projectId": 1, "projectRoleId": 2}'
```

**Problem**: Default admin login not working

**Solution**: Check if database is initialized
```bash
# Check if database file exists
ls -la server/data/database.sqlite

# If missing, restart the server to initialize
node server/index.js
```

#### API Access Issues

**Problem**: CORS errors when accessing API from different domain

**Solution**: Update CLIENT_URL in .env
```bash
CLIENT_URL=http://192.168.0.159
```

**Problem**: 404 errors on API endpoints

**Solution**: Ensure backend is running and check the correct port
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-08-22T...","version":"2.0"}
```

### Environment Variables

The project uses environment variables for configuration. Copy `.env.example` to `.env` and update the values as needed:

```bash
cp .env.example .env
```

#### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3001` | No |
| `SERVER_HOST` | Server host | `localhost` | No |
| `CLIENT_URL` | Frontend URL for CORS and invitation links | `http://localhost` | No |
| `JWT_SECRET` | Secret key for JWT token signing | `your-secret-key-change-in-production` | **Yes** |

#### AI Features (Optional)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GROQ_API_KEY` | Groq API key for AI analysis | - | No |

#### Email Configuration (Optional)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SEND_EMAILS` | Enable/disable email sending | `false` | No |
| `SMTP_HOST` | SMTP server host | `localhost` | No |
| `SMTP_PORT` | SMTP server port | `587` | No |
| `SMTP_USER` | SMTP username | - | No |
| `SMTP_PASS` | SMTP password | - | No |
| `SMTP_FROM` | Email sender address | `noreply@testreport.com` | No |

#### Development Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TEST_SUITE` | Default test suite name | `default` | No |
| `VITE_HMR_HOST` | Vite HMR host | `localhost` | No |
| `VITE_API_URL` | API URL for frontend | `http://localhost:3001` | No |

#### Production Notes

- **JWT_SECRET**: Must be changed in production to a secure random string
- **SEND_EMAILS**: Set to `true` in production to enable invitation emails
- **SMTP Configuration**: Required if `SEND_EMAILS=true`

### AI Analysis Features

Reporter Engine includes optional AI-powered features for test failure analysis:

1. **Groq Integration** (Recommended)
   - Fast, cost-effective AI analysis
   - Get API key from [Groq Console](https://console.groq.com)

2. **OpenAI Integration**
   - Alternative to Groq
   - Requires OpenAI API key

## 🧪 Development

### Development Scripts

```bash
# Start development server (frontend + backend)
npm run dev

# Start only backend server
npm run server

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

### Project Structure

```
reporter-engine/
├── src/                          # Frontend React application
│   ├── components/              # React components
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Custom hooks
│   ├── pages/                  # Page components
│   ├── services/              # API services
│   └── utils/                 # Utilities
├── server/                     # Backend Node.js application
│   ├── controllers/           # API controllers
│   ├── middleware/           # Express middleware
│   ├── routes/               # API routes
│   ├── services/             # Business logic
│   └── data/                 # JSON data storage
├── public/                    # Static assets
└── docs/                     # Documentation
```

### API Documentation

Full API documentation is available at `/api/docs` when running the server.

#### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/health` | Health check | No |
| `POST` | `/api/auth/login` | User authentication | No |
| `GET` | `/api/docs` | API documentation | No |
| `GET` | `/api/projects` | List projects | Yes |
| `POST` | `/api/tests/start` | Start test execution | Yes |
| `POST` | `/api/tests/result` | Report test result | Yes |
| `POST` | `/api/tests/step` | Report test step | Yes |
| `POST` | `/api/tests/complete` | Complete execution | Yes |
| `POST` | `/api/tests/update` | Update test execution | Yes |
| `POST` | `/api/tests/artifact` | Upload test artifact | Yes |
| `POST` | `/api/tests/batch/results` | Batch test results | Yes |
| `GET` | `/api/reports` | List reports | Yes |
| `GET` | `/api/reports/:id` | Get report details | Yes |
| `GET` | `/api/analysis/projects/:id/summary` | Get failure analysis summary | Yes |
| `GET` | `/api/analysis/projects/:id/test-cases` | Get classified test failures | Yes |
| `GET` | `/api/analysis/projects/:id/suite-runs` | Get suite-level failure analysis | Yes |
| `GET` | `/api/analysis/projects/:id/groups` | Get deduplicated failure groups | Yes |
| `POST` | `/api/analysis/test-cases/:id/reclassify` | Manually reclassify a failure | Yes |
| `POST` | `/api/invitations/create` | Create user invitation | Yes (Admin) |
| `GET` | `/api/invitations/list` | List invitations | Yes (Admin) |
| `POST` | `/api/invitations/:token/accept` | Accept invitation | No |
| `POST` | `/api/invitations/:id/revoke` | Revoke invitation | Yes (Admin) |

#### API Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

#### Authentication Headers
All authenticated endpoints require:
```bash
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## 🔒 Security

- **Authentication**: JWT-based authentication system
- **CORS**: Configurable CORS settings
- **Helmet**: Security headers with Helmet.js
- **Input Validation**: Request validation middleware
- **File Upload**: Secure file upload with restrictions

## 🌟 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

## 📊 Performance

- **Real-time Updates**: WebSocket connections for instant updates
- **Efficient Rendering**: React optimizations and lazy loading
- **API Response Time**: < 100ms for most endpoints
- **File Upload**: Chunked upload for large artifacts
- **Database Queries**: Optimized with indexing and caching

## 🚀 Deployment

### Docker Deployment

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY package*.json ./
RUN npm ci --only=production
EXPOSE 3001
CMD ["npm", "run", "server"]
```

### Cloud Deployment

- **Vercel**: Frontend deployment
- **Heroku**: Full-stack deployment
- **AWS**: EC2 or ECS deployment
- **DigitalOcean**: Droplet deployment

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- **Documentation**: [Wiki](https://github.com/Qeagle/reporter-engine/wiki)
- **Issues**: [GitHub Issues](https://github.com/Qeagle/reporter-engine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Qeagle/reporter-engine/discussions)

## 🏆 Acknowledgments

- [Playwright](https://playwright.dev/) - Web testing framework
- [React](https://reactjs.org/) - Frontend framework
- [Express.js](https://expressjs.com/) - Backend framework
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

<div align="center">
  <p>Made with ❤️ by the Qeagle Team</p>
  <p>
    <a href="https://github.com/Qeagle/reporter-engine">⭐ Star us on GitHub</a> |
    <a href="https://github.com/Qeagle/reporter-engine/issues">🐛 Report Bug</a> |
    <a href="https://github.com/Qeagle/reporter-engine/issues">💡 Request Feature</a>
  </p>
</div>

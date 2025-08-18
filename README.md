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
   
   Edit `.env` with your configuration:
   ```bash
   # Required for AI features (optional)
   GROQ_API_KEY=your_groq_api_key_here
   
   # Server configuration
   CLIENT_URL=http://localhost
   PORT=3001
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost (port 80)
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/api/health

### Default Login
- **Username**: `admin@example.com`
- **Password**: `admin123`

## 📖 Usage Guide

### For Test Framework Integration

Reporter Engine provides REST APIs to integrate with any test automation framework:

#### 1. Start a Test Execution
```bash
POST http://localhost:3001/api/tests/start
Content-Type: application/json

{
  "projectId": "your-project-id",
  "testSuite": "smoke-tests",
  "environment": "staging",
  "metadata": {
    "branch": "main",
    "commit": "abc123",
    "triggeredBy": "jenkins"
  }
}
```

#### 2. Report Test Results
```bash
POST http://localhost:3001/api/tests/result
Content-Type: application/json

{
  "executionId": "execution-id-from-start",
  "testName": "User Login Test",
  "status": "passed",
  "duration": 2500,
  "error": null,
  "screenshots": ["screenshot1.png"],
  "metadata": {
    "browser": "chrome",
    "viewport": "1920x1080"
  }
}
```

#### 3. Complete Test Execution
```bash
POST http://localhost:3001/api/tests/complete
Content-Type: application/json

{
  "executionId": "execution-id-from-start",
  "summary": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0,
    "duration": 120000
  }
}
```

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

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost` | No |
| `GROQ_API_KEY` | Groq API key for AI analysis | - | No |
| `OPENAI_API_KEY` | OpenAI API key (alternative to Groq) | - | No |
| `NODE_ENV` | Environment mode | `development` | No |

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `http://localhost:3001/api/health` | Health check |
| `POST` | `http://localhost:3001/api/auth/login` | User authentication |
| `GET` | `http://localhost:3001/api/projects` | List projects |
| `POST` | `http://localhost:3001/api/tests/start` | Start test execution |
| `POST` | `http://localhost:3001/api/tests/result` | Report test result |
| `POST` | `http://localhost:3001/api/tests/complete` | Complete execution |
| `GET` | `http://localhost:3001/api/reports` | List reports |
| `GET` | `http://localhost:3001/api/reports/:id` | Get report details |
| `GET` | `http://localhost:3001/api/analysis/projects/:id/summary` | Get failure analysis summary |
| `GET` | `http://localhost:3001/api/analysis/projects/:id/test-cases` | Get classified test failures |
| `GET` | `http://localhost:3001/api/analysis/projects/:id/suite-runs` | Get suite-level failure analysis |
| `GET` | `http://localhost:3001/api/analysis/projects/:id/groups` | Get deduplicated failure groups |
| `POST` | `http://localhost:3001/api/analysis/test-cases/:id/reclassify` | Manually reclassify a failure |
| `POST` | `http://localhost:3001/api/invitations/create` | Create user invitation |
| `GET` | `http://localhost:3001/api/invitations/list` | List invitations |
| `POST` | `http://localhost:3001/api/invitations/:token/accept` | Accept invitation |
| `POST` | `http://localhost:3001/api/invitations/:id/revoke` | Revoke invitation |

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

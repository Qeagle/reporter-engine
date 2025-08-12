# Contributing to Reporter Engine

Thank you for your interest in contributing to Reporter Engine! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, browser)
   - Screenshots or error logs

### Suggesting Features

1. **Check the roadmap** to see if the feature is already planned
2. **Open a feature request** with detailed description
3. **Explain the use case** and why it would be valuable
4. **Consider implementation complexity** and breaking changes

### Code Contributions

#### Setup Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/reporter-engine.git
   cd reporter-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

#### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. **Commit with conventional format**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Coding Standards

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Define interfaces** for all data structures
- **Use strict type checking** - avoid `any` types
- **Export types** from dedicated `.types.ts` files

```typescript
// ✅ Good
interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
}

// ❌ Avoid
const result: any = { /* ... */ };
```

### React Component Guidelines

- **Use functional components** with hooks
- **Define prop interfaces** for all components
- **Use meaningful component names** in PascalCase
- **Extract custom hooks** for reusable logic

```typescript
// ✅ Good
interface DashboardStatsProps {
  stats: {
    totalReports: number;
    totalTests: number;
    passRate: number;
    avgDuration: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  // Component implementation
};
```

### API Guidelines

- **Use RESTful conventions** for endpoints
- **Return consistent response formats**
- **Include proper HTTP status codes**
- **Add request validation middleware**

```typescript
// ✅ Good
app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await reportService.getById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### File Naming Conventions

- **Components**: PascalCase (`DashboardStats.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useDocumentTitle.ts`)
- **Services**: PascalCase (`ReportService.ts`)
- **Utilities**: camelCase (`formatDuration.ts`)
- **Types**: PascalCase with `.types.ts` suffix (`Report.types.ts`)

### CSS/Styling Guidelines

- **Use Tailwind CSS** for styling
- **Create reusable utility classes** when needed
- **Use CSS-in-JS sparingly** for dynamic styles
- **Maintain dark/light theme support**

```tsx
// ✅ Good
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
    Report Details
  </h2>
</div>
```

## 🧪 Testing Guidelines

### Unit Tests

- **Write tests for utilities** and pure functions
- **Test React components** with React Testing Library
- **Mock external dependencies** appropriately
- **Aim for >80% code coverage**

### Integration Tests

- **Test API endpoints** with complete request/response cycle
- **Test WebSocket functionality** with proper connection handling
- **Test file upload/download** scenarios

### Manual Testing

- **Test in multiple browsers** (Chrome, Firefox, Safari)
- **Verify responsive design** on different screen sizes
- **Test dark/light theme switching**
- **Verify real-time updates** with WebSocket connections

## 📖 Documentation

### Code Documentation

- **Add JSDoc comments** for complex functions
- **Document API endpoints** with OpenAPI/Swagger
- **Include inline comments** for business logic
- **Update README.md** for new features

### Examples

```typescript
/**
 * Calculates the test pass rate percentage
 * @param passed - Number of passed tests
 * @param total - Total number of tests
 * @returns Pass rate as percentage (0-100)
 */
function calculatePassRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}
```

## 🚀 Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Commit Message Format

Use [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(api): add test execution streaming endpoint
fix(dashboard): resolve chart rendering issue with empty data
docs: update API documentation for webhook integration
```

## 🔍 Code Review Process

### For Contributors

1. **Self-review your code** before submitting
2. **Ensure all tests pass** and linting is clean
3. **Update documentation** for new features
4. **Keep PRs focused** on a single feature/fix
5. **Respond promptly** to review feedback

### For Reviewers

1. **Be constructive** in feedback
2. **Focus on code quality** and maintainability
3. **Check for security** implications
4. **Verify test coverage** for new code
5. **Approve when ready** and tests pass

## 🛡️ Security

### Security Issues

- **Report security vulnerabilities** privately via email
- **Do not open public issues** for security problems
- **Wait for confirmation** before public disclosure

### Security Best Practices

- **Validate all inputs** on both client and server
- **Use parameterized queries** to prevent injection
- **Sanitize file uploads** and restrict file types
- **Keep dependencies updated** regularly

## 📞 Getting Help

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Code Reviews**: For implementation feedback
- **Documentation**: Check the wiki for detailed guides

## 🎉 Recognition

Contributors will be recognized in:

- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **README.md** acknowledgments section

Thank you for contributing to Reporter Engine! 🚀

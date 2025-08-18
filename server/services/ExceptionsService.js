import DatabaseService from './DatabaseService.js';
import crypto from 'crypto';

/**
 * ExceptionsService - Groups and analyzes test exceptions for better debugging
 */
class ExceptionsService {
  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Generate a signature hash for grouping similar exceptions
   */
  generateExceptionSignature(errorMessage, stackTrace) {
    if (!errorMessage && !stackTrace) return 'unknown-error';
    
    // Extract meaningful parts for signature
    const message = (errorMessage || '').trim();
    const stack = (stackTrace || '').trim();
    
    // Extract the first line of error (usually the most important)
    const firstLine = message.split('\n')[0].trim();
    
    // Extract the error type/class (before the colon)
    const errorType = firstLine.includes(':') ? firstLine.split(':')[0].trim() : firstLine;
    
    // Extract file names from stack trace (remove line numbers for grouping)
    const stackFiles = stack.match(/at .+?([^\s\/\\]+\.(js|ts|jsx|tsx|py|java|rb))/g);
    const fileSignature = stackFiles ? stackFiles.slice(0, 3).join('|') : '';
    
    // Create signature combining error type and file locations
    const signatureText = `${errorType}|${fileSignature}`;
    
    // Generate hash for consistent grouping
    return crypto.createHash('md5').update(signatureText).digest('hex').substring(0, 12);
  }

  /**
   * Get all exception groups across projects (with access control)
   */
  getExceptionGroups(projectId = null, timeRange = '30d', userId = null) {
    try {
      let baseQuery = `
        SELECT 
          tc.id,
          tc.test_run_id,
          tc.name as test_name,
          tc.status,
          tc.duration,
          tc.error_message,
          tc.stack_trace,
          tc.start_time,
          tc.end_time,
          tr.project_id,
          tr.test_suite,
          tr.environment,
          tr.framework,
          tr.started_at as run_started_at,
          p.name as project_name,
          p.key as project_key
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        JOIN projects p ON tr.project_id = p.id
        WHERE tc.status IN ('failed', 'error') 
        AND (tc.error_message IS NOT NULL OR tc.stack_trace IS NOT NULL)
      `;
      
      const params = [];

      // Apply project filter
      if (projectId) {
        baseQuery += ` AND tr.project_id = ?`;
        params.push(projectId);
      }

      // Apply time range filter
      if (timeRange && timeRange !== 'all') {
        const timeMap = {
          '1d': '1 day',
          '7d': '7 days', 
          '30d': '30 days',
          '90d': '90 days'
        };
        const interval = timeMap[timeRange] || '30 days';
        baseQuery += ` AND tr.started_at >= datetime('now', '-${interval}')`;
      }

      // For non-admin users, filter by accessible projects
      if (userId) {
        const user = this.db.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user && user.role !== 'admin') {
          const userProjects = this.db.getUserProjects(userId);
          if (userProjects.length === 0) {
            return [];
          }
          const projectIds = userProjects.map(p => p.id);
          baseQuery += ` AND tr.project_id IN (${projectIds.map(() => '?').join(',')})`;
          params.push(...projectIds);
        }
      }

      baseQuery += ` ORDER BY tr.started_at DESC`;

      const failedTests = this.db.db.prepare(baseQuery).all(...params);

      // Group by exception signature
      const exceptionGroups = new Map();

      failedTests.forEach(test => {
        const signature = this.generateExceptionSignature(test.error_message, test.stack_trace);
        
        if (!exceptionGroups.has(signature)) {
          exceptionGroups.set(signature, {
            signature,
            errorType: this.extractErrorType(test.error_message),
            representativeError: test.error_message || 'Unknown error',
            representativeStackTrace: test.stack_trace || '',
            firstSeen: test.run_started_at,
            lastSeen: test.run_started_at,
            occurrenceCount: 0,
            affectedTests: [],
            projects: new Set(),
            environments: new Set(),
            frameworks: new Set(),
            testSuites: new Set()
          });
        }

        const group = exceptionGroups.get(signature);
        group.occurrenceCount++;
        group.lastSeen = test.run_started_at > group.lastSeen ? test.run_started_at : group.lastSeen;
        group.firstSeen = test.run_started_at < group.firstSeen ? test.run_started_at : group.firstSeen;
        
        group.affectedTests.push({
          id: test.id,
          testRunId: test.test_run_id,
          testName: test.test_name,
          status: test.status,
          duration: test.duration,
          startTime: test.start_time,
          endTime: test.end_time,
          errorMessage: test.error_message,
          stackTrace: test.stack_trace,
          projectName: test.project_name,
          projectKey: test.project_key,
          testSuite: test.test_suite,
          environment: test.environment,
          framework: test.framework,
          runStartedAt: test.run_started_at
        });

        group.projects.add(test.project_name);
        group.environments.add(test.environment);
        group.frameworks.add(test.framework);
        group.testSuites.add(test.test_suite);
      });

      // Convert to array and add computed properties
      const result = Array.from(exceptionGroups.values()).map(group => ({
        ...group,
        projects: Array.from(group.projects),
        environments: Array.from(group.environments),
        frameworks: Array.from(group.frameworks),
        testSuites: Array.from(group.testSuites),
        affectedTestsCount: group.affectedTests.length,
        // Sort affected tests by most recent first
        affectedTests: group.affectedTests.sort((a, b) => 
          new Date(b.runStartedAt) - new Date(a.runStartedAt)
        )
      }));

      // Sort by occurrence count (most frequent first)
      return result.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    } catch (error) {
      console.error('Error getting exception groups:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific exception group
   */
  getExceptionGroupDetails(signature, projectId = null, userId = null) {
    try {
      const groups = this.getExceptionGroups(projectId, 'all', userId);
      const group = groups.find(g => g.signature === signature);
      
      if (!group) {
        return null;
      }

      // Add timeline analysis
      group.timeline = this.generateExceptionTimeline(group.affectedTests);
      
      // Add pattern analysis
      group.patterns = this.analyzeExceptionPatterns(group.affectedTests);

      return group;
    } catch (error) {
      console.error('Error getting exception group details:', error);
      throw error;
    }
  }

  /**
   * Extract error type from error message
   */
  extractErrorType(errorMessage) {
    if (!errorMessage) return 'Unknown Error';
    
    const message = errorMessage.trim();
    
    // Common error patterns
    const patterns = [
      /^([A-Z][a-zA-Z]*Error):/,  // JavaScript/TypeScript errors
      /^([A-Z][a-zA-Z]*Exception):/,  // Java/Python exceptions  
      /^(AssertionError):/,  // Assertion failures
      /^(TimeoutError):/,  // Timeout errors
      /^(ElementNotFound):/,  // UI automation errors
      /^(Error):/  // Generic errors
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Extract first word if it looks like an error type
    const firstWord = message.split(/[\s:]/)[0];
    if (firstWord && /^[A-Z][a-zA-Z]*(?:Error|Exception)$/.test(firstWord)) {
      return firstWord;
    }

    // Fallback to first line
    return message.split('\n')[0].substring(0, 50);
  }

  /**
   * Generate timeline showing when exceptions occurred
   */
  generateExceptionTimeline(tests) {
    const timeline = {};
    
    tests.forEach(test => {
      const date = test.runStartedAt.split('T')[0]; // Get date part
      if (!timeline[date]) {
        timeline[date] = 0;
      }
      timeline[date]++;
    });

    return Object.entries(timeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Analyze patterns in exception occurrences
   */
  analyzeExceptionPatterns(tests) {
    const patterns = {
      byEnvironment: {},
      byFramework: {},
      byTestSuite: {},
      byTimeOfDay: {},
      avgDuration: 0,
      totalDuration: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    tests.forEach(test => {
      // Environment patterns
      patterns.byEnvironment[test.environment] = 
        (patterns.byEnvironment[test.environment] || 0) + 1;

      // Framework patterns  
      patterns.byFramework[test.framework] = 
        (patterns.byFramework[test.framework] || 0) + 1;

      // Test suite patterns
      patterns.byTestSuite[test.testSuite] = 
        (patterns.byTestSuite[test.testSuite] || 0) + 1;

      // Time of day patterns
      if (test.runStartedAt) {
        const hour = new Date(test.runStartedAt).getHours();
        const timeSlot = `${hour}:00`;
        patterns.byTimeOfDay[timeSlot] = 
          (patterns.byTimeOfDay[timeSlot] || 0) + 1;
      }

      // Duration analysis
      if (test.duration && test.duration > 0) {
        totalDuration += test.duration;
        durationCount++;
      }
    });

    patterns.avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
    patterns.totalDuration = totalDuration;

    return patterns;
  }

  /**
   * Get exception statistics for dashboard
   */
  getExceptionStats(projectId = null, timeRange = '30d', userId = null) {
    try {
      const groups = this.getExceptionGroups(projectId, timeRange, userId);
      
      const totalGroups = groups.length;
      const totalOccurrences = groups.reduce((sum, g) => sum + g.occurrenceCount, 0);
      const avgOccurrencesPerGroup = totalGroups > 0 ? Math.round(totalOccurrences / totalGroups) : 0;
      
      // Most frequent exception types
      const errorTypes = {};
      groups.forEach(group => {
        errorTypes[group.errorType] = (errorTypes[group.errorType] || 0) + group.occurrenceCount;
      });

      const topErrorTypes = Object.entries(errorTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      // Most affected projects/environments
      const projectStats = {};
      const environmentStats = {};

      groups.forEach(group => {
        group.projects.forEach(project => {
          projectStats[project] = (projectStats[project] || 0) + group.occurrenceCount;
        });
        group.environments.forEach(env => {
          environmentStats[env] = (environmentStats[env] || 0) + group.occurrenceCount;
        });
      });

      return {
        totalGroups,
        totalOccurrences,
        avgOccurrencesPerGroup,
        topErrorTypes,
        mostAffectedProjects: Object.entries(projectStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([project, count]) => ({ project, count })),
        mostAffectedEnvironments: Object.entries(environmentStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([environment, count]) => ({ environment, count }))
      };
    } catch (error) {
      console.error('Error getting exception stats:', error);
      throw error;
    }
  }
}

export default ExceptionsService;

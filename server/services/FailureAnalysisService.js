import DatabaseService from './DatabaseService.js';
import crypto from 'crypto';

class FailureAnalysisService {
  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Convert timeWindow to SQLite datetime modifier
   */
  getDateModifier(timeWindow) {
    if (timeWindow === '1h') return '-1 hours';
    if (timeWindow === '8h') return '-8 hours';
    if (timeWindow === '1d') return '-1 days';
    
    // For numeric values (7, 30, 60, 90), treat as days
    const days = parseInt(timeWindow) || 30;
    return `-${days} days`;
  }

  /**
   * Get failure analysis summary for a project within a time window
   */
  getSummary(projectId, filters) {
    try {
      const { timeWindow, startDate, endDate, testSearch, selectedRuns } = filters;
      
      // Build date filter
      let dateFilter = '';
      const params = [projectId];
      
      if (timeWindow === 'custom' && startDate && endDate) {
        dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        const dateModifier = this.getDateModifier(timeWindow);
        dateFilter = ` AND tr.started_at >= datetime('now', '${dateModifier}')`;
      }

      // Base query filters
      let baseFilter = ` WHERE tr.project_id = ? AND tc.status = 'failed'${dateFilter}`;
      
      if (testSearch) {
        baseFilter += ' AND tc.name LIKE ?';
        params.push(`%${testSearch}%`);
      }
      
      if (selectedRuns && selectedRuns.length > 0) {
        baseFilter += ` AND tr.id IN (${selectedRuns.map(() => '?').join(',')})`;
        params.push(...selectedRuns);
      }

      // Total failures
      let query = `
        SELECT 
          tc.id,
          tc.error_message,
          tc.stack_trace,
          tc.primary_class,
          tc.sub_class,
          tc.is_manually_classified
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        ${baseFilter}
      `;
      
      const allFailures = this.db.db.prepare(query).all(...params);
      const totalFailures = allFailures.length;

      // Classify each failure and count by category
      let automationErrors = 0;
      let dataIssues = 0;
      let environmentIssues = 0;
      let applicationDefects = 0;
      let unknownFailures = 0;
      
      allFailures.forEach(failure => {
        const classification = this.getClassification(failure);
        switch (classification.primaryClass) {
          case 'Automation Script Error':
            automationErrors++;
            break;
          case 'Test Data Issue':
            dataIssues++;
            break;
          case 'Environment Issue':
            environmentIssues++;
            break;
          case 'Application Defect':
            applicationDefects++;
            break;
          default:
            unknownFailures++;
            break;
        }
      });

      const classifiedCount = automationErrors + dataIssues + environmentIssues + applicationDefects + unknownFailures;
      const classifiedPercent = totalFailures > 0 ? Math.round((classifiedCount / totalFailures) * 100) : 0;
      const unclassified = totalFailures - classifiedCount;

      return {
        totalFailures,
        classifiedPercent,
        unclassified,
        duplicateGroups: 0, // Will implement when adding grouping logic
        automationErrors,
        dataIssues,
        environmentIssues,
        applicationDefects,
        unknownFailures
      };
    } catch (error) {
      console.error('Error getting failure analysis summary:', error);
      throw error;
    }
  }

  /**
   * Get test case failures with optional classification
   */
  getTestCaseFailures(projectId, filters) {
    try {
      const { timeWindow, startDate, endDate, testSearch, selectedRuns } = filters;
      
      // Build date filter
      let dateFilter = '';
      const params = [projectId];
      
      if (timeWindow === 'custom' && startDate && endDate) {
        dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        const dateModifier = this.getDateModifier(timeWindow);
        dateFilter = ` AND tr.started_at >= datetime('now', '${dateModifier}')`;
      }

      let query = `
        SELECT 
          tc.id,
          tc.name as testName,
          tr.test_suite as suiteName,
          tc.status as latestStatus,
          tc.error_message,
          tc.stack_trace,
          tc.end_time as lastSeen,
          tr.id as runId,
          tr.test_suite,
          tr.started_at,
          tc.primary_class,
          tc.sub_class,
          tc.is_manually_classified
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        WHERE tr.project_id = ? AND tc.status = 'failed'${dateFilter}
      `;
      
      if (testSearch) {
        query += ' AND tc.name LIKE ?';
        params.push(`%${testSearch}%`);
      }
      
      if (selectedRuns && selectedRuns.length > 0) {
        query += ` AND tr.id IN (${selectedRuns.map(() => '?').join(',')})`;
        params.push(...selectedRuns);
      }

      query += ' ORDER BY tc.end_time DESC LIMIT 100';

      const failures = this.db.db.prepare(query).all(...params);

      return failures.map(failure => {
        // Use stored classification or auto-classify on the fly
        const classification = this.getClassification(failure);
        
        return {
          id: failure.id,
          testName: failure.testName,
          suiteName: failure.suiteName || failure.test_suite || 'Unknown Suite',
          latestStatus: failure.latestStatus,
          primaryClass: classification.primaryClass,
          subClass: classification.subClass,
          confidence: classification.confidence,
          evidence: {
            errorMessage: failure.error_message,
            stackTrace: failure.stack_trace
          },
          lastSeen: failure.lastSeen,
          errorMessage: failure.error_message,
          stackTrace: failure.stack_trace,
          runId: failure.runId
        };
      });
    } catch (error) {
      console.error('Error getting test case failures:', error);
      throw error;
    }
  }

  /**
   * Get suite/run failure summary
   */
  getSuiteRunFailures(projectId, filters) {
    try {
      const { timeWindow, startDate, endDate, testSearch, selectedRuns } = filters;
      
      // Build date filter
      let dateFilter = '';
      const params = [projectId];
      
      if (timeWindow === 'custom' && startDate && endDate) {
        dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        const dateModifier = this.getDateModifier(timeWindow);
        dateFilter = ` AND tr.started_at >= datetime('now', '${dateModifier}')`;
      }

      let query = `
        SELECT 
          tr.test_suite as suiteName,
          tr.id as runId,
          tc.error_message,
          tc.stack_trace,
          COUNT(*) as failureCount
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        WHERE tr.project_id = ? AND tc.status = 'failed'${dateFilter}
      `;
      
      if (testSearch) {
        query += ' AND tc.name LIKE ?';
        params.push(`%${testSearch}%`);
      }
      
      if (selectedRuns && selectedRuns.length > 0) {
        query += ` AND tr.id IN (${selectedRuns.map(() => '?').join(',')})`;
        params.push(...selectedRuns);
      }

      query += ' GROUP BY tr.test_suite, tr.id ORDER BY failureCount DESC';

      const suiteRuns = this.db.db.prepare(query).all(...params);

      return suiteRuns.map(suiteRun => {
        // Get individual failures for classification
        const failuresQuery = `
          SELECT 
            tc.error_message, 
            tc.stack_trace,
            tc.primary_class,
            tc.sub_class,
            tc.is_manually_classified
          FROM test_cases tc
          JOIN test_runs tr ON tc.test_run_id = tr.id
          WHERE tr.project_id = ? AND tc.status = 'failed' 
            AND tr.test_suite = ? AND tr.id = ?${dateFilter.replace(/tr\./g, 'tr.')}
        `;
        
        const failureParams = [projectId, suiteRun.suiteName, suiteRun.runId];
        if (timeWindow === 'custom' && startDate && endDate) {
          failureParams.push(startDate, endDate);
        }
        
        const failures = this.db.db.prepare(failuresQuery).all(...failureParams);
        
        // Classify each failure and count by class
        const counts = {};
        const subClassCounts = {};
        
        failures.forEach(failure => {
          const classification = this.getClassification(failure);
          counts[classification.primaryClass] = (counts[classification.primaryClass] || 0) + 1;
          subClassCounts[classification.subClass] = (subClassCounts[classification.subClass] || 0) + 1;
        });

        // Get top sub-classes
        const topSubClasses = Object.entries(subClassCounts)
          .map(([subClass, count]) => ({ subClass, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          suiteName: suiteRun.suiteName || 'Unknown Suite',
          runId: suiteRun.runId,
          counts,
          topSubClasses
        };
      });
    } catch (error) {
      console.error('Error getting suite run failures:', error);
      throw error;
    }
  }

  /**
   * Get failure groups (simplified clustering)
   */
  getFailureGroups(projectId, filters) {
    try {
      const failures = this.getTestCaseFailures(projectId, filters);
      
      // Group by signature hash
      const groups = {};
      
      failures.forEach(failure => {
        const signature = this.generateSignatureHash(failure.errorMessage || '', failure.stackTrace || '');
        
        if (!groups[signature]) {
          groups[signature] = {
            id: signature,
            signatureHash: signature,
            primaryClass: failure.primaryClass,
            subClass: failure.subClass,
            representativeError: failure.errorMessage || 'No error message',
            memberTests: [],
            firstSeen: failure.lastSeen,
            lastSeen: failure.lastSeen,
            occurrenceCount: 0
          };
        }
        
        groups[signature].memberTests.push(failure.id);
        groups[signature].occurrenceCount += 1;
        
        // Update first/last seen
        if (failure.lastSeen < groups[signature].firstSeen) {
          groups[signature].firstSeen = failure.lastSeen;
        }
        if (failure.lastSeen > groups[signature].lastSeen) {
          groups[signature].lastSeen = failure.lastSeen;
        }
      });

      return Object.values(groups).sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    } catch (error) {
      console.error('Error getting failure groups:', error);
      throw error;
    }
  }

  /**
   * Auto-classify failures (updates the database if you add classification columns)
   */
  autoClassify(projectId, filters) {
    try {
      // For now, this is a no-op since we classify on-the-fly
      // You could implement this to store classifications in the database
      return { classified: 0 };
    } catch (error) {
      console.error('Error auto-classifying failures:', error);
      throw error;
    }
  }

  /**
   * Get classification for a test case (stored or automatic)
   */
  getClassification(testCase) {
    // If manually classified, use the stored classification
    if (testCase.is_manually_classified && testCase.primary_class) {
      return {
        primaryClass: testCase.primary_class,
        subClass: testCase.sub_class || '',
        confidence: 1.0, // Manual classifications have 100% confidence
        isManual: true
      };
    }
    
    // Otherwise, use automatic classification
    const autoClassification = this.classifyFailure(testCase);
    return {
      ...autoClassification,
      isManual: false
    };
  }

  /**
   * Classify a single failure using heuristic rules
   */
  classifyFailure(testCase) {
    try {
      const errorText = testCase.error_message || '';
      const stackTrace = testCase.stack_trace || '';
      const combinedText = (errorText + ' ' + stackTrace).toLowerCase();

      // Environment Issue patterns (highest priority)
      const environmentPatterns = [
        /connection refused|connection reset|econnrefused|econnreset/,
        /dns.*fail|enotfound/,
        /certificate.*error|cert_|ssl.*error/,
        /5\d\d.*auth|5\d\d.*gateway/,
        /grid.*node.*down|selenium.*grid.*unavailable/,
        /time.*sync|clock.*skew/,
        /429.*infra/
      ];

      for (const pattern of environmentPatterns) {
        if (pattern.test(combinedText)) {
          return {
            primaryClass: 'Environment Issue',
            subClass: this.getEnvironmentSubClass(combinedText),
            confidence: 0.85
          };
        }
      }

      // Automation Script Error patterns
      const automationPatterns = [
        /nosuchelement|element.*not.*found/,
        /staleelementreference|stale.*element/,
        /timeouterror.*page\.|timeouterror.*locator\.|timeout.*exceeded/,
        /test timeout.*exceeded/,
        /locator.*not.*visible|element.*not.*interactable/,
        /missing.*await|nullpointerexception.*test/,
        /typeerror.*is not a function/,
        /syntaxerror.*unexpected/,
        /referenceerror.*is not defined/
      ];

      for (const pattern of automationPatterns) {
        if (pattern.test(combinedText)) {
          return {
            primaryClass: 'Automation Script Error',
            subClass: this.getAutomationSubClass(combinedText),
            confidence: 0.80
          };
        }
      }

      // Test Data Issue patterns
      const testDataPatterns = [
        /4\d\d.*bad.*request|4\d\d.*unprocessable/,
        /validation.*failed|invalid.*credentials/,
        /unique.*constraint|duplicate.*key/,
        /test.*user.*not.*found|precondition.*failed/,
        /fixture.*missing|expired.*credentials/,
        /enoent.*no such file or directory/,
        /file.*not.*found|missing.*file/,
        /\.json.*not found|cannot.*read.*file/
      ];

      for (const pattern of testDataPatterns) {
        if (pattern.test(combinedText)) {
          return {
            primaryClass: 'Test Data Issue',
            subClass: this.getTestDataSubClass(combinedText),
            confidence: 0.75
          };
        }
      }

      // Application Defect (default for server errors and UI issues)
      const applicationPatterns = [
        /5\d\d.*internal.*server.*error/,
        /nullreference.*app|typeerror.*app/,
        /ui.*mismatch|dom.*diff|breaking.*changes/,
        /network.*error|fetch.*failed/,
        /cors.*error|cross.*origin/,
        /api.*error|endpoint.*not.*found/
      ];

      for (const pattern of applicationPatterns) {
        if (pattern.test(combinedText)) {
          return {
            primaryClass: 'Application Defect',
            subClass: this.getApplicationSubClass(combinedText),
            confidence: 0.70
          };
        }
      }

      // Test Assertion/Expectation failures (Unknown bucket)
      const unknownPatterns = [
        /error: expect\(.*\)\./,
        /assertion.*failed|assert.*error/,
        /expected.*but.*received|expected.*to.*be/,
        /should.*be.*but.*was/,
        /test.*failed.*expectation/
      ];

      for (const pattern of unknownPatterns) {
        if (pattern.test(combinedText)) {
          return {
            primaryClass: 'Unknown',
            subClass: this.getUnknownSubClass(combinedText),
            confidence: 0.60
          };
        }
      }

      // Default classification for truly unmatched failures
      return {
        primaryClass: 'Unknown',
        subClass: 'Unclassified',
        confidence: 0.20
      };
    } catch (error) {
      console.error('Error classifying failure:', error);
      return {
        primaryClass: 'Application Defect',
        subClass: 'Classification Error',
        confidence: 0.10
      };
    }
  }

  getEnvironmentSubClass(text) {
    if (/connection.*refused|econnrefused/.test(text)) return 'Connection_Refused';
    if (/dns.*fail|enotfound/.test(text)) return 'DNS_Failure';
    if (/certificate|cert_|ssl/.test(text)) return 'SSL_Certificate';
    if (/grid.*node|selenium.*grid/.test(text)) return 'Grid_Node_Down';
    if (/time.*sync|clock.*skew/.test(text)) return 'Time_Sync';
    return 'Infrastructure';
  }

  getAutomationSubClass(text) {
    if (/nosuchelement|element.*not.*found/.test(text)) return 'Locator_Break';
    if (/stale.*element/.test(text)) return 'Stale_Element';
    if (/timeout.*exceeded|timeouterror|test timeout/.test(text)) return 'Wait_Timeout';
    if (/not.*visible|not.*interactable/.test(text)) return 'Element_State';
    if (/missing.*await|nullpointer.*test/.test(text)) return 'Script_Logic';
    if (/typeerror.*is not a function|syntaxerror|referenceerror/.test(text)) return 'Script_Logic';
    return 'Automation_Issue';
  }

  getTestDataSubClass(text) {
    if (/validation.*failed/.test(text)) return 'Validation_Error';
    if (/invalid.*credentials/.test(text)) return 'Auth_Failure';
    if (/unique.*constraint|duplicate.*key/.test(text)) return 'Data_Conflict';
    if (/test.*user.*not.*found/.test(text)) return 'Missing_Test_Data';
    if (/fixture.*missing/.test(text)) return 'Fixture_Issue';
    if (/enoent.*no such file|file.*not.*found|missing.*file/.test(text)) return 'Missing_Test_Data';
    if (/\.json.*not found|cannot.*read.*file/.test(text)) return 'Missing_Test_Data';
    return 'Data_Issue';
  }

  getApplicationSubClass(text) {
    if (/5\d\d.*internal.*server.*error/.test(text)) return 'Server Error';
    if (/ui.*mismatch|dom.*diff/.test(text)) return 'UI Defect';
    if (/nullreference|typeerror/.test(text)) return 'Logic Error';
    if (/network.*error|fetch.*failed/.test(text)) return 'Network Issue';
    if (/cors.*error|cross.*origin/.test(text)) return 'CORS Issue';
    if (/api.*error|endpoint.*not.*found/.test(text)) return 'API Issue';
    return 'General Application Issue';
  }

  getUnknownSubClass(text) {
    if (/expect\(.*\)\.tobefalsy|expect\(.*\)\.tobetruthy/.test(text)) return 'Boolean Assertion';
    if (/expect\(.*\)\.tobe\(/.test(text)) return 'Value Assertion';
    if (/expect\(.*\)\.tocontain/.test(text)) return 'Content Assertion';
    if (/expect\(.*\)\.tohave/.test(text)) return 'Property Assertion';
    if (/assertion.*failed/.test(text)) return 'Generic Assertion';
    return 'Unclassified';
  }

  /**
   * Generate a signature hash for grouping similar failures
   */
  generateSignatureHash(errorMessage, stackTrace) {
    try {
      // Normalize the error message and stack trace
      const normalizedError = errorMessage
        .replace(/\d+/g, 'NUM')           // Replace numbers
        .replace(/['"]/g, '')            // Remove quotes
        .replace(/\s+/g, ' ')            // Normalize whitespace
        .trim()
        .slice(0, 200);                  // Limit length

      const normalizedStack = stackTrace
        .split('\n')[0]                  // Take first line of stack trace
        .replace(/:\d+/g, '')            // Remove line numbers
        .replace(/\d+/g, 'NUM')          // Replace numbers
        .trim()
        .slice(0, 100);                  // Limit length

      const combined = normalizedError + '|' + normalizedStack;
      return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
    } catch (error) {
      console.error('Error generating signature hash:', error);
      return crypto.createHash('sha256').update(errorMessage + stackTrace).digest('hex').substring(0, 16);
    }
  }

  /**
   * Reclassify a test case failure
   */
  reclassifyFailure(testCaseId, primaryClass, subClass) {
    try {
      // Store the manual classification in the database
      const updateQuery = `
        UPDATE test_cases 
        SET primary_class = ?, 
            sub_class = ?, 
            is_manually_classified = 1,
            classified_at = datetime('now')
        WHERE id = ?
      `;
      
      const result = this.db.db.prepare(updateQuery).run(primaryClass, subClass || '', testCaseId);
      
      if (result.changes === 0) {
        throw new Error(`Test case ${testCaseId} not found`);
      }
      
      console.log(`Reclassified test case ${testCaseId} to ${primaryClass}:${subClass}`);
      return { success: true };
    } catch (error) {
      console.error('Error reclassifying failure:', error);
      throw error;
    }
  }

  /**
   * Get evidence for a test case failure
   */
  getEvidence(testCaseId) {
    try {
      const query = `
        SELECT 
          tc.error_message,
          tc.stack_trace,
          tc.name,
          tc.status,
          tc.end_time,
          tr.test_suite,
          tr.browser,
          tr.environment
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        WHERE tc.id = ?
      `;

      const evidence = this.db.db.prepare(query).get(testCaseId);
      
      return {
        errorMessage: evidence?.error_message,
        stackTrace: evidence?.stack_trace,
        testName: evidence?.name,
        suiteName: evidence?.test_suite,
        browser: evidence?.browser,
        environment: evidence?.environment,
        timestamp: evidence?.end_time
      };
    } catch (error) {
      console.error('Error getting evidence:', error);
      throw error;
    }
  }

  /**
   * Get suggested fixes for a failure
   */
  getSuggestedFixes(testCaseId) {
    try {
      const evidence = this.getEvidence(testCaseId);
      const classification = this.classifyFailure(evidence);
      
      // Return generic suggestions based on classification
      const suggestions = {
        'Environment Issue': [
          'Check network connectivity and DNS resolution',
          'Verify SSL certificates are valid',
          'Ensure test infrastructure is running',
          'Check for firewall or proxy issues'
        ],
        'Automation Script Error': [
          'Update element locators if UI has changed',
          'Add explicit waits for dynamic elements',
          'Check for stale element references',
          'Verify test script logic and assertions'
        ],
        'Test Data Issue': [
          'Refresh test data and fixtures',
          'Check user credentials and permissions',
          'Verify database state and constraints',
          'Update test data for current environment'
        ],
        'Application Defect': [
          'Check application logs for errors',
          'Verify API responses and status codes',
          'Test manually to confirm defect',
          'Create bug report with reproduction steps'
        ]
      };

      return suggestions[classification.primaryClass] || ['Review error details and logs'];
    } catch (error) {
      console.error('Error getting suggested fixes:', error);
      return ['Unable to generate suggestions'];
    }
  }
}

export default FailureAnalysisService;

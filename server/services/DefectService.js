import DatabaseService from './DatabaseService.js';
import crypto from 'crypto';

class DefectService {
  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Get defect summary for a project within a time window
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
        const days = parseInt(timeWindow) || 30;
        dateFilter = ' AND tr.started_at >= datetime("now", "-' + days + ' days")';
      }

      // Total failures
      let query = `
        SELECT COUNT(*) as count
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

      const totalFailures = this.db.db.prepare(query).get(...params)?.count || 0;

      // Classified count
      const classifiedQuery = `
        SELECT COUNT(*) as count
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        JOIN defect_classifications dc ON tc.id = dc.test_case_id
        WHERE tr.project_id = ? AND tc.status = 'failed'${dateFilter}
      `;
      
      const classifiedParams = [...params];
      const classified = this.db.db.prepare(classifiedQuery).get(...classifiedParams)?.count || 0;

      // Duplicate groups
      const groupsQuery = `
        SELECT COUNT(*) as count
        FROM defect_groups dg
        WHERE EXISTS (
          SELECT 1 FROM defect_group_members dgm
          JOIN test_cases tc ON dgm.test_case_id = tc.id
          JOIN test_runs tr ON tc.test_run_id = tr.id
          WHERE dgm.group_id = dg.id AND tr.project_id = ?${dateFilter.replace('tr.started_at', 'tr.started_at')}
        )
      `;
      
      const groupsParams = [projectId];
      if (timeWindow === 'custom' && startDate && endDate) {
        groupsParams.push(startDate, endDate);
      }
      
      const duplicateGroups = this.db.db.prepare(groupsQuery).get(...groupsParams)?.count || 0;

      const classifiedPercent = totalFailures > 0 ? Math.round((classified / totalFailures) * 100) : 0;
      const unclassified = totalFailures - classified;

      return {
        totalFailures,
        classifiedPercent,
        unclassified,
        duplicateGroups
      };
    } catch (error) {
      console.error('Error getting defect summary:', error);
      throw error;
    }
  }

  /**
   * Get test case defects with classifications
   */
  getTestCaseDefects(projectId, filters) {
    try {
      const { timeWindow, startDate, endDate, testSearch, selectedRuns } = filters;
      
      let dateFilter = '';
      const params = [projectId];
      
      if (timeWindow === 'custom' && startDate && endDate) {
        dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        const days = parseInt(timeWindow) || 30;
        dateFilter = ' AND tr.started_at >= datetime("now", "-' + days + ' days")';
      }

      let query = `
        SELECT 
          tc.id,
          tc.name as testName,
          tc.status as latestStatus,
          tc.error_message,
          tc.stack_trace,
          tr.finished_at as lastSeen,
          dc.primary_class as primaryClass,
          dc.sub_class as subClass,
          dc.confidence,
          dc.evidence_data as evidence,
          dc.is_manually_classified as isManuallyClassified
        FROM test_cases tc
        JOIN test_runs tr ON tc.test_run_id = tr.id
        LEFT JOIN defect_classifications dc ON tc.id = dc.test_case_id
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

      query += ' ORDER BY tr.finished_at DESC LIMIT 100';

      const results = this.db.db.prepare(query).all(...params);
      
      return results.map(row => ({
        id: row.id,
        testName: row.testName,
        latestStatus: row.latestStatus,
        primaryClass: row.primaryClass,
        subClass: row.subClass,
        confidence: row.confidence,
        evidence: row.evidence ? JSON.parse(row.evidence) : {
          errorText: row.error_message,
          stackTrace: row.stack_trace
        },
        lastSeen: row.lastSeen,
        isManuallyClassified: Boolean(row.isManuallyClassified)
      }));
    } catch (error) {
      console.error('Error getting test case defects:', error);
      throw error;
    }
  }

  /**
   * Generate signature hash for grouping similar failures
   */
  generateSignatureHash(errorText, stackTrace) {
    try {
      // Normalize the error text and stack trace
      let signature = '';
      
      if (errorText) {
        // Remove timestamps, IDs, and variable parts
        signature += errorText
          .replace(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}[\.\d]*[Z]?/g, 'TIMESTAMP')
          .replace(/\b\d+\b/g, 'NUMBER')
          .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, 'UUID')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      if (stackTrace) {
        // Take first few lines of stack trace, normalize line numbers
        const stackLines = stackTrace
          .split('\n')
          .slice(0, 5)
          .map(line => line.replace(/:\d+:\d+/g, ':LINE:COL'))
          .join('\n');
        signature += '|' + stackLines;
      }

      return crypto.createHash('sha256').update(signature).digest('hex').substring(0, 16);
    } catch (error) {
      console.error('Error generating signature hash:', error);
      return crypto.createHash('sha256').update(Math.random().toString()).digest('hex').substring(0, 16);
    }
  }

  /**
   * Classify a single test case failure using heuristic rules
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
        /mcp.*server.*unreachable/,
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
        /timeoutexception|timeout.*waiting/,
        /locator.*not.*visible|element.*not.*interactable/,
        /missing.*await|nullpointerexception.*test/
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
        /fixture.*missing|expired.*credentials/
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
        /ui.*mismatch|dom.*diff|breaking.*changes/
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

      // Default classification for unmatched failures
      return {
        primaryClass: 'Application Defect',
        subClass: 'Unknown',
        confidence: 0.30
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
    if (/timeout/.test(text)) return 'Wait_Timeout';
    if (/not.*visible|not.*interactable/.test(text)) return 'Element_State';
    if (/missing.*await|nullpointer.*test/.test(text)) return 'Script_Logic';
    return 'Automation_Issue';
  }

  getTestDataSubClass(text) {
    if (/validation.*failed/.test(text)) return 'Validation_Error';
    if (/unique.*constraint|duplicate/.test(text)) return 'Data_Conflict';
    if (/credentials|authentication/.test(text)) return 'Auth_Data';
    if (/precondition.*failed|fixture/.test(text)) return 'Precondition';
    return 'Data_Issue';
  }

  getApplicationSubClass(text) {
    if (/5\d\d/.test(text)) return 'Server_Error';
    if (/nullreference|typeerror/.test(text)) return 'Runtime_Error';
    if (/ui.*mismatch|dom.*diff/.test(text)) return 'UI_Change';
    return 'Logic_Error';
  }

  /**
   * Auto-classify all unclassified failures in a project
   */
  autoClassify(projectId, filters) {
    try {
      const testCases = this.getUnclassifiedFailures(projectId, filters);
      const results = [];

      for (const testCase of testCases) {
        const classification = this.classifyFailure(testCase);
        const signatureHash = this.generateSignatureHash(testCase.error_message, testCase.stack_trace);
        
        // Save classification
        const classificationId = this.saveClassification({
          testCaseId: testCase.id,
          primaryClass: classification.primaryClass,
          subClass: classification.subClass,
          confidence: classification.confidence,
          signatureHash,
          isManuallyClassified: false,
          evidenceData: {
            errorText: testCase.error_message,
            stackTrace: testCase.stack_trace
          }
        });

        results.push({ testCaseId: testCase.id, classificationId, ...classification });
      }

      return results;
    } catch (error) {
      console.error('Error in auto-classification:', error);
      throw error;
    }
  }

  getUnclassifiedFailures(projectId, filters) {
    const { timeWindow, startDate, endDate, testSearch, selectedRuns } = filters;
    
    let dateFilter = '';
    const params = [projectId];
    
    if (timeWindow === 'custom' && startDate && endDate) {
      dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      const days = parseInt(timeWindow) || 30;
      dateFilter = ' AND tr.started_at >= datetime("now", "-' + days + ' days")';
    }

    let query = `
      SELECT tc.id, tc.name, tc.error_message, tc.stack_trace
      FROM test_cases tc
      JOIN test_runs tr ON tc.test_run_id = tr.id
      LEFT JOIN defect_classifications dc ON tc.id = dc.test_case_id
      WHERE tr.project_id = ? AND tc.status = 'failed' AND dc.id IS NULL${dateFilter}
    `;
    
    if (testSearch) {
      query += ' AND tc.name LIKE ?';
      params.push(`%${testSearch}%`);
    }
    
    if (selectedRuns && selectedRuns.length > 0) {
      query += ` AND tr.id IN (${selectedRuns.map(() => '?').join(',')})`;
      params.push(...selectedRuns);
    }

    return this.db.db.prepare(query).all(...params);
  }

  saveClassification(data) {
    const query = `
      INSERT INTO defect_classifications 
      (test_case_id, primary_class, sub_class, confidence, signature_hash, is_manually_classified, evidence_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.db.db.prepare(query).run(
      data.testCaseId,
      data.primaryClass,
      data.subClass,
      data.confidence,
      data.signatureHash,
      data.isManuallyClassified ? 1 : 0,
      JSON.stringify(data.evidenceData)
    );

    return result.lastInsertRowid;
  }

  /**
   * Deduplicate failures by grouping similar signature hashes
   */
  deduplicate(projectId, filters) {
    try {
      // Get all classified failures
      const classified = this.getClassifiedFailures(projectId, filters);
      const groupsMap = new Map();

      // Group by signature hash
      for (const failure of classified) {
        if (!groupsMap.has(failure.signature_hash)) {
          groupsMap.set(failure.signature_hash, []);
        }
        groupsMap.get(failure.signature_hash).push(failure);
      }

      // Create groups for signatures with multiple occurrences
      const results = [];
      for (const [signatureHash, members] of groupsMap) {
        if (members.length > 1) {
          const groupId = this.createDefectGroup(signatureHash, members);
          results.push({ groupId, signatureHash, memberCount: members.length });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in deduplication:', error);
      throw error;
    }
  }

  getClassifiedFailures(projectId, filters) {
    const { timeWindow, startDate, endDate } = filters;
    
    let dateFilter = '';
    const params = [projectId];
    
    if (timeWindow === 'custom' && startDate && endDate) {
      dateFilter = ' AND tr.started_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      const days = parseInt(timeWindow) || 30;
      dateFilter = ' AND tr.started_at >= datetime("now", "-' + days + ' days")';
    }

    const query = `
      SELECT dc.*, tc.error_message, tr.finished_at
      FROM defect_classifications dc
      JOIN test_cases tc ON dc.test_case_id = tc.id
      JOIN test_runs tr ON tc.test_run_id = tr.id
      WHERE tr.project_id = ?${dateFilter}
      ORDER BY dc.classified_at DESC
    `;

    return this.db.db.prepare(query).all(...params);
  }

  createDefectGroup(signatureHash, members) {
    // Check if group already exists
    const existingGroup = this.db.db.prepare(
      'SELECT id FROM defect_groups WHERE signature_hash = ?'
    ).get(signatureHash);

    if (existingGroup) {
      // Update existing group
      this.updateDefectGroup(existingGroup.id, members);
      return existingGroup.id;
    }

    // Create new group
    const representative = members[0];
    const firstSeen = Math.min(...members.map(m => new Date(m.classified_at).getTime()));
    const lastSeen = Math.max(...members.map(m => new Date(m.classified_at).getTime()));

    const groupResult = this.db.db.prepare(`
      INSERT INTO defect_groups 
      (signature_hash, primary_class, sub_class, representative_error, first_seen, last_seen, occurrence_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      signatureHash,
      representative.primary_class,
      representative.sub_class,
      representative.error_message || 'No error message',
      new Date(firstSeen).toISOString(),
      new Date(lastSeen).toISOString(),
      members.length
    );

    const groupId = groupResult.lastInsertRowid;

    // Add members to group
    for (const member of members) {
      this.db.db.prepare(`
        INSERT OR IGNORE INTO defect_group_members (group_id, test_case_id)
        VALUES (?, ?)
      `).run(groupId, member.test_case_id);
    }

    return groupId;
  }

  updateDefectGroup(groupId, members) {
    const lastSeen = Math.max(...members.map(m => new Date(m.classified_at).getTime()));
    
    this.db.db.prepare(`
      UPDATE defect_groups 
      SET last_seen = ?, occurrence_count = ?
      WHERE id = ?
    `).run(
      new Date(lastSeen).toISOString(),
      members.length,
      groupId
    );

    // Add new members
    for (const member of members) {
      this.db.db.prepare(`
        INSERT OR IGNORE INTO defect_group_members (group_id, test_case_id)
        VALUES (?, ?)
      `).run(groupId, member.test_case_id);
    }
  }
}

export default DefectService;

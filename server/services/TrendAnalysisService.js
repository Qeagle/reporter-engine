import DatabaseService from './DatabaseService.js';

class TrendAnalysisService {
  constructor() {
    this.db = new DatabaseService();
  }
  /**
   * Get trend data for pass/fail over time
   * @param {Object} filters - Filter options
   * @param {number} filters.projectId - Project ID to filter by
   * @param {string} filters.timeRange - Time range ('7d', '30d', '90d', '6m', '1y')
   * @param {string} filters.groupBy - Grouping interval ('day', 'week', 'month')
   * @param {string} filters.testSuite - Optional test suite filter
   * @param {string} filters.environment - Optional environment filter
   * @param {string} filters.branch - Optional branch filter
   * @returns {Promise<Object>} Trend data with pass/fail statistics
   */
  async getTrendData(filters = {}) {
    const { 
      projectId, 
      timeRange = '30d', 
      groupBy = 'day',
      testSuite,
      environment,
      branch
    } = filters;

    // Get time range SQL modifier
    const timeModifier = this.getTimeModifier(timeRange);
    const groupByFormat = this.getGroupByFormat(groupBy);
    
    // Build the WHERE clause
    let whereConditions = ['tr.started_at >= datetime(\'now\', ?)'];
    let params = [timeModifier];
    
    if (projectId) {
      whereConditions.push('tr.project_id = ?');
      params.push(projectId);
    }
    
    if (testSuite) {
      whereConditions.push('tr.test_suite = ?');
      params.push(testSuite);
    }
    
    if (environment) {
      whereConditions.push('tr.environment = ?');
      params.push(environment);
    }
    
    if (branch) {
      whereConditions.push('tr.branch = ?');
      params.push(branch);
    }

    const whereClause = whereConditions.join(' AND ');

    // Main trend query - aggregate test runs by time period
    const trendQuery = `
      SELECT 
        strftime('${groupByFormat}', tr.started_at) as period,
        DATE(tr.started_at) as date,
        COUNT(*) as total_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 100 THEN 1 
          ELSE 0 
        END) as passed_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) < 100 
            AND CAST(json_extract(tr.summary, '$.passRate') AS REAL) > 0 THEN 1 
          ELSE 0 
        END) as flaky_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 0 THEN 1 
          ELSE 0 
        END) as failed_runs,
        AVG(CAST(json_extract(tr.summary, '$.total') AS INTEGER)) as avg_total_tests,
        AVG(CAST(json_extract(tr.summary, '$.passed') AS INTEGER)) as avg_passed_tests,
        AVG(CAST(json_extract(tr.summary, '$.failed') AS INTEGER)) as avg_failed_tests,
        AVG(julianday(tr.finished_at) - julianday(tr.started_at)) * 24 * 60 as avg_duration_minutes
      FROM test_runs tr
      WHERE ${whereClause}
        AND tr.status = 'completed'
        AND tr.finished_at IS NOT NULL
        AND tr.summary IS NOT NULL
      GROUP BY strftime('${groupByFormat}', tr.started_at)
      ORDER BY date ASC
    `;

    const trendData = this.db.db.prepare(trendQuery).all(params);

    // Test case level trends for more detailed analysis
    const testCaseTrendQuery = `
      SELECT 
        strftime('${groupByFormat}', tr.started_at) as period,
        DATE(tr.started_at) as date,
        COUNT(tc.id) as total_test_cases,
        SUM(CASE WHEN tc.status = 'passed' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN tc.status = 'failed' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN tc.status = 'skipped' THEN 1 ELSE 0 END) as skipped_tests,
        AVG(tc.duration) as avg_test_duration_ms
      FROM test_runs tr
      JOIN test_cases tc ON tr.id = tc.test_run_id
      WHERE ${whereClause}
      GROUP BY strftime('${groupByFormat}', tr.started_at)
      ORDER BY date ASC
    `;

    const testCaseTrends = this.db.db.prepare(testCaseTrendQuery).all(params);

    return {
      runTrends: trendData,
      testCaseTrends: testCaseTrends,
      summary: await this.getTrendSummary(filters),
      filters: {
        timeRange,
        groupBy,
        projectId,
        testSuite,
        environment,
        branch
      }
    };
  }

  /**
   * Get trend summary statistics
   */
  async getTrendSummary(filters = {}) {
    const { projectId, timeRange = '30d', testSuite, environment, branch } = filters;
    
    const timeModifier = this.getTimeModifier(timeRange);
    let whereConditions = ['tr.started_at >= datetime(\'now\', ?)'];
    let params = [timeModifier];
    
    if (projectId) {
      whereConditions.push('tr.project_id = ?');
      params.push(projectId);
    }
    
    if (testSuite) {
      whereConditions.push('tr.test_suite = ?');
      params.push(testSuite);
    }
    
    if (environment) {
      whereConditions.push('tr.environment = ?');
      params.push(environment);
    }
    
    if (branch) {
      whereConditions.push('tr.branch = ?');
      params.push(branch);
    }

    const whereClause = whereConditions.join(' AND ');

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 100 THEN 1 
          ELSE 0 
        END) as total_passed_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 0 THEN 1 
          ELSE 0 
        END) as total_failed_runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) < 100 
            AND CAST(json_extract(tr.summary, '$.passRate') AS REAL) > 0 THEN 1 
          ELSE 0 
        END) as total_flaky_runs,
        ROUND(AVG(CAST(json_extract(tr.summary, '$.passRate') AS REAL)), 2) as pass_rate,
        ROUND(AVG(julianday(tr.finished_at) - julianday(tr.started_at)) * 24 * 60, 2) as avg_duration_minutes,
        MIN(tr.started_at) as earliest_run,
        MAX(tr.started_at) as latest_run
      FROM test_runs tr
      WHERE ${whereClause}
        AND tr.status = 'completed'
        AND tr.finished_at IS NOT NULL
        AND tr.summary IS NOT NULL
    `;

    const summary = this.db.db.prepare(summaryQuery).get(params);

    // Get test case summary
    const testCaseSummaryQuery = `
      SELECT 
        COUNT(tc.id) as total_test_cases,
        SUM(CASE WHEN tc.status = 'passed' THEN 1 ELSE 0 END) as total_passed_tests,
        SUM(CASE WHEN tc.status = 'failed' THEN 1 ELSE 0 END) as total_failed_tests,
        SUM(CASE WHEN tc.status = 'skipped' THEN 1 ELSE 0 END) as total_skipped_tests,
        ROUND(AVG(CASE WHEN tc.status = 'passed' THEN 100.0 ELSE 0 END), 2) as test_pass_rate,
        ROUND(AVG(tc.duration), 0) as avg_test_duration_ms
      FROM test_runs tr
      JOIN test_cases tc ON tr.id = tc.test_run_id
      WHERE ${whereClause}
    `;

    const testCaseSummary = this.db.db.prepare(testCaseSummaryQuery).get(params);

    return {
      ...summary,
      ...testCaseSummary
    };
  }

  /**
   * Get test suite performance trends
   */
  async getTestSuiteTrends(filters = {}) {
    const { projectId, timeRange = '30d', groupBy = 'day' } = filters;
    
    const timeModifier = this.getTimeModifier(timeRange);
    const groupByFormat = this.getGroupByFormat(groupBy);
    
    let whereConditions = ['tr.started_at >= datetime(\'now\', ?)'];
    let params = [timeModifier];
    
    if (projectId) {
      whereConditions.push('tr.project_id = ?');
      params.push(projectId);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        tr.test_suite,
        strftime('${groupByFormat}', tr.started_at) as period,
        DATE(tr.started_at) as date,
        COUNT(*) as runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 100 THEN 1 
          ELSE 0 
        END) as passed,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) < 100 THEN 1 
          ELSE 0 
        END) as failed,
        ROUND(AVG(CAST(json_extract(tr.summary, '$.passRate') AS REAL)), 2) as pass_rate,
        AVG(julianday(tr.finished_at) - julianday(tr.started_at)) * 24 * 60 as avg_duration
      FROM test_runs tr
      WHERE ${whereClause}
        AND tr.test_suite IS NOT NULL
        AND tr.status = 'completed'
        AND tr.finished_at IS NOT NULL
        AND tr.summary IS NOT NULL
      GROUP BY tr.test_suite, strftime('${groupByFormat}', tr.started_at)
      ORDER BY tr.test_suite, date ASC
    `;

    const results = this.db.db.prepare(query).all(params);
    
    // Group results by test suite
    const suiteData = {};
    results.forEach(row => {
      if (!suiteData[row.test_suite]) {
        suiteData[row.test_suite] = [];
      }
      suiteData[row.test_suite].push(row);
    });

    return suiteData;
  }

  /**
   * Get environment comparison trends
   */
  async getEnvironmentTrends(filters = {}) {
    const { projectId, timeRange = '30d', groupBy = 'day' } = filters;
    
    const timeModifier = this.getTimeModifier(timeRange);
    const groupByFormat = this.getGroupByFormat(groupBy);
    
    let whereConditions = ['tr.started_at >= datetime(\'now\', ?)'];
    let params = [timeModifier];
    
    if (projectId) {
      whereConditions.push('tr.project_id = ?');
      params.push(projectId);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        tr.environment,
        strftime('${groupByFormat}', tr.started_at) as period,
        DATE(tr.started_at) as date,
        COUNT(*) as runs,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) = 100 THEN 1 
          ELSE 0 
        END) as passed,
        SUM(CASE 
          WHEN CAST(json_extract(tr.summary, '$.passRate') AS REAL) < 100 THEN 1 
          ELSE 0 
        END) as failed,
        ROUND(AVG(CAST(json_extract(tr.summary, '$.passRate') AS REAL)), 2) as pass_rate
      FROM test_runs tr
      WHERE ${whereClause}
        AND tr.environment IS NOT NULL
        AND tr.status = 'completed'
        AND tr.finished_at IS NOT NULL
        AND tr.summary IS NOT NULL
      GROUP BY tr.environment, strftime('${groupByFormat}', tr.started_at)
      ORDER BY tr.environment, date ASC
    `;

    const results = this.db.db.prepare(query).all(params);
    
    // Group results by environment
    const envData = {};
    results.forEach(row => {
      if (!envData[row.environment]) {
        envData[row.environment] = [];
      }
      envData[row.environment].push(row);
    });

    return envData;
  }

  /**
   * Get flaky test trends
   */
  async getFlakyTestTrends(filters = {}) {
    const { projectId, timeRange = '30d', groupBy = 'day' } = filters;
    
    const timeModifier = this.getTimeModifier(timeRange);
    const groupByFormat = this.getGroupByFormat(groupBy);
    
    let whereConditions = ['tr.started_at >= datetime(\'now\', ?)'];
    let params = [timeModifier];
    
    if (projectId) {
      whereConditions.push('tr.project_id = ?');
      params.push(projectId);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        strftime('${groupByFormat}', tr.started_at) as period,
        DATE(tr.started_at) as date,
        tc.name as test_name,
        tc.suite,
        COUNT(*) as total_runs,
        SUM(CASE WHEN tc.status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN tc.status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(AVG(CASE WHEN tc.status = 'passed' THEN 100.0 ELSE 0 END), 2) as pass_rate
      FROM test_runs tr
      JOIN test_cases tc ON tr.id = tc.test_run_id
      WHERE ${whereClause}
      GROUP BY strftime('${groupByFormat}', tr.started_at), tc.name, tc.suite
      HAVING total_runs >= 2 
        AND passed > 0 
        AND failed > 0
        AND pass_rate > 0 
        AND pass_rate < 100
      ORDER BY date ASC, pass_rate ASC
    `;

    return this.db.db.prepare(query).all(params);
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(projectId = null) {
    let whereClause = 'WHERE test_suite IS NOT NULL';
    let params = [];
    
    if (projectId) {
      whereClause = 'WHERE project_id = ? AND test_suite IS NOT NULL';
      params.push(projectId);
    }

    const testSuites = this.db.db.prepare(`
        SELECT DISTINCT test_suite 
        FROM test_runs 
        ${whereClause}
        ORDER BY test_suite
      `).all(params);
      
    // Reset for environments query
    whereClause = 'WHERE environment IS NOT NULL';
    params = [];
    
    if (projectId) {
      whereClause = 'WHERE project_id = ? AND environment IS NOT NULL';
      params.push(projectId);
    }
      
    const environments = this.db.db.prepare(`
        SELECT DISTINCT environment 
        FROM test_runs 
        ${whereClause}
        ORDER BY environment
      `).all(params);
      
    // Reset for branches query  
    whereClause = 'WHERE branch IS NOT NULL';
    params = [];
    
    if (projectId) {
      whereClause = 'WHERE project_id = ? AND branch IS NOT NULL';
      params.push(projectId);
    }
      
    const branches = this.db.db.prepare(`
        SELECT DISTINCT branch 
        FROM test_runs 
        ${whereClause}
        ORDER BY branch
      `).all(params);

    return {
      testSuites: testSuites.map(row => row.test_suite),
      environments: environments.map(row => row.environment),
      branches: branches.map(row => row.branch)
    };
  }

  /**
   * Convert time range to SQLite modifier
   */
  getTimeModifier(timeRange) {
    const modifiers = {
      '7d': '-7 days',
      '30d': '-30 days',
      '90d': '-90 days',
      '6m': '-6 months',
      '1y': '-1 year'
    };
    return modifiers[timeRange] || '-30 days';
  }

  /**
   * Convert groupBy to SQLite strftime format
   */
  getGroupByFormat(groupBy) {
    const formats = {
      'day': '%Y-%m-%d',
      'week': '%Y-W%W',
      'month': '%Y-%m'
    };
    return formats[groupBy] || '%Y-%m-%d';
  }
}

export default new TrendAnalysisService();

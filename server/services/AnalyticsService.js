import moment from 'moment';

class AnalyticsService {
  calculateMetrics(report) {
    const { tests, summary } = report;
    
    return {
      summary,
      testDurations: tests.map(test => ({
        name: test.name,
        duration: test.duration || 0,
        status: test.status
      })),
      failureReasons: this.getFailureReasons(tests),
      stepMetrics: this.getStepMetrics(tests),
      tagMetrics: this.getTagMetrics(report.tags || []),
      environmentInfo: {
        name: report.environment,
        framework: report.framework,
        metadata: report.metadata
      }
    };
  }

  generateTimeline(report) {
    const { tests } = report;
    
    const timeline = tests.map(test => ({
      testName: test.name,
      startTime: test.startTime,
      endTime: test.endTime,
      duration: test.duration || 0,
      status: test.status,
      steps: test.steps?.length || 0
    }));

    return {
      tests: timeline,
      totalDuration: timeline.reduce((sum, test) => sum + test.duration, 0),
      parallelExecution: this.detectParallelExecution(timeline)
    };
  }

  compareReports(reports) {
    if (reports.length < 2) {
      throw new Error('At least 2 reports are required for comparison');
    }

    const comparison = {
      reports: reports.map(report => ({
        id: report.id,
        testSuite: report.testSuite,
        startTime: report.startTime,
        summary: report.summary
      })),
      trends: {
        passRateChange: this.calculatePassRateChange(reports),
        durationChange: this.calculateDurationChange(reports),
        testCountChange: this.calculateTestCountChange(reports)
      },
      commonFailures: this.findCommonFailures(reports),
      newFailures: this.findNewFailures(reports),
      fixedTests: this.findFixedTests(reports)
    };

    return comparison;
  }

  getFailureReasons(tests) {
    const failedTests = tests.filter(test => test.status === 'failed');
    const reasons = {};

    failedTests.forEach(test => {
      if (test.errorMessage) {
        const reason = this.categorizeError(test.errorMessage);
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
    });

    return Object.entries(reasons).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / failedTests.length) * 100)
    }));
  }

  getStepMetrics(tests) {
    const allSteps = tests.flatMap(test => test.steps || []);
    
    const stepMetrics = {
      totalSteps: allSteps.length,
      avgStepsPerTest: Math.round(allSteps.length / tests.length * 100) / 100,
      stepDurations: allSteps.map(step => ({
        name: step.name,
        duration: step.duration || 0,
        status: step.status
      }))
    };

    return stepMetrics;
  }

  getTagMetrics(tags) {
    const tagCounts = {};
    
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    return Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count
    }));
  }

  detectParallelExecution(timeline) {
    // Simple parallel execution detection
    const overlaps = [];
    
    for (let i = 0; i < timeline.length; i++) {
      for (let j = i + 1; j < timeline.length; j++) {
        const test1 = timeline[i];
        const test2 = timeline[j];
        
        if (this.timePeriodsOverlap(test1, test2)) {
          overlaps.push([test1.testName, test2.testName]);
        }
      }
    }

    return {
      isParallel: overlaps.length > 0,
      overlappingTests: overlaps
    };
  }

  timePeriodsOverlap(test1, test2) {
    const start1 = moment(test1.startTime);
    const end1 = moment(test1.endTime);
    const start2 = moment(test2.startTime);
    const end2 = moment(test2.endTime);

    return start1.isBefore(end2) && start2.isBefore(end1);
  }

  categorizeError(errorMessage) {
    const errorCategories = [
      { pattern: /timeout|timed out/i, category: 'Timeout' },
      { pattern: /element not found|no such element/i, category: 'Element Not Found' },
      { pattern: /assertion|expected|actual/i, category: 'Assertion Failure' },
      { pattern: /network|connection/i, category: 'Network Issue' },
      { pattern: /page not found|404/i, category: 'Page Not Found' },
      { pattern: /permission|access denied|401|403/i, category: 'Permission Error' }
    ];

    for (const { pattern, category } of errorCategories) {
      if (pattern.test(errorMessage)) {
        return category;
      }
    }

    return 'Other';
  }

  calculatePassRateChange(reports) {
    if (reports.length < 2) return 0;
    
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    const latestRate = latest.summary.passRate || 0;
    const previousRate = previous.summary.passRate || 0;
    
    return latestRate - previousRate;
  }

  calculateDurationChange(reports) {
    if (reports.length < 2) return 0;
    
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    const latestDuration = latest.summary.duration || 0;
    const previousDuration = previous.summary.duration || 0;
    
    if (previousDuration === 0) return 0;
    
    return Math.round(((latestDuration - previousDuration) / previousDuration) * 100);
  }

  calculateTestCountChange(reports) {
    if (reports.length < 2) return 0;
    
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    return latest.summary.total - previous.summary.total;
  }

  findCommonFailures(reports) {
    const allFailures = reports.flatMap(report => 
      report.tests.filter(test => test.status === 'failed')
        .map(test => test.name)
    );

    const failureCounts = {};
    allFailures.forEach(testName => {
      failureCounts[testName] = (failureCounts[testName] || 0) + 1;
    });

    return Object.entries(failureCounts)
      .filter(([, count]) => count > 1)
      .map(([testName, count]) => ({ testName, count }));
  }

  findNewFailures(reports) {
    if (reports.length < 2) return [];
    
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    const latestFailures = latest.tests
      .filter(test => test.status === 'failed')
      .map(test => test.name);
    
    const previousFailures = previous.tests
      .filter(test => test.status === 'failed')
      .map(test => test.name);
    
    return latestFailures.filter(testName => !previousFailures.includes(testName));
  }

  findFixedTests(reports) {
    if (reports.length < 2) return [];
    
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    const latestPassed = latest.tests
      .filter(test => test.status === 'passed')
      .map(test => test.name);
    
    const previousFailed = previous.tests
      .filter(test => test.status === 'failed')
      .map(test => test.name);
    
    return latestPassed.filter(testName => previousFailed.includes(testName));
  }
}

export default AnalyticsService;
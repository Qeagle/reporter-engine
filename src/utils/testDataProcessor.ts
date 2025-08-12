export interface ProcessedTestData {
  name: string;
  status: string;
  duration: number;
  browser?: string;
  platform?: string;
  viewport?: string;
  steps?: any[];
  artifacts?: any[];
  errorMessage?: string;
  stackTrace?: string;
}

export interface BrowserStats {
  [browser: string]: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
}

/**
 * Processes raw test data to extract browser information from test names or metadata
 * This function can be used to enhance test data with browser information
 */
export const processTestDataForBrowserInfo = (tests: any[]): ProcessedTestData[] => {
  return tests.map(test => {
    let browser = test.browser;
    let platform = test.platform;
    let viewport = test.viewport;

    // If browser info is not directly available, try to extract from test name or metadata
    if (!browser) {
      // Common patterns for browser extraction from test names
      const browserPatterns = [
        { pattern: /chromium|chrome/i, browser: 'Chromium' },
        { pattern: /firefox|mozilla/i, browser: 'Firefox' },
        { pattern: /webkit|safari/i, browser: 'WebKit' },
        { pattern: /edge|msedge/i, browser: 'Edge' }
      ];

      for (const { pattern, browser: browserName } of browserPatterns) {
        if (pattern.test(test.name) || pattern.test(test.title || '')) {
          browser = browserName;
          break;
        }
      }

      // Check metadata or configuration
      if (!browser && test.metadata) {
        browser = test.metadata.browser || test.metadata.browserName;
        platform = test.metadata.platform || test.metadata.os;
        viewport = test.metadata.viewport;
      }

      // Check configuration object
      if (!browser && test.config) {
        browser = test.config.browser || test.config.browserName;
        platform = test.config.platform;
        viewport = test.config.viewport;
      }
    }

    return {
      ...test,
      browser,
      platform,
      viewport
    };
  });
};

/**
 * Generates browser statistics from processed test data
 */
export const generateBrowserStats = (tests: ProcessedTestData[]): BrowserStats => {
  const stats: BrowserStats = {};

  tests.forEach(test => {
    const browser = test.browser || 'Unknown';
    
    if (!stats[browser]) {
      stats[browser] = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0
      };
    }

    stats[browser].total++;
    
    switch (test.status?.toLowerCase()) {
      case 'passed':
        stats[browser].passed++;
        break;
      case 'failed':
        stats[browser].failed++;
        break;
      case 'skipped':
        stats[browser].skipped++;
        break;
    }
  });

  // Calculate pass rates
  Object.keys(stats).forEach(browser => {
    const browserStats = stats[browser];
    browserStats.passRate = browserStats.total > 0 
      ? Math.round((browserStats.passed / browserStats.total) * 100)
      : 0;
  });

  return stats;
};

/**
 * Removes browser information from environment metadata to avoid duplication
 */
export const cleanEnvironmentMetadata = (environmentInfo: any) => {
  if (!environmentInfo || !environmentInfo.metadata) {
    return environmentInfo;
  }

  const { browser, browserName, ...cleanedMetadata } = environmentInfo.metadata;
  
  return {
    ...environmentInfo,
    metadata: cleanedMetadata
  };
};

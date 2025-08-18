import { apiService } from './apiService';

export interface TrendFilters {
  projectId?: number;
  timeRange?: '7d' | '30d' | '90d' | '6m' | '1y';
  groupBy?: 'day' | 'week' | 'month';
  testSuite?: string;
  environment?: string;
  branch?: string;
}

export interface TrendDataPoint {
  period: string;
  date: string;
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  flaky_runs: number;
  avg_total_tests: number;
  avg_passed_tests: number;
  avg_failed_tests: number;
  avg_duration_minutes: number;
}

export interface TestCaseTrendPoint {
  period: string;
  date: string;
  total_test_cases: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  avg_test_duration_ms: number;
}

export interface TrendSummary {
  total_runs: number;
  total_passed_runs: number;
  total_failed_runs: number;
  total_flaky_runs: number;
  pass_rate: number;
  avg_duration_minutes: number;
  earliest_run: string;
  latest_run: string;
  total_test_cases: number;
  total_passed_tests: number;
  total_failed_tests: number;
  total_skipped_tests: number;
  test_pass_rate: number;
  avg_test_duration_ms: number;
}

export interface TrendData {
  runTrends: TrendDataPoint[];
  testCaseTrends: TestCaseTrendPoint[];
  summary: TrendSummary;
  filters: TrendFilters;
}

export interface SuiteTrendData {
  [suiteName: string]: Array<{
    period: string;
    date: string;
    runs: number;
    passed: number;
    failed: number;
    pass_rate: number;
    avg_duration: number;
  }>;
}

export interface EnvironmentTrendData {
  [environment: string]: Array<{
    period: string;
    date: string;
    runs: number;
    passed: number;
    failed: number;
    pass_rate: number;
  }>;
}

export interface FlakyTestData {
  period: string;
  date: string;
  test_name: string;
  suite: string;
  total_runs: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

export interface FilterOptions {
  testSuites: string[];
  environments: string[];
  branches: string[];
}

class TrendAnalysisService {
  /**
   * Get trend data for pass/fail analysis
   */
  async getTrendData(filters: TrendFilters = {}): Promise<TrendData> {
    const response = await apiService.get(`/trends/data?${new URLSearchParams(filters as any).toString()}`);
    return response.data;
  }

  /**
   * Get trend summary statistics
   */
  async getTrendSummary(filters: TrendFilters = {}): Promise<TrendSummary> {
    const response = await apiService.get(`/trends/summary?${new URLSearchParams(filters as any).toString()}`);
    return response.data;
  }

  /**
   * Get test suite performance trends
   */
  async getTestSuiteTrends(filters: TrendFilters = {}): Promise<SuiteTrendData> {
    const response = await apiService.get(`/trends/test-suites?${new URLSearchParams(filters as any).toString()}`);
    return response.data;
  }

  /**
   * Get environment comparison trends
   */
  async getEnvironmentTrends(filters: TrendFilters = {}): Promise<EnvironmentTrendData> {
    const response = await apiService.get(`/trends/environments?${new URLSearchParams(filters as any).toString()}`);
    return response.data;
  }

  /**
   * Get flaky test trends
   */
  async getFlakyTestTrends(filters: TrendFilters = {}): Promise<FlakyTestData[]> {
    const response = await apiService.get(`/trends/flaky-tests?${new URLSearchParams(filters as any).toString()}`);
    return response.data;
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(projectId?: number): Promise<FilterOptions> {
    const queryParams = projectId ? `?projectId=${projectId}` : '';
    const response = await apiService.get(`/trends/filters${queryParams}`);
    return response.data;
  }
}

export default new TrendAnalysisService();

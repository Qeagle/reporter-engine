import { apiService } from './apiService';

export interface FailureAnalysisSummary {
  totalFailures: number;
  classifiedPercent: number;
  unclassified: number;
  duplicateGroups: number;
  // Detailed breakdown by category
  automationErrors: number;
  dataIssues: number;
  environmentIssues: number;
  applicationDefects: number;
  unknownFailures: number;
}

export interface AnalysisFilters {
  timeWindow: '1h' | '8h' | '1d' | '7' | '30' | '60' | '90' | 'custom';
  startDate?: string;
  endDate?: string;
  selectedRuns?: string[];
  testSearch?: string;
}

export interface TestCaseFailure {
  id: number;
  testName: string;
  suiteName: string;
  latestStatus: 'failed' | 'passed' | 'skipped';
  primaryClass?: string;
  subClass?: string;
  confidence?: number;
  evidence: any;
  lastSeen: string;
  errorMessage?: string;
  stackTrace?: string;
  runId: number;
}

export interface SuiteRunFailure {
  suiteName: string;
  runId: number;
  counts: {
    [className: string]: number;
  };
  topSubClasses: Array<{
    subClass: string;
    count: number;
  }>;
}

export interface FailureGroup {
  id: string;
  signatureHash: string;
  primaryClass: string;
  subClass: string;
  representativeError: string;
  memberTests: number[];
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
}

class FailureAnalysisService {
  async getSummary(projectId: number, filters: AnalysisFilters): Promise<FailureAnalysisSummary> {
    const params = new URLSearchParams();
    params.append('timeWindow', filters.timeWindow);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.testSearch) params.append('testSearch', filters.testSearch);
    if (filters.selectedRuns?.length) {
      filters.selectedRuns.forEach(run => params.append('runs', run));
    }

    const response = await apiService.get(`/analysis/projects/${projectId}/summary?${params.toString()}`);
    return response.data;
  }

  async getTestCaseFailures(projectId: number, filters: AnalysisFilters): Promise<TestCaseFailure[]> {
    const params = new URLSearchParams();
    params.append('timeWindow', filters.timeWindow);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.testSearch) params.append('testSearch', filters.testSearch);
    if (filters.selectedRuns?.length) {
      filters.selectedRuns.forEach(run => params.append('runs', run));
    }

    const response = await apiService.get(`/analysis/projects/${projectId}/test-cases?${params.toString()}`);
    return response.data;
  }

  async getSuiteRunFailures(projectId: number, filters: AnalysisFilters): Promise<SuiteRunFailure[]> {
    const params = new URLSearchParams();
    params.append('timeWindow', filters.timeWindow);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.testSearch) params.append('testSearch', filters.testSearch);
    if (filters.selectedRuns?.length) {
      filters.selectedRuns.forEach(run => params.append('runs', run));
    }

    const response = await apiService.get(`/analysis/projects/${projectId}/suite-runs?${params.toString()}`);
    return response.data;
  }

  async getFailureGroups(projectId: number, filters: AnalysisFilters): Promise<FailureGroup[]> {
    const params = new URLSearchParams();
    params.append('timeWindow', filters.timeWindow);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.testSearch) params.append('testSearch', filters.testSearch);
    if (filters.selectedRuns?.length) {
      filters.selectedRuns.forEach(run => params.append('runs', run));
    }

    const response = await apiService.get(`/analysis/projects/${projectId}/groups?${params.toString()}`);
    return response.data;
  }

  async autoClassify(projectId: number, filters: AnalysisFilters): Promise<void> {
    const params = new URLSearchParams();
    params.append('timeWindow', filters.timeWindow);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.testSearch) params.append('testSearch', filters.testSearch);
    if (filters.selectedRuns?.length) {
      filters.selectedRuns.forEach(run => params.append('runs', run));
    }

    await apiService.post(`/analysis/projects/${projectId}/auto-classify?${params.toString()}`);
  }

  async reclassifyFailure(testCaseId: number, primaryClass: string, subClass: string): Promise<void> {
    await apiService.post(`/analysis/test-cases/${testCaseId}/reclassify`, {
      primaryClass,
      subClass
    });
  }

  async getEvidence(testCaseId: number): Promise<any> {
    const response = await apiService.get(`/analysis/test-cases/${testCaseId}/evidence`);
    return response.data;
  }

  async getSuggestedFixes(testCaseId: number): Promise<string[]> {
    const response = await apiService.get(`/analysis/test-cases/${testCaseId}/suggested-fixes`);
    return response.data;
  }
}

export const failureAnalysisService = new FailureAnalysisService();

// Legacy export for compatibility
export const defectService = failureAnalysisService;
export type DefectSummary = FailureAnalysisSummary;
export type DefectFilters = AnalysisFilters;
export type TestCaseDefect = TestCaseFailure;
export type SuiteRunDefect = SuiteRunFailure;
export type DefectGroup = FailureGroup;

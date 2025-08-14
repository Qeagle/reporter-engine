import { apiService } from './apiService';

export interface ExceptionGroup {
  signature: string;
  errorType: string;
  representativeError: string;
  representativeStackTrace?: string;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  affectedTestsCount: number;
  projects: string[];
  environments: string[];
  frameworks: string[];
  testSuites: string[];
  affectedTests?: AffectedTest[];
  timeline?: TimelineEntry[];
  patterns?: ExceptionPatterns;
}

export interface AffectedTest {
  id: number;
  testRunId: number;
  testName: string;
  status: string;
  duration: number;
  startTime: string;
  endTime: string;
  errorMessage: string;
  stackTrace: string;
  projectName: string;
  projectKey: string;
  testSuite: string;
  environment: string;
  framework: string;
  runStartedAt: string;
}

export interface TimelineEntry {
  date: string;
  count: number;
}

export interface ExceptionPatterns {
  byEnvironment: Record<string, number>;
  byFramework: Record<string, number>;
  byTestSuite: Record<string, number>;
  byTimeOfDay: Record<string, number>;
  avgDuration: number;
  totalDuration: number;
}

export interface ExceptionStats {
  totalGroups: number;
  totalOccurrences: number;
  avgOccurrencesPerGroup: number;
  topErrorTypes: Array<{ type: string; count: number }>;
  mostAffectedProjects: Array<{ project: string; count: number }>;
  mostAffectedEnvironments: Array<{ environment: string; count: number }>;
}

export interface ExceptionFilters {
  projectId?: string;
  timeRange?: '1d' | '7d' | '30d' | '90d' | 'all';
  page?: number;
  limit?: number;
}

class ExceptionsService {
  /**
   * Get all exception groups
   */
  async getExceptionGroups(filters: ExceptionFilters = {}): Promise<{
    groups: ExceptionGroup[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.projectId) params.append('projectId', filters.projectId);
    if (filters.timeRange) params.append('timeRange', filters.timeRange);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiService.get(`/exceptions/groups?${params.toString()}`);
    return response.data;
  }

  /**
   * Get detailed information about a specific exception group
   */
  async getExceptionGroupDetails(signature: string, projectId?: string): Promise<ExceptionGroup> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);

    const response = await apiService.get(`/exceptions/groups/${signature}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get exception statistics
   */
  async getExceptionStats(filters: Pick<ExceptionFilters, 'projectId' | 'timeRange'> = {}): Promise<ExceptionStats> {
    const params = new URLSearchParams();
    
    if (filters.projectId) params.append('projectId', filters.projectId);
    if (filters.timeRange) params.append('timeRange', filters.timeRange);

    const response = await apiService.get(`/exceptions/stats?${params.toString()}`);
    return response.data;
  }
}

export const exceptionsService = new ExceptionsService();
export default exceptionsService;

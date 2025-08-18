import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ExceptionGroup, 
  ExceptionStats,
  ExceptionFilters,
  exceptionsService 
} from '../services/exceptionsService';
import { projectService } from '../services/projectService';
import { 
  ExclamationTriangleIcon,
  BugAntIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const Exceptions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [exceptionGroups, setExceptionGroups] = useState<ExceptionGroup[]>([]);
  const [stats, setStats] = useState<ExceptionStats | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState<ExceptionFilters>({
    projectId: searchParams.get('projectId') || '',
    timeRange: (searchParams.get('timeRange') as any) || '30d',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadData();
    loadProjects();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [groupsResponse, statsResponse] = await Promise.all([
        exceptionsService.getExceptionGroups(filters),
        exceptionsService.getExceptionStats({
          projectId: filters.projectId,
          timeRange: filters.timeRange
        })
      ]);

      setExceptionGroups(groupsResponse.groups);
      setPagination(groupsResponse.pagination);
      setStats(statsResponse);

    } catch (err: any) {
      console.error('Error loading exceptions data:', err);
      setError(err.message || 'Failed to load exceptions data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const updateFilters = (newFilters: Partial<ExceptionFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (updatedFilters.projectId) params.set('projectId', updatedFilters.projectId);
    if (updatedFilters.timeRange) params.set('timeRange', updatedFilters.timeRange);
    if (updatedFilters.page && updatedFilters.page > 1) params.set('page', updatedFilters.page.toString());
    
    setSearchParams(params);
  };

  const toggleGroupExpansion = (signature: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(signature)) {
      newExpanded.delete(signature);
    } else {
      newExpanded.add(signature);
    }
    setExpandedGroups(newExpanded);
  };

  const viewGroupDetails = (signature: string) => {
    navigate(`/exceptions/${signature}${filters.projectId ? `?projectId=${filters.projectId}` : ''}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getErrorTypeColor = (errorType: string) => {
    const colors: Record<string, string> = {
      'AssertionError': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'TimeoutError': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'ElementNotFound': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'NetworkError': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'TypeError': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Error': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    return colors[errorType] || colors['Error'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading exceptions
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <BugAntIcon className="h-8 w-8 text-red-500 mr-3" />
          Exceptions Analysis
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Group and analyze test failures by exception patterns to identify root causes
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <BugAntIcon className="h-5 w-5 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Exception Groups</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalGroups}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Occurrences</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalOccurrences}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg per Group</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.avgOccurrencesPerGroup}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Range</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {filters.timeRange === '1d' ? 'Last 24h' : 
                   filters.timeRange === '7d' ? 'Last 7 days' :
                   filters.timeRange === '30d' ? 'Last 30 days' :
                   filters.timeRange === '90d' ? 'Last 90 days' : 'All time'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project
              </label>
              <select
                value={filters.projectId || ''}
                onChange={(e) => updateFilters({ projectId: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => updateFilters({ timeRange: e.target.value as any, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Exception Groups List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Exception Groups ({pagination.total})
          </h2>
        </div>

        {exceptionGroups.length === 0 ? (
          <div className="p-8 text-center">
            <BugAntIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No exceptions found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No failed tests with exceptions in the selected time range.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {exceptionGroups.map((group) => (
              <div key={group.signature} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getErrorTypeColor(group.errorType)}`}>
                        {group.errorType}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {group.occurrenceCount} occurrence{group.occurrenceCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {group.affectedTestsCount} test{group.affectedTestsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {group.representativeError.length > 100 
                        ? `${group.representativeError.substring(0, 100)}...`
                        : group.representativeError
                      }
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>First seen: {formatDate(group.firstSeen)}</span>
                      <span>Last seen: {formatDate(group.lastSeen)}</span>
                      {group.projects.length > 0 && (
                        <span>Projects: {group.projects.slice(0, 2).join(', ')}{group.projects.length > 2 ? ` +${group.projects.length - 2}` : ''}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => viewGroupDetails(group.signature)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details
                      <ChevronRightIcon className="ml-1 h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={() => toggleGroupExpansion(group.signature)}
                      className="inline-flex items-center p-1.5 border border-gray-300 dark:border-gray-600 shadow-sm rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {expandedGroups.has(group.signature) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedGroups.has(group.signature) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Environments
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.environments.map((env) => (
                            <span key={env} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {env}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Frameworks
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.frameworks.map((framework) => (
                            <span key={framework} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {framework}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Test Suites
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.testSuites.slice(0, 3).map((suite) => (
                            <span key={suite} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {suite}
                            </span>
                          ))}
                          {group.testSuites.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{group.testSuites.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} exception groups
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => updateFilters({ page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilters({ page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exceptions;

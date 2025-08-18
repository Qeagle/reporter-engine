import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { SuiteRunDefect, DefectFilters } from '../../services/defectService';
import { defectService } from '../../services/defectService';
import { useProject } from '../../contexts/ProjectContext';

interface SuiteRunTabProps {
  timeWindow: '1h' | '8h' | '1d' | '7' | '30' | '60' | '90' | 'custom';
}

export const SuiteRunTab: React.FC<SuiteRunTabProps> = ({ timeWindow }) => {
  const [suiteRuns, setSuiteRuns] = useState<SuiteRunDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'suiteName' | 'totalCount' | 'applicationDefects'>('totalCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { currentProject } = useProject();

  useEffect(() => {
    if (currentProject) {
      loadSuiteRuns();
    }
  }, [timeWindow, currentProject]);

  const loadSuiteRuns = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const filters: DefectFilters = {
        timeWindow,
        testSearch: searchTerm || undefined
      };
      const data = await defectService.getSuiteRunFailures(parseInt(currentProject.id), filters);
      setSuiteRuns(data);
    } catch (error) {
      console.error('Failed to load suite run defects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (suiteRunKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(suiteRunKey)) {
      newExpanded.delete(suiteRunKey);
    } else {
      newExpanded.add(suiteRunKey);
    }
    setExpandedRows(newExpanded);
  };

  // Filter and sort suite runs
  const filteredSuiteRuns = suiteRuns
    .filter(suiteRun => 
      suiteRun.suiteName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'suiteName':
          comparison = a.suiteName.localeCompare(b.suiteName);
          break;
        case 'totalCount':
          const totalA = Object.values(a.counts).reduce((sum, count) => sum + count, 0);
          const totalB = Object.values(b.counts).reduce((sum, count) => sum + count, 0);
          comparison = totalA - totalB;
          break;
        case 'applicationDefects':
          const appA = a.counts['Application Defect'] || 0;
          const appB = b.counts['Application Defect'] || 0;
          comparison = appA - appB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getTotalCount = (counts: { [className: string]: number }) => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search test suites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'suiteName' | 'totalCount' | 'applicationDefects')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
          >
            <option value="totalCount">Sort by Total Count</option>
            <option value="suiteName">Sort by Suite Name</option>
            <option value="applicationDefects">Sort by App Defects</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Suite/Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Failures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  App Defects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Test Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Script Errors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Top Sub-Classes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuiteRuns.map((suiteRun) => {
                const suiteRunKey = `${suiteRun.suiteName}-${suiteRun.runId}`;
                const isExpanded = expandedRows.has(suiteRunKey);
                const totalCount = getTotalCount(suiteRun.counts);
                
                return (
                  <React.Fragment key={suiteRunKey}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRowExpansion(suiteRunKey)}
                            className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {suiteRun.suiteName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              <PlayIcon className="w-4 h-4 mr-1" />
                              Run #{suiteRun.runId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {totalCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {suiteRun.counts['Application Defect'] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          {suiteRun.counts['Test Data Issue'] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {suiteRun.counts['Automation Script Error'] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {suiteRun.counts['Environment Issue'] || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {suiteRun.topSubClasses.slice(0, 2).map((subClass, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            >
                              {subClass.subClass} ({subClass.count})
                            </span>
                          ))}
                          {suiteRun.topSubClasses.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{suiteRun.topSubClasses.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleRowExpansion(suiteRunKey)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              All Sub-Classes for {suiteRun.suiteName} - Run #{suiteRun.runId}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {suiteRun.topSubClasses.map((subClass, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {subClass.subClass}
                                  </span>
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {subClass.count} failures
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSuiteRuns.length === 0 && (
          <div className="text-center py-12">
            <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No suite runs found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search terms or time window.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

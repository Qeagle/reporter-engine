import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ExclamationTriangleIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { TestCaseDefect, DefectFilters } from '../../services/defectService';
import { defectService } from '../../services/defectService';
import { useProject } from '../../contexts/ProjectContext';

interface TestCaseTabProps {
  timeWindow: '1h' | '8h' | '1d' | '7' | '30' | '60' | '90' | 'custom';
  onDataChange?: () => void;
}

export const TestCaseTab: React.FC<TestCaseTabProps> = ({ timeWindow, onDataChange }) => {
  const [defects, setDefects] = useState<TestCaseDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'testName' | 'lastSeen' | 'primaryClass'>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { currentProject } = useProject();

  useEffect(() => {
    if (currentProject) {
      loadDefects();
    }
  }, [timeWindow, currentProject]);

  useEffect(() => {
    if (currentProject && searchTerm) {
      const debounceTimer = setTimeout(() => {
        loadDefects();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm]);

  const loadDefects = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const filters: DefectFilters = {
        timeWindow,
        testSearch: searchTerm || undefined
      };
      const data = await defectService.getTestCaseFailures(parseInt(currentProject.id), filters);
      setDefects(data);
    } catch (error) {
      console.error('Failed to load test case defects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReclassify = async (defectId: number, primaryClass: string, subClass?: string) => {
    try {
      await defectService.reclassifyFailure(defectId, primaryClass, subClass || '');
      loadDefects(); // Refresh the data
      onDataChange?.(); // Notify parent to refresh summary
    } catch (error) {
      console.error('Failed to reclassify defect:', error);
    }
  };

  const getClassBadgeColor = (primaryClass: string) => {
    switch (primaryClass) {
      case 'Application Defect':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'Test Data Issue':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'Automation Script Error':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Environment Issue':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'Unknown':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort defects
  const filteredDefects = defects
    .filter(defect => {
      // Search term filter
      const matchesSearch = defect.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defect.suiteName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Classification filter
      const matchesClassFilter = classFilter === 'all' || 
        (classFilter === 'unclassified' && (!defect.primaryClass || defect.primaryClass === '')) ||
        defect.primaryClass === classFilter;
      
      return matchesSearch && matchesClassFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'testName':
          comparison = a.testName.localeCompare(b.testName);
          break;
        case 'lastSeen':
          comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
        case 'primaryClass':
          comparison = (a.primaryClass || '').localeCompare(b.primaryClass || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const classificationOptions = [
    'Application Defect',
    'Test Data Issue', 
    'Automation Script Error',
    'Environment Issue',
    'Unknown'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tests or suites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            <option value="Application Defect">Application Defect</option>
            <option value="Test Data Issue">Test Data Issue</option>
            <option value="Automation Script Error">Automation Script Error</option>
            <option value="Environment Issue">Environment Issue</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    if (sortBy === 'testName') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('testName');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Test Case
                  {sortBy === 'testName' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    if (sortBy === 'primaryClass') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('primaryClass');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Primary Class
                  {sortBy === 'primaryClass' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sub-Class
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    if (sortBy === 'lastSeen') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('lastSeen');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Last Seen
                  {sortBy === 'lastSeen' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDefects.map((defect) => (
                <tr key={defect.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                        <span>{defect.testName}</span>
                        <a 
                          href={`/reports/${defect.runId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Test Report"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {defect.suiteName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {defect.primaryClass ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getClassBadgeColor(defect.primaryClass)}`}>
                        {defect.primaryClass}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        Unclassified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {defect.subClass || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {formatDate(defect.lastSeen)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="relative inline-block text-left">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleReclassify(defect.id, e.target.value);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                                   rounded px-3 py-1 text-sm text-gray-700 dark:text-gray-300 
                                   hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Reclassify</option>
                          {classificationOptions.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="absolute right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDefects.length === 0 && (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No defects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

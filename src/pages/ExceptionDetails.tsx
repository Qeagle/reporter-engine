import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ExceptionGroup,
  exceptionsService 
} from '../services/exceptionsService';
import { 
  ArrowLeftIcon,
  BugAntIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CubeIcon,
  ServerIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ExceptionDetails: React.FC = () => {
  const navigate = useNavigate();
  const { signature } = useParams<{ signature: string }>();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  // State
  const [exceptionGroup, setExceptionGroup] = useState<ExceptionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'tests' | 'timeline' | 'patterns'>('tests');

  useEffect(() => {
    if (signature) {
      loadExceptionDetails();
    }
  }, [signature, projectId]);

  const loadExceptionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const details = await exceptionsService.getExceptionGroupDetails(signature!, projectId || undefined);
      setExceptionGroup(details);

    } catch (err: any) {
      console.error('Error loading exception details:', err);
      setError(err.message || 'Failed to load exception details');
    } finally {
      setLoading(false);
    }
  };

  const toggleTestExpansion = (testId: number) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
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

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'skipped': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const generateTimelineChart = () => {
    if (!exceptionGroup?.timeline) return null;

    const data = {
      labels: exceptionGroup.timeline.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Exception Occurrences',
          data: exceptionGroup.timeline.map(t => t.count),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Exception Timeline'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };

    return <Line data={data} options={options} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !exceptionGroup) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading exception details
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error || 'Exception group not found'}
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
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate('/exceptions')}
            className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Exceptions
          </button>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <BugAntIcon className="h-8 w-8 text-red-500 mr-3" />
              {exceptionGroup.errorType}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-4xl">
              {exceptionGroup.representativeError}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Occurrences</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{exceptionGroup.occurrenceCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <CodeBracketIcon className="h-5 w-5 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Affected Tests</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{exceptionGroup.affectedTestsCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">First Seen</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(exceptionGroup.firstSeen)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Seen</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(exceptionGroup.lastSeen)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tests'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Affected Tests ({exceptionGroup.affectedTestsCount})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'patterns'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Patterns
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tests' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Affected Tests
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {exceptionGroup.affectedTests?.map((test) => (
              <div key={test.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {test.testName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDuration(test.duration)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="flex items-center">
                        <CubeIcon className="h-3 w-3 mr-1" />
                        {test.projectName}
                      </span>
                      <span className="flex items-center">
                        <ServerIcon className="h-3 w-3 mr-1" />
                        {test.environment}
                      </span>
                      <span>Suite: {test.testSuite}</span>
                      <span>Run: {formatDate(test.runStartedAt)}</span>
                    </div>
                    
                    {test.errorMessage && (
                      <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                        {test.errorMessage.length > 200 
                          ? `${test.errorMessage.substring(0, 200)}...`
                          : test.errorMessage
                        }
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={() => toggleTestExpansion(test.id)}
                      className="inline-flex items-center p-1.5 border border-gray-300 dark:border-gray-600 shadow-sm rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {expandedTests.has(test.id) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Stack Trace */}
                {expandedTests.has(test.id) && test.stackTrace && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Stack Trace
                    </h4>
                    <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {test.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Exception Timeline
          </h2>
          {exceptionGroup.timeline && exceptionGroup.timeline.length > 0 ? (
            <div className="h-64">
              {generateTimelineChart()}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No timeline data</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Not enough data points to generate timeline.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'patterns' && exceptionGroup.patterns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Patterns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              By Environment
            </h3>
            <div className="space-y-2">
              {Object.entries(exceptionGroup.patterns.byEnvironment).map(([env, count]) => (
                <div key={env} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{env}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Framework Patterns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              By Framework
            </h3>
            <div className="space-y-2">
              {Object.entries(exceptionGroup.patterns.byFramework).map(([framework, count]) => (
                <div key={framework} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{framework}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Suite Patterns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              By Test Suite
            </h3>
            <div className="space-y-2">
              {Object.entries(exceptionGroup.patterns.byTestSuite).map(([suite, count]) => (
                <div key={suite} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{suite}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Duration Analysis
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Duration</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(exceptionGroup.patterns.avgDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Duration</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(exceptionGroup.patterns.totalDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExceptionDetails;

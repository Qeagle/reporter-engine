import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Bug, Search, Calendar, Play, FileText, GitMerge, ExternalLink, BarChart3, AlertTriangle, CheckCircle, FileX } from 'lucide-react';
import { defectService, DefectSummary, DefectFilters } from '../services/defectService';
import { TestCaseTab } from '../components/DefectTabs/TestCaseTab';
import { SuiteRunTab } from '../components/DefectTabs/SuiteRunTab';
import { GroupsTab } from '../components/DefectTabs/GroupsTab';
import toast from 'react-hot-toast';

const FailureAnalysis: React.FC = () => {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'tests' | 'suites' | 'groups'>('tests');
  const [summary, setSummary] = useState<DefectSummary>({
    totalFailures: 0,
    classifiedPercent: 0,
    unclassified: 0,
    duplicateGroups: 0,
    automationErrors: 0,
    dataIssues: 0,
    environmentIssues: 0,
    applicationDefects: 0,
    unknownFailures: 0
  });
  
  const [filters, setFilters] = useState<DefectFilters>({
    timeWindow: '30',
    startDate: '',
    endDate: '',
    selectedRuns: [],
    testSearch: ''
  });

  const [loading, setLoading] = useState(true);
  const [autoClassifying, setAutoClassifying] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadDefectSummary();
    }
  }, [currentProject, filters]);

  const loadDefectSummary = async () => {
    try {
      setLoading(true);
      const summaryData = await defectService.getSummary(parseInt(currentProject!.id), filters);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading defect summary:', error);
      toast.error('Failed to load defect summary');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoClassify = async () => {
    try {
      setAutoClassifying(true);
      await defectService.autoClassify(parseInt(currentProject!.id), filters);
      toast.success('Auto-classification completed');
      loadDefectSummary();
    } catch (error) {
      console.error('Error in auto-classification:', error);
      toast.error('Auto-classification failed');
    } finally {
      setAutoClassifying(false);
    }
  };

  const handleDeepAnalyze = async () => {
    try {
      // await defectService.deepAnalyze(parseInt(currentProject!.id), filters);
      toast.success('Deep analysis feature coming soon');
      loadDefectSummary();
    } catch (error) {
      console.error('Error in deep analysis:', error);
      toast.error('Deep analysis failed');
    }
  };

  const handleDeduplicate = async () => {
    try {
      // await defectService.deduplicate(parseInt(currentProject!.id), filters);
      toast.success('Deduplication feature coming soon');
      loadDefectSummary();
    } catch (error) {
      console.error('Error in deduplication:', error);
      toast.error('Deduplication failed');
    }
  };

  const handlePushToJira = async () => {
    try {
      // await defectService.pushToJira(parseInt(currentProject!.id), filters);
      toast.success('Jira integration feature coming soon');
    } catch (error) {
      console.error('Error pushing to Jira:', error);
      toast.error('Failed to push to Jira');
    }
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Project Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a project to view failure analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bug className="w-8 h-8 text-red-600" />
          <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Failure Analysis
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Analyze and classify test failures intelligently
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Window Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={filters.timeWindow}
              onChange={(e) => setFilters((prev: DefectFilters) => ({ ...prev, timeWindow: e.target.value as DefectFilters['timeWindow'] }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="1h">Last 1 hour</option>
              <option value="8h">Last 8 hours</option>
              <option value="1d">Last 1 day</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filters.timeWindow === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev: DefectFilters) => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev: DefectFilters) => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Test Search */}
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tests..."
              value={filters.testSearch}
              onChange={(e) => setFilters((prev: DefectFilters) => ({ ...prev, testSearch: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={handleAutoClassify}
              disabled={autoClassifying}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {autoClassifying ? 'Classifying...' : 'Auto-Classify'}
            </button>
            
            <button
              onClick={handleDeepAnalyze}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Search className="w-4 h-4 mr-2" />
              Deep Analyze
            </button>
            
            <button
              onClick={handleDeduplicate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Deduplicate
            </button>
            
            <button
              onClick={handlePushToJira}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Push to Jira
            </button>
          </div>
        </div>
      </div>

      {/* Empty State - No Failures */}
      {!loading && summary.totalFailures === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Test Failures Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Great news! This project has no failed test cases in the selected time period.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>Project:</strong> {currentProject.name}<br />
              <strong>Time Period:</strong> {filters.timeWindow === 'custom' 
                ? `${filters.startDate} to ${filters.endDate}` 
                : filters.timeWindow === '1h' ? 'Last 1 hour'
                : filters.timeWindow === '8h' ? 'Last 8 hours'
                : filters.timeWindow === '1d' ? 'Last 1 day'
                : `Last ${filters.timeWindow} days`}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && summary.totalFailures > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Failures
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? '...' : summary.totalFailures.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Classified
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? '...' : `${summary.classifiedPercent}%`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileX className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Unclassified
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? '...' : summary.unclassified.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GitMerge className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Duplicate Groups
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? '...' : summary.duplicateGroups.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classification Breakdown */}
      {!loading && summary.totalFailures > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Failure Classification Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {loading ? '...' : summary.automationErrors.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Automation Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {loading ? '...' : summary.dataIssues.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Data Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {loading ? '...' : summary.environmentIssues.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Environment Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {loading ? '...' : summary.applicationDefects.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Application Defects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {loading ? '...' : summary.unknownFailures.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Unknown</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && summary.totalFailures > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tests'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              By Test Case
            </button>
            <button
              onClick={() => setActiveTab('suites')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suites'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Play className="w-4 h-4 inline mr-2" />
              By Suite/Run
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <GitMerge className="w-4 h-4 inline mr-2" />
              Groups (Deduped)
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'tests' && (
            <TestCaseTab timeWindow={filters.timeWindow} onDataChange={loadDefectSummary} />
          )}

          {activeTab === 'suites' && (
            <SuiteRunTab timeWindow={filters.timeWindow} />
          )}

          {activeTab === 'groups' && (
            <GroupsTab timeWindow={filters.timeWindow} />
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default FailureAnalysis;

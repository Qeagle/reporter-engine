import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Image, FileText, Timer, Monitor, Download, File, Globe } from 'lucide-react';
import TimerGraph from './TimerGraph';
import InlineAIInsights from '../AIInsights/InlineAIInsights';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

interface TestsListProps {
  tests: any[];
  reportId: string;
}

const TestsList: React.FC<TestsListProps> = ({ tests, reportId }) => {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showTimerGraph, setShowTimerGraph] = useState<string | null>(null);
  const [groupByBrowser, setGroupByBrowser] = useState(false);
  const [htmlDropdownOpen, setHtmlDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setHtmlDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Group tests by browser
  const groupTestsByBrowser = (tests: any[]) => {
    const grouped = tests.reduce((acc, test) => {
      const envInfo = getTestEnvironmentInfo(test);
      const browser = envInfo.browser || 'Unknown Browser';
      if (!acc[browser]) {
        acc[browser] = [];
      }
      acc[browser].push(test);
      return acc;
    }, {} as Record<string, any[]>);
    return grouped;
  };

  const groupedTests = groupByBrowser ? groupTestsByBrowser(tests) : { 'All Tests': tests };

  const toggleTestExpansion = (testName: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedTests(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Extract environment information from test data
  const getTestEnvironmentInfo = (test: any) => {
    const envInfo: any = {};
    
    // Direct properties
    if (test.browser) envInfo.browser = test.browser;
    if (test.platform) envInfo.platform = test.platform;
    if (test.viewport) envInfo.viewport = test.viewport;
    
    // From metadata
    if (test.metadata) {
      if (test.metadata.browser && !envInfo.browser) envInfo.browser = test.metadata.browser;
      if (test.metadata.browserName && !envInfo.browser) envInfo.browser = test.metadata.browserName;
      if (test.metadata.platform && !envInfo.platform) envInfo.platform = test.metadata.platform;
      if (test.metadata.os && !envInfo.platform) envInfo.platform = test.metadata.os;
      if (test.metadata.viewport && !envInfo.viewport) envInfo.viewport = test.metadata.viewport;
      if (test.metadata.userAgent) envInfo.userAgent = test.metadata.userAgent;
    }
    
    // From config
    if (test.config) {
      if (test.config.browser && !envInfo.browser) envInfo.browser = test.config.browser;
      if (test.config.browserName && !envInfo.browser) envInfo.browser = test.config.browserName;
      if (test.config.platform && !envInfo.platform) envInfo.platform = test.config.platform;
      if (test.config.viewport && !envInfo.viewport) envInfo.viewport = test.config.viewport;
    }
    
    // Extract from test name or title if not found
    if (!envInfo.browser) {
      const browserPatterns = [
        { pattern: /\[chromium\]|\bchromium\b/i, browser: 'Chromium' },
        { pattern: /\[chrome\]|\bchrome\b/i, browser: 'Chrome' },
        { pattern: /\[firefox\]|\bfirefox\b/i, browser: 'Firefox' },
        { pattern: /\[webkit\]|\bwebkit\b|\bsafari\b/i, browser: 'WebKit' },
        { pattern: /\[edge\]|\bedge\b|\bmsedge\b/i, browser: 'Edge' }
      ];
      
      const testText = `${test.name} ${test.title || ''}`.toLowerCase();
      for (const { pattern, browser } of browserPatterns) {
        if (pattern.test(testText)) {
          envInfo.browser = browser;
          break;
        }
      }
    }
    
    // Add test timing info
    if (test.startTime) envInfo.startTime = test.startTime;
    if (test.endTime) envInfo.endTime = test.endTime;
    if (test.retries !== undefined) envInfo.retries = test.retries;
    
    return envInfo;
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = (milliseconds / 1000).toFixed(2);
    return `${seconds}s`;
  };

  // Export functions for individual test cases
  const exportTestAsPDF = async (testCase: any) => {
    try {
      toast.loading('Generating PDF for test case...', { id: 'test-pdf-export' });
      await reportService.exportTestCaseToPDF(reportId, testCase.id || testCase.name);
      toast.success('Test case PDF downloaded successfully!', { id: 'test-pdf-export' });
    } catch (error: any) {
      console.error('Test case PDF export failed:', error);
      toast.error(error.message || 'Failed to export test case as PDF', { id: 'test-pdf-export' });
    }
  };

  const exportTestAsJSON = async (testCase: any) => {
    try {
      toast.loading('Generating JSON for test case...', { id: 'test-json-export' });
      await reportService.exportTestCaseToJSON(reportId, testCase.id || testCase.name);
      toast.success('Test case JSON downloaded successfully!', { id: 'test-json-export' });
    } catch (error: any) {
      console.error('Test case JSON export failed:', error);
      toast.error(error.message || 'Failed to export test case as JSON', { id: 'test-json-export' });
    }
  };

  const exportTestAsHTML = async (testCase: any, includeArtifacts: boolean = true) => {
    try {
      const exportType = includeArtifacts ? 'with artifacts' : 'lite';
      toast.loading(`Generating HTML for test case (${exportType})...`, { id: 'test-html-export' });
      await reportService.exportTestCaseToHTML(reportId, testCase.id || testCase.name, includeArtifacts);
      toast.success(`Test case HTML (${exportType}) downloaded successfully!`, { id: 'test-html-export' });
    } catch (error: any) {
      console.error('Test case HTML export failed:', error);
      toast.error(error.message || 'Failed to export test case as HTML', { id: 'test-html-export' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(groupedTests).map(([browserGroup, browserTests]) => (
          <div key={browserGroup}>
            {groupByBrowser && browserGroup !== 'All Tests' && (
              <div className="mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  <span>{browserGroup}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({(browserTests as any[]).length} tests)</span>
                </h3>
              </div>
            )}
            
            {(browserTests as any[]).map((test: any, index: number) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={() => toggleTestExpansion(test.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {expandedTests.has(test.name) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {getStatusIcon(test.status)}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {test.name}
                  </h3>
                  {test.errorMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {test.errorMessage}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {test.duration ? formatDuration(test.duration) : 'N/A'}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(test.status)}`}>
                  {test.status}
                </span>
              </div>
            </div>
          </div>

          {expandedTests.has(test.name) && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700">
              {/* Export buttons for individual test case */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Test Case Actions
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTestAsPDF(test);
                    }}
                    className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    title="Export this test case as PDF"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    PDF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTestAsJSON(test);
                    }}
                    className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    title="Export this test case as JSON"
                  >
                    <File className="w-3 h-3 mr-1" />
                    JSON
                  </button>
                  
                  {/* HTML Export Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHtmlDropdownOpen(htmlDropdownOpen === test.name ? null : test.name);
                      }}
                      className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                      title="Export this test case as HTML"
                    >
                      <Globe className="w-3 h-3 mr-1" />
                      HTML
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                    
                    {htmlDropdownOpen === test.name && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-[160px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTestAsHTML(test, false);
                            setHtmlDropdownOpen(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Globe className="w-3 h-3 mr-2" />
                          Lite Export
                          <div className="ml-auto text-xs text-gray-500">HTML only</div>
                        </button>
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (test.artifacts?.length > 0) {
                                exportTestAsHTML(test, true);
                                setHtmlDropdownOpen(null);
                              }
                            }}
                            disabled={!test.artifacts || test.artifacts.length === 0}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center border-t border-gray-200 dark:border-gray-700 ${
                              !test.artifacts || test.artifacts.length === 0
                                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-700'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Download className={`w-3 h-3 mr-2 ${
                              !test.artifacts || test.artifacts.length === 0
                                ? 'text-gray-400 dark:text-gray-500'
                                : ''
                            }`} />
                            Full Export
                            <div className={`ml-auto text-xs ${
                              !test.artifacts || test.artifacts.length === 0
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-500'
                            }`}>
                              {!test.artifacts || test.artifacts.length === 0 
                                ? 'No artifacts' 
                                : 'With artifacts'
                              }
                            </div>
                          </button>
                          {/* Custom tooltip for disabled button */}
                          {(!test.artifacts || test.artifacts.length === 0) && (
                            <div className="absolute left-full top-0 ml-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              No artifacts available for this test case
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-800 dark:border-r-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Test Environment */}
              {(() => {
                const envInfo = getTestEnvironmentInfo(test);
                const hasEnvInfo = Object.keys(envInfo).length > 0;
                
                return hasEnvInfo && (
                  <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Test Environment
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      {envInfo.browser && (
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">Browser:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{envInfo.browser}</span>
                        </div>
                      )}
                      {envInfo.platform && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{envInfo.platform}</span>
                        </div>
                      )}
                      {envInfo.viewport && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-gray-400">Viewport:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{envInfo.viewport}</span>
                        </div>
                      )}
                      {envInfo.retries !== undefined && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-gray-400">Retries:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{envInfo.retries}</span>
                        </div>
                      )}
                      {envInfo.startTime && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600 dark:text-gray-400">Started:</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {new Date(envInfo.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {envInfo.userAgent && (
                        <div className="flex items-start space-x-2 md:col-span-2 lg:col-span-3">
                          <span className="text-gray-600 dark:text-gray-400 mt-0.5">User Agent:</span>
                          <span className="text-gray-900 dark:text-white font-medium text-xs break-all">
                            {envInfo.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* Test Steps */}
              {test.steps && test.steps.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Test Steps ({test.steps.length})
                  </h4>
                  <div className="space-y-2">
                    {test.steps.map((step: any, stepIndex: number) => (
                      <div key={stepIndex} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(step.status)}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {step.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {step.duration ? formatDuration(step.duration) : '0s'}
                          </span>
                          <span className={`px-1 py-0.5 text-xs rounded ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {(test.artifacts?.length > 0 || test.steps?.length > 0) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Artifacts {test.artifacts ? `(${test.artifacts.length})` : ''}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {test.artifacts?.map((artifact: any, artifactIndex: number) => (
                      <a
                        key={artifactIndex}
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        {artifact.type === 'screenshot' ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-xs text-gray-900 dark:text-white truncate">
                          {artifact.filename}
                        </span>
                      </a>
                    ))}
                    {test.artifacts?.some((a: any) => a.filename.endsWith('trace.zip')) && test.steps?.length > 0 && (
                      <button
                        onClick={() => setShowTimerGraph(test.name)}
                        className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="View Execution Timeline"
                      >
                        <Timer className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-900 dark:text-white">Timeline</span>
                      </button>
                    )}
                    {test.steps?.length > 0 && !test.artifacts?.some((a: any) => a.filename.endsWith('trace.zip')) && (
                      <button
                        onClick={() => setShowTimerGraph(test.name)}
                        className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="View Execution Timeline"
                      >
                        <Timer className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-900 dark:text-white">Timeline</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Timer Graph Modal */}
              {showTimerGraph === test.name && test.steps && (
                <TimerGraph
                  steps={test.steps}
                  onClose={() => setShowTimerGraph(null)}
                />
              )}

              {/* AI Insights for Failed Tests */}
              {(test.status === 'failed' || test.status === 'error') && test.errorMessage && (
                <div className="mb-4">
                  <InlineAIInsights
                    testName={test.name}
                    errorMessage={test.errorMessage}
                    onViewFullAnalysis={() => {
                      // Optional: Can navigate to full AI analysis
                      console.log('View full analysis for test:', test.name);
                    }}
                  />
                </div>
              )}

              {/* Error Details */}
              {test.stackTrace && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Stack Trace
                  </h4>
                  <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 p-3 rounded overflow-x-auto">
                    {test.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
        </div>
      ))}

      {tests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No test results available.
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

export default TestsList;
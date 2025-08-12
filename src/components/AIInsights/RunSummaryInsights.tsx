import React, { useState, useEffect } from 'react';
import { Brain, TrendingDown, AlertCircle, Target, ChevronRight } from 'lucide-react';

interface TestPattern {
  pattern: string;
  count: number;
  percentage: number;
  category: 'timing' | 'locator' | 'network' | 'data' | 'environment';
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface RunSummaryInsightsProps {
  reportId: string;
  totalTests: number;
  failedTests: number;
  onViewFullAnalysis?: () => void;
}

const RunSummaryInsights: React.FC<RunSummaryInsightsProps> = ({
  reportId,
  totalTests,
  failedTests,
  onViewFullAnalysis
}) => {
  const [patterns, setPatterns] = useState<TestPattern[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (failedTests > 0) {
      generateRunSummary();
    }
  }, [reportId, failedTests]);

  const generateRunSummary = async () => {
    setLoading(true);
    
    try {
      // For now, simulate pattern analysis - will connect to AI service later
      const mockPatterns: TestPattern[] = [
        {
          pattern: 'Element locator timeouts',
          count: Math.ceil(failedTests * 0.4),
          percentage: 40,
          category: 'locator' as const,
          impact: 'high' as const,
          recommendation: 'Update selectors to use stable data-testid attributes'
        },
        {
          pattern: 'Network request failures',
          count: Math.ceil(failedTests * 0.3),
          percentage: 30,
          category: 'network' as const,
          impact: 'medium' as const,
          recommendation: 'Add retry logic and network error handling'
        },
        {
          pattern: 'Data setup issues',
          count: Math.ceil(failedTests * 0.2),
          percentage: 20,
          category: 'data' as const,
          impact: 'medium' as const,
          recommendation: 'Implement robust test data management'
        }
      ].filter(p => p.count > 0);
      
      setPatterns(mockPatterns);
    } catch (error) {
      console.error('Error generating run summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'timing':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case 'locator':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case 'network':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case 'data':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <TrendingDown className="w-4 h-4 text-yellow-500" />;
      default:
        return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  if (failedTests === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              All Tests Passed! 🎉
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              No failure patterns detected in this run.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center">
          <Brain className="w-5 h-5 text-blue-600 mr-2 animate-pulse" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Analyzing failure patterns across {failedTests} failed tests...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200 dark:border-red-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <Brain className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Top Failure Patterns
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {failedTests} of {totalTests} tests failed
        </span>
      </div>

      <div className="space-y-3">
        {patterns.slice(0, 3).map((pattern, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getImpactIcon(pattern.impact)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {pattern.pattern}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(pattern.category)}`}>
                    {pattern.category}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {pattern.count} tests ({pattern.percentage}%)
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {pattern.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>

      {onViewFullAnalysis && (
        <button
          onClick={onViewFullAnalysis}
          className="mt-3 w-full inline-flex items-center justify-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-md px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          View Detailed AI Analysis
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      )}
    </div>
  );
};

export default RunSummaryInsights;

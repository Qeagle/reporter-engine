import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';

interface InlineAIInsightsProps {
  testName: string;
  errorMessage: string;
  reportId?: string;
  onViewFullAnalysis?: () => void;
}

interface TestInsight {
  suggestion: string;
  confidence: number;
  category: 'timing' | 'locator' | 'network' | 'data' | 'environment';
  actionable: boolean;
}

const InlineAIInsights: React.FC<InlineAIInsightsProps> = ({
  testName,
  errorMessage,
  onViewFullAnalysis
}) => {
  const [insights, setInsights] = useState<TestInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateQuickInsights();
  }, [testName, errorMessage]);

  const generateQuickInsights = () => {
    setLoading(true);
    
    // Quick pattern-based analysis for immediate feedback
    const quickInsights: TestInsight[] = [];
    const error = errorMessage?.toLowerCase() || '';
    
    if (error.includes('timeout') || error.includes('wait')) {
      quickInsights.push({
        suggestion: 'Consider increasing wait timeouts or adding explicit waits',
        confidence: 85,
        category: 'timing',
        actionable: true
      });
    }
    
    if (error.includes('not found') || error.includes('locator') || error.includes('selector')) {
      quickInsights.push({
        suggestion: 'Element selector may be unstable - use data-testid attributes',
        confidence: 90,
        category: 'locator',
        actionable: true
      });
    }
    
    if (error.includes('network') || error.includes('request') || error.includes('connection')) {
      quickInsights.push({
        suggestion: 'Network connectivity issue - check API endpoints and retry logic',
        confidence: 88,
        category: 'network',
        actionable: true
      });
    }
    
    if (error.includes('permission') || error.includes('unauthorized') || error.includes('access')) {
      quickInsights.push({
        suggestion: 'Authentication or permission issue - verify user credentials',
        confidence: 92,
        category: 'environment',
        actionable: true
      });
    }
    
    if (error.includes('data') || error.includes('invalid') || error.includes('missing')) {
      quickInsights.push({
        suggestion: 'Data-related issue - check test data setup and application state',
        confidence: 75,
        category: 'data',
        actionable: true
      });
    }
    
    // If no specific patterns found, provide generic insight
    if (quickInsights.length === 0) {
      quickInsights.push({
        suggestion: 'Run full AI analysis for detailed root-cause investigation',
        confidence: 60,
        category: 'environment',
        actionable: false
      });
    }
    
    setInsights(quickInsights);
    setLoading(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'timing':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'locator':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'network':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'data':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Brain className="w-4 h-4 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
        <div className="flex items-center">
          <Brain className="w-4 h-4 text-blue-600 mr-2 animate-pulse" />
          <span className="text-sm text-blue-700 dark:text-blue-300">Analyzing failure pattern...</span>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
      <div className="flex items-start space-x-3">
        <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            AI Insight
            {insights[0] && (
              <span className={`ml-2 text-xs ${getConfidenceColor(insights[0].confidence)}`}>
                {insights[0].confidence}% confidence
              </span>
            )}
          </h4>
          
          <div className="space-y-2">
            {insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                {getCategoryIcon(insight.category)}
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{insight.suggestion}</p>
                  {insight.actionable && (
                    <div className="flex items-center mt-1">
                      <Lightbulb className="w-3 h-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-yellow-700 dark:text-yellow-300">Actionable</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {insights.length > 2 && (
            <button
              onClick={onViewFullAnalysis}
              className="mt-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View full analysis ({insights.length - 2} more insights)
              <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineAIInsights;

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Lightbulb,
  Users,
  Clock,
  Target,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AIInsightsProps {
  reportId: string;
}

interface Cluster {
  id: string;
  testCount: number;
  tests: Array<{
    name: string;
    error: string;
    duration: number;
  }>;
  rootCause: string;
  confidence: number;
  recommendations: string[];
  llmEnhanced?: boolean;
  technicalAnalysis?: string;
  patterns: {
    errors: string[];
    browsers: Record<string, number>;
    timing: {
      avgDuration: number;
      longTests: number;
      hasTimingIssues: boolean;
    };
    elements: {
      elementErrors: number;
      hasElementIssues: boolean;
    };
  };
  metadata: {
    avgDuration: number;
    browsers: string[];
    environments: string[];
  };
}

interface AIAnalysis {
  reportId: string;
  clusters: Cluster[];
  insights: {
    summary: string;
    topPatterns: Array<{
      pattern: string;
      testCount: number;
      confidence: number;
    }>;
    confidence: number;
    recommendations: string[];
    totalFailedTests: number;
    clusterCount: number;
  };
  timestamp: string;
  error?: string;
}

const AIInsights: React.FC<AIInsightsProps> = ({ reportId }) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  useEffect(() => {
    loadExistingAnalysis();
  }, [reportId]);

  const loadExistingAnalysis = async () => {
    try {
      const response = await fetch(`/api/ai/reports/${reportId}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
      }
    } catch (error) {
      console.log('No existing analysis found');
    }
  };

  const runAnalysis = async (background = false) => {
    setLoading(true);
    
    try {
      const endpoint = background 
        ? `/api/ai/reports/${reportId}/analyze/background`
        : `/api/ai/reports/${reportId}/analyze`;
      
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        if (background) {
          toast.success('AI analysis started in background');
        } else {
          setAnalysis(data.data);
          toast.success('AI analysis completed');
        }
      } else {
        toast.error('Analysis failed: ' + data.error);
      }
    } catch (error) {
      toast.error('Failed to run analysis');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getClusterIcon = (cluster: Cluster) => {
    if (cluster.rootCause.toLowerCase().includes('timeout')) {
      return <Clock className="w-5 h-5 text-orange-500" />;
    }
    if (cluster.rootCause.toLowerCase().includes('locator') || cluster.rootCause.toLowerCase().includes('element')) {
      return <Target className="w-5 h-5 text-blue-500" />;
    }
    if (cluster.rootCause.toLowerCase().includes('network')) {
      return <TrendingUp className="w-5 h-5 text-purple-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  if (!analysis && !loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI-Powered Failure Analysis
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get intelligent insights into test failures with root-cause analysis and clustering.
            <br />
            <span className="text-green-600 dark:text-green-400 font-medium">✨ Enhanced with Groq LLM for deeper analysis</span>
          </p>
          <div className="space-x-4">
            <button
              onClick={() => runAnalysis(false)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Brain className="w-4 h-4 mr-2" />
              {loading ? 'Analyzing...' : 'Analyze Failures'}
            </button>
            <button
              onClick={() => runAnalysis(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run in Background
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Running AI analysis...</span>
        </div>
      </div>
    );
  }

  if (analysis?.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analysis Failed
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{analysis.error}</p>
          <button
            onClick={() => runAnalysis(false)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Overall Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            AI Insights Summary
          </h3>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(analysis.insights.confidence)}`}>
              {analysis.insights.confidence}% Confidence
            </span>
            <button
              onClick={() => runAnalysis(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh Analysis"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Failed Tests</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{analysis.insights.totalFailedTests}</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Clusters Found</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{analysis.insights.clusterCount}</div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{analysis.insights.confidence}%</div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">{analysis.insights.summary}</p>
        </div>

        {/* Top Recommendations */}
        {analysis.insights.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
              Key Recommendations
            </h4>
            <ul className="space-y-2">
              {analysis.insights.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Failure Clusters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-purple-600" />
          Failure Clusters ({analysis.clusters.length})
        </h3>

        <div className="space-y-4">
          {analysis.clusters.map((cluster, index) => (
            <div key={cluster.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
              <button
                onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getClusterIcon(cluster)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                        Cluster #{index + 1}: {cluster.rootCause}
                        {cluster.llmEnhanced && (
                          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full font-medium">
                            ✨ LLM Enhanced
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {cluster.testCount} test{cluster.testCount > 1 ? 's' : ''} • {cluster.metadata.browsers.join(', ')}
                        {cluster.llmEnhanced && (
                          <span className="text-purple-600 dark:text-purple-400 ml-2">• AI Analyzed</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(cluster.confidence)}`}>
                      {cluster.confidence}%
                    </span>
                    {expandedCluster === cluster.id ? 
                      <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>
              </button>

              {expandedCluster === cluster.id && (
                <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Affected Tests */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Affected Tests</h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cluster.tests.map((test, testIndex) => (
                          <div key={testIndex} className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                            <div className="font-medium text-gray-900 dark:text-white truncate" title={test.name}>
                              {test.name}
                            </div>
                            <div className="text-red-600 dark:text-red-400 text-xs mt-1 truncate" title={test.error}>
                              {test.error}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              Duration: {Math.round(test.duration / 1000)}s
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Recommendations</h5>
                      <ul className="space-y-2">
                        {cluster.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{rec}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Pattern Analysis */}
                      <div className="mt-4">
                        <h6 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Pattern Analysis</h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <div className="text-gray-500">Avg Duration</div>
                            <div className="font-medium">{Math.round(cluster.metadata.avgDuration / 1000)}s</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <div className="text-gray-500">Environments</div>
                            <div className="font-medium">{cluster.metadata.environments.join(', ')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Analysis (LLM Enhanced) */}
                      {cluster.technicalAnalysis && (
                        <div className="mt-4">
                          <h6 className="font-medium text-gray-900 dark:text-white mb-2 text-sm flex items-center">
                            <Brain className="w-4 h-4 mr-1 text-purple-500" />
                            AI Technical Analysis
                          </h6>
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-3 rounded border-l-4 border-purple-500">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{cluster.technicalAnalysis}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Metadata */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Analysis completed at {new Date(analysis.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default AIInsights;

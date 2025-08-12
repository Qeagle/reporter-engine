import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface ReportMetricsProps {
  metrics: any;
}

const ReportMetrics: React.FC<ReportMetricsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No metrics data available.
        </p>
      </div>
    );
  }

  const passFailData = {
    labels: ['Passed', 'Failed', 'Skipped'],
    datasets: [{
      data: [
        metrics.summary.passed,
        metrics.summary.failed,
        metrics.summary.skipped
      ],
      backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
    }]
  };

  const durationData = {
    labels: metrics.testDurations?.slice(0, 3).map((test: any) => test.name) || [],
    datasets: [{
      label: 'Duration (ms)',
      data: metrics.testDurations?.slice(0, 3).map((test: any) => test.duration) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgb(107, 114, 128)'
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: 'rgb(107, 114, 128)'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgb(107, 114, 128)'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Total Tests
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {metrics.summary.total}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Pass Rate
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {metrics.summary.passRate || 0}%
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Avg Duration
          </h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {((metrics.summary.duration || 0) / (metrics.summary.total || 1) / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Test Results Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={passFailData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Test Duration (Top 3)
          </h3>
          <div className="h-64">
            <Bar data={durationData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Failure Reasons */}
      {metrics.failureReasons && metrics.failureReasons.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Common Failure Reasons
          </h3>
          <div className="space-y-3">
            {metrics.failureReasons.map((reason: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                <span className="text-sm text-gray-900 dark:text-white">
                  {reason.reason}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {reason.count} occurrences
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs rounded">
                    {reason.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Info */}
      {metrics.environmentInfo && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Test Run Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Environment:</span>
              <p className="text-sm text-gray-900 dark:text-white">{metrics.environmentInfo.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Framework:</span>
              <p className="text-sm text-gray-900 dark:text-white">{metrics.environmentInfo.framework}</p>
            </div>
            {metrics.environmentInfo.metadata && Object.keys(metrics.environmentInfo.metadata)
              .filter(key => key !== 'browser') // Exclude browser info from metrics
              .map((key) => (
                <div key={key}>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{key}:</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {String(metrics.environmentInfo.metadata[key])}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Browser Distribution */}
      {metrics.browserStats && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Browser Coverage
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.browserStats).map(([browser, stats]: [string, any]) => (
              <div key={browser} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {browser.charAt(0).toUpperCase() + browser.slice(1)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">{stats.passed} passed</span>
                  <span className="text-red-600 dark:text-red-400">{stats.failed} failed</span>
                  <span className="text-gray-500 dark:text-gray-400">{stats.total} total</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded">
                    {stats.passRate}% pass rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportMetrics;
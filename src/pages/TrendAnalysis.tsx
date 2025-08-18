import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Filter, TrendingUp, TrendingDown, Activity, Clock, BarChart3 } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import trendService, { TrendData, TrendFilters, FilterOptions } from '../services/trendService';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TrendAnalysis: React.FC = () => {
  const { currentProject } = useProject();
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TrendFilters>({
    timeRange: '30d',
    groupBy: 'day',
    projectId: currentProject ? parseInt(currentProject.id) : undefined
  });

  useEffect(() => {
    if (currentProject) {
      setFilters(prev => ({ ...prev, projectId: parseInt(currentProject.id) }));
    }
  }, [currentProject]);

  useEffect(() => {
    loadTrendData();
    loadFilterOptions();
  }, [filters]);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      const data = await trendService.getTrendData(filters);
      setTrendData(data);
    } catch (error) {
      console.error('Error loading trend data:', error);
      toast.error('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const options = await trendService.getFilterOptions(filters.projectId);
      setFilterOptions(options);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof TrendFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getPassFailChartData = () => {
    if (!trendData) return null;

    const labels = trendData.runTrends.map(point => {
      const date = new Date(point.date);
      return filters.groupBy === 'day' 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : filters.groupBy === 'week'
        ? `Week ${date.getWeek()}`
        : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Passed Runs',
          data: trendData.runTrends.map(point => point.passed_runs),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Failed Runs',
          data: trendData.runTrends.map(point => point.failed_runs),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Flaky Runs',
          data: trendData.runTrends.map(point => point.flaky_runs),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.1,
        }
      ]
    };
  };

  const getPassRateChartData = () => {
    if (!trendData) return null;

    const labels = trendData.runTrends.map(point => {
      const date = new Date(point.date);
      return filters.groupBy === 'day' 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : filters.groupBy === 'week'
        ? `Week ${date.getWeek()}`
        : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const passRates = trendData.runTrends.map(point => {
      const total = point.total_runs;
      return total > 0 ? ((point.passed_runs / total) * 100) : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Pass Rate (%)',
          data: passRates,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.1,
        }
      ]
    };
  };

  const getDurationChartData = () => {
    if (!trendData) return null;

    const labels = trendData.runTrends.map(point => {
      const date = new Date(point.date);
      return filters.groupBy === 'day' 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : filters.groupBy === 'week'
        ? `Week ${date.getWeek()}`
        : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Average Duration (minutes)',
          data: trendData.runTrends.map(point => Math.round(point.avg_duration_minutes || 0)),
          backgroundColor: 'rgba(168, 85, 247, 0.6)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time Period'
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const passRateOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        max: 100,
        title: {
          display: true,
          text: 'Pass Rate (%)'
        }
      }
    }
  };

  const durationOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        title: {
          display: true,
          text: 'Duration (minutes)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trend Analysis
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Historical analysis of test execution trends and patterns
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group By
            </label>
            <select
              value={filters.groupBy}
              onChange={(e) => handleFilterChange('groupBy', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>

          {filterOptions && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Suite
                </label>
                <select
                  value={filters.testSuite || ''}
                  onChange={(e) => handleFilterChange('testSuite', e.target.value || undefined)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Suites</option>
                  {filterOptions.testSuites.map(suite => (
                    <option key={suite} value={suite}>{suite}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment
                </label>
                <select
                  value={filters.environment || ''}
                  onChange={(e) => handleFilterChange('environment', e.target.value || undefined)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Environments</option>
                  {filterOptions.environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {trendData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Runs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trendData.summary.total_runs}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trendData.summary.pass_rate?.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(trendData.summary.avg_duration_minutes || 0)}m
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Runs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trendData.summary.total_failed_runs}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass/Fail Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pass/Fail Trends</h3>
          <div className="h-80">
            {getPassFailChartData() && (
              <Line data={getPassFailChartData()!} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Pass Rate Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pass Rate Trend</h3>
          <div className="h-80">
            {getPassRateChartData() && (
              <Line data={getPassRateChartData()!} options={passRateOptions} />
            )}
          </div>
        </div>

        {/* Duration Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Duration Trend</h3>
          <div className="h-80">
            {getDurationChartData() && (
              <Bar data={getDurationChartData()!} options={durationOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export default TrendAnalysis;

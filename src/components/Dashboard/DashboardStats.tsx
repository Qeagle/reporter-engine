import React from 'react';
import { Activity, CheckCircle, Clock, Play } from 'lucide-react';

interface StatsProps {
  stats: {
    totalReports: number;
    totalTests: number;
    passRate: number;
    avgDuration: number;
  };
}

const DashboardStats: React.FC<StatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Test Reports',
      value: stats.totalReports.toLocaleString(),
      icon: Play,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900'
    },
    {
      label: 'Total Tests Executed',
      value: stats.totalTests.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      label: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900'
    },
    {
      label: 'Avg Duration',
      value: `${(stats.avgDuration / 1000).toFixed(1)}s`,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {item.label}
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
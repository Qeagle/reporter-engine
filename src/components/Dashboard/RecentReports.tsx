import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RecentReportsProps {
  reports: any[];
}

const RecentReports: React.FC<RecentReportsProps> = ({ reports }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Recent Reports
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {reports.slice(0, 10).map((report) => (
          <Link
            key={report.id}
            to={`/reports/${report.id}`}
            className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(report.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.testSuite}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {report.environment} • {report.framework}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.summary.passed}/{report.summary.total}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {report.summary.passRate || 0}% pass
                  </p>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {reports.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No reports found. Run your first test to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentReports;
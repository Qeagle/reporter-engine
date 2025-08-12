import React from 'react';
import { Calendar, Clock, Tag, Monitor, User } from 'lucide-react';

interface ReportSummaryProps {
  report: any;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ report }) => {
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
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

  // Get unique authors from tests
  const getUniqueAuthors = (): string[] => {
    if (!report.tests) return [];
    const authors: string[] = report.tests
      .map((test: any) => test.author || test.metadata?.author)
      .filter((author: any): author is string => typeof author === 'string' && author !== 'Unknown');
    return [...new Set(authors)];
  };

  const uniqueAuthors = getUniqueAuthors();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {report.summary.passed}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Passed</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {report.summary.failed}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {report.summary.skipped}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Skipped</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {report.summary.passRate || 0}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Pass Rate</div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Started: {new Date(report.startTime).toLocaleString()}</span>
            </div>
            
            {report.endTime && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Completed: {new Date(report.endTime).toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              <span>Duration: {report.summary.duration ? formatDuration(report.summary.duration) : 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Monitor className="w-4 h-4 mr-2" />
              <span>Environment: {report.environment}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Tag className="w-4 h-4 mr-2" />
              <span>Framework: {report.framework}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Status:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                {report.status}
              </span>
            </div>
          </div>
        </div>

        {/* Authors Section */}
        {uniqueAuthors.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Test Authors:</span>
              <div className="flex flex-wrap gap-1">
                {uniqueAuthors.map((author: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-300 text-xs rounded-md"
                  >
                    {author}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {report.tags && report.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {report.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSummary;
import React, { useState, useEffect } from 'react';
import { X, Filter, User, CheckCircle, XCircle, Clock, Tag } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  reports: any[];
}

export interface FilterOptions {
  status: string[];
  environment: string[];
  framework: string[];
  authorText: string; // Regex text search for authors
  dateRange: {
    start: string;
    end: string;
  };
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  reports
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  if (!isOpen) return null;

  // Extract unique values from reports
  const getUniqueValues = (key: string) => {
    const values = new Set<string>();
    reports.forEach(report => {
      if (key === 'author') {
        // Extract authors from tests within each report
        if (report.tests) {
          report.tests.forEach((test: any) => {
            const author = test.author || test.metadata?.author;
            if (author && author !== 'Unknown') {
              values.add(author);
            }
          });
        }
      } else {
        if (report[key]) {
          values.add(report[key]);
        }
      }
    });
    return Array.from(values).sort();
  };

  const statuses = getUniqueValues('status');
  const environments = getUniqueValues('environment');
  const frameworks = getUniqueValues('framework');

  const handleFilterChange = (category: keyof FilterOptions, value: string) => {
    if (category === 'dateRange') return;
    
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    setFilters({
      ...filters,
      [category]: newValues
    });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilters({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    });
  };

  const handleReset = () => {
    setFilters({
      status: [],
      environment: [],
      framework: [],
      authorText: '',
      dateRange: { start: '', end: '' }
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const FilterSection = ({ title, icon, options, category }: {
    title: string;
    icon: React.ReactNode;
    options: string[];
    category: keyof FilterOptions;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {icon}
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {options.map(option => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(filters[category] as string[]).includes(option)}
              onChange={() => handleFilterChange(category, option)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              {category === 'status' && getStatusIcon(option)}
              <span className="capitalize">{option}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filter Reports</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FilterSection
              title="Status"
              icon={<CheckCircle className="w-4 h-4 text-gray-500" />}
              options={statuses}
              category="status"
            />

            <FilterSection
              title="Environment"
              icon={<Tag className="w-4 h-4 text-gray-500" />}
              options={environments}
              category="environment"
            />

            <FilterSection
              title="Framework"
              icon={<Tag className="w-4 h-4 text-gray-500" />}
              options={frameworks}
              category="framework"
            />

            {/* Author Name Filter with Regex Support */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Author Name Filter (Regex)
                </h3>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Enter author name or regex pattern (e.g., hari | shan)"
                  value={filters.authorText}
                  onChange={(e) => setFilters({ ...filters, authorText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports regex patterns. Use | for OR (e.g., "hari | shan"), .* for wildcards. Spaces around | are automatically handled.
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Date Range</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Reset Filters
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
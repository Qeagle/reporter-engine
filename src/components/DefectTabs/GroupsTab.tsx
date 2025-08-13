import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { DefectGroup, DefectFilters } from '../../services/defectService';
import { defectService } from '../../services/defectService';
import { useProject } from '../../contexts/ProjectContext';

interface GroupsTabProps {
  timeWindow: '1h' | '8h' | '1d' | '7' | '30' | '60' | '90' | 'custom';
}

export const GroupsTab: React.FC<GroupsTabProps> = ({ timeWindow }) => {
  const [groups, setGroups] = useState<DefectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'occurrenceCount' | 'lastSeen' | 'primaryClass'>('occurrenceCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [classFilter, setClassFilter] = useState<string>('all');
  const { currentProject } = useProject();

  useEffect(() => {
    if (currentProject) {
      loadGroups();
    }
  }, [timeWindow, classFilter, currentProject]);

  const loadGroups = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const filters: DefectFilters = {
        timeWindow,
        testSearch: searchTerm || undefined
      };
      const data = await defectService.getFailureGroups(parseInt(currentProject.id), filters);
      setGroups(data);
    } catch (error) {
      console.error('Failed to load defect groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassBadgeColor = (primaryClass: string) => {
    switch (primaryClass) {
      case 'Application Defect':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'Test Data Issue':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'Automation Script Error':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Environment Issue':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort groups
  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.representativeError.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.subClass.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === 'all' || group.primaryClass === classFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'occurrenceCount':
          comparison = a.occurrenceCount - b.occurrenceCount;
          break;
        case 'lastSeen':
          comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
        case 'primaryClass':
          comparison = a.primaryClass.localeCompare(b.primaryClass);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search error patterns or sub-classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            <option value="Application Defect">Application Defect</option>
            <option value="Test Data Issue">Test Data Issue</option>
            <option value="Automation Script Error">Automation Script Error</option>
            <option value="Environment Issue">Environment Issue</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'occurrenceCount' | 'lastSeen' | 'primaryClass')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
          >
            <option value="occurrenceCount">Sort by Occurrence</option>
            <option value="lastSeen">Sort by Last Seen</option>
            <option value="primaryClass">Sort by Class</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          
          return (
            <div 
              key={group.id}
              className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getClassBadgeColor(group.primaryClass)}`}>
                        {group.primaryClass}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        {group.subClass}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {group.representativeError}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <UsersIcon className="w-4 h-4 mr-1" />
                        {group.occurrenceCount} occurrences
                      </div>
                      <div className="flex items-center">
                        <DocumentTextIcon className="w-4 h-4 mr-1" />
                        {group.memberTests.length} affected tests
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        Last seen: {formatDate(group.lastSeen)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {group.occurrenceCount}
                    </span>
                    <button
                      onClick={() => toggleGroupExpansion(group.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Timeline
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>First seen: {formatDate(group.firstSeen)}</div>
                        <div>Last seen: {formatDate(group.lastSeen)}</div>
                        <div>Signature: <code className="text-xs bg-gray-200 dark:bg-gray-800 px-1 rounded">{group.signatureHash.substring(0, 12)}...</code></div>
                      </div>
                    </div>

                    {/* Affected Tests */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Affected Tests ({group.memberTests.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto">
                        <div className="grid gap-1">
                          {group.memberTests.slice(0, 10).map((testId) => (
                            <div 
                              key={testId}
                              className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border"
                            >
                              Test ID: {testId}
                            </div>
                          ))}
                          {group.memberTests.length > 10 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                              ... and {group.memberTests.length - 10} more tests
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex gap-3">
                      <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500">
                        View All Tests
                      </button>
                      <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500">
                        Create Jira Issue
                      </button>
                      <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500">
                        Suggest Fix
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No groups found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search terms, or run deduplication to create groups.
          </p>
        </div>
      )}
    </div>
  );
};

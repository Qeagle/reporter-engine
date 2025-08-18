import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, AlertCircle, CheckCircle, Clock, Flag,
  Search, SortAsc, SortDesc, ChevronLeft, ChevronRight,
  Activity, BarChart3, Edit2, Check, X, RotateCcw, 
  Ban, MessageCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import toast from 'react-hot-toast';

interface ProjectMember {
  id: number;
  email: string;
  name: string;
  display_name: string;
  avatar_url: string;
  role_key: string;
}

interface Annotation {
  id: number;
  title: string;
  content: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  created_by: number;
  assigned_to?: number;
  creator_display_name: string;
  creator_name: string;
  creator_email: string;
  creator_avatar_url: string;
  assignee_display_name?: string;
  assignee_name?: string;
  assignee_email?: string;
  assignee_avatar_url?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  comment_count: number;
  tags: string[];
  test_run_name?: string;
  test_case_name?: string;
}

interface AnalysisStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  assigned_to_me: number;
  created_by_me: number;
  overdue: number;
}

const AnalysisActivity: React.FC = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    assigned_to_me: 0,
    created_by_me: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
    assignee: '',
    creator: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedAnnotations, setSelectedAnnotations] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Edit state
  const [editingAnnotation, setEditingAnnotation] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', message: '' });
  
  // Status change modal state
  const [statusChangeModal, setStatusChangeModal] = useState<{
    isOpen: boolean;
    annotationIds: number[];
    newStatus: string;
    comment: string;
  }>({
    isOpen: false,
    annotationIds: [],
    newStatus: '',
    comment: ''
  });
  
  // Bulk operation confirmation state
  const [bulkConfirmModal, setBulkConfirmModal] = useState<{
    isOpen: boolean;
    operation: string;
    count: number;
  }>({
    isOpen: false,
    operation: '',
    count: 0
  });

  useEffect(() => {
    if (currentProject) {
      loadAnnotations();
      loadProjectMembers();
    }
  }, [currentProject, filters, sortBy, sortOrder, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, sortOrder]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());
      
      const response = await fetch(`/api/annotations/projects/${currentProject?.id}/annotations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.data.annotations || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(Math.ceil((data.data.total || 0) / pageSize));
        
        // Calculate stats
        const annotations_data = data.data.annotations || [];
        const now = new Date();
        const userId = Number(user?.id);
        
        const newStats: AnalysisStats = {
          total: data.data.total || 0, // Use total from server instead of filtered data
          open: annotations_data.filter((a: Annotation) => a.status === 'open').length,
          in_progress: annotations_data.filter((a: Annotation) => a.status === 'in_progress').length,
          resolved: annotations_data.filter((a: Annotation) => a.status === 'resolved').length,
          closed: annotations_data.filter((a: Annotation) => a.status === 'closed').length,
          assigned_to_me: annotations_data.filter((a: Annotation) => a.assigned_to === userId).length,
          created_by_me: annotations_data.filter((a: Annotation) => a.created_by === userId).length,
          overdue: annotations_data.filter((a: Annotation) => 
            a.due_date && new Date(a.due_date) < now && a.status !== 'resolved' && a.status !== 'closed'
          ).length
        };
        
        setStats(newStats);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to load annotations: ${errorData.error || errorData.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      toast.error('Failed to load analysis activity');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectMembers = async () => {
    try {
      const response = await fetch(`/api/annotations/projects/${currentProject?.id}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjectMembers(data.data || []); // Updated to match new API response structure
      }
    } catch (error) {
      console.error('Error loading project members:', error);
    }
  };

  const updateAnnotationStatus = async (annotationId: number, status: string, comment?: string) => {
    try {
      const response = await fetch(`/api/annotations/annotations/${annotationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, comment })
      });

      if (response.ok) {
        toast.success('Status updated successfully');
        loadAnnotations();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateAnnotationAssignment = async (annotationId: number, assignedTo: number | null) => {
    try {
      const response = await fetch(`/api/annotations/annotations/${annotationId}/assignment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assignedTo })
      });

      if (response.ok) {
        toast.success('Assignment updated successfully');
        loadAnnotations();
      } else {
        toast.error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedAnnotations.length === 0) {
      toast.error('Please select annotations to update');
      return;
    }

    // Show confirmation modal for bulk operations
    setBulkConfirmModal({
      isOpen: true,
      operation: status,
      count: selectedAnnotations.length
    });
  };

  const confirmBulkUpdate = async () => {
    const { operation, count } = bulkConfirmModal;
    
    try {
      const promises = selectedAnnotations.map(id => 
        updateAnnotationStatus(id, operation)
      );
      
      await Promise.all(promises);
      setSelectedAnnotations([]);
      setBulkConfirmModal({ isOpen: false, operation: '', count: 0 });
      toast.success(`Updated ${count} annotations`);
    } catch (error) {
      toast.error('Failed to update annotations');
    }
  };

  const handleStatusChangeWithComment = (annotationIds: number[], newStatus: string) => {
    setStatusChangeModal({
      isOpen: true,
      annotationIds,
      newStatus,
      comment: ''
    });
  };

  const confirmStatusChange = async () => {
    const { annotationIds, newStatus, comment } = statusChangeModal;
    
    try {
      const promises = annotationIds.map(id => 
        updateAnnotationStatus(id, newStatus, comment)
      );
      
      await Promise.all(promises);
      setStatusChangeModal({ isOpen: false, annotationIds: [], newStatus: '', comment: '' });
      if (annotationIds.length > 1) {
        setSelectedAnnotations([]);
      }
      toast.success(annotationIds.length > 1 ? 
        `Updated ${annotationIds.length} annotations` : 
        'Status updated successfully'
      );
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue': return <AlertCircle className="w-4 h-4" />;
      case 'improvement': return <CheckCircle className="w-4 h-4" />;
      case 'question': return <MessageSquare className="w-4 h-4" />;
      case 'blocker': return <Flag className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'issue': return 'bg-red-100 text-red-800 border-red-200';
      case 'improvement': return 'bg-green-100 text-green-800 border-green-200';
      case 'question': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocker': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'reopened': return 'bg-orange-100 text-orange-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserDisplayName = (member: ProjectMember) => {
    return member.display_name || member.name || member.email;
  };

  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleAnnotationSelection = (id: number) => {
    setSelectedAnnotations(prev => 
      prev.includes(id) 
        ? prev.filter(annotationId => annotationId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAnnotations.length === annotations.length) {
      setSelectedAnnotations([]);
    } else {
      setSelectedAnnotations(annotations.map(a => a.id));
    }
  };

  const startEditing = (annotation: Annotation) => {
    setEditingAnnotation(annotation.id);
    setEditForm({ title: annotation.title, message: annotation.message });
  };

  const cancelEditing = () => {
    setEditingAnnotation(null);
    setEditForm({ title: '', message: '' });
  };

  const saveEdit = async (annotationId: number) => {
    try {
      const response = await fetch(`/api/annotations/annotations/${annotationId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: editForm.title,
          message: editForm.message
        })
      });

      if (response.ok) {
        toast.success('Annotation updated successfully');
        setEditingAnnotation(null);
        setEditForm({ title: '', message: '' });
        loadAnnotations(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update annotation');
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error('Failed to update annotation');
    }
  };

  const canEdit = (annotation: Annotation) => {
    return annotation.status === 'open' && annotation.created_by === Number(user?.id);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Project Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a project to view analysis activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analysis Activity
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track and manage analysis items across your project
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search annotations..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="reopened">Reopened</option>
            <option value="invalid">Invalid</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="note">Note</option>
            <option value="issue">Issue</option>
            <option value="improvement">Improvement</option>
            <option value="question">Question</option>
            <option value="blocker">Blocker</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filters.assignee}
            onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            <option value={user?.id?.toString()}>Myself</option>
            {projectMembers
              .filter(member => member.id !== Number(user?.id))
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {getUserDisplayName(member)}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Items
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {loading ? '...' : stats.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Open
              </p>
              <p className="text-2xl font-semibold text-blue-600">
                {loading ? '...' : stats.open.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                In Progress
              </p>
              <p className="text-2xl font-semibold text-yellow-600">
                {loading ? '...' : stats.in_progress.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Resolved
              </p>
              <p className="text-2xl font-semibold text-green-600">
                {loading ? '...' : stats.resolved.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Assignment & Status Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? '...' : stats.assigned_to_me.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Assigned to Me</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {loading ? '...' : stats.created_by_me.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Created by Me</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {loading ? '...' : stats.overdue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {loading ? '...' : stats.closed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Closed</div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Positioned above the table */}
      {selectedAnnotations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedAnnotations.length} annotation{selectedAnnotations.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleStatusChangeWithComment(selectedAnnotations, 'in_progress')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                title="Mark selected annotations as In Progress"
              >
                <Clock className="w-4 h-4 mr-1" />
                In Progress
              </button>
              <button
                onClick={() => handleStatusChangeWithComment(selectedAnnotations, 'resolved')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                title="Mark selected annotations as Resolved"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolved
              </button>
              <button
                onClick={() => handleStatusChangeWithComment(selectedAnnotations, 'closed')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                title="Mark selected annotations as Closed"
              >
                <Flag className="w-4 h-4 mr-1" />
                Closed
              </button>
              <button
                onClick={() => handleStatusChangeWithComment(selectedAnnotations, 'reopened')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                title="Reopen selected annotations"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reopen
              </button>
              <button
                onClick={() => handleStatusChangeWithComment(selectedAnnotations, 'invalid')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                title="Mark selected annotations as Invalid"
              >
                <Ban className="w-4 h-4 mr-1" />
                Invalid
              </button>
              <button
                onClick={() => setSelectedAnnotations([])}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Annotations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedAnnotations.length === annotations.length && annotations.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('title')}
                      className="flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>Title</span>
                      {sortBy === 'title' && (
                        sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>Created</span>
                      {sortBy === 'created_at' && (
                        sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading analysis items...</p>
                    </td>
                  </tr>
                ) : annotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No analysis items found. Try adjusting your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  annotations.map((annotation) => (
                    <tr key={annotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAnnotations.includes(annotation.id)}
                          onChange={() => toggleAnnotationSelection(annotation.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded ${getTypeColor(annotation.type)}`}>
                            {getTypeIcon(annotation.type)}
                          </div>
                          <div>
                            {editingAnnotation === annotation.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                  placeholder="Title"
                                />
                                <textarea
                                  value={editForm.message}
                                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                  placeholder="Description"
                                  rows={2}
                                />
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => saveEdit(annotation.id)}
                                    className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="inline-flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {annotation.title}
                                  </p>
                                  {canEdit(annotation) && (
                                    <button
                                      onClick={() => startEditing(annotation)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                      title="Edit annotation"
                                    >
                                      <Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-600" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                  {annotation.message}
                                </p>
                              </div>
                            )}
                            {annotation.tags && annotation.tags.length > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                {annotation.tags.slice(0, 2).map((tag, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {annotation.tags.length > 2 && (
                                  <span className="text-xs text-gray-400">+{annotation.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${getTypeColor(annotation.type)}`}>
                          {annotation.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(annotation.priority)}`}></div>
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {annotation.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={annotation.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            if (['resolved', 'closed', 'reopened', 'invalid'].includes(newStatus)) {
                              handleStatusChangeWithComment([annotation.id], newStatus);
                            } else {
                              updateAnnotationStatus(annotation.id, newStatus);
                            }
                          }}
                          className={`text-xs rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(annotation.status)}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="reopened">Reopened</option>
                          <option value="invalid">Invalid</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={annotation.assigned_to || ''}
                          onChange={(e) => updateAnnotationAssignment(annotation.id, e.target.value ? Number(e.target.value) : null)}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Unassigned</option>
                          {projectMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {getUserDisplayName(member)}
                              {member.id === Number(user?.id) ? ' (Me)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {annotation.creator_display_name || annotation.creator_name || annotation.creator_email}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
                          {annotation.due_date && (
                            <span className={`text-xs ${isOverdue(annotation.due_date) ? 'text-red-600' : 'text-gray-400'}`}>
                              Due: {new Date(annotation.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Change with Comment Modal */}
        {statusChangeModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Change Status to "{statusChangeModal.newStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}"
                </h3>
                <button
                  onClick={() => setStatusChangeModal({ isOpen: false, annotationIds: [], newStatus: '', comment: '' })}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {statusChangeModal.annotationIds.length === 1 
                    ? 'You are about to change the status of 1 annotation.'
                    : `You are about to change the status of ${statusChangeModal.annotationIds.length} annotations.`
                  }
                </p>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add a comment (optional):
                </label>
                <textarea
                  value={statusChangeModal.comment}
                  onChange={(e) => setStatusChangeModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Add a note about this status change..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setStatusChangeModal({ isOpen: false, annotationIds: [], newStatus: '', comment: '' })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <MessageCircle className="w-4 h-4 mr-2 inline-block" />
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Operation Confirmation Modal */}
        {bulkConfirmModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                  Confirm Bulk Operation
                </h3>
                <button
                  onClick={() => setBulkConfirmModal({ isOpen: false, operation: '', count: 0 })}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You are about to update <strong>{bulkConfirmModal.count}</strong> annotation{bulkConfirmModal.count !== 1 ? 's' : ''} 
                  to status <strong>"{bulkConfirmModal.operation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}"</strong>.
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  This action will affect all selected annotations. Do you want to proceed?
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setBulkConfirmModal({ isOpen: false, operation: '', count: 0 })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkUpdate}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Yes, Update All
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AnalysisActivity;

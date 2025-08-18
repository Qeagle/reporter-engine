import React, { useState, useEffect } from 'react';
import { 
  X, Plus, MessageSquare, User, AlertCircle, CheckCircle,
  Clock, Flag, Users, Tag, Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import toast from 'react-hot-toast';

interface AnnotationPanelProps {
  reportId: string;
  testCaseId?: string;
  onClose: () => void;
}

interface ProjectMember {
  id: number;
  email: string;
  name: string;
  display_name: string;
  avatar_url: string;
  role_key: string;
}

interface TestCase {
  id: number;
  suite: string;
  name: string;
  status: string;
  duration: number;
  start_time: string;
  end_time: string;
}

interface Annotation {
  id: number;
  title: string;
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
  created_at: string;
  updated_at: string;
  comment_count: number;
  tags: string[];
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ reportId, testCaseId, onClose }) => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAnnotation, setExpandedAnnotation] = useState<number | null>(null);

  const [newAnnotation, setNewAnnotation] = useState({
    title: '',
    message: '',
    type: 'note',
    priority: 'medium',
    assignedTo: '',
    testCaseId: '',
    dueDate: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (currentProject) {
      loadAnnotations();
      loadProjectMembers();
      loadTestCases(reportId); // Load test cases for the current report (test run)
    }
  }, [reportId, testCaseId, currentProject]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (testCaseId) {
        params.append('testCaseId', testCaseId);
      }
      
      const response = await fetch(`/api/annotations/projects/${currentProject?.id}/annotations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.data.annotations || []);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      toast.error('Failed to load annotations');
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
        setProjectMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading project members:', error);
    }
  };

  const loadTestCases = async (reportId: string) => {
    if (!reportId) {
      setTestCases([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/annotations/test-runs/${reportId}/test-cases`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestCases(data.data || []);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.title.trim() || !newAnnotation.message.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    try {
      setLoading(true);
      const annotationData = {
        title: newAnnotation.title,
        message: newAnnotation.message,
        type: newAnnotation.type,
        priority: newAnnotation.priority,
        assignedTo: newAnnotation.assignedTo || null,
        testRunId: reportId ? parseInt(reportId) : null, // Use the current report's test run ID
        testCaseId: newAnnotation.testCaseId ? parseInt(newAnnotation.testCaseId) : (testCaseId ? parseInt(testCaseId) : null),
        dueDate: newAnnotation.dueDate || null,
        tags: newAnnotation.tags
      };

      const response = await fetch(`/api/annotations/projects/${currentProject?.id}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(annotationData)
      });

      if (response.ok) {
        setNewAnnotation({
          title: '',
          message: '',
          type: 'note',
          priority: 'medium',
          assignedTo: '',
          testCaseId: '',
          dueDate: '',
          tags: []
        });
        toast.success('Annotation created successfully');
        loadAnnotations();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create annotation');
      }
    } catch (error) {
      console.error('Error creating annotation:', error);
      toast.error('Failed to create annotation');
    } finally {
      setLoading(false);
    }
  };

  const updateAnnotationStatus = async (annotationId: number, status: string) => {
    try {
      const response = await fetch(`/api/annotations/annotations/${annotationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserDisplayName = (member: ProjectMember) => {
    return member.display_name || member.name || member.email;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Analysis Activity
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {annotations.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add New Annotation Form */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create Analysis Item
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newAnnotation.title}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Brief description of the issue..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newAnnotation.type}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="note">Note</option>
                  <option value="issue">Issue</option>
                  <option value="improvement">Improvement</option>
                  <option value="question">Question</option>
                  <option value="blocker">Blocker</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={newAnnotation.priority}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Case (Optional)
              </label>
              <select
                value={newAnnotation.testCaseId}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, testCaseId: e.target.value })}
                disabled={testCases.length === 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Test Case</option>
                {testCases.map((testCase) => (
                  <option key={testCase.id} value={testCase.id}>
                    {testCase.name} ({testCase.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Assign To
              </label>
              <select
                value={newAnnotation.assignedTo}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, assignedTo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Unassigned</option>
                <option value={user?.id?.toString()}>Myself</option>
                {projectMembers.map((member) => {
                  if (member.id === Number(user?.id)) return null;
                  
                  const displayName = getUserDisplayName(member);
                  const roleInfo = member.role_key === 'USER' ? '' : ` (${member.role_key})`;
                  
                  return (
                    <option key={member.id} value={member.id}>
                      {displayName}{roleInfo}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={newAnnotation.dueDate}
                min={new Date().toISOString().split('T')[0]} // Restrict to today or future dates
                onChange={(e) => setNewAnnotation({ ...newAnnotation, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                value={newAnnotation.message}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, message: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                rows={3}
                placeholder="Detailed description of the analysis item..."
              />
            </div>

            <button
              onClick={handleAddAnnotation}
              disabled={loading || !newAnnotation.title.trim() || !newAnnotation.message.trim()}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 mr-2" />
              Create Analysis Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationPanel;
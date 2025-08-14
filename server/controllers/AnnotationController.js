import AnnotationService from '../services/AnnotationService.js';

class AnnotationController {
  constructor() {
    this.annotationService = new AnnotationService();
  }

  // Get project members for assignment dropdown
  getProjectMembers = async (req, res) => {
    try {
      const { projectId } = req.params;
      const pid = parseInt(projectId, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ success: false, error: 'Invalid projectId' });
      }

      const members = await this.annotationService.getProjectMembers(pid);
      return res.json({ success: true, data: members });
    } catch (error) {
      console.error('Error fetching project members:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  // Get test runs for a project
  getProjectTestRuns = async (req, res) => {
    try {
      const { projectId } = req.params;
      const pid = parseInt(projectId, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ success: false, error: 'Invalid projectId' });
      }

      const stmt = this.annotationService.db.prepare(`
        SELECT 
          id,
          run_key,
          test_suite,
          environment,
          framework,
          status,
          started_at,
          finished_at
        FROM test_runs 
        WHERE project_id = ?
        ORDER BY started_at DESC
        LIMIT 50
      `);

      const testRuns = stmt.all(pid);
      return res.json({ success: true, data: testRuns });
    } catch (error) {
      console.error('Error fetching test runs:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  // Get test cases for a test run
  getTestRunCases = async (req, res) => {
    try {
      const { testRunId } = req.params;
      const trid = parseInt(testRunId, 10);
      if (Number.isNaN(trid)) {
        return res.status(400).json({ success: false, error: 'Invalid testRunId' });
      }

      const stmt = this.annotationService.db.prepare(`
        SELECT 
          id,
          suite,
          name,
          status,
          duration,
          start_time,
          end_time
        FROM test_cases 
        WHERE test_run_id = ?
        ORDER BY name
      `);

      const testCases = stmt.all(trid);
      return res.json({ success: true, data: testCases });
    } catch (error) {
      console.error('Error fetching test cases:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  // Create new annotation
  createAnnotation = async (req, res) => {
    try {
      // Debug context
      console.log('=== ANNOTATION CREATION DEBUG ===');
      console.log('req.user:', req.user);
      console.log('req.body:', req.body);
      console.log('req.params:', req.params);

      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing userId' });
      }

      const { projectId } = req.params;
      const pid = parseInt(projectId, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ success: false, error: 'Invalid projectId' });
      }

      const {
        testRunId,
        testCaseId,
        annotation,
        title,
        message,
        type = 'note',
        priority = 'medium',
        assignedTo,
        dueDate,
      } = req.body ?? {};

      const annotationTitle = title || 'Annotation';
      const annotationMessage = message || annotation || '';

      const annotationData = {
        projectId: pid,
        testRunId: testRunId ? parseInt(testRunId, 10) : null,
        testCaseId: testCaseId ? parseInt(testCaseId, 10) : null,
        title: annotationTitle,
        message: annotationMessage,
        type,
        priority,
        assignedTo: assignedTo ? parseInt(assignedTo, 10) : null,
        assignedBy: userId,
        createdBy: userId,
        dueDate: dueDate || null,
      };

      console.log('Annotation data being created:', annotationData);

      const result = await this.annotationService.createAnnotation(annotationData);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating annotation:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  // Get annotations with filtering
  getAnnotations = async (req, res) => {
    try {
      const { projectId } = req.params;
      const pid = parseInt(projectId, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ error: 'Invalid projectId' });
      }

      const userId = req?.user?.userId;

      const {
        assignedTo,
        assignee, // Alternative parameter name from frontend
        createdBy,
        status,
        type,
        priority,
        tags,
        testRunId,
        testCaseId,
        search,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        view = 'all', // 'all', 'assigned_to_me', 'created_by_me', 'watching'
      } = req.query;

      const filters = {
        projectId: pid,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        sortBy,
        sortOrder,
      };

      // Handle view shortcuts
      if (view === 'assigned_to_me' && userId) {
        filters.assignedTo = userId;
      } else if (view === 'created_by_me' && userId) {
        filters.createdBy = userId;
      } else {
        const assigneeValue = assignedTo || assignee; // Use either parameter
        if (assigneeValue) {
          filters.assignedTo = assigneeValue === 'unassigned' ? 'unassigned' : parseInt(assigneeValue, 10);
        }
        if (createdBy) filters.createdBy = parseInt(createdBy, 10);
      }

      if (status) filters.status = status;
      if (type) filters.type = type;
      if (priority) filters.priority = priority;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (testRunId) filters.testRunId = parseInt(testRunId, 10);
      if (testCaseId) filters.testCaseId = parseInt(testCaseId, 10);
      if (search) filters.search = search;

      const result = await this.annotationService.getAnnotations(filters);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching annotations:', error);
      return res.status(500).json({ error: 'Failed to fetch annotations', details: error.message });
    }
  };

  // Get single annotation by ID
  getAnnotation = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const id = parseInt(annotationId, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid annotationId' });
      }

      const annotation = await this.annotationService.getAnnotationById(id);
      return res.json({ success: true, data: { annotation } });
    } catch (error) {
      console.error('Error fetching annotation:', error);
      if (error.message === 'Annotation not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch annotation', details: error.message });
    }
  };

  // Update annotation assignment
  updateAssignment = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      const id = parseInt(annotationId, 10);
      const { assignedTo } = req.body ?? {};

      const annotation = await this.annotationService.updateAssignment(
        id,
        assignedTo ? parseInt(assignedTo, 10) : null,
        userId
      );

      return res.json({ success: true, data: { annotation } });
    } catch (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({ error: 'Failed to update assignment', details: error.message });
    }
  };

  // Update annotation status
  updateStatus = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const userId = req?.user?.userId;
      const { status, comment } = req.body ?? {};

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const id = parseInt(annotationId, 10);
      const annotation = await this.annotationService.updateStatus(id, status, userId, comment);
      return res.json({ success: true, data: { annotation } });
    } catch (error) {
      console.error('Error updating status:', error);
      return res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
  };

  // Update annotation title and message (only by creator and only when status is open)
  updateAnnotation = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const userId = req?.user?.userId;
      const { title, message } = req.body ?? {};

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      const id = parseInt(annotationId, 10);
      const annotation = await this.annotationService.updateAnnotation(id, title, message, userId);
      return res.json({ success: true, data: { annotation } });
    } catch (error) {
      console.error('Error updating annotation:', error);
      if (error.message === 'Annotation not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Only the creator can edit this annotation' || 
          error.message === 'Annotation can only be edited when status is open') {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update annotation', details: error.message });
    }
  };

  // Add comment to annotation
  addComment = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const userId = req?.user?.userId;
      const { comment } = req.body ?? {};

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      if (!comment || !String(comment).trim()) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const id = parseInt(annotationId, 10);
      const comments = await this.annotationService.addComment(id, userId, String(comment).trim());
      return res.json({ success: true, data: { comments } });
    } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({ error: 'Failed to add comment', details: error.message });
    }
  };

  // Get user notifications
  getNotifications = async (req, res) => {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      const { limit = 50, onlyUnread = false } = req.query;
      const notifications = await this.annotationService.getUserNotifications(
        userId,
        parseInt(limit, 10),
        String(onlyUnread) === 'true'
      );

      return res.json({ success: true, data: { notifications } });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
    }
  };

  // Mark notification as read
  markNotificationRead = async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      await this.annotationService.markNotificationRead(parseInt(notificationId, 10), userId);
      return res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
    }
  };

  // Mark all notifications as read
  markAllNotificationsRead = async (req, res) => {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      await this.annotationService.markAllNotificationsRead(userId);
      return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read', details: error.message });
    }
  };

  // Get annotation statistics
  getStats = async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req?.user?.userId;
      const { userOnly = false } = req.query;

      const pid = parseInt(projectId, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ error: 'Invalid projectId' });
      }

      const stats = await this.annotationService.getAnnotationStats(
        pid,
        String(userOnly) === 'true' && userId ? userId : null
      );

      return res.json({ success: true, data: { stats } });
    } catch (error) {
      console.error('Error fetching annotation stats:', error);
      return res.status(500).json({ error: 'Failed to fetch annotation stats', details: error.message });
    }
  };

  // Add or remove watcher (toggles)
  toggleWatcher = async (req, res) => {
    try {
      const { annotationId } = req.params;
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      await this.annotationService.addWatcher(parseInt(annotationId, 10), userId);
      return res.json({ success: true, message: 'Watcher status updated' });
    } catch (error) {
      console.error('Error updating watcher status:', error);
      return res.status(500).json({ error: 'Failed to update watcher status', details: error.message });
    }
  };
}

export default new AnnotationController();

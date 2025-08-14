import DatabaseService from './DatabaseService.js';

class AnnotationService {
  constructor() {
    this.db = new DatabaseService();
    // Access the underlying SQLite database for custom queries
    this.dbInstance = this.db.db;
  }

  // Create new annotation with assignment
  async createAnnotation(data) {
    const {
      projectId,
      testRunId,
      testCaseId,
      title,
      message,
      type = 'note',
      priority = 'medium',
      createdBy,
      assignedTo,
      assignedBy,
      dueDate,
      tags = []
    } = data;

    const annotation = this.dbInstance.prepare(`
      INSERT INTO annotations (
        project_id, test_run_id, test_case_id, title, message, type, priority,
        created_by, assigned_to, assigned_by, assigned_at, due_date, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      projectId,
      testRunId || null,
      testCaseId || null,
      title,
      message,
      type,
      priority,
      createdBy,
      assignedTo || null,
      assignedBy || null,
      assignedTo ? new Date().toISOString() : null,
      dueDate || null,
      JSON.stringify(tags)
    ]);

    const annotationId = annotation.lastID;

    // Add system comment for creation
    await this.addSystemComment(annotationId, createdBy, 'created', 'Annotation created');

    // Add assignment comment if assigned
    if (assignedTo && assignedBy) {
      const assignedUser = await this.getUserById(assignedTo);
      const assignerUser = await this.getUserById(assignedBy);
      await this.addSystemComment(
        annotationId, 
        assignedBy, 
        'assigned', 
        `Assigned to ${assignedUser.display_name || assignedUser.name || assignedUser.email} by ${assignerUser.display_name || assignerUser.name || assignerUser.email}`
      );

      // Create notification for assigned user
      if (assignedTo !== assignedBy) {
        await this.createNotification(assignedTo, annotationId, 'assigned', 
          `You have been assigned a new ${type}: "${title}"`);
      }

      // Auto-watch for creator and assignee
      await this.addWatcher(annotationId, createdBy);
      if (assignedTo !== createdBy) {
        await this.addWatcher(annotationId, assignedTo);
      }
    }

    return await this.getAnnotationById(annotationId);
  }

  // Get annotation by ID with all related data
  async getAnnotationById(id) {
    const annotation = await this.db.get(`
      SELECT 
        a.*,
        creator.display_name as creator_display_name,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.avatar_url as creator_avatar_url,
        assignee.display_name as assignee_display_name,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        assignee.avatar_url as assignee_avatar_url,
        assigner.display_name as assigner_display_name,
        assigner.name as assigner_name,
        assigner.email as assigner_email,
        resolver.display_name as resolver_display_name,
        resolver.name as resolver_name,
        resolver.email as resolver_email,
        tc.name as test_case_name,
        tr.run_key as test_run_key
      FROM annotations a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users assignee ON a.assigned_to = assignee.id
      LEFT JOIN users assigner ON a.assigned_by = assigner.id
      LEFT JOIN users resolver ON a.resolved_by = resolver.id
      LEFT JOIN test_cases tc ON a.test_case_id = tc.id
      LEFT JOIN test_runs tr ON a.test_run_id = tr.id
      WHERE a.id = ?
    `, [id]);

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Parse JSON fields
    annotation.tags = annotation.tags ? JSON.parse(annotation.tags) : [];
    annotation.metadata = annotation.metadata ? JSON.parse(annotation.metadata) : {};

    // Get comments
    annotation.comments = await this.getAnnotationComments(id);

    // Get watchers
    annotation.watchers = await this.getAnnotationWatchers(id);

    return annotation;
  }

  // Get annotations with filtering and pagination
  async getAnnotations(filters = {}) {
    const {
      projectId,
      assignedTo,
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
      sortOrder = 'DESC'
    } = filters;

    let query = `
      SELECT 
        a.*,
        creator.display_name as creator_display_name,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.avatar_url as creator_avatar_url,
        assignee.display_name as assignee_display_name,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        assignee.avatar_url as assignee_avatar_url,
        tc.name as test_case_name,
        tr.run_key as test_run_key
      FROM annotations a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users assignee ON a.assigned_to = assignee.id
      LEFT JOIN test_cases tc ON a.test_case_id = tc.id
      LEFT JOIN test_runs tr ON a.test_run_id = tr.id
      WHERE 1=1
    `;

    const params = [];

    if (projectId) {
      query += ` AND a.project_id = ?`;
      params.push(projectId);
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query += ` AND a.assigned_to IS NULL`;
      } else {
        query += ` AND a.assigned_to = ?`;
        params.push(assignedTo);
      }
    }

    if (createdBy) {
      query += ` AND a.created_by = ?`;
      params.push(createdBy);
    }

    if (status) {
      if (Array.isArray(status)) {
        query += ` AND a.status IN (${status.map(() => '?').join(',')})`;
        params.push(...status);
      } else {
        query += ` AND a.status = ?`;
        params.push(status);
      }
    }

    if (type) {
      if (Array.isArray(type)) {
        query += ` AND a.type IN (${type.map(() => '?').join(',')})`;
        params.push(...type);
      } else {
        query += ` AND a.type = ?`;
        params.push(type);
      }
    }

    if (priority) {
      if (Array.isArray(priority)) {
        query += ` AND a.priority IN (${priority.map(() => '?').join(',')})`;
        params.push(...priority);
      } else {
        query += ` AND a.priority = ?`;
        params.push(priority);
      }
    }

    if (testRunId) {
      query += ` AND a.test_run_id = ?`;
      params.push(testRunId);
    }

    if (testCaseId) {
      query += ` AND a.test_case_id = ?`;
      params.push(testCaseId);
    }

    if (search) {
      query += ` AND (a.title LIKE ? OR a.message LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tags && tags.length > 0) {
      // Simple tag search - could be improved for exact matching
      const tagConditions = tags.map(() => `a.tags LIKE ?`).join(' OR ');
      query += ` AND (${tagConditions})`;
      params.push(...tags.map(tag => `%"${tag}"%`));
    }

    query += ` ORDER BY a.${sortBy} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const annotations = this.dbInstance.prepare(query).all(params);

    // Parse JSON fields and add comment counts
    for (const annotation of annotations) {
      annotation.tags = annotation.tags ? JSON.parse(annotation.tags) : [];
      annotation.metadata = annotation.metadata ? JSON.parse(annotation.metadata) : {};
      
      // Get comment count
      const commentCount = await this.db.get(
        `SELECT COUNT(*) as count FROM annotation_comments WHERE annotation_id = ?`,
        [annotation.id]
      );
      annotation.comment_count = commentCount.count;
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM annotations a
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset

    if (projectId) countQuery += ` AND a.project_id = ?`;
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        countQuery += ` AND a.assigned_to IS NULL`;
      } else {
        countQuery += ` AND a.assigned_to = ?`;
      }
    }
    if (createdBy) countQuery += ` AND a.created_by = ?`;
    if (status) {
      if (Array.isArray(status)) {
        countQuery += ` AND a.status IN (${status.map(() => '?').join(',')})`;
      } else {
        countQuery += ` AND a.status = ?`;
      }
    }
    if (type) {
      if (Array.isArray(type)) {
        countQuery += ` AND a.type IN (${type.map(() => '?').join(',')})`;
      } else {
        countQuery += ` AND a.type = ?`;
      }
    }
    if (priority) {
      if (Array.isArray(priority)) {
        countQuery += ` AND a.priority IN (${priority.map(() => '?').join(',')})`;
      } else {
        countQuery += ` AND a.priority = ?`;
      }
    }
    if (testRunId) countQuery += ` AND a.test_run_id = ?`;
    if (testCaseId) countQuery += ` AND a.test_case_id = ?`;
    if (search) countQuery += ` AND (a.title LIKE ? OR a.message LIKE ?)`;
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => `a.tags LIKE ?`).join(' OR ');
      countQuery += ` AND (${tagConditions})`;
    }

    const totalResult = this.dbInstance.prepare(countQuery).get(countParams);

    return {
      annotations,
      total: totalResult.total,
      limit,
      offset,
      hasMore: offset + limit < totalResult.total
    };
  }

  // Update annotation assignment
  async updateAssignment(annotationId, assignedTo, assignedBy) {
    const annotation = await this.getAnnotationById(annotationId);
    const oldAssignee = annotation.assigned_to;

    await this.db.run(`
      UPDATE annotations 
      SET assigned_to = ?, assigned_by = ?, assigned_at = ?, updated_at = ?
      WHERE id = ?
    `, [assignedTo || null, assignedBy, assignedTo ? new Date().toISOString() : null, new Date().toISOString(), annotationId]);

    // Add system comment
    if (assignedTo && assignedTo !== oldAssignee) {
      const assignedUser = await this.getUserById(assignedTo);
      const assignerUser = await this.getUserById(assignedBy);
      await this.addSystemComment(
        annotationId, 
        assignedBy, 
        'assigned', 
        `Assigned to ${assignedUser.display_name || assignedUser.name || assignedUser.email} by ${assignerUser.display_name || assignerUser.name || assignerUser.email}`
      );

      // Create notification
      if (assignedTo !== assignedBy) {
        await this.createNotification(assignedTo, annotationId, 'assigned', 
          `You have been assigned to annotation: "${annotation.title}"`);
      }

      // Add as watcher
      await this.addWatcher(annotationId, assignedTo);
    } else if (!assignedTo && oldAssignee) {
      await this.addSystemComment(
        annotationId, 
        assignedBy, 
        'unassigned', 
        'Annotation unassigned'
      );
    }

    return await this.getAnnotationById(annotationId);
  }

  // Update annotation status
  async updateStatus(annotationId, status, userId, comment = null) {
    const annotation = await this.getAnnotationById(annotationId);
    const oldStatus = annotation.status;

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = userId;
    }

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    await this.db.run(`
      UPDATE annotations SET ${setClause} WHERE id = ?
    `, [...values, annotationId]);

    // Add system comment
    await this.addSystemComment(
      annotationId, 
      userId, 
      'status_changed', 
      `Status changed from ${oldStatus} to ${status}`
    );

    // Add user comment if provided
    if (comment) {
      await this.addComment(annotationId, userId, comment);
    }

    // Notify watchers
    await this.notifyWatchers(annotationId, userId, 'status_changed', 
      `Status changed to ${status} on annotation: "${annotation.title}"`);

    return await this.getAnnotationById(annotationId);
  }

  // Add comment to annotation
  async addComment(annotationId, userId, comment, isSystem = false) {
    await this.db.run(`
      INSERT INTO annotation_comments (annotation_id, user_id, comment, is_system)
      VALUES (?, ?, ?, ?)
    `, [annotationId, userId, comment, isSystem ? 1 : 0]);

    if (!isSystem) {
      const annotation = await this.getAnnotationById(annotationId);
      await this.notifyWatchers(annotationId, userId, 'comment_added', 
        `New comment on annotation: "${annotation.title}"`);
    }

    return await this.getAnnotationComments(annotationId);
  }

  // Get annotation comments
  async getAnnotationComments(annotationId) {
    return await this.db.all(`
      SELECT 
        ac.*,
        u.display_name,
        u.name,
        u.email,
        u.avatar_url
      FROM annotation_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.annotation_id = ?
      ORDER BY ac.created_at ASC
    `, [annotationId]);
  }

  // Get project members for assignment dropdown
  async getProjectMembers(projectId) {
    return this.dbInstance.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.display_name,
        u.avatar_url,
        r.key as role_key,
        r.description as role_description
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      JOIN roles r ON pm.role_id = r.id
      WHERE pm.project_id = ? AND u.is_active = 1
      ORDER BY u.display_name, u.name, u.email
    `).all([projectId]);
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, onlyUnread = false) {
    let query = `
      SELECT 
        an.*,
        a.title as annotation_title,
        a.type as annotation_type,
        a.priority as annotation_priority
      FROM annotation_notifications an
      JOIN annotations a ON an.annotation_id = a.id
      WHERE an.user_id = ?
    `;

    const params = [userId];

    if (onlyUnread) {
      query += ` AND an.is_read = 0`;
    }

    query += ` ORDER BY an.created_at DESC LIMIT ?`;
    params.push(limit);

    return await this.db.all(query, params);
  }

  // Mark notification as read
  async markNotificationRead(notificationId, userId) {
    await this.db.run(`
      UPDATE annotation_notifications 
      SET is_read = 1, read_at = ?
      WHERE id = ? AND user_id = ?
    `, [new Date().toISOString(), notificationId, userId]);
  }

  // Mark all notifications as read
  async markAllNotificationsRead(userId) {
    await this.db.run(`
      UPDATE annotation_notifications 
      SET is_read = 1, read_at = ?
      WHERE user_id = ? AND is_read = 0
    `, [new Date().toISOString(), userId]);
  }

  // Helper methods
  async addSystemComment(annotationId, userId, action, message) {
    await this.addComment(annotationId, userId, message, true);
  }

  async createNotification(userId, annotationId, type, message) {
    await this.db.run(`
      INSERT INTO annotation_notifications (user_id, annotation_id, type, message)
      VALUES (?, ?, ?, ?)
    `, [userId, annotationId, type, message]);
  }

  async addWatcher(annotationId, userId) {
    try {
      await this.db.run(`
        INSERT OR IGNORE INTO annotation_watchers (annotation_id, user_id)
        VALUES (?, ?)
      `, [annotationId, userId]);
    } catch (error) {
      // Ignore duplicate key errors
    }
  }

  async getAnnotationWatchers(annotationId) {
    return await this.db.all(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.display_name,
        u.avatar_url
      FROM annotation_watchers aw
      JOIN users u ON aw.user_id = u.id
      WHERE aw.annotation_id = ?
    `, [annotationId]);
  }

  async notifyWatchers(annotationId, excludeUserId, type, message) {
    const watchers = await this.getAnnotationWatchers(annotationId);
    
    for (const watcher of watchers) {
      if (watcher.id !== excludeUserId) {
        await this.createNotification(watcher.id, annotationId, type, message);
      }
    }
  }

  async getUserById(userId) {
    return await this.db.get(`
      SELECT id, email, name, display_name, avatar_url
      FROM users WHERE id = ?
    `, [userId]);
  }

  // Get annotation statistics
  async getAnnotationStats(projectId, userId = null) {
    const baseQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high
      FROM annotations 
      WHERE project_id = ?
    `;

    const params = [projectId];
    let query = baseQuery;

    if (userId) {
      query += ` AND (assigned_to = ? OR created_by = ?)`;
      params.push(userId, userId);
    }

    return await this.db.get(query, params);
  }
}

export default AnnotationService;

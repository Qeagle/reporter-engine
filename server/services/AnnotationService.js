import DatabaseService from './DatabaseService.js';

class AnnotationService {
  constructor() {
    this.databaseService = new DatabaseService();
    this.db = this.databaseService.db; // Direct access to better-sqlite3 instance
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

    // Debug logging
    console.log('AnnotationService.createAnnotation - createdBy:', createdBy);
    console.log('AnnotationService.createAnnotation - data:', data);

    const stmt = this.db.prepare(`
      INSERT INTO annotations (
        project_id, test_run_id, test_case_id, title, message, type, priority,
        created_by, assigned_to, assigned_by, assigned_at, due_date, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
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
    );

    // Get the created annotation with user details
    return this.getAnnotationById(result.lastInsertRowid);
  }

  // Get annotations with filtering
  async getAnnotations(filters) {
    const {
      projectId,
      assignedTo,
      createdBy,
      status = '',
      type = '',
      priority = '',
      tags = [],
      testRunId,
      testCaseId,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
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
        COUNT(ac.id) as comment_count
      FROM annotations a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users assignee ON a.assigned_to = assignee.id
      LEFT JOIN annotation_comments ac ON a.id = ac.annotation_id
      WHERE a.project_id = ?
    `;

    const params = [projectId];

    // Add filters
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
        const placeholders = status.map(() => '?').join(', ');
        query += ` AND a.status IN (${placeholders})`;
        params.push(...status);
      } else {
        query += ` AND a.status = ?`;
        params.push(status);
      }
    }

    if (type) {
      if (Array.isArray(type)) {
        const placeholders = type.map(() => '?').join(', ');
        query += ` AND a.type IN (${placeholders})`;
        params.push(...type);
      } else {
        query += ` AND a.type = ?`;
        params.push(type);
      }
    }

    if (priority) {
      if (Array.isArray(priority)) {
        const placeholders = priority.map(() => '?').join(', ');
        query += ` AND a.priority IN (${placeholders})`;
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
      const tagConditions = tags.map(() => `a.tags LIKE ?`).join(' OR ');
      query += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    query += ` GROUP BY a.id`;

    // Add sorting
    const validSortColumns = ['created_at', 'updated_at', 'title', 'priority', 'status'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY a.${sortColumn} ${order}`;

    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const annotations = this.db.prepare(query).all(params);

    // Parse JSON fields
    for (const annotation of annotations) {
      annotation.tags = annotation.tags ? JSON.parse(annotation.tags) : [];
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM annotations a
      WHERE a.project_id = ?
    `;
    const countParams = [projectId];

    // Apply same filters for count
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        countQuery += ` AND a.assigned_to IS NULL`;
      } else {
        countQuery += ` AND a.assigned_to = ?`;
        countParams.push(assignedTo);
      }
    }

    if (createdBy) {
      countQuery += ` AND a.created_by = ?`;
      countParams.push(createdBy);
    }

    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => '?').join(', ');
        countQuery += ` AND a.status IN (${placeholders})`;
        countParams.push(...status);
      } else {
        countQuery += ` AND a.status = ?`;
        countParams.push(status);
      }
    }

    if (type) {
      if (Array.isArray(type)) {
        const placeholders = type.map(() => '?').join(', ');
        countQuery += ` AND a.type IN (${placeholders})`;
        countParams.push(...type);
      } else {
        countQuery += ` AND a.type = ?`;
        countParams.push(type);
      }
    }

    if (priority) {
      if (Array.isArray(priority)) {
        const placeholders = priority.map(() => '?').join(', ');
        countQuery += ` AND a.priority IN (${placeholders})`;
        countParams.push(...priority);
      } else {
        countQuery += ` AND a.priority = ?`;
        countParams.push(priority);
      }
    }

    if (testRunId) {
      countQuery += ` AND a.test_run_id = ?`;
      countParams.push(testRunId);
    }

    if (testCaseId) {
      countQuery += ` AND a.test_case_id = ?`;
      countParams.push(testCaseId);
    }

    if (search) {
      countQuery += ` AND (a.title LIKE ? OR a.message LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => `a.tags LIKE ?`).join(' OR ');
      countQuery += ` AND (${tagConditions})`;
      tags.forEach(tag => countParams.push(`%"${tag}"%`));
    }

    const totalResult = this.db.prepare(countQuery).get(countParams);

    return {
      annotations,
      total: totalResult.total,
      limit,
      offset,
      hasMore: offset + limit < totalResult.total
    };
  }

  // Get single annotation by ID
  async getAnnotationById(annotationId) {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        creator.display_name as creator_display_name,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.avatar_url as creator_avatar_url,
        assignee.display_name as assignee_display_name,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        assignee.avatar_url as assignee_avatar_url
      FROM annotations a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users assignee ON a.assigned_to = assignee.id
      WHERE a.id = ?
    `);

    const annotation = stmt.get(annotationId);
    
    if (annotation) {
      annotation.tags = annotation.tags ? JSON.parse(annotation.tags) : [];
    }

    return annotation;
  }

  // Update annotation assignment
  async updateAssignment(annotationId, assignedTo, assignedBy) {
    const stmt = this.db.prepare(`
      UPDATE annotations 
      SET assigned_to = ?, assigned_by = ?, assigned_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      assignedTo,
      assignedBy,
      assignedTo ? new Date().toISOString() : null,
      new Date().toISOString(),
      annotationId
    );

    return this.getAnnotationById(annotationId);
  }

  // Update annotation status
  async updateStatus(annotationId, status, updatedBy) {
    const stmt = this.db.prepare(`
      UPDATE annotations 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, new Date().toISOString(), annotationId);

    return this.getAnnotationById(annotationId);
  }

  // Update annotation title and message (only by creator and only when status is open)
  async updateAnnotation(annotationId, title, message, userId) {
    // First, get the annotation to check creator and status
    const annotation = await this.getAnnotationById(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Debug logging for troubleshooting
    console.log('AnnotationService.updateAnnotation - Debug info:');
    console.log('- annotationId:', annotationId);
    console.log('- annotation.created_by:', annotation.created_by, typeof annotation.created_by);
    console.log('- userId:', userId, typeof userId);
    console.log('- annotation.status:', annotation.status);

    // Check if the user is the creator
    if (annotation.created_by !== userId) {
      throw new Error('Only the creator can edit this annotation');
    }

    // Check if the status is open
    if (annotation.status !== 'open') {
      throw new Error('Annotation can only be edited when status is open');
    }

    // Update the annotation
    const stmt = this.db.prepare(`
      UPDATE annotations 
      SET title = ?, message = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(title, message, new Date().toISOString(), annotationId);

    return this.getAnnotationById(annotationId);
  }

  // Add comment to annotation
  async addComment(annotationId, userId, message) {
    const stmt = this.db.prepare(`
      INSERT INTO annotation_comments (annotation_id, user_id, message)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(annotationId, userId, message);

    // Get the comment with user details
    const commentStmt = this.db.prepare(`
      SELECT 
        ac.*,
        u.display_name,
        u.name,
        u.email,
        u.avatar_url
      FROM annotation_comments ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.id = ?
    `);

    return commentStmt.get(result.lastInsertRowid);
  }

  // Get project members for assignment dropdown
  async getProjectMembers(projectId) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT
        u.id,
        u.email,
        u.name,
        u.display_name,
        u.avatar_url,
        COALESCE(r.key, 'USER') as role_key,
        COALESCE(r.description, 'User') as role_description,
        CASE 
          WHEN pm.project_id IS NOT NULL THEN 1
          ELSE 2
        END as sort_order
      FROM users u
      LEFT JOIN project_members pm ON u.id = pm.user_id AND pm.project_id = ?
      LEFT JOIN roles r ON pm.role_id = r.id
      WHERE u.is_active = 1
      ORDER BY sort_order, u.display_name, u.name, u.email
    `);

    return stmt.all([projectId]);
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 20, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM annotation_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all([userId, limit, offset]);
  }

  // Mark notification as read
  async markNotificationRead(notificationId, userId) {
    const stmt = this.db.prepare(`
      UPDATE annotation_notifications 
      SET read_at = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(new Date().toISOString(), notificationId, userId);
  }

  // Mark all notifications as read
  async markAllNotificationsRead(userId) {
    const stmt = this.db.prepare(`
      UPDATE annotation_notifications 
      SET read_at = ?
      WHERE user_id = ? AND read_at IS NULL
    `);

    stmt.run(new Date().toISOString(), userId);
  }

  // Get annotation statistics
  async getAnnotationStats(projectId, userId = null) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN assigned_to = ? THEN 1 ELSE 0 END) as assigned_to_user,
        SUM(CASE WHEN created_by = ? THEN 1 ELSE 0 END) as created_by_user,
        SUM(CASE WHEN due_date < datetime('now') AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as overdue
      FROM annotations
      WHERE project_id = ?
    `);

    return stmt.get([userId, userId, projectId]);
  }

  // Add watcher
  async addWatcher(annotationId, userId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO annotation_watchers (annotation_id, user_id)
      VALUES (?, ?)
    `);

    stmt.run(annotationId, userId);
  }

  // Remove watcher
  async removeWatcher(annotationId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM annotation_watchers
      WHERE annotation_id = ? AND user_id = ?
    `);

    stmt.run(annotationId, userId);
  }

  // Check if user is watching annotation
  async isWatching(annotationId, userId) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM annotation_watchers
      WHERE annotation_id = ? AND user_id = ?
    `);

    const result = stmt.get([annotationId, userId]);
    return result.count > 0;
  }
}

export default AnnotationService;

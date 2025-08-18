-- Add annotations table for proper assignment management
CREATE TABLE annotations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL,
  test_run_id     INTEGER,                -- Optional: link to specific test run
  test_case_id    INTEGER,                -- Optional: link to specific test case
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'note', -- 'note', 'issue', 'improvement', 'question', 'blocker'
  priority        TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status          TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  created_by      INTEGER NOT NULL,
  assigned_to     INTEGER,                -- NULL means unassigned
  assigned_by     INTEGER,                -- Who assigned it
  assigned_at     TEXT,
  due_date        TEXT,                   -- Optional due date
  resolved_at     TEXT,
  resolved_by     INTEGER,
  tags            TEXT,                   -- JSON array of tags
  metadata        TEXT,                   -- JSON for additional data
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Annotation comments/activity log
CREATE TABLE annotation_comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  comment       TEXT NOT NULL,
  is_system     INTEGER DEFAULT 0,        -- 0=user comment, 1=system activity
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Annotation notifications
CREATE TABLE annotation_notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  annotation_id INTEGER NOT NULL,
  type          TEXT NOT NULL,            -- 'assigned', 'mentioned', 'status_changed', 'comment_added'
  is_read       INTEGER DEFAULT 0,
  message       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  read_at       TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Annotation watchers (users who want to be notified of changes)
CREATE TABLE annotation_watchers (
  annotation_id INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (annotation_id, user_id),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Helpful indexes for annotations
CREATE INDEX idx_annotations_project ON annotations(project_id);
CREATE INDEX idx_annotations_test_run ON annotations(test_run_id);
CREATE INDEX idx_annotations_test_case ON annotations(test_case_id);
CREATE INDEX idx_annotations_created_by ON annotations(created_by);
CREATE INDEX idx_annotations_assigned_to ON annotations(assigned_to);
CREATE INDEX idx_annotations_status ON annotations(status);
CREATE INDEX idx_annotations_priority ON annotations(priority);
CREATE INDEX idx_annotations_created_at ON annotations(created_at);
CREATE INDEX idx_annotation_comments_annotation ON annotation_comments(annotation_id);
CREATE INDEX idx_annotation_notifications_user ON annotation_notifications(user_id);
CREATE INDEX idx_annotation_notifications_unread ON annotation_notifications(user_id, is_read);
CREATE INDEX idx_annotation_watchers_user ON annotation_watchers(user_id);

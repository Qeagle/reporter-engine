-- Core users
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  bio           TEXT,
  timezone      TEXT DEFAULT 'UTC',
  location      TEXT,
  website       TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User invitations
CREATE TABLE user_invitations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  invited_by      INTEGER NOT NULL,
  role_id         INTEGER,                    -- Global role (optional)
  project_id      INTEGER,                    -- Project for project-level invitation (optional)
  project_role_id INTEGER,                    -- Project role (required if project_id is set)
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  expires_at      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at     TEXT,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (project_role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Global/system roles (e.g., SUPERADMIN) and project roles (OWNER, MAINTAINER, ANALYST, VIEWER)
CREATE TABLE roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,      -- e.g., 'SUPERADMIN', 'OWNER'
  scope       TEXT NOT NULL,             -- 'system' | 'project'
  description TEXT
);

CREATE TABLE permissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,      -- e.g., 'project.read', 'test.write', 'user.manage'
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Projects & membership
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,     -- e.g., 'WEB', 'MOBILE'
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  visibility  TEXT NOT NULL DEFAULT 'private', -- 'private' | 'public'
  settings    TEXT,                      -- JSON for project settings
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_members (
  project_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  role_id    INTEGER NOT NULL,           -- must point to a project-scoped role
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id)    REFERENCES roles(id)  ON DELETE RESTRICT
);

-- API keys (for CI agents)
CREATE TABLE api_keys (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL,           -- store hash, never the raw key
  scopes       TEXT NOT NULL,           -- JSON array of permission keys or role keys
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test data (simplified; extend as needed)
CREATE TABLE test_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id    INTEGER NOT NULL,
  run_key       TEXT,                   -- CI/build identifier
  triggered_by  INTEGER,                -- users.id nullable for CI
  test_suite    TEXT,
  environment   TEXT,
  framework     TEXT,
  tags          TEXT,                   -- JSON array
  metadata      TEXT,                   -- JSON for browser, parallel, workers, etc.
  status        TEXT NOT NULL,          -- 'running'|'passed'|'failed'|'flaky'...
  branch        TEXT,
  commit_sha    TEXT,
  ci_url        TEXT,
  started_at    TEXT NOT NULL,
  finished_at   TEXT,
  summary       TEXT,                   -- JSON for total, passed, failed, etc.
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE test_cases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id   INTEGER NOT NULL,
  suite         TEXT,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL,
  duration      INTEGER,                -- duration in ms
  start_time    TEXT,
  end_time      TEXT,
  error_message TEXT,
  stack_trace   TEXT,
  annotations   TEXT,                   -- JSON array
  metadata      TEXT,                   -- JSON for file, line, column, etc.
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE test_steps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id INTEGER NOT NULL,
  step_order   INTEGER NOT NULL,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,
  duration     INTEGER,                 -- duration in ms
  error        TEXT,
  category     TEXT,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

CREATE TABLE test_artifacts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id INTEGER NOT NULL,
  artifact_id  TEXT NOT NULL,
  type         TEXT NOT NULL,           -- 'screenshot', 'video', 'trace'
  filename     TEXT NOT NULL,
  url          TEXT,
  uploaded_at  TEXT NOT NULL,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_runs_project ON test_runs(project_id);
CREATE INDEX idx_cases_run ON test_cases(test_run_id);
CREATE INDEX idx_steps_case ON test_steps(test_case_id);
CREATE INDEX idx_artifacts_case ON test_artifacts(test_case_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_started_at ON test_runs(started_at);

-- Defect Classification System
CREATE TABLE defect_classifications (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id          INTEGER NOT NULL,
  primary_class         TEXT NOT NULL,       -- 'Application Defect', 'Test Data Issue', 'Automation Script Error', 'Environment Issue'
  sub_class             TEXT,                -- More specific classification
  confidence            REAL DEFAULT 0.0,    -- 0.0 to 1.0 confidence score
  signature_hash        TEXT NOT NULL,       -- Unique identifier for grouping similar failures
  is_manually_classified INTEGER DEFAULT 0,  -- 0=auto, 1=manual
  classified_at         TEXT NOT NULL DEFAULT (datetime('now')),
  classified_by         INTEGER,             -- user_id who manually classified (NULL for auto)
  evidence_data         TEXT,               -- JSON with error details, stack traces, etc.
  suggestions          TEXT,                -- JSON with fix suggestions for automation issues
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (classified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE defect_groups (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  signature_hash       TEXT NOT NULL UNIQUE,
  primary_class        TEXT NOT NULL,
  sub_class            TEXT,
  representative_error TEXT,              -- The "best" error message representing this group
  first_seen          TEXT NOT NULL,
  last_seen           TEXT NOT NULL,
  occurrence_count    INTEGER DEFAULT 1,
  is_resolved         INTEGER DEFAULT 0   -- 0=active, 1=resolved
);

CREATE TABLE defect_group_members (
  group_id         INTEGER NOT NULL,
  test_case_id     INTEGER NOT NULL,
  added_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, test_case_id),
  FOREIGN KEY (group_id) REFERENCES defect_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

CREATE TABLE classification_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name   TEXT NOT NULL,
  primary_class TEXT NOT NULL,
  sub_class   TEXT,
  priority    INTEGER DEFAULT 100,        -- Lower numbers = higher priority
  conditions  TEXT NOT NULL,              -- JSON with rule conditions
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE jira_settings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id    INTEGER NOT NULL,
  base_url      TEXT NOT NULL,
  project_key   TEXT NOT NULL,
  auth_token    TEXT NOT NULL,            -- PAT or other auth
  default_issue_type TEXT DEFAULT 'Bug',
  labels_prefix TEXT DEFAULT 'auto-defect',
  field_mappings TEXT,                    -- JSON mapping classes to Jira fields
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE jira_pushes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL,
  group_id        INTEGER,                -- NULL for individual pushes
  signature_hash  TEXT NOT NULL,
  jira_issue_key  TEXT,                   -- e.g., 'PROJ-123'
  jira_issue_url  TEXT,
  status          TEXT NOT NULL,          -- 'success', 'failed', 'pending'
  error_message   TEXT,                   -- If status = 'failed'
  payload_data    TEXT,                   -- JSON of what was sent to Jira
  pushed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  pushed_by       INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES defect_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (pushed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE defect_audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  classification_id INTEGER NOT NULL,
  action          TEXT NOT NULL,          -- 'created', 'reclassified', 'resolved'
  old_primary_class TEXT,
  new_primary_class TEXT,
  old_sub_class   TEXT,
  new_sub_class   TEXT,
  changed_by      INTEGER,
  changed_at      TEXT NOT NULL DEFAULT (datetime('now')),
  notes           TEXT,
  FOREIGN KEY (classification_id) REFERENCES defect_classifications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Defect indexes
CREATE INDEX idx_defect_classifications_test_case ON defect_classifications(test_case_id);
CREATE INDEX idx_defect_classifications_signature ON defect_classifications(signature_hash);
CREATE INDEX idx_defect_classifications_class ON defect_classifications(primary_class);
CREATE INDEX idx_defect_groups_signature ON defect_groups(signature_hash);
CREATE INDEX idx_defect_groups_class ON defect_groups(primary_class);
CREATE INDEX idx_classification_rules_priority ON classification_rules(priority);
CREATE INDEX idx_jira_pushes_signature ON jira_pushes(signature_hash);
CREATE INDEX idx_defect_audit_log_classification ON defect_audit_log(classification_id);

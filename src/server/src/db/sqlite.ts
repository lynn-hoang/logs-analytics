import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/analytics.db');

export const db = new Database(dbPath);

export function initDatabase(): void {
  // RESOLUTIONS table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resolutions (
      resolution_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // BUGS table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bugs (
      bug_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'open',
      resolution_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (resolution_id) REFERENCES resolutions(resolution_id)
    )
  `);

  // ISSUES table
  // Note: matched_signature_id references signatures in crash_signatures, hang_signatures, or general_signatures
  // We don't use a foreign key constraint since signatures are split across tables by type
  db.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      issue_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      matched_signature_id TEXT,
      bug_id TEXT,
      tenant_id TEXT NOT NULL,
      occurrence_count INTEGER DEFAULT 1,
      admin_viewed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(bug_id)
    )
  `);

  // Add admin_viewed column if it doesn't exist (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE issues ADD COLUMN admin_viewed INTEGER DEFAULT 1`);
  } catch (e) {
    // Column already exists
  }

  // SIGNATURE tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS crash_signatures (
      signature_id TEXT PRIMARY KEY,
      signature TEXT NOT NULL UNIQUE,
      description TEXT,
      resolution_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      FOREIGN KEY (resolution_id) REFERENCES resolutions(resolution_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS hang_signatures (
      signature_id TEXT PRIMARY KEY,
      signature TEXT NOT NULL UNIQUE,
      description TEXT,
      resolution_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      FOREIGN KEY (resolution_id) REFERENCES resolutions(resolution_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS general_signatures (
      signature_id TEXT PRIMARY KEY,
      signature TEXT NOT NULL UNIQUE,
      description TEXT,
      resolution_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      FOREIGN KEY (resolution_id) REFERENCES resolutions(resolution_id)
    )
  `);

  // LOGS table
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      log_id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      type TEXT NOT NULL,
      app_version TEXT NOT NULL,
      os_version TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      machine_id TEXT NOT NULL,
      timestamp TEXT,
      content TEXT NOT NULL,
      metadata TEXT,
      received_at TEXT NOT NULL,
      issue_id TEXT,
      FOREIGN KEY (issue_id) REFERENCES issues(issue_id)
    )
  `);

  // DIAGNOSTIC_CONFIGS table
  // Stores diagnostic configurations per enterprise client
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagnostic_configs (
      config_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL UNIQUE,
      app_name TEXT NOT NULL,
      product_identifier TEXT NOT NULL,
      config_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // CONFIG_NOTIFICATIONS table
  // Notifies tenant admins when engineers update diagnostic configs
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_notifications (
      notification_id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      bug_id TEXT,
      issue_id TEXT,
      changed_by TEXT NOT NULL,
      change_type TEXT NOT NULL,
      change_summary TEXT NOT NULL,
      previous_config_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      deployed_at TEXT,
      FOREIGN KEY (config_id) REFERENCES diagnostic_configs(config_id),
      FOREIGN KEY (bug_id) REFERENCES bugs(bug_id),
      FOREIGN KEY (issue_id) REFERENCES issues(issue_id)
    )
  `);

  console.log('[Database] All tables created in analytics.db');
}

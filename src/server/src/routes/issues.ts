import { Router } from 'express';
import { db } from '../db/sqlite';
import { SignatureProcessor } from '../processor/SignatureProcessor';

const router = Router();

router.get('/', (req, res) => {
  try {
    // Get issues with latest log details
    const stmt = db.prepare(`
      SELECT
        i.issue_id,
        i.type,
        i.status,
        i.tenant_id,
        i.occurrence_count,
        i.admin_viewed,
        i.created_at,
        l.content,
        l.os_version,
        l.app_version,
        l.machine_id
      FROM issues i
      LEFT JOIN logs l ON l.issue_id = i.issue_id
      GROUP BY i.issue_id
      ORDER BY i.created_at DESC
    `);
    const issues = stmt.all();

    // Get stats
    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count
      FROM issues
    `);
    const stats = statsStmt.get() as { total: number; open_count: number; resolved_count: number; closed_count: number };

    // Get OS breakdown from logs
    // macOS version strings look like "Version 15.0 (Build 24A335)"
    // Windows version strings contain "Windows"
    // Linux version strings contain "Linux"
    const osStmt = db.prepare(`
      SELECT
        CASE
          WHEN os_version LIKE '%Mac%' OR os_version LIKE '%Darwin%' THEN 'macOS'
          WHEN os_version LIKE '%Windows%' THEN 'Windows'
          WHEN os_version LIKE '%Linux%' THEN 'Linux'
          WHEN os_version LIKE 'Version %' AND os_version LIKE '%Build%' THEN 'macOS'
          ELSE 'Other'
        END as os_type,
        COUNT(DISTINCT issue_id) as count
      FROM logs
      WHERE issue_id IS NOT NULL
      GROUP BY os_type
    `);
    const osBreakdown = osStmt.all();

    // Get timeline data (issues per day for last 7 days)
    const timelineStmt = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM issues
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    const timeline = timelineStmt.all();

    console.log(`[GET /issues] Returning ${issues.length} issues`);

    res.json({
      issues,
      stats,
      osBreakdown,
      timeline
    });
  } catch (error) {
    console.error('[GET /issues] Error:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

router.get('/:issueId', (req, res) => {
  try {
    const { issueId } = req.params;

    // Get issue details
    const issueStmt = db.prepare(`
      SELECT * FROM issues WHERE issue_id = ?
    `);
    const issue = issueStmt.get(issueId) as {
      issue_id: string;
      type: string;
      status: string;
      matched_signature_id: string | null;
      bug_id: string | null;
      tenant_id: string;
      occurrence_count: number;
      created_at: string;
    } | undefined;

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Get related logs
    const logsStmt = db.prepare(`
      SELECT * FROM logs WHERE issue_id = ? ORDER BY received_at DESC
    `);
    const logs = logsStmt.all(issueId);

    // Get resolution info if issue has a matched signature
    let resolution = null;
    if (issue.matched_signature_id && issue.status === 'resolved') {
      // Query the signatures database (separate from issues.db)
      const allSignatures = SignatureProcessor.getInstance().getAllSignatures();
      const matchedSig = allSignatures.find(s => s.signature_id === issue.matched_signature_id);
      if (matchedSig) {
        resolution = {
          signature: matchedSig.signature,
          description: matchedSig.description,
          resolution_type: matchedSig.resolution_type,
          resolution_content: matchedSig.resolution_content
        };
      }
    }

    // Get bug info if linked
    let bug = null;
    if (issue.bug_id) {
      const bugStmt = db.prepare(`
        SELECT b.*, r.type as resolution_type, r.content as resolution_content
        FROM bugs b
        LEFT JOIN resolutions r ON b.resolution_id = r.resolution_id
        WHERE b.bug_id = ?
      `);
      bug = bugStmt.get(issue.bug_id);
    }

    // Mark issue as viewed by admin (for notification bell)
    const markViewedStmt = db.prepare(`UPDATE issues SET admin_viewed = 1 WHERE issue_id = ?`);
    markViewedStmt.run(issueId);

    res.json({ issue, logs, resolution, bug });
  } catch (error) {
    console.error('[GET /issues/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch issue details' });
  }
});

// PUT /issues/:issueId - Update issue status
router.put('/:issueId', (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'resolved', 'closed', 'require_more_data'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const stmt = db.prepare(`
      UPDATE issues SET status = ? WHERE issue_id = ?
    `);
    const result = stmt.run(status, issueId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    console.log(`[PUT /issues/${issueId}] Updated status to: ${status}`);
    res.json({ message: 'Status updated', issueId, status });
  } catch (error) {
    console.error('[PUT /issues/:id] Error:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// POST /issues/:issueId/logs - Add additional log data to an issue
router.post('/:issueId/logs', (req, res) => {
  try {
    const { issueId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify issue exists
    const issueStmt = db.prepare(`SELECT * FROM issues WHERE issue_id = ?`);
    const issue = issueStmt.get(issueId);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Add new log entry
    const logId = `LOG-${Date.now()}`;
    const insertStmt = db.prepare(`
      INSERT INTO logs (log_id, type, app_version, os_version, tenant_id, machine_id, content, received_at, issue_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      logId,
      (issue as any).type,
      'additional-data',
      'N/A',
      (issue as any).tenant_id,
      'portal-submission',
      content,
      new Date().toISOString(),
      issueId
    );

    console.log(`[POST /issues/${issueId}/logs] Added additional log: ${logId}`);
    res.json({ message: 'Additional data submitted', logId });
  } catch (error) {
    console.error('[POST /issues/:id/logs] Error:', error);
    res.status(500).json({ error: 'Failed to add log data' });
  }
});

// POST /issues/resolve-matching - Match open issues against resolved signatures
router.post('/resolve-matching', (req, res) => {
  try {
    // Get all signatures with resolutions
    const allSignatures = SignatureProcessor.getInstance().getAllSignatures();
    const resolvedSignatures = allSignatures.filter(s => s.resolution_id !== null);

    if (resolvedSignatures.length === 0) {
      return res.json({ message: 'No resolved signatures found', resolvedCount: 0 });
    }

    // Get all open issues with their log content
    const openIssuesStmt = db.prepare(`
      SELECT i.issue_id, i.type, l.content
      FROM issues i
      LEFT JOIN logs l ON l.issue_id = i.issue_id
      WHERE i.status = 'open'
    `);
    const openIssues = openIssuesStmt.all() as Array<{
      issue_id: string;
      type: string;
      content: string | null;
    }>;

    let resolvedCount = 0;

    for (const issue of openIssues) {
      if (!issue.content) continue;

      // Find matching signature of same type
      const matchingSignature = resolvedSignatures.find(sig => {
        if (sig.type !== issue.type) return false;
        return fuzzyMatch(issue.content!, sig.signature);
      });

      if (matchingSignature) {
        // Update issue to resolved and set admin_viewed = 0 for notification bell
        const updateStmt = db.prepare(`
          UPDATE issues
          SET status = 'resolved', matched_signature_id = ?, admin_viewed = 0
          WHERE issue_id = ?
        `);
        updateStmt.run(matchingSignature.signature_id, issue.issue_id);
        resolvedCount++;
        console.log(`[POST /issues/resolve-matching] Resolved issue ${issue.issue_id} with signature ${matchingSignature.signature_id}`);
      }
    }

    res.json({
      message: `Resolved ${resolvedCount} issue(s)`,
      resolvedCount,
      totalOpenIssues: openIssues.length,
      resolvedSignaturesCount: resolvedSignatures.length
    });
  } catch (error) {
    console.error('[POST /issues/resolve-matching] Error:', error);
    res.status(500).json({ error: 'Failed to resolve matching issues' });
  }
});

// Helper function for fuzzy matching
function fuzzyMatch(content: string, signature: string): boolean {
  const contentLower = content.toLowerCase();
  const signatureLower = signature.toLowerCase();

  if (contentLower.includes(signatureLower)) {
    return true;
  }

  const signatureWords = signatureLower.split(/[\s_\-\.]+/).filter(w => w.length > 2);
  const matchedWords = signatureWords.filter(word => contentLower.includes(word));
  const matchRatio = matchedWords.length / signatureWords.length;

  return matchRatio >= 0.8;
}

export default router;

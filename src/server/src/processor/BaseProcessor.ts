import { IngestedLog } from './LogIngestionProcessor';
import { db } from '../db/sqlite';
import { IssueType } from '../models/types';

export class BaseProcessor {
  protected type: IssueType;

  constructor(type: IssueType) {
    this.type = type;
  }

  protected createNewIssue(log: IngestedLog): string {
    const issueId = `ISSUE-${Date.now()}`;
    const bugId = `BUG-${Date.now()}`;
    const createdAt = new Date().toISOString();

    // Create bug ticket (in production, would check for existing bucket first)
    const insertBug = db.prepare(`
      INSERT INTO bugs (bug_id, status, created_at)
      VALUES (?, 'open', ?)
    `);
    insertBug.run(bugId, createdAt);

    // Create issue linked to bug
    const insertIssue = db.prepare(`
      INSERT INTO issues (issue_id, type, status, bug_id, tenant_id, occurrence_count, created_at)
      VALUES (?, ?, 'open', ?, ?, 1, ?)
    `);
    insertIssue.run(issueId, this.type, bugId, log.tenantId, createdAt);

    // Link log to issue
    const updateLog = db.prepare(`
      UPDATE logs SET issue_id = ? WHERE log_id = ?
    `);
    updateLog.run(issueId, log.logId);

    console.log(`[${this.constructor.name}] Created bug: ${bugId}, issue: ${issueId}`);

    return issueId;
  }

  protected fuzzyMatch(content: string, signature: string): boolean {
    // Simple fuzzy match: check if signature appears in content (case-insensitive)
    const contentLower = content.toLowerCase();
    const signatureLower = signature.toLowerCase();

    // Direct containment
    if (contentLower.includes(signatureLower)) {
      return true;
    }

    // Check for partial matches (each word in signature appears in content)
    const signatureWords = signatureLower.split(/[\s_\-\.]+/).filter(w => w.length > 2);
    const matchedWords = signatureWords.filter(word => contentLower.includes(word));
    const matchRatio = matchedWords.length / signatureWords.length;

    // Consider a match if 80% or more of signature words are found
    return matchRatio >= 0.8;
  }

  protected fuzzyMatchSignature(content: string): { signatureId: string; signature: string; resolutionId: string | null } | null {
    const tableName = `${this.type}_signatures`;

    // Load all known signatures for this type from analytics.db
    const stmt = db.prepare(`
      SELECT signature_id, signature, resolution_id FROM ${tableName}
    `);
    const signatures = stmt.all() as { signature_id: string; signature: string; resolution_id: string | null }[];

    // Fuzzy match: check if any known signature is contained in the log content
    for (const sig of signatures) {
      if (this.fuzzyMatch(content, sig.signature)) {
        return {
          signatureId: sig.signature_id,
          signature: sig.signature,
          resolutionId: sig.resolution_id
        };
      }
    }

    return null;
  }
}

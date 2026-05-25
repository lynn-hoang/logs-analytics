import { IngestedLog } from './LogIngestionProcessor';
import { db } from '../db/sqlite';
import { BaseProcessor } from './BaseProcessor';
import { IssueType } from '../models/types';

export class GeneralIssueProcessor extends BaseProcessor {
  private static instance: GeneralIssueProcessor;

  private constructor() {
    super(IssueType.GENERAL);
  }

  static getInstance(): GeneralIssueProcessor {
    if (!GeneralIssueProcessor.instance) {
      GeneralIssueProcessor.instance = new GeneralIssueProcessor();
    }
    return GeneralIssueProcessor.instance;
  }

  async process(log: IngestedLog): Promise<void> {
    const traceId = log.e2eTraceId;
    console.log(`[GeneralIssueProcessor] [traceId: ${traceId}] Processing general issue: ${log.logId}`);

    // 1. Load known signatures and do fuzzy match against log content
    const matchedSignature = this.fuzzyMatchSignature(log.content);

    if (matchedSignature) {
      // 2a. Known issue - create resolved issue with known solution
      console.log(`[GeneralIssueProcessor] [traceId: ${traceId}] Matched signature: ${matchedSignature.signatureId}, resolutionId: ${matchedSignature.resolutionId}`);
      this.createResolvedIssue(log, matchedSignature);
      console.log(`[GeneralIssueProcessor] [traceId: ${traceId}] Notifying admin with resolution: ${matchedSignature.resolutionId}`);
    } else {
      // 2b. Unknown issue - create new open issue
      console.log(`[GeneralIssueProcessor] [traceId: ${traceId}] Unknown general issue - creating new issue`);
      this.createNewIssue(log);
    }
  }

  private createResolvedIssue(log: IngestedLog, matched: { signatureId: string; resolutionId: string | null }): void {
    const issueId = `ISSUE-${Date.now()}`;

    // Create issue with resolved status since we have a known solution
    // Set admin_viewed = 0 to show notification bell for enterprise admin
    const insertIssue = db.prepare(`
      INSERT INTO issues (issue_id, type, status, matched_signature_id, tenant_id, occurrence_count, admin_viewed, created_at)
      VALUES (?, ?, 'resolved', ?, ?, 1, 0, ?)
    `);
    insertIssue.run(issueId, this.type, matched.signatureId, log.tenantId, new Date().toISOString());

    // Link log to issue
    const updateLog = db.prepare(`
      UPDATE logs SET issue_id = ? WHERE log_id = ?
    `);
    updateLog.run(issueId, log.logId);

    console.log(`[GeneralIssueProcessor] Created resolved issue: ${issueId} (matched signature: ${matched.signatureId})`);
  }
}

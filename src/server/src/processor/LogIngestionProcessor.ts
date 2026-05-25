import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/sqlite';
import { InMemoryQueue } from '../queue/InMemoryQueue';

export interface LogPayload {
  type: 'crash' | 'hang' | 'general';
  e2eTraceId?: string;
  appVersion: string;
  osVersion: string;
  tenantId: string;
  machineId: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IngestedLog extends LogPayload {
  logId: string;
  receivedAt: string;
  e2eTraceId: string;
}

export class LogIngestionProcessor {
  private static instance: LogIngestionProcessor;

  private constructor() {}

  static getInstance(): LogIngestionProcessor {
    if (!LogIngestionProcessor.instance) {
      LogIngestionProcessor.instance = new LogIngestionProcessor();
    }
    return LogIngestionProcessor.instance;
  }

  async ingest(payload: LogPayload): Promise<{ logId: string }> {
    const logId = uuidv4();
    const receivedAt = new Date().toISOString();
    const e2eTraceId = payload.e2eTraceId || uuidv4();

    // Validate payload
    this.validate(payload);

    // Enrich with server-side data
    const enrichedLog: IngestedLog = {
      ...payload,
      logId,
      receivedAt,
      e2eTraceId
    };

    // Save to database
    this.saveToDatabase(enrichedLog);

    // Push to queue for processing
    InMemoryQueue.getInstance().enqueue({
      type: payload.type,
      logId,
      payload: enrichedLog
    });

    console.log(`[LogIngestionProcessor] [traceId: ${e2eTraceId}] Ingested log: ${logId} (type: ${payload.type})`);

    return { logId };
  }

  private validate(payload: LogPayload): void {
    const requiredFields = ['type', 'appVersion', 'osVersion', 'tenantId', 'machineId', 'content'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!['crash', 'hang', 'general'].includes(payload.type)) {
      throw new Error(`Invalid log type: ${payload.type}`);
    }
  }

  private saveToDatabase(log: IngestedLog): void {
    const stmt = db.prepare(`
      INSERT INTO logs (log_id, trace_id, type, app_version, os_version, tenant_id, machine_id, timestamp, content, metadata, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.logId,
      log.e2eTraceId,
      log.type,
      log.appVersion,
      log.osVersion,
      log.tenantId,
      log.machineId,
      log.timestamp,
      log.content,
      JSON.stringify(log.metadata || {}),
      log.receivedAt
    );
  }
}

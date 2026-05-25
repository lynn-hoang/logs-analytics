import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/sqlite';

export class SignatureProcessor {
  private static instance: SignatureProcessor;

  private constructor() {
    // Tables are initialized in sqlite.ts
  }

  static getInstance(): SignatureProcessor {
    if (!SignatureProcessor.instance) {
      SignatureProcessor.instance = new SignatureProcessor();
    }
    return SignatureProcessor.instance;
  }

  async addSignature(
    type: 'crash' | 'hang' | 'general',
    signature: string,
    description?: string,
    resolution?: { type: string; content?: string }
  ): Promise<{ signatureId: string; resolutionId?: string }> {
    const signatureId = uuidv4();
    const createdAt = new Date().toISOString();
    const tableName = `${type}_signatures`;

    let resolutionId: string | null = null;

    // Create resolution if provided
    if (resolution?.type) {
      resolutionId = uuidv4();
      const resStmt = db.prepare(`
        INSERT INTO resolutions (resolution_id, type, content, created_at)
        VALUES (?, ?, ?, ?)
      `);
      resStmt.run(resolutionId, resolution.type, resolution.content || null, createdAt);
      console.log(`[SignatureProcessor] Created resolution: ${resolutionId} (type: ${resolution.type})`);
    }

    // Create signature with resolution link
    const stmt = db.prepare(`
      INSERT INTO ${tableName} (signature_id, signature, description, resolution_id, status, created_at)
      VALUES (?, ?, ?, ?, 'open', ?)
    `);
    stmt.run(signatureId, signature, description || null, resolutionId, createdAt);

    console.log(`[SignatureProcessor] Added ${type} signature: ${signatureId}`);

    return { signatureId, resolutionId: resolutionId || undefined };
  }

  getSignature(type: 'crash' | 'hang' | 'general', signature: string): { signatureId: string; resolutionId: string | null; status: string } | null {
    const tableName = `${type}_signatures`;

    const stmt = db.prepare(`
      SELECT signature_id, resolution_id, status FROM ${tableName} WHERE signature = ?
    `);

    const result = stmt.get(signature) as { signature_id: string; resolution_id: string | null; status: string } | undefined;

    if (result) {
      return {
        signatureId: result.signature_id,
        resolutionId: result.resolution_id,
        status: result.status
      };
    }

    return null;
  }

  async updateSignature(
    signatureId: string,
    originalType: 'crash' | 'hang' | 'general',
    newType: 'crash' | 'hang' | 'general',
    signature: string,
    description?: string,
    resolution?: { type: string; content?: string }
  ): Promise<void> {
    const originalTable = `${originalType}_signatures`;
    const createdAt = new Date().toISOString();

    // Get current signature to check for existing resolution
    const getStmt = db.prepare(`SELECT * FROM ${originalTable} WHERE signature_id = ?`);
    const original = getStmt.get(signatureId) as { resolution_id: string | null; created_at: string } | undefined;

    if (!original) {
      throw new Error('Signature not found');
    }

    let resolutionId = original.resolution_id;

    // Handle resolution update
    if (resolution?.type) {
      if (resolutionId) {
        // Update existing resolution
        const updateRes = db.prepare(`
          UPDATE resolutions SET type = ?, content = ? WHERE resolution_id = ?
        `);
        updateRes.run(resolution.type, resolution.content || null, resolutionId);
      } else {
        // Create new resolution
        resolutionId = uuidv4();
        const insertRes = db.prepare(`
          INSERT INTO resolutions (resolution_id, type, content, created_at)
          VALUES (?, ?, ?, ?)
        `);
        insertRes.run(resolutionId, resolution.type, resolution.content || null, createdAt);
      }
    }

    if (originalType === newType) {
      // Update in same table
      const stmt = db.prepare(`
        UPDATE ${originalTable}
        SET signature = ?, description = ?, resolution_id = ?
        WHERE signature_id = ?
      `);
      stmt.run(signature, description || null, resolutionId, signatureId);
    } else {
      // Move to different table
      const newTable = `${newType}_signatures`;

      // Delete from original table
      const deleteStmt = db.prepare(`DELETE FROM ${originalTable} WHERE signature_id = ?`);
      deleteStmt.run(signatureId);

      // Insert into new table
      const insertStmt = db.prepare(`
        INSERT INTO ${newTable} (signature_id, signature, description, resolution_id, status, created_at)
        VALUES (?, ?, ?, ?, 'open', ?)
      `);
      insertStmt.run(signatureId, signature, description || null, resolutionId, original.created_at);
    }

    console.log(`[SignatureProcessor] Updated signature: ${signatureId}`);
  }

  getAllSignatures(): Array<{
    signature_id: string;
    type: string;
    signature: string;
    description: string | null;
    resolution_id: string | null;
    resolution_type: string | null;
    resolution_content: string | null;
    created_at: string;
  }> {
    const results: Array<{
      signature_id: string;
      type: string;
      signature: string;
      description: string | null;
      resolution_id: string | null;
      resolution_type: string | null;
      resolution_content: string | null;
      created_at: string;
    }> = [];

    const types = ['crash', 'hang', 'general'] as const;

    for (const type of types) {
      const tableName = `${type}_signatures`;
      const stmt = db.prepare(`
        SELECT s.signature_id, s.signature, s.description, s.resolution_id, s.created_at,
               r.type as resolution_type, r.content as resolution_content
        FROM ${tableName} s
        LEFT JOIN resolutions r ON s.resolution_id = r.resolution_id
        ORDER BY s.created_at DESC
      `);
      const rows = stmt.all() as Array<{
        signature_id: string;
        signature: string;
        description: string | null;
        resolution_id: string | null;
        resolution_type: string | null;
        resolution_content: string | null;
        created_at: string;
      }>;

      for (const row of rows) {
        results.push({ ...row, type });
      }
    }

    return results;
  }
}

import { Router, Response } from 'express';
import { db } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Store connected clients by tenant
const connectedClients: Map<string, Set<Response>> = new Map();

// GET /configs/subscribe/:tenantId - SSE endpoint for clients to subscribe to config updates
router.get('/subscribe/:tenantId', (req, res) => {
  const { tenantId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Add client to the tenant's set
  if (!connectedClients.has(tenantId)) {
    connectedClients.set(tenantId, new Set());
  }
  connectedClients.get(tenantId)!.add(res);

  console.log(`[SSE] Client connected for tenant: ${tenantId} (total: ${connectedClients.get(tenantId)!.size})`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    connectedClients.get(tenantId)?.delete(res);
    console.log(`[SSE] Client disconnected for tenant: ${tenantId} (remaining: ${connectedClients.get(tenantId)?.size || 0})`);
  });
});

// POST /configs/push - Push config update notification to clients
router.post('/push', (req, res) => {
  try {
    const { configId, tenantId } = req.body;

    if (!configId || !tenantId) {
      return res.status(400).json({ error: 'Missing configId or tenantId' });
    }

    const clients = connectedClients.get(tenantId);
    const clientCount = clients?.size || 0;

    if (clientCount > 0) {
      const message = JSON.stringify({
        type: 'config_update',
        configId,
        tenantId,
        timestamp: new Date().toISOString()
      });

      clients!.forEach(client => {
        client.write(`data: ${message}\n\n`);
      });

      console.log(`[SSE] Pushed config update to ${clientCount} client(s) for tenant: ${tenantId}`);
    }

    res.json({ message: 'Config push sent', clientCount });
  } catch (error) {
    console.error('[POST /configs/push] Error:', error);
    res.status(500).json({ error: 'Failed to push config' });
  }
});

// GET /configs - List all diagnostic configs with latest notification status
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
        dc.config_id,
        dc.tenant_id,
        dc.app_name,
        dc.product_identifier,
        dc.version,
        dc.created_at,
        dc.updated_at,
        cn.status as notification_status,
        cn.created_at as notification_created_at
      FROM diagnostic_configs dc
      LEFT JOIN (
        SELECT config_id, status, created_at,
          ROW_NUMBER() OVER (PARTITION BY config_id ORDER BY created_at DESC) as rn
        FROM config_notifications
      ) cn ON dc.config_id = cn.config_id AND cn.rn = 1
      ORDER BY dc.updated_at DESC
    `);
    const configs = stmt.all();

    res.json({ configs });
  } catch (error) {
    console.error('[GET /configs] Error:', error);
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

// GET /configs/by-id/:configId - Get full config by ID (for portal editing)
router.get('/by-id/:configId', (req, res) => {
  try {
    const { configId } = req.params;

    const stmt = db.prepare(`
      SELECT
        dc.*,
        cn.status as notification_status,
        cn.notification_id
      FROM diagnostic_configs dc
      LEFT JOIN (
        SELECT config_id, status, notification_id,
          ROW_NUMBER() OVER (PARTITION BY config_id ORDER BY created_at DESC) as rn
        FROM config_notifications
      ) cn ON dc.config_id = cn.config_id AND cn.rn = 1
      WHERE dc.config_id = ?
    `);
    const config = stmt.get(configId) as {
      config_id: string;
      tenant_id: string;
      app_name: string;
      product_identifier: string;
      config_json: string;
      version: number;
      created_at: string;
      updated_at: string;
      notification_status: string | null;
      notification_id: string | null;
    } | undefined;

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json({ config });
  } catch (error) {
    console.error('[GET /configs/by-id/:configId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// GET /configs/:tenantId - Get config for a specific tenant (used by desktop client)
router.get('/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;

    const stmt = db.prepare(`
      SELECT * FROM diagnostic_configs WHERE tenant_id = ?
    `);
    const config = stmt.get(tenantId) as {
      config_id: string;
      tenant_id: string;
      app_name: string;
      product_identifier: string;
      config_json: string;
      version: number;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!config) {
      return res.status(404).json({ error: 'Config not found for tenant' });
    }

    // Return parsed config with version for client consumption
    const parsedConfig = JSON.parse(config.config_json);
    res.json({ ...parsedConfig, version: config.version });
  } catch (error) {
    console.error('[GET /configs/:tenantId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /configs - Create or update a diagnostic config
router.post('/', (req, res) => {
  try {
    const { tenantId, appName, productIdentifier, config } = req.body;

    if (!tenantId || !appName || !productIdentifier || !config) {
      return res.status(400).json({ error: 'Missing required fields: tenantId, appName, productIdentifier, config' });
    }

    const now = new Date().toISOString();
    const configJson = JSON.stringify(config);

    // Check if config exists for this tenant
    const existingStmt = db.prepare(`SELECT config_id, version FROM diagnostic_configs WHERE tenant_id = ?`);
    const existing = existingStmt.get(tenantId) as { config_id: string; version: number } | undefined;

    if (existing) {
      // Update existing config and bump version
      const newVersion = existing.version + 1;
      const updateStmt = db.prepare(`
        UPDATE diagnostic_configs
        SET app_name = ?, product_identifier = ?, config_json = ?, version = ?, updated_at = ?
        WHERE tenant_id = ?
      `);
      updateStmt.run(appName, productIdentifier, configJson, newVersion, now, tenantId);

      // Create notification for tenant
      const notificationId = uuidv4();
      const notifyStmt = db.prepare(`
        INSERT INTO config_notifications (notification_id, config_id, tenant_id, changed_by, change_type, change_summary, status, created_at)
        VALUES (?, ?, ?, ?, 'config_update', ?, 'pending', ?)
      `);
      const changedBy = req.body.changedBy || 'engineer';
      const changeSummary = `Diagnostic configuration updated to version ${newVersion}`;
      notifyStmt.run(notificationId, existing.config_id, tenantId, changedBy, changeSummary, now);

      console.log(`[POST /configs] Updated config for tenant: ${tenantId} (version: ${newVersion})`);
      res.json({ message: 'Config updated', tenantId, version: newVersion });
    } else {
      // Create new config with version 1
      const configId = uuidv4();
      const insertStmt = db.prepare(`
        INSERT INTO diagnostic_configs (config_id, tenant_id, app_name, product_identifier, config_json, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `);
      insertStmt.run(configId, tenantId, appName, productIdentifier, configJson, now, now);

      console.log(`[POST /configs] Created config for tenant: ${tenantId} (version: 1)`);
      res.status(201).json({ message: 'Config created', configId, tenantId, version: 1 });
    }
  } catch (error) {
    console.error('[POST /configs] Error:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// GET /configs/notifications/:tenantId - Get pending notifications for a tenant
router.get('/notifications/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;

    const stmt = db.prepare(`
      SELECT
        cn.notification_id,
        cn.config_id,
        cn.tenant_id,
        cn.changed_by,
        cn.change_type,
        cn.change_summary,
        cn.status,
        cn.created_at,
        cn.acknowledged_at,
        dc.app_name,
        dc.version
      FROM config_notifications cn
      JOIN diagnostic_configs dc ON cn.config_id = dc.config_id
      WHERE cn.tenant_id = ? AND cn.status = 'pending'
      ORDER BY cn.created_at DESC
    `);
    const notifications = stmt.all(tenantId);

    res.json({ notifications });
  } catch (error) {
    console.error('[GET /configs/notifications/:tenantId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /configs/notifications/:notificationId/acknowledge - Acknowledge a notification
router.put('/notifications/:notificationId/acknowledge', (req, res) => {
  try {
    const { notificationId } = req.params;
    const { acknowledgedBy } = req.body;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE config_notifications
      SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ?
      WHERE notification_id = ?
    `);
    const result = stmt.run(acknowledgedBy || 'tenant', now, notificationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    console.log(`[PUT /configs/notifications/:id/acknowledge] Acknowledged notification: ${notificationId}`);
    res.json({ message: 'Notification acknowledged' });
  } catch (error) {
    console.error('[PUT /configs/notifications/:id/acknowledge] Error:', error);
    res.status(500).json({ error: 'Failed to acknowledge notification' });
  }
});

// PUT /configs/:configId/status - Update notification status
router.put('/:configId/status', (req, res) => {
  try {
    const { configId } = req.params;
    const { status, updatedBy } = req.body;

    const validStatuses = ['pending', 'acknowledged', 'deployed', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: pending, acknowledged, deployed, or dismissed' });
    }

    const now = new Date().toISOString();

    // Check if there's an existing notification for this config
    const existingStmt = db.prepare(`
      SELECT notification_id FROM config_notifications
      WHERE config_id = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    const existing = existingStmt.get(configId) as { notification_id: string } | undefined;

    if (existing) {
      // Update existing notification
      const updateStmt = db.prepare(`
        UPDATE config_notifications
        SET status = ?,
            acknowledged_by = CASE WHEN ? IN ('acknowledged', 'deployed', 'dismissed') THEN ? ELSE acknowledged_by END,
            acknowledged_at = CASE WHEN ? IN ('acknowledged', 'deployed', 'dismissed') AND acknowledged_at IS NULL THEN ? ELSE acknowledged_at END,
            deployed_at = CASE WHEN ? = 'deployed' THEN ? ELSE deployed_at END
        WHERE notification_id = ?
      `);
      updateStmt.run(status, status, updatedBy || 'engineer', status, now, status, now, existing.notification_id);

      console.log(`[PUT /configs/:configId/status] Updated notification status to: ${status}`);
      res.json({ message: 'Status updated', status });
    } else {
      // Create a new notification with the status
      const configStmt = db.prepare(`SELECT tenant_id FROM diagnostic_configs WHERE config_id = ?`);
      const config = configStmt.get(configId) as { tenant_id: string } | undefined;

      if (!config) {
        return res.status(404).json({ error: 'Config not found' });
      }

      const notificationId = uuidv4();
      const insertStmt = db.prepare(`
        INSERT INTO config_notifications (notification_id, config_id, tenant_id, changed_by, change_type, change_summary, status, created_at, acknowledged_by, acknowledged_at, deployed_at)
        VALUES (?, ?, ?, ?, 'status_update', 'Status updated via portal', ?, ?, ?, ?, ?)
      `);

      const acknowledgedBy = ['acknowledged', 'deployed', 'dismissed'].includes(status) ? (updatedBy || 'engineer') : null;
      const acknowledgedAt = ['acknowledged', 'deployed', 'dismissed'].includes(status) ? now : null;
      const deployedAt = status === 'deployed' ? now : null;

      insertStmt.run(notificationId, configId, config.tenant_id, updatedBy || 'engineer', status, now, acknowledgedBy, acknowledgedAt, deployedAt);

      console.log(`[PUT /configs/:configId/status] Created notification with status: ${status}`);
      res.json({ message: 'Status created', status });
    }
  } catch (error) {
    console.error('[PUT /configs/:configId/status] Error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /configs/:tenantId - Delete a config
router.delete('/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;

    const stmt = db.prepare(`DELETE FROM diagnostic_configs WHERE tenant_id = ?`);
    const result = stmt.run(tenantId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Config not found' });
    }

    console.log(`[DELETE /configs] Deleted config for tenant: ${tenantId}`);
    res.json({ message: 'Config deleted', tenantId });
  } catch (error) {
    console.error('[DELETE /configs] Error:', error);
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

export default router;

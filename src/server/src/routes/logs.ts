import { Router, Request, Response } from 'express';
import { LogIngestionProcessor } from '../processor/LogIngestionProcessor';

const router = Router();

// POST /logs - Submit logs from DiagnosticService
router.post('/', async (req: Request, res: Response) => {
  try {
    const logPayload = req.body;

    if (!logPayload || !logPayload.type) {
      return res.status(400).json({ error: 'Missing required field: type' });
    }

    const result = await LogIngestionProcessor.getInstance().ingest(logPayload);

    res.status(201).json({
      message: 'Log received',
      logId: result.logId
    });
  } catch (error) {
    console.error('[POST /logs] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { SignatureProcessor } from '../processor/SignatureProcessor';

const router = Router();

// GET /signatures - List all signatures
router.get('/', async (_req: Request, res: Response) => {
  try {
    const signatures = SignatureProcessor.getInstance().getAllSignatures();
    console.log(`[GET /signatures] Returning ${signatures.length} signatures`);
    res.json({ signatures });
  } catch (error) {
    console.error('[GET /signatures] Error:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// POST /signatures - Add a new signature
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, signature, description, resolution } = req.body;

    if (!type || !signature) {
      return res.status(400).json({ error: 'Missing required fields: type, signature' });
    }

    if (!['crash', 'hang', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be: crash, hang, or general' });
    }

    const result = await SignatureProcessor.getInstance().addSignature(type, signature, description, resolution);

    res.status(201).json({
      message: 'Signature added',
      signatureId: result.signatureId
    });
  } catch (error) {
    console.error('[POST /signatures] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /signatures/:id - Update a signature
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { originalType, type, signature, description, resolution } = req.body;

    if (!originalType || !type || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['crash', 'hang', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be: crash, hang, or general' });
    }

    await SignatureProcessor.getInstance().updateSignature(id, originalType, type, signature, description, resolution);

    res.json({ message: 'Signature updated' });
  } catch (error) {
    console.error('[PUT /signatures] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

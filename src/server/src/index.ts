import express from 'express';
import cors from 'cors';
import logsRouter from './routes/logs';
import signaturesRouter from './routes/signatures';
import issuesRouter from './routes/issues';
import configsRouter from './routes/configs';
import { initDatabase } from './db/sqlite';
import { Orchestrator } from './processor/Orchestrator';
import { SignatureProcessor } from './processor/SignatureProcessor';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Routes
app.use('/logs', logsRouter);
app.use('/signatures', signaturesRouter);
app.use('/issues', issuesRouter);
app.use('/configs', configsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize
async function start() {
  // Initialize databases
  initDatabase();
  SignatureProcessor.getInstance();
  console.log('[Server] Databases initialized');

  // Start orchestrator
  Orchestrator.getInstance().start();
  console.log('[Server] Orchestrator started');

  // Start server
  app.listen(PORT, () => {
    console.log(`[Server] Listening on http://localhost:${PORT}`);
  });
}

start();

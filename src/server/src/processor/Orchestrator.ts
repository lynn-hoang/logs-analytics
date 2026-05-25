import { InMemoryQueue, QueueItem } from '../queue/InMemoryQueue';
import { CrashProcessor } from './CrashProcessor';
import { HangProcessor } from './HangProcessor';
import { GeneralIssueProcessor } from './GeneralIssueProcessor';

export class Orchestrator {
  private static instance: Orchestrator;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): Orchestrator {
    if (!Orchestrator.instance) {
      Orchestrator.instance = new Orchestrator();
    }
    return Orchestrator.instance;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.pollInterval = setInterval(() => this.processQueue(), 1000);
    console.log('[Orchestrator] Started polling queue');
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log('[Orchestrator] Stopped');
  }

  private async processQueue(): Promise<void> {
    const queue = InMemoryQueue.getInstance();
    const item = queue.dequeue();

    if (!item) return;

    const traceId = item.payload.e2eTraceId;
    console.log(`[Orchestrator] [traceId: ${traceId}] Processing: ${item.logId} (type: ${item.type})`);

    try {
      await this.routeToService(item);
    } catch (error) {
      console.error(`[Orchestrator] [traceId: ${traceId}] Error processing ${item.logId}:`, error);
      // TODO: Add to dead-letter queue or retry logic
    }
  }

  private async routeToService(item: QueueItem): Promise<void> {
    switch (item.type) {
      case 'crash':
        await CrashProcessor.getInstance().process(item.payload);
        break;
      case 'hang':
        await HangProcessor.getInstance().process(item.payload);
        break;
      case 'general':
        await GeneralIssueProcessor.getInstance().process(item.payload);
        break;
      default:
        console.warn(`[Orchestrator] Unknown log type: ${item.type}`);
    }
  }
}

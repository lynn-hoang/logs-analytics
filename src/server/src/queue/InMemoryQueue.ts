import { IngestedLog } from '../processor/LogIngestionProcessor';

export interface QueueItem {
  type: 'crash' | 'hang' | 'general';
  logId: string;
  payload: IngestedLog;
}

export class InMemoryQueue {
  private static instance: InMemoryQueue;
  private queue: QueueItem[] = [];

  private constructor() {}

  static getInstance(): InMemoryQueue {
    if (!InMemoryQueue.instance) {
      InMemoryQueue.instance = new InMemoryQueue();
    }
    return InMemoryQueue.instance;
  }

  enqueue(item: QueueItem): void {
    this.queue.push(item);
    console.log(`[Queue] Enqueued: ${item.logId} (queue size: ${this.queue.length})`);
  }

  dequeue(): QueueItem | undefined {
    return this.queue.shift();
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

import { EventEmitter } from 'node:events';
import type { StreamEvent } from '@command/shared';

/** In-process pub/sub between services (publishers) and SSE connections (subscribers). */
export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // One listener per open SSE connection.
    this.emitter.setMaxListeners(0);
  }

  publish(event: StreamEvent): void {
    this.emitter.emit('event', event);
  }

  /** Returns the unsubscribe function. */
  subscribe(listener: (event: StreamEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  listenerCount(): number {
    return this.emitter.listenerCount('event');
  }
}

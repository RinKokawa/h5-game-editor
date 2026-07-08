/**
 * EventEmitter — minimal typed event hub.
 *
 * Used by DocumentService to publish `DocumentChange` events. Subscribers
 * receive every emission; there is no per-event filtering. Listeners are
 * called synchronously in subscription order; throwing listeners will
 * interrupt subsequent ones (callers should wrap defensively).
 */

export type Unsubscribe = () => void;

export class EventEmitter<T> {
  private readonly listeners: Set<(payload: T) => void> = new Set();

  subscribe(listener: (payload: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(payload: T): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

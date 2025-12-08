import { useCallback, useEffect, useRef } from 'react';
import { FinanceEvent, FinanceEventType } from '@/types/finance';

type EventCallback = (event: FinanceEvent) => void;

// Event Bus simples para comunicação entre telas
class FinanceEventBus {
  private listeners: Map<FinanceEventType, Set<EventCallback>> = new Map();

  subscribe(type: FinanceEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  emit(event: FinanceEvent): void {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(cb => cb(event));
    }

    // Log para debug
    console.log('[FinanceEvent]', event.type, event.payload);
  }

  subscribeAll(callback: EventCallback): () => void {
    const unsubscribers: (() => void)[] = [];
    const allTypes: FinanceEventType[] = [
      'transaction.created',
      'transaction.updated',
      'transaction.deleted',
      'transfer.created',
      'investment.linked',
      'loan.payment'
    ];

    allTypes.forEach(type => {
      unsubscribers.push(this.subscribe(type, callback));
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
}

// Singleton
export const financeEventBus = new FinanceEventBus();

// Hook para usar eventos
export function useFinanceEvents() {
  const emitEvent = useCallback((
    type: FinanceEventType,
    payload: FinanceEvent['payload']
  ) => {
    financeEventBus.emit({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }, []);

  return { emitEvent };
}

// Hook para ouvir eventos específicos
export function useFinanceEventListener(
  type: FinanceEventType,
  callback: EventCallback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = financeEventBus.subscribe(type, (event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, [type]);
}

// Hook para ouvir todos os eventos
export function useAllFinanceEvents(callback: EventCallback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = financeEventBus.subscribeAll((event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, []);
}

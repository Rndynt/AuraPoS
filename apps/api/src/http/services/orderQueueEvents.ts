import { Response } from 'express';

type QueueListener = {
  tenantId: string;
  res: Response;
};

const listeners = new Set<QueueListener>();

export function subscribeOrderQueue(tenantId: string, res: Response) {
  const listener: QueueListener = { tenantId, res };
  listeners.add(listener);

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

  return () => {
    listeners.delete(listener);
  };
}

export function emitOrderQueueChanged(tenantId: string, payload: Record<string, unknown>) {
  const message = `event: order_queue_updated\ndata: ${JSON.stringify({
    tenantId,
    ...payload,
    ts: Date.now(),
  })}\n\n`;

  for (const listener of listeners) {
    if (listener.tenantId === tenantId) {
      listener.res.write(message);
    }
  }
}

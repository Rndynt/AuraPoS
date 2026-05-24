/**
 * useKitchenChannel — BroadcastChannel for offline Kitchen Display System (KDS).
 *
 * Sender (POS):  called when a local offline order is created with kitchen intent.
 * Receiver (KDS): listens for new/updated tickets and updates the display instantly.
 *
 * This mirrors the CFD (Customer Facing Display) channel pattern exactly.
 * Works same-device only — cross-device requires network (handled by server tickets).
 */

import { useEffect, useRef, useCallback } from "react";
import type { LocalKitchenTicket, KitchenTicketStatus } from "@pos/offline";

export const KDS_CHANNEL = "aurapos-kds-v1";

// ─── Message types ────────────────────────────────────────────────────────────

export type KDSMessage =
  | { type: "ticket_added";   ticket: LocalKitchenTicket }
  | { type: "status_updated"; ticketId: string; status: KitchenTicketStatus }
  | { type: "ticket_removed"; ticketId: string }
  | { type: "ping" };

// ─── Sender hook (used in POS) ────────────────────────────────────────────────

export function useKitchenChannelSender() {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    channelRef.current = new BroadcastChannel(KDS_CHANNEL);
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  const sendToKDS = useCallback((msg: KDSMessage) => {
    channelRef.current?.postMessage(msg);

    // localStorage snapshot so KDS cold-starts with latest tickets
    if (msg.type === "ticket_added") {
      try {
        const raw = localStorage.getItem(`${KDS_CHANNEL}:tickets`) ?? "[]";
        const tickets: LocalKitchenTicket[] = JSON.parse(raw);
        // prepend new ticket, keep last 50
        const updated = [msg.ticket, ...tickets.filter((t) => t.id !== msg.ticket.id)].slice(0, 50);
        localStorage.setItem(`${KDS_CHANNEL}:tickets`, JSON.stringify(updated));
      } catch {}
    }
  }, []);

  return { sendToKDS };
}

// ─── Receiver hook (used in KDS page) ────────────────────────────────────────

export function useKitchenChannelReceiver(
  onMessage: (msg: KDSMessage) => void
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const bc = new BroadcastChannel(KDS_CHANNEL);
    bc.onmessage = (e: MessageEvent<KDSMessage>) => {
      onMessageRef.current(e.data);
    };

    return () => bc.close();
  }, []);
}

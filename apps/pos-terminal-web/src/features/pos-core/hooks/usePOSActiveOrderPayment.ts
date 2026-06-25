import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchOrderForPOS } from "../services/posOrderApiService";
import { resolvePOSActiveOrderPaymentAmount } from "../services/posPaymentAmountService";
import type { POSLifecycleOrder } from "../services/posLifecycleService";

export type POSPendingOrderPayment = { orderId: string; totalAmount: number; orderNumber: string; order?: POSLifecycleOrder } | null;

export type POSActiveOrderPaymentPreparationResult =
  | { ok: true; pendingPayment: NonNullable<POSPendingOrderPayment> }
  | { ok: false; reason: string };

export async function preparePOSActiveOrderPayment(
  order: POSLifecycleOrder,
  fetchOrder: (orderId: string) => Promise<POSLifecycleOrder | null | undefined> = fetchOrderForPOS,
): Promise<POSActiveOrderPaymentPreparationResult> {
  const fullOrder = await fetchOrder(order.id);
  const hydratedOrder = fullOrder ?? order;
  const result = resolvePOSActiveOrderPaymentAmount(hydratedOrder);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return {
    ok: true,
    pendingPayment: {
      orderId: hydratedOrder.id,
      totalAmount: result.amount,
      orderNumber: result.orderNumber,
      order: hydratedOrder,
    },
  };
}

export function usePOSActiveOrderPayment(input: {
  setPendingOrderForPayment: Dispatch<SetStateAction<POSPendingOrderPayment>>;
  openPaymentDialog: () => void;
}) {
  const { toast } = useToast();
  const [payingActiveOrderId, setPayingActiveOrderId] = useState<string | null>(null);

  const payActiveOrder = async (order: POSLifecycleOrder) => {
    setPayingActiveOrderId(order.id);
    try {
      const preparation = await preparePOSActiveOrderPayment(order);
      if (!preparation.ok) {
        toast({ title: "Pembayaran diblokir", description: preparation.reason, variant: "destructive" });
        return;
      }
      input.setPendingOrderForPayment(preparation.pendingPayment);
      input.openPaymentDialog();
    } catch (error) {
      toast({
        title: "Gagal memuat detail order",
        description: error instanceof Error ? error.message : "Detail pesanan lengkap tidak dapat dimuat.",
        variant: "destructive",
      });
    } finally {
      setPayingActiveOrderId(null);
    }
  };

  return { payActiveOrder, payingActiveOrderId };
}

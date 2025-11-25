import { Clock, CheckCircle, PlayCircle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order } from "@pos/domain/orders/types";

interface KitchenTicketProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: string) => void;
  isLoading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "border-orange-500";
    case "preparing":
      return "border-yellow-500";
    case "ready":
      return "border-green-500";
    default:
      return "border-slate-200";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Waiting";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    default:
      return status;
  }
};

const formatTime = (date: Date | string | undefined) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

export function KitchenTicket({
  order,
  onUpdateStatus,
  isLoading = false,
}: KitchenTicketProps) {
  const handleNextStatus = () => {
    let nextStatus = "";
    switch (order.status) {
      case "confirmed":
        nextStatus = "preparing";
        break;
      case "preparing":
        nextStatus = "ready";
        break;
      case "ready":
        nextStatus = "completed";
        break;
    }
    if (nextStatus) {
      onUpdateStatus(order.id, nextStatus);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-xl shadow-sm border-t-4 ${getStatusColor(
        order.status
      )} overflow-hidden`}
      data-testid={`ticket-${order.id}`}
    >
      {/* Ticket Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-lg text-slate-800">
              {order.order_number || order.id}
            </span>
            {order.table_number && (
              <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                Meja {order.table_number}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-500 truncate max-w-[150px]">
            {order.customer_name || "Walk-in"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 flex items-center justify-end gap-1">
            <Clock size={12} /> {formatTime(order.created_at)}
          </span>
          <span className="text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 flex-1 space-y-3">
        {order.items && order.items.length > 0 ? (
          order.items.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="font-black text-slate-700 w-6 text-center bg-slate-100 rounded text-sm py-0.5 h-fit">
                {item.quantity || 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {item.product_name}
                </p>
                {item.variant_name && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.variant_name}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-orange-600 italic mt-0.5">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">No items</p>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100">
        {order.status === "confirmed" && (
          <Button
            onClick={handleNextStatus}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-10"
            data-testid={`button-start-prep-${order.id}`}
          >
            <PlayCircle size={16} className="mr-2" /> Start Preparing
          </Button>
        )}
        {order.status === "preparing" && (
          <Button
            onClick={handleNextStatus}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-10"
            data-testid={`button-ready-${order.id}`}
          >
            <CheckCircle size={16} className="mr-2" /> Mark Ready
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            onClick={handleNextStatus}
            disabled={isLoading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm h-10"
            data-testid={`button-complete-${order.id}`}
          >
            <CheckSquare size={16} className="mr-2" /> Complete
          </Button>
        )}
      </div>
    </div>
  );
}

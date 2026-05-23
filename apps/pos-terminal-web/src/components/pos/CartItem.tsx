import type { CartItem as CartItemType } from "@/hooks/useCart";
import { Minus, Plus } from "lucide-react";

type CartItemProps = {
  item: CartItemType;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  getItemPrice: (item: CartItemType) => number;
};

export function CartItem({ item, onUpdateQty, getItemPrice }: CartItemProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const totalPrice = getItemPrice(item) * item.quantity;

  return (
    <div
      className="flex gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm"
      data-testid={`cart-item-${item.id}`}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 mt-0.5">
        {item.product.image_url && (
          <img src={item.product.image_url} className="w-full h-full object-cover" alt={item.product.name} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Nama item — full width, wrap jika panjang */}
        <p className="font-bold text-slate-800 text-sm leading-tight" data-testid={`text-cart-product-${item.id}`}>
          {item.product.name}
        </p>

        {/* Opsi/varian */}
        {(item.variant || item.selectedOptions?.length > 0) && (
          <p className="text-[10px] text-slate-400 leading-tight">
            {[item.variant?.name, ...(item.selectedOptions?.map(o => o.option_name) ?? [])].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Row bawah: harga | qty control */}
        <div className="flex items-center justify-end mt-0.5">
          <div className="flex items-center gap-2">
            {/* Harga sejajar dengan qty */}
            <span className="text-sm font-bold text-blue-600 tabular-nums" data-testid={`text-item-total-${item.id}`}>
              {fmt(totalPrice)}
            </span>

            {/* Qty control */}
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
              <button
                onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                className="w-5 h-5 bg-white rounded shadow-sm flex items-center justify-center"
                data-testid={`button-qty-minus-${item.id}`}
              >
                <Minus size={10} />
              </button>
              <span className="text-xs font-black w-4 text-center tabular-nums" data-testid={`text-qty-${item.id}`}>
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                className="w-5 h-5 bg-white rounded shadow-sm flex items-center justify-center"
                data-testid={`button-qty-plus-${item.id}`}
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

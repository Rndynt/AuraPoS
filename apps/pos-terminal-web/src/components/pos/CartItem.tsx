import type { CartItem as CartItemType } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";

type CartItemProps = {
  item: CartItemType;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  getItemPrice: (item: CartItemType) => number;
};

export function CartItem({ item, onUpdateQty, onRemove, getItemPrice }: CartItemProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const itemPrice = getItemPrice(item);
  const totalPrice = itemPrice * item.quantity;

  return (
    <div 
      className="flex gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative mb-2 last:mb-0" 
      data-testid={`cart-item-${item.id}`}
    >
      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
        {item.product.image_url && (
          <img
            src={item.product.image_url}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate pr-4" data-testid={`text-cart-product-${item.id}`}>
            {item.product.name}
          </h4>
          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm whitespace-nowrap" data-testid={`text-item-total-${item.id}`}>
            {formatPrice(totalPrice)}
          </span>
        </div>
        {(item.variant || (item.selectedOptions && item.selectedOptions.length > 0)) && (
          <div className='text-[10px] text-slate-500 dark:text-slate-400 my-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 w-max max-w-full'>
            {item.variant && (
              <span className='block truncate'>
                • {item.variant.name}
              </span>
            )}
            {item.selectedOptions && item.selectedOptions.length > 0 && (
              item.selectedOptions.map((option, idx) => (
                <span key={idx} className='block truncate'>
                  • {option.option_name}
                </span>
              ))
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => onRemove(item.id)}
            className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            data-testid={`button-remove-${item.id}`}
          >
            <Trash2 size={14} />
          </button>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              className="w-6 h-6 bg-white dark:bg-slate-900 rounded shadow-sm flex items-center justify-center hover-elevate active-elevate-2"
              data-testid={`button-qty-minus-${item.id}`}
            >
              <Minus size={12} />
            </button>
            <span className="text-xs font-bold w-4 text-center" data-testid={`text-qty-${item.id}`}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              className="w-6 h-6 bg-white dark:bg-slate-900 rounded shadow-sm flex items-center justify-center hover-elevate active-elevate-2"
              data-testid={`button-qty-plus-${item.id}`}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

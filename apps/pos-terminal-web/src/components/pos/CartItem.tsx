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
      className='flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative'
      data-testid={`cart-item-${item.id}`}
    >
      <div className='w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0'>
        {item.product.image_url && (
          <img
            src={item.product.image_url}
            className='w-full h-full object-cover'
            alt={item.product.name}
          />
        )}
      </div>
      <div className='flex-1 flex flex-col justify-between min-w-0'>
        <div className='flex justify-between items-start'>
          <h4 className='font-bold text-slate-700 text-sm truncate pr-4' data-testid={`text-cart-product-${item.id}`}>
            {item.product.name}
          </h4>
          <span className='text-blue-600 font-bold text-sm whitespace-nowrap' data-testid={`text-item-total-${item.id}`}>
            {formatPrice(totalPrice)}
          </span>
        </div>
        {(item.variant || (item.selectedOptions && item.selectedOptions.length > 0)) && (
          <div className='text-[10px] text-slate-500 my-1 bg-slate-50 p-1.5 rounded border border-slate-100 w-max max-w-full'>
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
        <div className='flex items-center justify-between mt-2'>
          <button
            onClick={() => onRemove(item.id)}
            className='text-slate-300 hover:text-red-500'
            data-testid={`button-remove-${item.id}`}
          >
            <Trash2 size={14} />
          </button>
          <div className='flex items-center gap-3 bg-slate-50 rounded-lg p-0.5 border border-slate-100'>
            <button
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              className='w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center'
              data-testid={`button-qty-minus-${item.id}`}
            >
              <Minus size={12} />
            </button>
            <span className='text-xs font-bold w-4 text-center' data-testid={`text-qty-${item.id}`}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              className='w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center'
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

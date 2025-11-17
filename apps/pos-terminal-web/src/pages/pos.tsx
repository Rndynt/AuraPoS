import { useState } from "react";
import { Sidebar } from "@/components/pos/Sidebar";
import { ProductArea } from "@/components/pos/ProductArea";
import { CartPanel } from "@/components/pos/CartPanel";
import { MobileCartDrawer } from "@/components/pos/MobileCartDrawer";
import { ProductOptionsDialog } from "@/components/pos/ProductOptionsDialog";
import { PartialPaymentDialog } from "@/components/pos/PartialPaymentDialog";
import { useCart } from "@/hooks/useCart";
import { useFeatures } from "@/hooks/useFeatures";
import { useProducts, useCreateOrder, useCreateKitchenTicket } from "@/lib/api/hooks";
import type { Product, ProductVariant } from "@/../../packages/domain/catalog/types";
import type { SelectedOption } from "@/../../packages/domain/orders/types";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function POSPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [partialPaymentDialogOpen, setPartialPaymentDialogOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isSubmittingPartialPayment, setIsSubmittingPartialPayment] = useState(false);
  const cart = useCart();
  const { hasFeature } = useFeatures();
  const { toast } = useToast();

  // Fetch products from backend
  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts({ isActive: true });
  const products = productsData?.products || [];

  // Mutations
  const createOrderMutation = useCreateOrder();

  const handleAddToCart = (product: Product) => {
    // Check if product has variants or option_groups that require selection
    const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
    const hasOptionGroups = product.option_groups && product.option_groups.length > 0;

    if (hasVariants || hasOptionGroups) {
      // Show dialog for variant/option selection
      setSelectedProduct(product);
    } else {
      // Add directly to cart with no options
      cart.addItem(product, undefined, [], 1);
      toast({
        title: "Added to cart",
        description: `${product.name} added to cart`,
      });
    }
  };

  const handleVariantAdd = (
    product: Product, 
    variant: ProductVariant | undefined, 
    selectedOptions: SelectedOption[], 
    qty: number
  ) => {
    cart.addItem(product, variant, selectedOptions, qty);
    setSelectedProduct(null);
    
    // Build description with variant and options
    let description = product.name;
    if (variant) {
      description += ` (${variant.name})`;
    }
    if (selectedOptions.length > 0) {
      const optionsText = selectedOptions.map(opt => opt.option_name).join(", ");
      description += ` - ${optionsText}`;
    }

    toast({
      title: "Added to cart",
      description,
    });
  };

  const handleCharge = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before charging",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderItems = cart.toBackendOrderItems();
      const result = await createOrderMutation.mutateAsync({
        items: orderItems,
      });

      toast({
        title: "Payment successful",
        description: `Order #${result.order.order_number} - Total: Rp ${result.pricing.total_amount.toLocaleString("id-ID")}`,
      });
      
      cart.clearCart();
    } catch (error) {
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Failed to process order",
        variant: "destructive",
      });
    }
  };

  const handlePartialPayment = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before making a payment",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the order first
      const orderItems = cart.toBackendOrderItems();
      const orderResult = await createOrderMutation.mutateAsync({
        items: orderItems,
      });

      // Set the order ID and open the dialog
      setCurrentOrderId(orderResult.order.id);
      setPartialPaymentDialogOpen(true);
    } catch (error) {
      toast({
        title: "Failed to create order",
        description: error instanceof Error ? error.message : "Failed to create order for partial payment",
        variant: "destructive",
      });
    }
  };

  const handlePartialPaymentSubmit = async (
    amount: number,
    paymentMethod: "cash" | "card" | "ewallet" | "other",
    transactionRef?: string,
    notes?: string
  ) => {
    if (!currentOrderId) {
      toast({
        title: "No order found",
        description: "Please try again",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingPartialPayment(true);

      // Record the partial payment for the already-created order
      const paymentResult = await fetch(`/api/orders/${currentOrderId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": "demo-tenant",
        },
        credentials: "include",
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          transaction_ref: transactionRef,
          notes,
        }),
      });

      if (!paymentResult.ok) {
        throw new Error("Failed to record payment");
      }

      const paymentData = await paymentResult.json();

      // Show success toast with remaining balance
      const remainingAmount = paymentData.data.remainingAmount;
      const orderNumber = paymentData.data.order?.order_number || currentOrderId.slice(0, 8);
      toast({
        title: "Partial payment recorded",
        description: `Order #${orderNumber} - Paid: Rp ${amount.toLocaleString("id-ID")} - Remaining: Rp ${remainingAmount.toLocaleString("id-ID")}`,
      });

      // Clear cart and close dialog
      cart.clearCart();
      setPartialPaymentDialogOpen(false);
      setCurrentOrderId(null);
    } catch (error) {
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Failed to process partial payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPartialPayment(false);
    }
  };

  const handleKitchenTicket = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before sending to kitchen",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create an order
      const orderItems = cart.toBackendOrderItems();
      const orderResult = await createOrderMutation.mutateAsync({
        items: orderItems,
      });

      // Then create kitchen ticket for the order
      const ticketResult = await fetch(`/api/orders/${orderResult.order.id}/kitchen-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": "demo-tenant",
        },
        credentials: "include",
      });

      if (!ticketResult.ok) {
        throw new Error("Failed to create kitchen ticket");
      }

      const ticketData = await ticketResult.json();

      toast({
        title: "Kitchen ticket sent",
        description: `Order #${orderResult.order.order_number} sent to kitchen`,
      });
      
      cart.clearCart();
    } catch (error) {
      toast({
        title: "Failed to send kitchen ticket",
        description: error instanceof Error ? error.message : "Failed to create kitchen ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-muted/40">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Product Area */}
      <ProductArea 
        products={products}
        isLoading={productsLoading}
        error={productsError}
        onAddToCart={handleAddToCart} 
      />

      {/* Cart Panel - Hidden on mobile */}
      <div className="hidden lg:block w-[360px]">
        <CartPanel
          items={cart.items}
          onUpdateQty={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClear={cart.clearCart}
          getItemPrice={cart.getItemPrice}
          subtotal={cart.subtotal}
          tax={cart.tax}
          serviceCharge={cart.serviceCharge}
          total={cart.total}
          onCharge={handleCharge}
          onPartialPayment={handlePartialPayment}
          onKitchenTicket={handleKitchenTicket}
          hasPartialPayment={hasFeature("partial_payment")}
          hasKitchenTicket={hasFeature("kitchen_ticket")}
        />
      </div>

      {/* Mobile Cart Button - Shows on mobile/tablet when cart panel is hidden */}
      {cart.itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-md">
          <Button
            size="lg"
            className="h-12 md:h-14 px-4 md:px-6 gap-2 md:gap-3 shadow-lg w-full text-sm md:text-base"
            onClick={() => setMobileCartOpen(true)}
            data-testid="button-view-cart-mobile"
          >
            <ShoppingCart className="w-4 md:w-5 h-4 md:h-5" />
            <span className="hidden sm:inline">View Cart</span>
            <Badge variant="secondary" className="ml-1">
              {cart.itemCount}
            </Badge>
            <span className="ml-auto font-semibold">
              Rp {cart.total.toLocaleString("id-ID")}
            </span>
          </Button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      <MobileCartDrawer
        open={mobileCartOpen}
        onOpenChange={setMobileCartOpen}
        items={cart.items}
        onUpdateQty={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
        getItemPrice={cart.getItemPrice}
        subtotal={cart.subtotal}
        tax={cart.tax}
        serviceCharge={cart.serviceCharge}
        total={cart.total}
        onCharge={() => {
          handleCharge();
          setMobileCartOpen(false);
        }}
        onPartialPayment={handlePartialPayment}
        onKitchenTicket={handleKitchenTicket}
        hasPartialPayment={hasFeature("partial_payment")}
        hasKitchenTicket={hasFeature("kitchen_ticket")}
      />

      {/* Product Options Dialog */}
      <ProductOptionsDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleVariantAdd}
      />

      {/* Partial Payment Dialog */}
      <PartialPaymentDialog
        open={partialPaymentDialogOpen}
        onClose={() => setPartialPaymentDialogOpen(false)}
        onSubmit={handlePartialPaymentSubmit}
        cartTotal={cart.total}
        isSubmitting={isSubmittingPartialPayment}
      />
    </div>
  );
}

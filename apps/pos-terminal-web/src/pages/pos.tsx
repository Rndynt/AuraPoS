import { useState, useEffect, useMemo } from "react";
import { ProductArea } from "@/components/pos/ProductArea";
import { CartPanel } from "@/components/pos/CartPanel";
import { MobileCartDrawer } from "@/components/pos/MobileCartDrawer";
import { ProductOptionsDialog } from "@/components/pos/ProductOptionsDialog";
import { PartialPaymentDialog } from "@/components/pos/PartialPaymentDialog";
import { useCart } from "@/hooks/useCart";
import { useFeatures } from "@/hooks/useFeatures";
import { useProducts, useCreateOrder, useCreateKitchenTicket, useOrderTypes } from "@/lib/api/hooks";
import type { Product, ProductVariant } from "@/../../packages/domain/catalog/types";
import type { SelectedOption } from "@/../../packages/domain/orders/types";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getActiveTenantId } from "@/lib/tenant";

export default function POSPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [partialPaymentDialogOpen, setPartialPaymentDialogOpen] = useState(false);
  const [isSubmittingPartialPayment, setIsSubmittingPartialPayment] = useState(false);
  const [selectedOrderTypeId, setSelectedOrderTypeId] = useState<string | null>(null);
  const cart = useCart();
  const { hasFeature } = useFeatures();
  const { toast } = useToast();

  // Fetch products from backend
  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts({ isActive: true });
  const products = productsData?.products || [];

  // Fetch order types for tenant
  const { data: orderTypes, isLoading: orderTypesLoading } = useOrderTypes();

  // Filter only active order types - defensive check even though API already filters
  const activeOrderTypes = useMemo(() => {
    return orderTypes?.filter(ot => ot.isActive === true) || [];
  }, [orderTypes]);

  // Auto-select first ACTIVE order type when loaded
  useEffect(() => {
    if (!orderTypesLoading && activeOrderTypes.length > 0 && !selectedOrderTypeId) {
      setSelectedOrderTypeId(activeOrderTypes[0].id);
    }
  }, [activeOrderTypes, orderTypesLoading, selectedOrderTypeId]);

  // Mutations
  const createOrderMutation = useCreateOrder();
  const createKitchenTicketMutation = useCreateKitchenTicket();

  const hasPartialPayment = hasFeature("partial_payment");
  const hasKitchenTicket = hasFeature("kitchen_ticket");

  const ensureCartHasItems = () => {
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before continuing",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateOrderType = () => {
    if (!selectedOrderTypeId) {
      toast({
        title: "Order type required",
        description: "Please select an order type before continuing",
        variant: "destructive",
      });
      return false;
    }

    // Validate that selected order type is active
    const isValidOrderType = activeOrderTypes.some(ot => ot.id === selectedOrderTypeId);
    if (!isValidOrderType) {
      toast({
        title: "Invalid order type",
        description: "The selected order type is no longer available. Please select a valid order type.",
        variant: "destructive",
      });
      setSelectedOrderTypeId(null);
      return false;
    }

    return true;
  };

  const buildOrderPayload = () => ({
    items: cart.toBackendOrderItems(),
    tax_rate: cart.taxRate,
    service_charge_rate: cart.serviceChargeRate,
    order_type_id: selectedOrderTypeId || undefined,
    customer_name: cart.customerName || undefined,
    table_number: cart.tableNumber || undefined,
  });

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
    if (!ensureCartHasItems()) return;
    if (!validateOrderType()) return;

    try {
      const result = await createOrderMutation.mutateAsync(buildOrderPayload());

      toast({
        title: "Payment successful",
        description: `Order #${result.order.order_number} - Total: Rp ${result.pricing.total_amount.toLocaleString("id-ID")}`,
      });
      
      cart.clearCart();
    } catch (error) {
      let errorMessage = "Failed to process order";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Try to extract more details from API error response
      const apiError = error as any;
      if (apiError?.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError?.body?.message) {
        errorMessage = apiError.body.message;
      }
      
      console.error("Payment error details:", error);
      
      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePartialPayment = () => {
    if (!hasPartialPayment) return;
    if (!ensureCartHasItems()) return;
    if (!validateOrderType()) return;
    setPartialPaymentDialogOpen(true);
    setMobileCartOpen(false);
  };

  const handlePartialPaymentSubmit = async (
    amount: number,
    paymentMethod: "cash" | "card" | "ewallet" | "other",
    transactionRef?: string,
    notes?: string
  ) => {
    if (!hasPartialPayment) return;
    if (!ensureCartHasItems()) {
      setPartialPaymentDialogOpen(false);
      return;
    }

    try {
      setIsSubmittingPartialPayment(true);

      const orderResult = await createOrderMutation.mutateAsync(buildOrderPayload());

      const paymentResult = await fetch(`/api/orders/${orderResult.order.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getActiveTenantId(),
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
        throw new Error((await paymentResult.text()) || "Failed to record payment");
      }

      const paymentData = await paymentResult.json();

      // Show success toast with remaining balance
      const remainingAmount = paymentData.data.remainingAmount;
      const orderNumber = paymentData.data.order?.order_number || orderResult.order.order_number;
      toast({
        title: "Partial payment recorded",
        description: `Order #${orderNumber} - Paid: Rp ${amount.toLocaleString("id-ID")} - Remaining: Rp ${remainingAmount.toLocaleString("id-ID")}`,
      });

      // Clear cart and close dialog
      cart.clearCart();
      setPartialPaymentDialogOpen(false);
      setMobileCartOpen(false);
    } catch (error) {
      let errorMessage = "Failed to process partial payment";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Try to extract more details from API error response
      const apiError = error as any;
      if (apiError?.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError?.body?.message) {
        errorMessage = apiError.body.message;
      }
      
      console.error("Partial payment error details:", error);
      
      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPartialPayment(false);
    }
  };

  const handleKitchenTicket = async () => {
    if (!ensureCartHasItems()) return;
    if (!validateOrderType()) return;

    try {
      const orderResult = await createOrderMutation.mutateAsync(buildOrderPayload());

      await createKitchenTicketMutation.mutateAsync({
        orderId: orderResult.order.id,
      });

      toast({
        title: "Kitchen ticket sent",
        description: `Order #${orderResult.order.order_number} sent to kitchen`,
      });

      cart.clearCart();
      setMobileCartOpen(false);
    } catch (error) {
      toast({
        title: "Failed to send kitchen ticket",
        description: error instanceof Error ? error.message : "Failed to create kitchen ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 overflow-x-hidden w-full max-w-[100vw]">
      {/* Main Product Area */}
      <ProductArea 
        products={products}
        isLoading={productsLoading}
        error={productsError}
        onAddToCart={handleAddToCart}
        orderTypes={activeOrderTypes}
        orderTypesLoading={orderTypesLoading}
        selectedOrderTypeId={selectedOrderTypeId}
        onSelectOrderType={setSelectedOrderTypeId}
      />

      {/* Cart Panel - Hidden on mobile */}
      <div className="hidden lg:block w-[360px] h-full">
        <CartPanel
          items={cart.items}
          onUpdateQty={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClear={cart.clearCart}
          getItemPrice={cart.getItemPrice}
          subtotal={cart.subtotal}
          taxRate={cart.taxRate}
          tax={cart.tax}
          serviceChargeRate={cart.serviceChargeRate}
          serviceCharge={cart.serviceCharge}
          total={cart.total}
          onCharge={handleCharge}
          onPartialPayment={handlePartialPayment}
          onKitchenTicket={handleKitchenTicket}
          hasPartialPayment={hasPartialPayment}
          hasKitchenTicket={hasKitchenTicket}
          customerName={cart.customerName}
          setCustomerName={cart.setCustomerName}
          orderNumber={cart.orderNumber}
          tableNumber={cart.tableNumber}
          setTableNumber={cart.setTableNumber}
          paymentMethod={cart.paymentMethod}
          setPaymentMethod={cart.setPaymentMethod}
        />
      </div>

      {/* Mobile Cart Button - Shows on mobile/tablet when cart panel is hidden */}
      {cart.itemCount > 0 && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
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
        taxRate={cart.taxRate}
        tax={cart.tax}
        serviceChargeRate={cart.serviceChargeRate}
        serviceCharge={cart.serviceCharge}
        total={cart.total}
        onCharge={() => {
          handleCharge();
          setMobileCartOpen(false);
        }}
        onPartialPayment={handlePartialPayment}
        onKitchenTicket={handleKitchenTicket}
        hasPartialPayment={hasPartialPayment}
        hasKitchenTicket={hasKitchenTicket}
        customerName={cart.customerName}
        setCustomerName={cart.setCustomerName}
        orderNumber={cart.orderNumber}
        tableNumber={cart.tableNumber}
        setTableNumber={cart.setTableNumber}
        paymentMethod={cart.paymentMethod}
        setPaymentMethod={cart.setPaymentMethod}
      />

      {/* Product Options Dialog */}
      <ProductOptionsDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleVariantAdd}
      />

      {/* Partial Payment Dialog */}
      {hasPartialPayment && (
        <PartialPaymentDialog
          open={partialPaymentDialogOpen}
          onClose={() => setPartialPaymentDialogOpen(false)}
          onSubmit={handlePartialPaymentSubmit}
          cartTotal={cart.total}
          isSubmitting={isSubmittingPartialPayment}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { ProductArea } from "@/components/pos/ProductArea";
import { CartPanel } from "@/components/pos/CartPanel";
import { MobileCartDrawer } from "@/components/pos/MobileCartDrawer";
import { OrderQueue } from "@/components/kitchen-display/OrderQueue";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";
import { ProductOptionsDialog } from "@/components/pos/ProductOptionsDialog";
import { PartialPaymentDialog } from "@/components/pos/PartialPaymentDialog";
import { OrderTypeSelectionDialog } from "@/components/pos/OrderTypeSelectionDialog";
import type { OrderTypeSelectionResult } from "@/components/pos/OrderTypeSelectionDialog";
import { useCart } from "@/hooks/useCart";
import { useFeatures } from "@/hooks/useFeatures";
import { useProducts, useCreateOrder, useUpdateOrder, useCreateKitchenTicket, useOrderTypes, useRecordPayment, useOrders } from "@/lib/api/hooks";
import type { Product, ProductVariant } from "@pos/domain/catalog/types";
import type { SelectedOption, Order } from "@pos/domain/orders/types";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ShoppingBag, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getActiveTenantId } from "@/lib/tenant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function POSPage() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const continueOrderId = urlParams.get("continueOrderId");
  const [, setLocation] = useLocation();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [partialPaymentDialogOpen, setPartialPaymentDialogOpen] = useState(false);
  const [orderTypeSelectionDialogOpen, setOrderTypeSelectionDialogOpen] = useState(false);
  const [isSubmittingPartialPayment, setIsSubmittingPartialPayment] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isProcessingQuickCharge, setIsProcessingQuickCharge] = useState(false);
  const cart = useCart();
  const { hasFeature } = useFeatures();
  const { toast } = useToast();

  // Fetch products from backend
  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts({ isActive: true });
  const products = productsData?.products || [];

  // Fetch orders for queue display
  const { data: ordersData, refetch: refetchOrders } = useOrders();
  const orders: Order[] = ordersData?.orders || [];

  // Fetch order types for tenant
  const { data: orderTypes, isLoading: orderTypesLoading } = useOrderTypes();

  // Filter only active order types - defensive check even though API already filters
  const activeOrderTypes = useMemo(() => {
    return orderTypes?.filter(ot => ot.isActive === true) || [];
  }, [orderTypes]);

  // Load order into cart if continueOrderId is provided
  const loadedOrderRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (continueOrderId && loadedOrderRef.current !== continueOrderId) {
      loadedOrderRef.current = continueOrderId;
      
      const loadOrderIntoCart = async () => {
        try {
          const tenantId = localStorage.getItem("tenantId") || "demo-tenant";
          const response = await fetch(`/api/orders/${continueOrderId}`, {
            headers: {
              "x-tenant-id": tenantId,
            },
          });
          if (!response.ok) throw new Error("Failed to fetch order");
          
          const json = await response.json();
          const fullOrder = json.data;
          
          // Clear cart first to remove any stale data
          cart.clearCart();
          
          // Load order into cart with fresh state
          cart.loadOrder(fullOrder);
          
          toast({
            title: "Order loaded",
            description: `Order #${fullOrder.orderNumber} for Table ${fullOrder.tableNumber} loaded. Continue editing and submit to save changes.`,
          });
        } catch (error) {
          console.error("Error loading order:", error);
          toast({
            title: "Error loading order",
            description: "Failed to load order into cart",
            variant: "destructive",
          });
        }
      };
      loadOrderIntoCart();
    }
  }, [continueOrderId]);

  // Auto-select first ACTIVE order type when loaded (only if not already in cart)
  useEffect(() => {
    if (!orderTypesLoading && activeOrderTypes.length > 0 && !cart.selectedOrderTypeId) {
      cart.setSelectedOrderTypeId(activeOrderTypes[0].id);
    }
  }, [activeOrderTypes, orderTypesLoading, cart]);

  // Mutations
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const createKitchenTicketMutation = useCreateKitchenTicket();
  const recordPaymentMutation = useRecordPayment();

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
    if (!cart.selectedOrderTypeId) {
      toast({
        title: "Order type required",
        description: "Please select an order type before continuing",
        variant: "destructive",
      });
      return false;
    }

    // Validate that selected order type is active
    const isValidOrderType = activeOrderTypes.some(ot => ot.id === cart.selectedOrderTypeId);
    if (!isValidOrderType) {
      toast({
        title: "Invalid order type",
        description: "The selected order type is no longer available. Please select a valid order type.",
        variant: "destructive",
      });
      cart.setSelectedOrderTypeId(null);
      return false;
    }

    return true;
  };

  const buildOrderPayload = () => ({
    items: cart.toBackendOrderItems(),
    tax_rate: cart.taxRate,
    service_charge_rate: cart.serviceChargeRate,
    order_type_id: cart.selectedOrderTypeId || undefined,
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

  const handleUpdateContinueOrder = async () => {
    console.log("🔴 [UPDATE] handleUpdateContinueOrder called, continueOrderId:", continueOrderId);
    console.log("🔴 [UPDATE] Cart items:", cart.items.length, cart.items);
    
    if (!ensureCartHasItems()) {
      console.log("🔴 [UPDATE] No items in cart - aborting");
      return;
    }
    
    if (!continueOrderId) {
      console.log("🔴 [UPDATE] No continueOrderId - aborting");
      toast({
        title: "Error",
        description: "No order ID found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessingQuickCharge(true);
      console.log("🔴 [UPDATE] Building order payload...");
      
      const items = cart.toBackendOrderItems();
      console.log("🔴 [UPDATE] Backend items:", items);
      
      const orderPayload = {
        items,
        tax_rate: cart.taxRate,
        service_charge_rate: cart.serviceChargeRate,
        order_type_id: cart.selectedOrderTypeId,
        customer_name: cart.customerName || undefined,
        table_number: cart.tableNumber || undefined,
      };
      
      console.log("🔴 [UPDATE] Full payload:", orderPayload);
      
      // Update the existing order
      console.log("🔴 [UPDATE] Calling mutation for order:", continueOrderId);
      const orderResult = await updateOrderMutation.mutateAsync({
        orderId: continueOrderId,
        ...orderPayload,
      });
      
      console.log("🔴 [UPDATE] Success! Response:", orderResult);
      
      setIsProcessingQuickCharge(false);
      toast({
        title: "Order updated",
        description: `Order updated successfully`,
      });
      
      cart.clearCart();
      setMobileCartOpen(false);
    } catch (error) {
      console.error("🔴 [UPDATE] Error caught:", error);
      
      let errorMessage = "Failed to update order";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("🔴 [UPDATE] Error message:", errorMessage);
      }
      const apiError = error as any;
      if (apiError?.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError?.body?.message) {
        errorMessage = apiError.body.message;
      }
      
      setIsProcessingQuickCharge(false);
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  const handleCharge = async () => {
    console.log("🟡 [CHARGE] handleCharge called, continueOrderId:", continueOrderId);
    
    if (!ensureCartHasItems()) {
      console.log("🟡 [CHARGE] No items - aborting");
      return;
    }
    
    // If continuing an order, update it directly without dialog
    if (continueOrderId) {
      console.log("🟡 [CHARGE] Continuing existing order:", continueOrderId);
      await handleUpdateContinueOrder();
      return;
    }
    
    console.log("🟡 [CHARGE] Creating new order");
    
    // P2 Quick Charge Path - check if order type already selected (NEW ORDERS ONLY)
    if (cart.selectedOrderTypeId) {
      // Get the selected order type metadata
      const selectedOrderType = activeOrderTypes.find(ot => ot.id === cart.selectedOrderTypeId);
      
      if (selectedOrderType) {
        // Check if order type requires table number
        const needsTable = selectedOrderType.needTableNumber === true;
        
        // If table is required but not set, open dialog for table entry
        if (needsTable && !cart.tableNumber) {
          setOrderTypeSelectionDialogOpen(true);
          setMobileCartOpen(false);
          return;
        }
        
        // All metadata ready - direct charge without dialog
        setIsProcessingQuickCharge(true);
        try {
          const orderPayload = {
            items: cart.toBackendOrderItems(),
            tax_rate: cart.taxRate,
            service_charge_rate: cart.serviceChargeRate,
            order_type_id: cart.selectedOrderTypeId,
            customer_name: cart.customerName || undefined,
            table_number: cart.tableNumber || undefined,
          };
          
          // Create the order
          const orderResult = await createOrderMutation.mutateAsync(orderPayload);
          
          // Auto-pay on direct charge (quick cash sales workflow)
          await recordPaymentMutation.mutateAsync({
            orderId: orderResult.order.id,
            amount: orderResult.pricing.total_amount,
            payment_method: cart.paymentMethod,
          });
          
          // Show success message
          setTimeout(() => {
            setIsProcessingQuickCharge(false);
            toast({
              title: "Order completed & paid",
              description: `Order #${orderResult.order.order_number} - Total: Rp ${orderResult.pricing.total_amount.toLocaleString("id-ID")} (Paid)`,
            });
          }, 500);
          
          cart.clearCart();
          setMobileCartOpen(false);
        } catch (error) {
          let errorMessage = "Failed to process order";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          const apiError = error as any;
          if (apiError?.response?.data?.message) {
            errorMessage = apiError.response.data.message;
          } else if (apiError?.body?.message) {
            errorMessage = apiError.body.message;
          }
          
          console.error("Quick charge error details:", error);
          
          setIsProcessingQuickCharge(false);
          toast({
            title: "Order failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }
    }
    
    // No order type selected - open dialog for selection
    setOrderTypeSelectionDialogOpen(true);
    setMobileCartOpen(false);
  };

  const handleOrderTypeConfirm = async (result: OrderTypeSelectionResult) => {
    try {
      setIsSubmittingOrder(true);

      if (!result.orderTypeId) {
        toast({
          title: "Order type required",
          description: "Please select an order type before continuing",
          variant: "destructive",
        });
        return;
      }

      // Build order payload with order type and table number from dialog
      const orderPayload = {
        items: cart.toBackendOrderItems(),
        tax_rate: cart.taxRate,
        service_charge_rate: cart.serviceChargeRate,
        order_type_id: result.orderTypeId,
        customer_name: cart.customerName || undefined,
        table_number: result.tableNumber || undefined,
      };

      // Decide whether to create new order or update existing one
      let orderResult;
      if (continueOrderId) {
        // Update existing order
        orderResult = await updateOrderMutation.mutateAsync({
          orderId: continueOrderId,
          ...orderPayload,
        });
      } else {
        // Create new order
        orderResult = await createOrderMutation.mutateAsync(orderPayload);
      }

      // If mark as paid, record full payment
      if (result.markAsPaid) {
        await recordPaymentMutation.mutateAsync({
          orderId: orderResult.order.id,
          amount: orderResult.pricing.total_amount,
          payment_method: cart.paymentMethod,
        });

        toast({
          title: "Order completed & paid",
          description: `Order #${orderResult.order.order_number} - Total: Rp ${orderResult.pricing.total_amount.toLocaleString("id-ID")} (Paid)`,
        });
      } else {
        toast({
          title: "Order created",
          description: `Order #${orderResult.order.order_number} - Total: Rp ${orderResult.pricing.total_amount.toLocaleString("id-ID")}`,
        });
      }

      // Update selected order type and table number in cart state
      cart.setSelectedOrderTypeId(result.orderTypeId);
      if (result.tableNumber) {
        cart.setTableNumber(result.tableNumber);
      }

      // Clear cart
      cart.clearCart();
      setOrderTypeSelectionDialogOpen(false);
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

      console.error("Order creation error details:", error);

      toast({
        title: "Order failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handlePartialPayment = () => {
    if (!hasPartialPayment) return;
    if (!ensureCartHasItems()) return;
    if (!validateOrderType()) return;
    setPartialPaymentDialogOpen(true);
    setMobileCartOpen(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const tenantId = getActiveTenantId();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update order status");
      }

      // Refetch orders to update queue
      await refetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Gagal",
        description: "Gagal memperbarui status order",
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
    <div className="flex flex-1 min-h-0 h-full w-full max-w-[100vw]">
      {/* Main Product Area with Order Queue */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Order Queue inside ProductArea */}
        {orders.length > 0 && (
          <div className="border-b border-slate-200 bg-white flex-shrink-0">
            <OrderQueue
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          </div>
        )}

        <ProductArea
          products={products}
          isLoading={productsLoading}
          error={productsError}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* Cart Panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:flex-col w-[360px] min-h-0 h-full overflow-hidden">
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
          isProcessing={isProcessingQuickCharge}
          customerName={cart.customerName}
          setCustomerName={cart.setCustomerName}
          orderNumber={cart.orderNumber}
          tableNumber={cart.tableNumber}
          setTableNumber={cart.setTableNumber}
          paymentMethod={cart.paymentMethod}
          setPaymentMethod={cart.setPaymentMethod}
          orderType={cart.orderType}
          setOrderType={cart.setOrderType}
          continueOrderId={continueOrderId}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <UnifiedBottomNav
        cartCount={cart.items.length}
        onCartClick={() => setMobileCartOpen(true)}
      />

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
        isProcessing={isProcessingQuickCharge}
        customerName={cart.customerName}
        setCustomerName={cart.setCustomerName}
        orderNumber={cart.orderNumber}
        tableNumber={cart.tableNumber}
        setTableNumber={cart.setTableNumber}
        paymentMethod={cart.paymentMethod}
        setPaymentMethod={cart.setPaymentMethod}
        orderType={cart.orderType}
        setOrderType={cart.setOrderType}
        continueOrderId={continueOrderId}
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

      {/* Order Type Selection Dialog */}
      <OrderTypeSelectionDialog
        open={orderTypeSelectionDialogOpen}
        onClose={() => setOrderTypeSelectionDialogOpen(false)}
        onConfirm={handleOrderTypeConfirm}
        orderTypes={orderTypes || []}
        orderTypesLoading={orderTypesLoading}
        cartTotal={cart.total}
        isSubmitting={isSubmittingOrder}
        initialSelectedOrderTypeId={cart.selectedOrderTypeId}
      />

      {/* Quick Charge Processing Dialog */}
      <Dialog open={isProcessingQuickCharge} onOpenChange={setIsProcessingQuickCharge}>
        <DialogContent className="sm:max-w-[300px]" data-testid="dialog-quick-charge-processing">
          <DialogHeader>
            <DialogTitle>Processing Order</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-center text-sm text-muted-foreground">
              Creating order and recording payment...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

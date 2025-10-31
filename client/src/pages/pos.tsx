import { useState } from "react";
import { Sidebar } from "@/components/pos/Sidebar";
import { ProductArea } from "@/components/pos/ProductArea";
import { CartPanel } from "@/components/pos/CartPanel";
import { MobileCartDrawer } from "@/components/pos/MobileCartDrawer";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { useCart } from "@/hooks/useCart";
import { useFeatures } from "@/hooks/useFeatures";
import { Product } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function POSPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const cart = useCart();
  const { features, hasFeature } = useFeatures();
  const { toast } = useToast();

  const handleAddToCart = (product: Product) => {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
    } else {
      cart.addItem(product, undefined, 1);
      toast({
        title: "Added to cart",
        description: `${product.name} added to cart`,
      });
    }
  };

  const handleVariantAdd = (product: Product, variant: any, qty: number) => {
    cart.addItem(product, variant, qty);
    setSelectedProduct(null);
    toast({
      title: "Added to cart",
      description: `${product.name}${variant ? ` (${variant.name})` : ""} added to cart`,
    });
  };

  const handleCharge = () => {
    console.log("Processing payment...");
    toast({
      title: "Payment successful",
      description: `Total: Rp ${cart.total.toLocaleString("id-ID")}`,
    });
    cart.clearCart();
  };

  const handlePartialPayment = () => {
    console.log("Processing partial payment...");
    toast({
      title: "Partial payment",
      description: "Down payment recorded",
    });
  };

  const handleKitchenTicket = () => {
    console.log("Sending to kitchen...");
    toast({
      title: "Kitchen ticket sent",
      description: "Order sent to kitchen printer",
    });
  };

  return (
    <div className="flex h-screen bg-muted/40">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Product Area */}
      <ProductArea onAddToCart={handleAddToCart} />

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
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Button
            size="lg"
            className="h-14 px-6 gap-3 shadow-lg"
            onClick={() => setMobileCartOpen(true)}
            data-testid="button-view-cart-mobile"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>View Cart</span>
            <Badge variant="secondary" className="ml-1">
              {cart.itemCount}
            </Badge>
            <span className="ml-2 font-semibold">
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

      {/* Variant Selector Dialog */}
      {selectedProduct && (
        <VariantSelector
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={handleVariantAdd}
        />
      )}
    </div>
  );
}

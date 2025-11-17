import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, Banknote, DollarSign } from "lucide-react";

type PartialPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    paymentMethod: "cash" | "card" | "ewallet" | "other",
    transactionRef?: string,
    notes?: string
  ) => void;
  cartTotal: number;
  isSubmitting?: boolean;
};

export function PartialPaymentDialog({
  open,
  onClose,
  onSubmit,
  cartTotal,
  isSubmitting = false,
}: PartialPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "ewallet" | "other"
  >("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate remaining balance
  const numericAmount = parseFloat(amount) || 0;
  const remainingBalance = cartTotal - numericAmount;

  // Validation
  useEffect(() => {
    if (!amount) {
      setError("");
      return;
    }

    if (numericAmount <= 0) {
      setError("Amount must be greater than 0");
    } else if (numericAmount > cartTotal) {
      setError("Amount cannot exceed total");
    } else {
      setError("");
    }
  }, [amount, numericAmount, cartTotal]);

  const isValid = !error && numericAmount > 0 && numericAmount <= cartTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit(
      numericAmount,
      paymentMethod,
      transactionRef || undefined,
      notes || undefined
    );
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setAmount("");
      setPaymentMethod("cash");
      setTransactionRef("");
      setNotes("");
      setError("");
    }
  }, [open]);

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case "cash":
        return <Banknote className="w-4 h-4" />;
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "ewallet":
        return <Wallet className="w-4 h-4" />;
      case "other":
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-partial-payment">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Partial Payment (Down Payment)</DialogTitle>
            <DialogDescription>
              Enter the amount to be paid now. The remaining balance can be
              paid later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Total Amount Display */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Total</span>
                <span
                  className="font-semibold tabular-nums"
                  data-testid="text-order-total"
                >
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Payment Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={cartTotal}
                step="1000"
                data-testid="input-payment-amount"
                className={error ? "border-destructive" : ""}
              />
              {error && (
                <p
                  className="text-sm text-destructive"
                  data-testid="text-amount-error"
                >
                  {error}
                </p>
              )}
            </div>

            {/* Remaining Balance Display */}
            {numericAmount > 0 && !error && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Remaining Balance
                  </span>
                  <span
                    className="font-semibold tabular-nums"
                    data-testid="text-remaining-balance"
                  >
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">
                Payment Method <span className="text-destructive">*</span>
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as typeof paymentMethod)
                }
              >
                <SelectTrigger
                  id="payment-method"
                  data-testid="select-payment-method"
                >
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon()}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash" data-testid="option-cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="card" data-testid="option-card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Card
                    </div>
                  </SelectItem>
                  <SelectItem value="ewallet" data-testid="option-ewallet">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      E-Wallet
                    </div>
                  </SelectItem>
                  <SelectItem value="other" data-testid="option-other">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Reference (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="transaction-ref">
                Transaction Reference (Optional)
              </Label>
              <Input
                id="transaction-ref"
                type="text"
                placeholder="e.g., TRX12345 or Card #1234"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                data-testid="input-transaction-ref"
              />
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              data-testid="button-submit-payment"
            >
              {isSubmitting ? "Processing..." : `Pay ${formatCurrency(numericAmount)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// @ts-nocheck - React 19 compatibility with shadcn/ui components
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, Banknote, DollarSign, Loader2 } from "lucide-react";
import type { PaymentMethod } from "@/hooks/useCart";

type PaymentMethodDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  cartTotal: number;
  isSubmitting?: boolean;
  defaultPaymentMethod?: PaymentMethod;
};

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Tunai (Cash)", icon: Banknote },
  { value: "card", label: "Kartu Debit/Kredit", icon: CreditCard },
  { value: "ewallet", label: "E-Wallet (GoPay, OVO, dll)", icon: Wallet },
  { value: "other", label: "Lainnya", icon: DollarSign },
];

export function PaymentMethodDialog({
  open,
  onClose,
  onConfirm,
  cartTotal,
  isSubmitting = false,
  defaultPaymentMethod = "cash",
}: PaymentMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultPaymentMethod);

  useEffect(() => {
    if (open) {
      setSelectedMethod(defaultPaymentMethod);
    }
  }, [open, defaultPaymentMethod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedMethod);
  };

  const handleCancel = () => {
    setSelectedMethod(defaultPaymentMethod);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting && !nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]" data-testid="dialog-payment-method">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Pilih metode pembayaran untuk menyelesaikan transaksi ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Pembayaran</span>
                <span className="font-semibold text-lg tabular-nums" data-testid="text-payment-total">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <RadioGroup
                value={selectedMethod}
                onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}
                className="space-y-2"
                data-testid="radiogroup-payment-method"
                disabled={isSubmitting}
              >
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedMethod === method.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`option-payment-${method.value}`}
                    >
                      <RadioGroupItem
                        value={method.value}
                        id={`payment-${method.value}`}
                        data-testid={`radio-payment-${method.value}`}
                      />
                      <Label
                        htmlFor={`payment-${method.value}`}
                        className="flex-1 flex items-center gap-3 cursor-pointer text-sm font-medium"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        {method.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid="button-cancel-payment"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-confirm-payment"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? "Memproses..." : `Bayar ${formatCurrency(cartTotal)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

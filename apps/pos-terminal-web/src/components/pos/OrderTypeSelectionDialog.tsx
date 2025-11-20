import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/context/TenantContext";
import type { OrderType } from "@pos/domain/orders/types";
import { ShoppingBag, Utensils, Coffee, Package } from "lucide-react";

const formSchema = z.object({
  orderTypeId: z.string().min(1, "Please select an order type"),
  tableNumber: z.string().optional(),
  markAsPaid: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export type OrderTypeSelectionResult = {
  orderTypeId: string;
  tableNumber?: string;
  markAsPaid: boolean;
};

type OrderTypeSelectionDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: OrderTypeSelectionResult) => void;
  orderTypes: OrderType[];
  orderTypesLoading: boolean;
  cartTotal: number;
};

const getOrderTypeIcon = (code: string) => {
  switch (code.toLowerCase()) {
    case "dine_in":
      return <Utensils className="w-4 h-4" />;
    case "takeaway":
    case "take_away":
      return <ShoppingBag className="w-4 h-4" />;
    case "delivery":
      return <Package className="w-4 h-4" />;
    default:
      return <Coffee className="w-4 h-4" />;
  }
};

export function OrderTypeSelectionDialog({
  open,
  onClose,
  onConfirm,
  orderTypes,
  orderTypesLoading,
  cartTotal,
}: OrderTypeSelectionDialogProps) {
  const { hasModule } = useTenant();
  const hasTableManagement = hasModule("enable_table_management");

  // Filter active order types - memoized to prevent infinite loop
  const activeOrderTypes = useMemo(
    () => orderTypes.filter((ot) => ot.isActive === true),
    [orderTypes]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderTypeId: activeOrderTypes.length > 0 ? activeOrderTypes[0].id : "",
      tableNumber: "",
      markAsPaid: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open && activeOrderTypes.length > 0) {
      form.reset({
        orderTypeId: activeOrderTypes[0].id,
        tableNumber: "",
        markAsPaid: false,
      });
    }
  }, [open, activeOrderTypes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = (values: FormValues) => {
    onConfirm({
      orderTypeId: values.orderTypeId,
      tableNumber: values.tableNumber || undefined,
      markAsPaid: values.markAsPaid,
    });
    onClose();
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  if (orderTypesLoading) {
    return (
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-order-type-selection">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading order types...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (activeOrderTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-order-type-selection">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-destructive">
              No active order types available. Please contact support.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} data-testid="button-close">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-order-type-selection">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Complete Order</DialogTitle>
              <DialogDescription>
                Select order type and additional details to complete this order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Order Total Display */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="font-semibold tabular-nums" data-testid="text-order-total">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Order Type Selection */}
              <FormField
                control={form.control}
                name="orderTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Order Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        data-testid="radiogroup-order-type"
                      >
                        <div className="space-y-2">
                          {activeOrderTypes.map((orderType) => (
                            <div
                              key={orderType.id}
                              className="flex items-center gap-2 p-3 rounded-md border hover-elevate"
                              data-testid={`option-order-type-${orderType.code}`}
                            >
                              <RadioGroupItem
                                value={orderType.id}
                                id={orderType.id}
                                data-testid={`radio-order-type-${orderType.code}`}
                              />
                              <Label
                                htmlFor={orderType.id}
                                className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
                              >
                                {getOrderTypeIcon(orderType.code)}
                                <span className="font-medium">{orderType.name}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Table Number/Selection - Conditional based on module */}
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Number (Optional)</FormLabel>
                    <FormControl>
                      {hasTableManagement ? (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-table">
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" data-testid="option-table-1">
                              Table 1
                            </SelectItem>
                            <SelectItem value="2" data-testid="option-table-2">
                              Table 2
                            </SelectItem>
                            <SelectItem value="3" data-testid="option-table-3">
                              Table 3
                            </SelectItem>
                            <SelectItem value="4" data-testid="option-table-4">
                              Table 4
                            </SelectItem>
                            <SelectItem value="5" data-testid="option-table-5">
                              Table 5
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter table number"
                          data-testid="input-table-number"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mark as Paid Checkbox */}
              <FormField
                control={form.control}
                name="markAsPaid"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-mark-as-paid"
                        />
                      </FormControl>
                      <div className="flex-1 space-y-1">
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Mark as Paid
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Check this to immediately mark the order as fully paid (
                          {formatCurrency(cartTotal)})
                        </p>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-confirm-order">
                Confirm Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

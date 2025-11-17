import { useState } from "react";
import { VariantSelector } from "../pos/VariantSelector";
import { mockProducts } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export default function VariantSelectorExample() {
  const [open, setOpen] = useState(false);
  const product = mockProducts[0]; // Burger with variants

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open Variant Selector</Button>
      <VariantSelector
        product={product}
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(p, v, qty) => {
          console.log("Added:", p.name, v?.name, "Qty:", qty);
          setOpen(false);
        }}
      />
    </div>
  );
}

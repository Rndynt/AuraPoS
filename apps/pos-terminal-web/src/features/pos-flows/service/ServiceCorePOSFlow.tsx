import { RetailStandardPOSFlowView } from "@/features/pos-flows/retail";
import { useServiceCorePOSFlow } from "./useServiceCorePOSFlow";

export function ServiceCorePOSFlow() {
  const flow = useServiceCorePOSFlow();
  return <RetailStandardPOSFlowView flow={flow} />;
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/home";
import POSPage from "@/pages/pos";
import OrdersPage from "@/pages/orders";
import NotFound from "@/pages/not-found";
import { TenantProvider } from "@/context/TenantContext";
import { MainLayout } from "@/components/layout/MainLayout";

const POSPageWithLayout = () => (
  <MainLayout>
    <POSPage />
  </MainLayout>
);

const OrdersPageWithLayout = () => (
  <MainLayout>
    <OrdersPage />
  </MainLayout>
);

const NotFoundWithLayout = () => (
  <MainLayout>
    <NotFound />
  </MainLayout>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/pos" component={POSPageWithLayout} />
      <Route path="/orders" component={OrdersPageWithLayout} />
      <Route component={NotFoundWithLayout} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;

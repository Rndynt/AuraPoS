import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/home";
import POSPage from "@/pages/pos";
import OrdersPage from "@/pages/orders";
import TablesManagementPage from "@/pages/tables-management";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import ReportsPage from "@/pages/reports";
import StoreProfilePage from "@/pages/store-profile";
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

const TablesManagementPageWithLayout = () => (
  <MainLayout>
    <TablesManagementPage />
  </MainLayout>
);

const HomePageWithLayout = () => (
  <MainLayout>
    <HomePage />
  </MainLayout>
);

const DashboardPageWithLayout = () => (
  <MainLayout>
    <DashboardPage />
  </MainLayout>
);

const ProductsPageWithLayout = () => (
  <MainLayout>
    <ProductsPage />
  </MainLayout>
);

const ReportsPageWithLayout = () => (
  <MainLayout>
    <ReportsPage />
  </MainLayout>
);

const StoreProfilePageWithLayout = () => (
  <MainLayout>
    <StoreProfilePage />
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
      <Route path="/" component={HomePageWithLayout} />
      <Route path="/pos" component={POSPageWithLayout} />
      <Route path="/orders" component={OrdersPageWithLayout} />
      <Route path="/tables" component={TablesManagementPageWithLayout} />
      <Route path="/dashboard" component={DashboardPageWithLayout} />
      <Route path="/products" component={ProductsPageWithLayout} />
      <Route path="/reports" component={ReportsPageWithLayout} />
      <Route path="/store-profile" component={StoreProfilePageWithLayout} />
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

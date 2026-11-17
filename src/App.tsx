/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { DataStoreProvider } from "@/src/hooks/useDataStore";
import { ProtectedRoute } from "@/src/components/layout/ProtectedRoute";
import { AppShell } from "@/src/components/layout/AppShell";
import { LoginPage } from "@/src/app/auth/LoginPage";
import { RegisterPage } from "@/src/app/auth/RegisterPage";
import { ForgotPasswordPage } from "@/src/app/auth/ForgotPasswordPage";
import { DashboardPage } from "@/src/app/dashboard/DashboardPage";
import { CustomersPage } from "@/src/app/customers/CustomersPage";
import { CustomerProfilePage } from "@/src/app/customers/CustomerProfilePage";
import { EnquiriesPage } from "@/src/app/enquiries/EnquiriesPage";
import { OrdersPage } from "@/src/app/orders/OrdersPage";
import { ProductsPage } from "@/src/app/products/ProductsPage";
import { InvoicesPage } from "@/src/app/invoices/InvoicesPage";
import { AssistantPage } from "@/src/app/assistant/AssistantPage";
import { ReportsPage } from "@/src/app/reports/ReportsPage";
import { SettingsPage } from "@/src/app/settings/SettingsPage";

export default function App() {
  return (
    <DataStoreProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerProfilePage />} />
              <Route path="/enquiries" element={<EnquiriesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </DataStoreProvider>
  );
}

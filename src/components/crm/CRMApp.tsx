import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RoleGuard from './RoleGuard';

// Hotel pages
import Dashboard from '../../pages/crm/Dashboard';
import RestaurantDashboard from '../../pages/crm/RestaurantDashboard';
import ChannelManager from '../../pages/crm/ChannelManager';
import Reservations from '../../pages/crm/Reservations';
import Calendar from '../../pages/crm/Calendar';
import Guests from '../../pages/crm/Guests';
import Rooms from '../../pages/crm/Rooms';
import ServiceRequests from '../../pages/crm/ServiceRequests';
import Payments from '../../pages/crm/Payments';
import Invoices from '../../pages/crm/Invoices';
import Reports from '../../pages/crm/Reports';
import Staff from '../../pages/crm/Staff';
import RoomsCMS from '../../pages/crm/RoomsCMS';
import LandingCMS from '../../pages/crm/LandingCMS';
import WebsiteEditor from '../../pages/crm/WebsiteEditor';
import PricingRules from '../../pages/crm/PricingRules';
import BookingSettings from '../../pages/crm/BookingSettings';
import WhatsAppSettingsPage from '../../pages/crm/WhatsAppSettingsPage';

// Restaurant pages
import MenuManager from '../../pages/crm/MenuManager';
import POS from '../../pages/crm/POS';
import FoodOrders from '../../pages/crm/FoodOrders';
import Tables from '../../pages/crm/Tables';
import FoodInventory from '../../pages/crm/FoodInventory';
import Billing from '../../pages/crm/Billing';
import ServerOrders from '../../pages/crm/ServerOrders';
import Expenses from '../../pages/crm/Expenses';
import ProfitLoss from '../../pages/crm/ProfitLoss';
import SavingsMargin from '../../pages/crm/SavingsMargin';

// Business module
import BusinessDashboard from '../../pages/crm/business/BusinessDashboard';
import BusinessPropertyCreate from '../../pages/crm/business/BusinessPropertyCreate';
import BusinessPropertyDetail from '../../pages/crm/business/BusinessPropertyDetail';

// Platform admin
import PlatformAdmin from '../../pages/crm/PlatformAdmin';

// Property verification gate
import PropertyVerification from '../../pages/crm/PropertyVerification';
import BillingSetup from '../../pages/crm/BillingSetup';

export default function CRMApp() {
  const { user, tenant, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#F8F9FB] to-[#EEF1F5]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0E2A38]/20 border-t-[#0E2A38] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Handled by RoleGuard in CRMApp

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // If the user has no tenant, they must be redirected to business/properties dashboard to set up one.
  // Platform admins are exempt.
  const hasNoTenant = user.role !== 'PLATFORM_ADMIN' && !tenant;
  const onBusinessRoute = location.pathname.startsWith('/admin/business');

  if (hasNoTenant && !onBusinessRoute) {
    return <Navigate to="/admin/business" replace />;
  }

  // Verification gate: a property owner whose tenant is not yet approved is
  // locked to /admin/verification until the platform admin approves it.
  // Platform admins are exempt. Existing/live tenants are grandfathered as
  // 'approved' by migration 20260705000000, so they never hit this.
  const needsVerification =
    user.role !== 'PLATFORM_ADMIN' &&
    !!tenant &&
    tenant.verification_status !== undefined &&
    tenant.verification_status !== 'approved';
  const onVerificationRoute = location.pathname.startsWith('/admin/verification');

  // Billing Setup gate: locked to /admin/billing-setup until payment is completed
  const needsBillingSetup =
    user.role !== 'PLATFORM_ADMIN' &&
    !!tenant &&
    tenant.payment_setup === false;
  const onBillingSetupRoute = location.pathname.startsWith('/admin/billing-setup');

  if (needsBillingSetup && !onBillingSetupRoute) {
    return <Navigate to="/admin/billing-setup" replace />;
  }

  if (needsVerification && !onVerificationRoute && !needsBillingSetup) {
    return <Navigate to="/admin/verification" replace />;
  }

  const isRestaurantOnly = tenant?.business_type === 'restaurant';

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#F8F9FB] to-[#EEF1F5] overflow-hidden font-sans text-gray-900 relative">

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white w-64`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="dashboard" element={
              user?.role === 'PLATFORM_ADMIN' && !tenant
                ? <Navigate to="/admin/platform" replace />
                : (user?.role === 'BUSINESS_ADMIN' && !tenant
                    ? <Navigate to="/admin/business" replace />
                    : (isRestaurantOnly ? <RestaurantDashboard /> : <Dashboard />))
            } />
            <Route path="server-orders" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'SERVER', 'BUSINESS_ADMIN']}>
                  <ServerOrders />
                </RoleGuard>
              )
            } />

            {/* Hotel routes */}
            <Route path="channels" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN']}>
                  <ChannelManager />
                </RoleGuard>
              )
            } />
            <Route path="reservations" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN']}>
                <Reservations />
              </RoleGuard>
            } />
            <Route path="calendar" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN']}>
                <Calendar />
              </RoleGuard>
            } />
            <Route path="guests" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN']}>
                <Guests />
              </RoleGuard>
            } />
            <Route path="rooms" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN']}>
                <Rooms />
              </RoleGuard>
            } />
            <Route path="service-requests" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN']}>
                <ServiceRequests />
              </RoleGuard>
            } />
            <Route path="payments" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'BUSINESS_ADMIN']}>
                <Payments />
              </RoleGuard>
            } />
            <Route path="invoices" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'RECEPTION', 'ACCOUNTANT', 'BUSINESS_ADMIN']}>
                <Invoices />
              </RoleGuard>
            } />
            <Route path="reports" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'BUSINESS_ADMIN']}>
                <Reports />
              </RoleGuard>
            } />
            <Route path="staff" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'BUSINESS_ADMIN']}>
                <Staff />
              </RoleGuard>
            } />
            <Route path="rooms-cms" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <RoomsCMS />
              </RoleGuard>
            } />
            <Route path="landing-cms" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <LandingCMS />
              </RoleGuard>
            } />
            <Route path="website-editor" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <WebsiteEditor />
              </RoleGuard>
            } />
            <Route path="pricing" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <PricingRules />
              </RoleGuard>
            } />
            <Route path="booking-settings" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <BookingSettings />
              </RoleGuard>
            } />
            <Route path="whatsapp" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <WhatsAppSettingsPage />
              </RoleGuard>
            } />

            {/* Restaurant routes */}
            <Route path="pos" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER']}>
                  <POS />
                </RoleGuard>
              )
            } />
            <Route path="menu" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                  <MenuManager />
                </RoleGuard>
              )
            } />
            <Route path="food-orders" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER']}>
                  <FoodOrders />
                </RoleGuard>
              )
            } />
            <Route path="tables" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER']}>
                  <Tables />
                </RoleGuard>
              )
            } />
            <Route path="inventory" element={
              tenant?.plan === 'commission' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                  <FoodInventory />
                </RoleGuard>
              )
            } />

            {/* Finance */}
            <Route path="expenses" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']}>
                <Expenses />
              </RoleGuard>
            } />
            <Route path="profit-loss" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                <ProfitLoss />
              </RoleGuard>
            } />

            {/* Billing */}
            <Route path="billing" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                <Billing />
              </RoleGuard>
            } />

            {/* Savings & Margin */}
            <Route path="savings" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'BUSINESS_ADMIN']}>
                <SavingsMargin />
              </RoleGuard>
            } />

            {/* Business module */}
            <Route path="business" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN']}>
                <BusinessDashboard />
              </RoleGuard>
            } />
            <Route path="business/create" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN']}>
                <BusinessPropertyCreate />
              </RoleGuard>
            } />
            <Route path="business/:propertyId" element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN']}>
                <BusinessPropertyDetail />
              </RoleGuard>
            } />

            {/* Billing setup gate */}
            <Route path="billing-setup" element={<BillingSetup />} />

            {/* Property verification gate (owner-only, no RoleGuard) */}
            <Route path="verification" element={<PropertyVerification />} />

            {/* Platform admin */}
            <Route path="platform" element={
              <RoleGuard allowedRoles={['PLATFORM_ADMIN']}>
                <PlatformAdmin />
              </RoleGuard>
            } />

            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Eager load only critical components
import Layout from './components/Layout';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpenseFormPage = lazy(() => import('./pages/ExpenseFormPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const AdminDataViewer = lazy(() => import('./pages/AdminDataViewer'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-400 text-lg">Loading...</p>
    </div>
  </div>
);

// 404 Page Component
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
    <h1 className="text-4xl font-extrabold mb-4">404 - Page Not Found</h1>
    <p className="text-lg">The financial data you seek is not here.</p>
    <a
      href="/login"
      className="mt-6 px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-300"
    >
      Go to Login
    </a>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin Data Viewer (Public for now) */}
          <Route path="/admin-data" element={<AdminDataViewer />} />

          {/* Private/Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="add-expense/:id?" element={<ExpenseFormPage />} />
              <Route path="budgets" element={<BudgetPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
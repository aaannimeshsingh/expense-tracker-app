import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExpenseFormPage from './pages/ExpenseFormPage';
import ReportsPage from './pages/ReportsPage';
import BudgetPage from './pages/BudgetPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import IntegrationsPage from './pages/IntegrationsPage';
import AdminDataViewer from './pages/AdminDataViewer';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
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
        <Route
          path="*"
          element={
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
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;

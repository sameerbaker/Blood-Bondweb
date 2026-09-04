import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BloodBanksPage from './pages/BloodBanksPage';
import BloodRequestsPage from './pages/BloodRequestsPage';
import DonationsPage from './pages/DonationsPage';
import BadgesPage from './pages/BadgesPage';
import ProfilePage from './pages/ProfilePage';
import EligibilityPage from './pages/EligibilityPage';
import AdminUsersPage from './pages/AdminUsersPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPasswordPage />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blood-banks"
            element={
              <ProtectedRoute>
                <BloodBanksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <BloodRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations"
            element={
              <ProtectedRoute>
                <DonationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/badges"
            element={
              <ProtectedRoute>
                <BadgesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eligibility"
            element={
              <ProtectedRoute>
                <EligibilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['Admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* Utility */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </>
  );
}

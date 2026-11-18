import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import type { Role } from './types';

const CapsulePrototypePage = lazy(() => import('./pages/CapsulePrototypePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ConsolePage = lazy(() => import('./pages/ConsolePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const STAFF_ROLES: Role[] = ['superadmin', 'medico', 'operador_ubs'];

export default function App() {
  return (
    <Routes>
      <Route path="/capsula" element={<Suspense fallback={<p>Carregando cápsula 3D…</p>}><CapsulePrototypePage /></Suspense>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="console"
          element={
            <ProtectedRoute roles={STAFF_ROLES}>
              <ConsolePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pacientes"
          element={
            <ProtectedRoute roles={STAFF_ROLES}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route path="exames" element={<ExamsPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['superadmin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="perfil" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

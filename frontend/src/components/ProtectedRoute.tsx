import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from './Loading';
import type { Role } from '../types';

export default function ProtectedRoute({
  children,
  roles
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { loading, session, profile, configured } = useAuth();
  const location = useLocation();

  if (!configured) return <Navigate to="/login" replace />;
  if (loading) return <FullPageLoader />;
  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(profile.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted">
            Seu perfil nao possui permissao para acessar este modulo. Fale com o administrador da
            sua unidade.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

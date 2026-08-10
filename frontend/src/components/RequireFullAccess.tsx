import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasFullAccess } from '../roles';
import { useToast } from './ToastContext';

// Blocks direct-URL access to pages hidden from the demo nav (SideNav already
// hides the links, but a demo user could still type the path).
export function RequireFullAccess({ children }: { children: ReactNode }) {
  const { role, isRoleLoading } = useAuth();
  const { showToast } = useToast();
  const allowed = hasFullAccess(role);

  useEffect(() => {
    if (!isRoleLoading && !allowed) {
      showToast("This page isn't available in demo mode");
    }
  }, [isRoleLoading, allowed, showToast]);

  if (isRoleLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

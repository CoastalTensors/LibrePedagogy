import React, { useCallback, useContext } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import { TooltipAnchor, Button } from '@librechat/client';
import { useLocalize, AuthContext } from '~/hooks';

interface AdminDashboardButtonProps {
  isSmallScreen?: boolean;
  toggleNav: () => void;
}

export default function AdminDashboardButton({
  isSmallScreen,
  toggleNav,
}: AdminDashboardButtonProps) {
  const navigate = useNavigate();
  const localize = useLocalize();
  const authContext = useContext(AuthContext);

  const handleAdminDashboard = useCallback(() => {
    navigate('/admin');
    if (isSmallScreen) {
      toggleNav();
    }
  }, [navigate, isSmallScreen, toggleNav]);

  // Check if auth is ready (avoid race conditions)
  const authReady =
    authContext?.isAuthenticated !== undefined &&
    (authContext?.isAuthenticated === false || authContext?.user !== undefined);

  // Only show to admin users
  const isAdmin = authReady && authContext?.user?.role === SystemRoles.ADMIN;

  if (!isAdmin) {
    return null;
  }

  return (
    <TooltipAnchor
      description="Admin Dashboard"
      render={
        <Button
          variant="outline"
          data-testid="nav-admin-dashboard-button"
          aria-label="Admin Dashboard"
          className="rounded-full border-none bg-transparent p-2 hover:bg-surface-hover md:rounded-xl"
          onClick={handleAdminDashboard}
        >
          <Shield className="icon-lg text-text-primary" />
        </Button>
      }
    />
  );
}
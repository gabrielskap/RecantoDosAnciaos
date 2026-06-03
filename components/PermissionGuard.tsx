import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewState, PermissionAction } from '../types';

interface PermissionGuardProps {
  module: ViewState;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ module, action, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  return hasPermission(module, action) ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;

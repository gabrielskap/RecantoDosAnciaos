import { useAuth } from '../contexts/AuthContext';
import { ViewState, PermissionAction } from '../types';

export const usePermission = (module: ViewState, action: PermissionAction): boolean => {
  const { hasPermission } = useAuth();
  return hasPermission(module, action);
};

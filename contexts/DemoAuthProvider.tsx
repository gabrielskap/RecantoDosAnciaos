import React from 'react';
import { AuthContext, AuthContextValue } from './AuthContext';
import { ViewState, PermissionAction, Profile, AuthUser } from '../types';

const DEMO_PROFILE: Profile = {
  id: 'demo-profile-admin',
  name: 'Administrador',
  type: 'Administrador',
  isEditable: false,
  permissions: Object.values(ViewState).map(module => ({
    module: module as ViewState,
    actions: ['view', 'edit', 'create', 'delete'] as PermissionAction[],
  })),
};

export const DEMO_CURRENT_USER: AuthUser = {
  id: 'demo-admin-user',
  name: 'Ricardo',
  email: 'admin@recantoanciaos.com.br',
  password: '',
  profile: DEMO_PROFILE,
  // empresaId ausente → SettingsModule/TeamModule retornam early nas chamadas Supabase
};

const noop = async (): Promise<void> => {};

interface DemoAuthProviderProps {
  onLogout: () => void;
  children: React.ReactNode;
}

export const DemoAuthProvider: React.FC<DemoAuthProviderProps> = ({ onLogout, children }) => {
  const value: AuthContextValue = {
    currentUser: DEMO_CURRENT_USER,
    users: [],
    profiles: [DEMO_PROFILE],
    loading: false,
    login: noop,
    logout: async () => { onLogout(); },
    resetPassword: noop,
    confirmPasswordReset: noop,
    hasPermission: (_module: ViewState, _action: PermissionAction): boolean => true,
    updateProfile: noop,
    addProfile: noop,
    addUser: async () => undefined,
    deleteUser: noop,
    resetUserPassword: noop,
    updateUser: noop,
    updateUserCertificate: noop,
    accessBlocked: false,
    trialInfo: null,
    refreshAccessStatus: noop,
    deleteProfile: noop,
    modeloBoletim: 'diurno_noturno',
    refreshModeloBoletim: noop,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

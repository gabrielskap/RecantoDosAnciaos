import React, { createContext, useContext, useState } from 'react';
import { AuthUser, Profile, Permission, PermissionAction, ViewState, ProfileType } from '../types';

// --- Default Profiles ---

const ALL_MODULES = [
  ViewState.DASHBOARD,
  ViewState.RESIDENTS,
  ViewState.RESIDENT_DETAIL,
  ViewState.AGENDA,
  ViewState.NUTRITION,
  ViewState.TEAM,
  ViewState.FINANCE,
  ViewState.STOCK,
  ViewState.REPORTS,
  ViewState.AI_ASSISTANT,
];

const allActions: PermissionAction[] = ['view', 'edit', 'create', 'delete'];

function makePermissions(modules: ViewState[], actions: PermissionAction[]): Permission[] {
  return modules.map(module => ({ module, actions }));
}

export const PROFILE_ADMIN: Profile = {
  id: 'profile-admin',
  name: 'Administrador',
  type: 'Administrador',
  isEditable: false,
  permissions: makePermissions(ALL_MODULES, allActions),
};

export const PROFILE_MEDICO: Profile = {
  id: 'profile-medico',
  name: 'Médico',
  type: 'Médico',
  isEditable: true,
  permissions: [
    ...makePermissions([ViewState.DASHBOARD, ViewState.NUTRITION, ViewState.REPORTS], ['view']),
    ...makePermissions([ViewState.RESIDENTS, ViewState.RESIDENT_DETAIL, ViewState.AGENDA], ['view', 'edit', 'create']),
    ...makePermissions([ViewState.AI_ASSISTANT, ViewState.STOCK], ['view']),
  ],
};

export const PROFILE_CUIDADOR: Profile = {
  id: 'profile-cuidador',
  name: 'Cuidador',
  type: 'Cuidador',
  isEditable: true,
  permissions: [
    ...makePermissions([ViewState.DASHBOARD, ViewState.NUTRITION], ['view', 'edit']),
    ...makePermissions([ViewState.RESIDENTS, ViewState.RESIDENT_DETAIL], ['view', 'edit']),
    ...makePermissions([ViewState.AGENDA], ['view', 'create']),
    ...makePermissions([ViewState.AI_ASSISTANT, ViewState.STOCK], ['view']),
  ],
};

export const PROFILE_RESPONSAVEL: Profile = {
  id: 'profile-responsavel',
  name: 'Responsável do Residente',
  type: 'Responsável',
  isEditable: false,
  permissions: makePermissions([ViewState.RESIDENTS, ViewState.RESIDENT_DETAIL, ViewState.AGENDA], ['view']),
};

// --- Mock Users ---

export const MOCK_USERS: AuthUser[] = [
  {
    id: 'user-1',
    name: 'Admin Sistema',
    email: 'admin@recanto.com',
    password: '1234',
    profile: PROFILE_ADMIN,
  },
  {
    id: 'user-2',
    name: 'Dra. Ana Costa',
    email: 'ana@recanto.com',
    password: '1234',
    profile: PROFILE_MEDICO,
  },
  {
    id: 'user-3',
    name: 'Carlos Oliveira',
    email: 'carlos@recanto.com',
    password: '1234',
    profile: PROFILE_CUIDADOR,
  },
  {
    id: 'user-4',
    name: 'João Silva',
    email: 'joao@familia.com',
    password: '1234',
    profile: PROFILE_RESPONSAVEL,
    residentId: '1',
  },
];

// --- Context ---

interface AuthContextValue {
  currentUser: AuthUser | null;
  profiles: Profile[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (module: ViewState, action: PermissionAction) => boolean;
  updateProfile: (profile: Profile) => void;
  addProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>(MOCK_USERS);
  const [profiles, setProfiles] = useState<Profile[]>([
    PROFILE_ADMIN,
    PROFILE_MEDICO,
    PROFILE_CUIDADOR,
    PROFILE_RESPONSAVEL,
  ]);

  const login = async (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('E-mail ou senha inválidos.');
    setCurrentUser(user);
  };

  const logout = () => setCurrentUser(null);

  const hasPermission = (module: ViewState, action: PermissionAction): boolean => {
    if (!currentUser) return false;
    const perm = currentUser.profile.permissions.find(p => p.module === module);
    return perm ? perm.actions.includes(action) : false;
  };

  const updateProfile = (updated: Profile) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    // update users that have this profile
    setUsers(prev => prev.map(u => u.profile.id === updated.id ? { ...u, profile: updated } : u));
    if (currentUser?.profile.id === updated.id) {
      setCurrentUser(prev => prev ? { ...prev, profile: updated } : null);
    }
  };

  const addProfile = (profile: Profile) => {
    setProfiles(prev => [...prev, profile]);
  };

  return (
    <AuthContext.Provider value={{ currentUser, profiles, login, logout, hasPermission, updateProfile, addProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

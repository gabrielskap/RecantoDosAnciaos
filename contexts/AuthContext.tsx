import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, Profile, Permission, PermissionAction, ViewState, ProfileType } from '../types';
import { supabase } from '../services/supabaseClient';

// --- Context ---

interface AuthContextValue {
  currentUser: AuthUser | null;
  users: AuthUser[];
  profiles: Profile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: ViewState, action: PermissionAction) => boolean;
  updateProfile: (profile: Profile) => Promise<void>;
  addProfile: (profile: Profile) => Promise<void>;
  addUser: (user: Omit<AuthUser, 'id'>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Helpers to fetch user profiles from database ---

const fetchUserProfile = async (authUserId: string): Promise<AuthUser | null> => {
  const { data, error } = await supabase
    .from('Recanto_Usuarios')
    .select(`
      id,
      auth_user_id,
      name,
      email,
      resident_id,
      profile:Recanto_Perfis (
        id,
        name,
        type,
        is_editable,
        Recanto_Permissoes (
          module,
          actions
        )
      )
    `)
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    console.error('Erro ao buscar perfil do usuário no Supabase:', error);
    return null;
  }

  const profileData = Array.isArray(data.profile) ? data.profile[0] : data.profile;
  const p = profileData as any;
  const mappedProfile: Profile = p ? {
    id: p.id,
    name: p.name,
    type: p.type as ProfileType,
    isEditable: p.is_editable,
    permissions: (p.Recanto_Permissoes || []).map((perm: any) => ({
      module: perm.module as ViewState,
      actions: perm.actions as PermissionAction[]
    }))
  } : {
    id: '',
    name: 'Sem Perfil',
    type: 'Cuidador',
    isEditable: false,
    permissions: []
  };

  return {
    id: data.auth_user_id || data.id,
    name: data.name,
    email: data.email,
    password: '',
    profile: mappedProfile,
    residentId: data.resident_id || undefined
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch profiles and users from database ---

  const fetchAllProfiles = async () => {
    const { data, error } = await supabase
      .from('Recanto_Perfis')
      .select(`
        id,
        name,
        type,
        is_editable,
        Recanto_Permissoes (
          module,
          actions
        )
      `);
    
    if (error) {
      console.error('Erro ao buscar perfis:', error);
      return;
    }

    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type as ProfileType,
      isEditable: p.is_editable,
      permissions: (p.Recanto_Permissoes || []).map((perm: any) => ({
        module: perm.module as ViewState,
        actions: perm.actions as PermissionAction[]
      }))
    }));

    setProfiles(mapped);
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('Recanto_Usuarios')
      .select(`
        id,
        auth_user_id,
        name,
        email,
        resident_id,
        profile:Recanto_Perfis (
          id,
          name,
          type,
          is_editable,
          Recanto_Permissoes (
            module,
            actions
          )
        )
      `);

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return;
    }

    const mapped = (data || []).map((u: any) => {
      const p = u.profile;
      const mappedProfile: Profile = p ? {
        id: p.id,
        name: p.name,
        type: p.type as ProfileType,
        isEditable: p.is_editable,
        permissions: (p.Recanto_Permissoes || []).map((perm: any) => ({
          module: perm.module as ViewState,
          actions: perm.actions as PermissionAction[]
        }))
      } : {
        id: '',
        name: 'Sem Perfil',
        type: 'Cuidador',
        isEditable: false,
        permissions: []
      };

      return {
        id: u.auth_user_id || u.id,
        name: u.name,
        email: u.email,
        password: '',
        profile: mappedProfile,
        residentId: u.resident_id || undefined
      };
    });

    setUsers(mapped);
  };

  // --- Auth State Handlers ---

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Erro ao recuperar sessão:', err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      try {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Erro ao processar alteração de auth:', err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync users and profiles when an admin user logs in
  useEffect(() => {
    if (currentUser) {
      fetchAllProfiles();
      fetchAllUsers();
    } else {
      setUsers([]);
      setProfiles([]);
    }
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      throw new Error(error.message || 'E-mail ou senha inválidos.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const hasPermission = (module: ViewState, action: PermissionAction): boolean => {
    if (!currentUser) return false;
    const perm = currentUser.profile.permissions.find(p => p.module === module);
    return perm ? perm.actions.includes(action) : false;
  };

  const updateProfile = async (updated: Profile) => {
    try {
      // 1. Atualizar informações de perfil
      const { error: profileError } = await supabase
        .from('Recanto_Perfis')
        .update({
          name: updated.name,
          type: updated.type,
        })
        .eq('id', updated.id);

      if (profileError) throw profileError;

      // 2. Excluir permissões antigas
      const { error: deleteError } = await supabase
        .from('Recanto_Permissoes')
        .delete()
        .eq('profile_id', updated.id);

      if (deleteError) throw deleteError;

      // 3. Inserir novas permissões
      if (updated.permissions.length > 0) {
        const { error: insertError } = await supabase
          .from('Recanto_Permissoes')
          .insert(
            updated.permissions.map(perm => ({
              profile_id: updated.id,
              module: perm.module,
              actions: perm.actions
            }))
          );
        if (insertError) throw insertError;
      }

      await fetchAllProfiles();
      await fetchAllUsers(); // atualiza os perfis dos usuários em exibição

      // Se o perfil editado for o do usuário logado atualmente, recarrega o currentUser
      if (currentUser && currentUser.profile.id === updated.id) {
        const updatedSelf = await fetchUserProfile(currentUser.id);
        setCurrentUser(updatedSelf);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao atualizar o perfil.');
    }
  };

  const addProfile = async (profile: Profile) => {
    try {
      // 1. Inserir o perfil
      const { data: newProfile, error: profileError } = await supabase
        .from('Recanto_Perfis')
        .insert({
          name: profile.name,
          type: profile.type,
          is_editable: true
        })
        .select()
        .single();

      if (profileError || !newProfile) throw profileError;

      // 2. Inserir as permissões
      if (profile.permissions.length > 0) {
        const { error: insertError } = await supabase
          .from('Recanto_Permissoes')
          .insert(
            profile.permissions.map(perm => ({
              profile_id: newProfile.id,
              module: perm.module,
              actions: perm.actions
            }))
          );
        if (insertError) throw insertError;
      }

      await fetchAllProfiles();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao adicionar o perfil.');
    }
  };

  const addUser = async (userData: Omit<AuthUser, 'id'>) => {
    try {
      // 1. Criar o usuário no Supabase Auth com metadados para que a trigger possa ler
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || '123456', // Senha padrão se vazia
        options: {
          data: {
            name: userData.name,
            profile_id: userData.profile.id,
            resident_id: userData.residentId || null
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Não foi possível registrar o usuário no sistema.');

      // 2. Salvar na tabela de negócio Recanto_Usuarios (usando upsert caso a trigger já tenha inserido)
      const { error: dbError } = await supabase
        .from('Recanto_Usuarios')
        .upsert({
          auth_user_id: data.user.id,
          name: userData.name,
          email: userData.email,
          profile_id: userData.profile.id,
          resident_id: userData.residentId || null
        }, { onConflict: 'auth_user_id' });

      if (dbError) throw dbError;

      await fetchAllUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao adicionar o usuário.');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Remove da tabela Recanto_Usuarios (a FK com auth.users é cascade no delete, mas
      // como não temos permissão de service_role para apagar de auth.users, removemos da nossa tabela de negócio).
      const { error } = await supabase
        .from('Recanto_Usuarios')
        .delete()
        .eq('auth_user_id', id);

      if (error) throw error;

      await fetchAllUsers();
      if (currentUser && currentUser.id === id) {
        await logout();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao excluir o usuário.');
    }
  };

  const updateUser = async (updatedUser: AuthUser) => {
    try {
      const { error } = await supabase
        .from('Recanto_Usuarios')
        .update({
          name: updatedUser.name,
          email: updatedUser.email,
          profile_id: updatedUser.profile.id,
          resident_id: updatedUser.residentId || null
        })
        .eq('auth_user_id', updatedUser.id);

      if (error) throw error;

      await fetchAllUsers();

      if (currentUser && currentUser.id === updatedUser.id) {
        const updatedSelf = await fetchUserProfile(currentUser.id);
        setCurrentUser(updatedSelf);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao atualizar o usuário.');
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, profiles, loading, login, logout, hasPermission, updateProfile, addProfile, addUser, deleteUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


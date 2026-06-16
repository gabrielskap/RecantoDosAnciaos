import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, Profile, Permission, PermissionAction, ViewState, ProfileType, DigitalCertificate } from '../types';
import { supabase } from '../services/supabaseClient';

// --- Context ---

interface AuthContextValue {
  currentUser: AuthUser | null;
  users: AuthUser[];
  profiles: Profile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (module: ViewState, action: PermissionAction) => boolean;
  updateProfile: (profile: Profile) => Promise<void>;
  addProfile: (profile: Profile) => Promise<void>;
  addUser: (user: Omit<AuthUser, 'id'> & { employeeId?: string }) => Promise<string | undefined>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  signUpNewTenant: (params: { companyName: string; city?: string; userName: string; email: string; password: string }) => Promise<{ needsEmailConfirm: boolean }>;
  updateUserCertificate: (userId: string, cert: DigitalCertificate | null) => Promise<void>;
  updateUserSignature: (userId: string, signatureImage: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Helpers to fetch user profiles from database ---

const fetchUserProfile = async (authUserId: string): Promise<AuthUser | null> => {
  const [userResult, certResult, employeeResult] = await Promise.all([
    supabase
      .from('Recanto_Usuarios')
      .select(`
        id,
        auth_user_id,
        name,
        email,
        resident_id,
        signature_image,
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
      .single(),
    supabase
      .from('Recanto_Certificados')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
    supabase
      .from('Recanto_Funcionarios')
      .select('role')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
  ]);

  if (userResult.error || !userResult.data) {
    console.error('Erro ao buscar perfil do usuário no Supabase:', userResult.error);
    return null;
  }

  const data = userResult.data as any;
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
    type: 'Cuidador' as ProfileType,
    isEditable: false,
    permissions: []
  };

  const certRow = certResult.data as any;
  const certificate: DigitalCertificate | undefined = certRow ? {
    certificate_file_name: certRow.certificate_file_name ?? undefined,
    certificate_holder_name: certRow.certificate_holder_name,
    certificate_document: certRow.certificate_document,
    certificate_serial_number: certRow.certificate_serial_number,
    certificate_issuer: certRow.certificate_issuer,
    certificate_issue_date: certRow.certificate_issue_date,
    certificate_expiration_date: certRow.certificate_expiration_date,
    certificate_status: certRow.certificate_status,
    certificate_last_validation: certRow.certificate_last_validation,
    certificate_type: 'A1',
  } : undefined;

  return {
    id: data.auth_user_id || data.id,
    name: data.name,
    email: data.email,
    password: '',
    profile: mappedProfile,
    residentId: data.resident_id || undefined,
    employeeRole: employeeResult.data?.role || undefined,
    certificate,
    signatureImage: data.signature_image ?? undefined,
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
    const [usersResult, certsResult] = await Promise.all([
      supabase.from('Recanto_Usuarios').select(`
        id,
        auth_user_id,
        name,
        email,
        resident_id,
        signature_image,
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
      `),
      supabase.from('Recanto_Certificados').select('*')
    ]);

    if (usersResult.error) {
      console.error('Erro ao buscar usuários:', usersResult.error);
      return;
    }

    const certMap = new Map(
      (certsResult.data ?? []).map((c: any) => [c.auth_user_id, c])
    );

    const mapped = (usersResult.data || []).map((u: any) => {
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

      const certRow = certMap.get(u.auth_user_id || u.id) as any;
      const certificate: DigitalCertificate | undefined = certRow ? {
        certificate_file_name: certRow.certificate_file_name ?? undefined,
        certificate_holder_name: certRow.certificate_holder_name,
        certificate_document: certRow.certificate_document,
        certificate_serial_number: certRow.certificate_serial_number,
        certificate_issuer: certRow.certificate_issuer,
        certificate_issue_date: certRow.certificate_issue_date,
        certificate_expiration_date: certRow.certificate_expiration_date,
        certificate_status: certRow.certificate_status,
        certificate_last_validation: certRow.certificate_last_validation,
        certificate_type: 'A1',
      } : undefined;

      return {
        id: u.auth_user_id || u.id,
        name: u.name,
        email: u.email,
        password: '',
        profile: mappedProfile,
        residentId: u.resident_id || undefined,
        certificate,
        signatureImage: u.signature_image ?? undefined,
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

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message || 'Erro ao enviar e-mail de redefinição.');
  };

  const hasPermission = (module: ViewState, action: PermissionAction): boolean => {
    if (!currentUser) return false;
    
    // Super Administrador tem acesso total a tudo por padrão
    if (currentUser.profile.type === 'Administrador') return true;
    
    // Fallback de permissão para novos módulos (ROOMS) caso não estejam persistidos no banco
    if (module === ViewState.ROOMS) {
      if (currentUser.profile.type === 'Médico' || currentUser.profile.type === 'Cuidador') {
        return action === 'view';
      }
    }

    // Configurações: visível para todos os perfis de staff, editável apenas pelo Administrador
    if (module === ViewState.SETTINGS) {
      return action === 'view';
    }
    
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

  const addUser = async (userData: Omit<AuthUser, 'id'> & { employeeId?: string }): Promise<string | undefined> => {
    try {
      // 1. Criar o usuário no Supabase Auth com metadados para que a trigger possa ler
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || '123456', // Senha padrão se vazia
        options: {
          data: {
            name: userData.name,
            profile_id: userData.profile.id,
            resident_id: userData.residentId || null,
            employee_id: userData.employeeId || null
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

      // 3. Vincular o funcionário se informado (backup do trigger)
      if (userData.employeeId) {
        await supabase
          .from('Recanto_Funcionarios')
          .update({ auth_user_id: data.user.id })
          .eq('id', userData.employeeId);
      }

      await fetchAllUsers();
      return data.user.id;
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao adicionar o usuário.');
      return undefined;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Desvincula primeiro de Recanto_Funcionarios
      await supabase
        .from('Recanto_Funcionarios')
        .update({ auth_user_id: null })
        .eq('auth_user_id', id);

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

  const signUpNewTenant = async (params: {
    companyName: string;
    city?: string;
    userName: string;
    email: string;
    password: string;
  }): Promise<{ needsEmailConfirm: boolean }> => {
    const allModules = [
      ViewState.DASHBOARD, ViewState.RESIDENTS, ViewState.FINANCE,
      ViewState.STOCK, ViewState.TEAM, ViewState.NUTRITION,
      ViewState.REPORTS, ViewState.AGENDA, ViewState.ROOMS,
    ];

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          name: params.userName,
          company_name: params.companyName,
        }
      }
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Falha ao criar usuário. Tente novamente.');

    if (!authData.session) {
      return { needsEmailConfirm: true };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('Recanto_Perfis')
      .insert({ name: 'Administrador', type: 'Administrador', is_editable: false })
      .select()
      .single();

    if (profileError) throw profileError;

    const { error: permError } = await supabase
      .from('Recanto_Permissoes')
      .insert(
        allModules.map(module => ({
          profile_id: profileData.id,
          module,
          actions: ['view', 'edit', 'create', 'delete'],
        }))
      );

    if (permError) console.warn('Aviso ao criar permissões:', permError.message);

    const { error: userError } = await supabase
      .from('Recanto_Usuarios')
      .upsert({
        auth_user_id: authData.user.id,
        name: params.userName,
        email: params.email,
        profile_id: profileData.id,
      }, { onConflict: 'auth_user_id' });

    if (userError) throw userError;

    return { needsEmailConfirm: false };
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

  const updateUserSignature = async (userId: string, signatureImage: string | null) => {
    const { error } = await supabase
      .from('Recanto_Usuarios')
      .update({ signature_image: signatureImage })
      .eq('auth_user_id', userId);

    if (error) throw new Error(error.message || 'Erro ao salvar a assinatura.');

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, signatureImage: signatureImage ?? undefined } : u
    ));
    setCurrentUser(prev =>
      prev && prev.id === userId ? { ...prev, signatureImage: signatureImage ?? undefined } : prev
    );
  };

  const updateUserCertificate = async (userId: string, cert: DigitalCertificate | null) => {
    if (cert) {
      const { error } = await supabase
        .from('Recanto_Certificados')
        .upsert({
          auth_user_id: userId,
          certificate_file_name: cert.certificate_file_name ?? null,
          certificate_holder_name: cert.certificate_holder_name,
          certificate_document: cert.certificate_document,
          certificate_serial_number: cert.certificate_serial_number,
          certificate_issuer: cert.certificate_issuer,
          certificate_issue_date: cert.certificate_issue_date,
          certificate_expiration_date: cert.certificate_expiration_date,
          certificate_status: cert.certificate_status,
          certificate_last_validation: cert.certificate_last_validation,
          certificate_type: cert.certificate_type,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'auth_user_id' });

      if (error) throw new Error(error.message || 'Erro ao salvar o certificado digital.');
    } else {
      const { error } = await supabase
        .from('Recanto_Certificados')
        .delete()
        .eq('auth_user_id', userId);

      if (error) throw new Error(error.message || 'Erro ao remover o certificado digital.');
    }

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, certificate: cert ?? undefined } : u
    ));
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, profiles, loading, login, logout, resetPassword, hasPermission, updateProfile, addProfile, addUser, deleteUser, updateUser, signUpNewTenant, updateUserCertificate, updateUserSignature }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


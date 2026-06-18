import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, Profile, Permission, PermissionAction, ViewState, ProfileType, DigitalCertificate } from '../types';
import { supabase } from '../services/supabaseClient';
import { gerarEmpresaId } from '../lib/empresaId';
import { toast } from '../services/toast';

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
        empresa_id,
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
    empresaId: data.empresa_id || undefined,
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
        empresa_id,
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
        empresaId: u.empresa_id || undefined,
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
  }, [currentUser]);  // Sincroniza as configurações da empresa com o localStorage para compatibilidade retroativa e migra do local se necessário
  useEffect(() => {
    const syncCompanySettings = async () => {
      if (!currentUser?.empresaId) return;
      try {
        const { data, error } = await supabase
          .from('Recanto_Empresas')
          .select('*')
          .eq('empresa_id', currentUser.empresaId)
          .single();
        
        if (error) {
          console.warn('Erro ao buscar configurações da empresa:', error);
          return;
        }

        if (data) {
          const migrationDone = localStorage.getItem('recanto_settings_migrated_to_db') === 'true';
          const localRaw = localStorage.getItem('recanto_system_settings');

          // Se ainda não foi feita a migração para o banco E houver dados locais válidos no localStorage
          if (!migrationDone && localRaw) {
            try {
              const localSettings = JSON.parse(localRaw);
              
              const { error: updateError } = await supabase
                .from('Recanto_Empresas')
                .update({
                  nome_instituicao: localSettings.institution?.name || data.nome_instituicao,
                  cnpj: localSettings.institution?.cnpj || data.cnpj,
                  telefone: localSettings.institution?.phone || data.telefone,
                  email_comercial: localSettings.institution?.email || data.email_comercial,
                  endereco: localSettings.institution?.address || data.endereco,
                  cidade: localSettings.institution?.city || data.cidade,
                  estado: localSettings.institution?.state || data.estado,
                  cep: localSettings.institution?.cep || data.cep,
                  capacidade_maxima: localSettings.institution?.capacity || data.capacidade_maxima,
                  diretor_geral: localSettings.institution?.directorName || data.diretor_geral,
                  responsavel_tecnico: localSettings.institution?.technicalDirector || data.responsavel_tecnico,
                  registro_anvisa: localSettings.institution?.anvisa || data.registro_anvisa,
                  papel_timbrado: localSettings.institution?.watermarkImage || data.papel_timbrado,
                  config_notificacoes: localSettings.notifications || data.config_notificacoes,
                  config_seguranca: localSettings.security || data.config_seguranca,
                })
                .eq('empresa_id', currentUser.empresaId);

              if (!updateError) {
                localStorage.setItem('recanto_settings_migrated_to_db', 'true');
                // Recarrega os dados pós-migração
                const { data: freshData } = await supabase
                  .from('Recanto_Empresas')
                  .select('*')
                  .eq('empresa_id', currentUser.empresaId)
                  .single();

                if (freshData) {
                  const settings = {
                    institution: {
                      name: freshData.nome_instituicao || '',
                      cnpj: freshData.cnpj || '',
                      phone: freshData.telefone || '',
                      email: freshData.email_comercial || '',
                      address: freshData.endereco || '',
                      city: freshData.cidade || '',
                      state: freshData.estado || 'SP',
                      cep: freshData.cep || '',
                      capacity: freshData.capacidade_maxima ?? 30,
                      directorName: freshData.diretor_geral || '',
                      technicalDirector: freshData.responsavel_tecnico || '',
                      anvisa: freshData.registro_anvisa || '',
                      watermarkImage: freshData.papel_timbrado || '',
                    },
                    notifications: freshData.config_notificacoes || {},
                    security: freshData.config_seguranca || {},
                  };
                  localStorage.setItem('recanto_system_settings', JSON.stringify(settings));
                }
                return;
              }
            } catch (errParse) {
              console.error('Erro ao processar migração local:', errParse);
            }
          }

          // Se a migração já foi feita ou não havia dados, apenas atualiza o localStorage com o que está no banco
          const settings = {
            institution: {
              name: data.nome_instituicao || '',
              cnpj: data.cnpj || '',
              phone: data.telefone || '',
              email: data.email_comercial || '',
              address: data.endereco || '',
              city: data.cidade || '',
              state: data.estado || 'SP',
              cep: data.cep || '',
              capacity: data.capacidade_maxima ?? 30,
              directorName: data.diretor_geral || '',
              technicalDirector: data.responsavel_tecnico || '',
              anvisa: data.registro_anvisa || '',
              watermarkImage: data.papel_timbrado || '',
            },
            notifications: data.config_notificacoes || {
              stockAlertThreshold: 5,
              medicationReminderEnabled: true,
              medicationReminderMinutes: 30,
              birthdayRemindersEnabled: true,
              contractDueDaysWarning: 30,
              checklistMissedAlerts: true,
              lowOccupancyThreshold: 20
            },
            security: data.config_seguranca || {
              sessionTimeoutMinutes: 60,
              requirePasswordChange: false,
              passwordChangeDays: 90,
              twoFactorEnabled: false,
              auditLogRetentionDays: 365,
              maxLoginAttempts: 5
            }
          };
          localStorage.setItem('recanto_system_settings', JSON.stringify(settings));
        }
      } catch (err) {
        console.error('Erro ao sincronizar configurações locais:', err);
      }
    };

    syncCompanySettings();
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

    // Configurações: visível de acordo com a permissão, editável apenas pelo Administrador
    if (module === ViewState.SETTINGS) {
      if (action !== 'view') return false;
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
      toast.error(err.message || 'Erro ao atualizar o perfil.');
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
          is_editable: true,
          empresa_id: currentUser?.empresaId ?? null,
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
      toast.error(err.message || 'Erro ao adicionar o perfil.');
    }
  };

  const addUser = async (userData: Omit<AuthUser, 'id'> & { employeeId?: string }): Promise<string | undefined> => {
    try {
      if (!userData.password || userData.password.trim().length < 8) {
        throw new Error('A senha é obrigatória e deve ter no mínimo 8 caracteres.');
      }
      // 1. Criar o usuário no Supabase Auth com metadados para que a trigger possa ler
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            profile_id: userData.profile.id,
            resident_id: userData.residentId || null,
            employee_id: userData.employeeId || null,
            empresa_id: currentUser?.empresaId
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
          resident_id: userData.residentId || null,
          empresa_id: currentUser?.empresaId
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
      toast.error(err.message || 'Erro ao adicionar o usuário.');
      return undefined;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { targetUserId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchAllUsers();
      if (currentUser && currentUser.id === id) {
        await logout();
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Erro ao excluir o usuário.');
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
      ViewState.DASHBOARD,
      ViewState.RESIDENTS,
      ViewState.RESIDENT_DETAIL,
      ViewState.AGENDA,
      ViewState.NUTRITION,
      ViewState.TEAM,
      ViewState.FINANCE,
      ViewState.STOCK,
      ViewState.REPORTS,
      ViewState.USERS,
      ViewState.ROOMS,
      ViewState.SETTINGS,
    ];

    const empresaId = gerarEmpresaId();

    // 1. Criar Empresa (pendente até confirmação de pagamento)
    const { error: empError } = await supabase
      .from('Recanto_Empresas')
      .insert({
        empresa_id: empresaId,
        nome_instituicao: params.companyName,
        cidade: params.city || null,
        status: 'pendente',
      });

    if (empError) throw empError;

    // 1b. Criar assinatura em trial (sem cobrança ainda — será ativada após pagamento)
    const hoje = new Date();
    const trialEnd = new Date(hoje);
    trialEnd.setDate(trialEnd.getDate() + 14);
    await supabase.from('Recanto_Assinaturas').insert({
      empresa_id: empresaId,
      plano_id: 'profissional',
      plano_nome: 'Profissional (trial)',
      valor_mensal: 0,
      periodicidade: 'mensal',
      gateway_pagamento: 'trial',
      status: 'em_trial',
      data_inicio: hoje.toISOString().split('T')[0],
      data_vencimento: trialEnd.toISOString().split('T')[0],
    });

    // 2. Criar Auth User
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          name: params.userName,
          company_name: params.companyName,
          empresa_id: empresaId
        }
      }
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Falha ao criar usuário. Tente novamente.');

    if (!authData.session) {
      return { needsEmailConfirm: true };
    }

    // 3. Criar Perfil de Administrador para a empresa
    const { data: profileData, error: profileError } = await supabase
      .from('Recanto_Perfis')
      .insert({ name: 'Administrador', type: 'Administrador', is_editable: false, empresa_id: empresaId })
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

    // 4. Salvar usuário público
    const { error: userError } = await supabase
      .from('Recanto_Usuarios')
      .upsert({
        auth_user_id: authData.user.id,
        name: params.userName,
        email: params.email,
        profile_id: profileData.id,
        empresa_id: empresaId
      }, { onConflict: 'auth_user_id' });

    if (userError) throw userError;

    return { needsEmailConfirm: false };
  };

  const updateUser = async (updatedUser: AuthUser) => {
    try {
      // Se o e-mail mudou, atualiza em auth.users via Edge Function (requer service_role)
      const existingUser = users.find(u => u.id === updatedUser.id);
      if (existingUser && existingUser.email !== updatedUser.email) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('update-user-email', {
          body: { targetUserId: updatedUser.id, newEmail: updatedUser.email },
        });
        if (fnError) throw fnError;
        if (fnData?.error) throw new Error(fnData.error);
      }

      // Atualiza os demais campos na tabela de negócio
      const { error } = await supabase
        .from('Recanto_Usuarios')
        .update({
          name: updatedUser.name,
          email: updatedUser.email,
          profile_id: updatedUser.profile.id,
          resident_id: updatedUser.residentId || null,
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
      throw new Error(err.message || 'Erro ao atualizar o usuário.');
    }
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
    <AuthContext.Provider value={{ currentUser, users, profiles, loading, login, logout, resetPassword, hasPermission, updateProfile, addProfile, addUser, deleteUser, updateUser, signUpNewTenant, updateUserCertificate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


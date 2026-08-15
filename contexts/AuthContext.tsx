import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthUser, Profile, Permission, PermissionAction, ViewState, ProfileType, DigitalCertificate, BoletimModelType } from '../types';
import { supabase } from '../services/supabaseClient';
import { toast } from '../services/toast';
import { confirmPasswordRecovery, requestPasswordRecovery } from '../services/passwordRecoveryService';

// --- Context ---

export interface TrialInfo {
  isInTrial: boolean;
  daysRemaining: number;
  expiraEm: string | null;
  isExpired: boolean;
}

export interface AuthContextValue {
  currentUser: AuthUser | null;
  users: AuthUser[];
  profiles: Profile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, password: string) => Promise<void>;
  hasPermission: (module: ViewState, action: PermissionAction) => boolean;
  updateProfile: (profile: Profile) => Promise<void>;
  addProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  addUser: (user: Omit<AuthUser, 'id'> & { employeeId?: string }) => Promise<string | undefined>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  updateUserCertificate: (userId: string, cert: DigitalCertificate | null) => Promise<void>;
  /** true quando o acesso deve ser bloqueado (pagamento pendente ou trial expirado). */
  accessBlocked: boolean;
  /** Informações do período de trial quando ativo. */
  trialInfo: TrialInfo | null;
  /** Reconsulta o status da assinatura (usado pela tela de pagamento pendente). */
  refreshAccessStatus: () => Promise<void>;
  /** Modelo de boletim diário configurado pela instituição (Configurações > Boletim Diário). */
  modeloBoletim: BoletimModelType;
  /** Reconsulta o modelo de boletim (usado após salvar em Configurações). */
  refreshModeloBoletim: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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
        cpf,
        sexo,
        celular,
        cep,
        logradouro,
        bairro,
        cidade,
        estado,
        numero,
        complemento,
        avatar_url,
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
      .maybeSingle(),
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

  if (userResult.error) {
    console.error('Erro ao buscar perfil do usuário no Supabase:', userResult.error);
    return null;
  }
  if (!userResult.data) {
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
    cpf: data.cpf || undefined,
    sexo: data.sexo || undefined,
    celular: data.celular || undefined,
    cep: data.cep || undefined,
    logradouro: data.logradouro || undefined,
    bairro: data.bairro || undefined,
    cidade: data.cidade || undefined,
    estado: data.estado || undefined,
    numero: data.numero || undefined,
    complemento: data.complemento || undefined,
    avatarUrl: data.avatar_url || undefined,
  };
};

// Configurações institucionais são mantidas no banco. A chave abaixo só é
// lida uma vez para migrar instalações antigas que ainda tinham um cache local.
const COMPANY_SETTINGS_LEGACY_PREFIX = 'recanto_system_settings_';
const COMPANY_SETTINGS_MIGRATION_PREFIX = 'recanto_settings_migrated_to_db_';

const getCompanySettingsLegacyKey = (empresaId: string) => `${COMPANY_SETTINGS_LEGACY_PREFIX}${empresaId}`;
const getCompanySettingsMigrationKey = (empresaId: string) => `${COMPANY_SETTINGS_MIGRATION_PREFIX}${empresaId}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmptyDatabaseValue = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

const getLegacyText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/**
 * Migra apenas lacunas do banco. Um valor já existente no banco sempre vence
 * o cache local, evitando que dados de outro dispositivo sobrescrevam a ILPI.
 */
const buildMissingCompanySettingsUpdate = (company: any, legacy: unknown): Record<string, unknown> => {
  if (!isPlainObject(legacy)) return {};

  const institution = isPlainObject(legacy.institution) ? legacy.institution : {};
  const updates: Record<string, unknown> = {};
  const fields: Array<[string, string]> = [
    ['nome_instituicao', 'name'],
    ['cnpj', 'cnpj'],
    ['telefone', 'phone'],
    ['email_comercial', 'email'],
    ['endereco', 'address'],
    ['cidade', 'city'],
    ['estado', 'state'],
    ['cep', 'cep'],
    ['diretor_geral', 'directorName'],
    ['responsavel_tecnico', 'technicalDirector'],
    ['registro_anvisa', 'anvisa'],
    ['papel_timbrado', 'watermarkImage'],
  ];

  for (const [column, legacyField] of fields) {
    const value = getLegacyText(institution[legacyField]);
    if (isEmptyDatabaseValue(company[column]) && value !== null) {
      updates[column] = value;
    }
  }

  const capacity = institution.capacity;
  if (
    (company.capacidade_maxima === null || company.capacidade_maxima === undefined) &&
    typeof capacity === 'number' &&
    Number.isFinite(capacity) &&
    capacity >= 0
  ) {
    updates.capacidade_maxima = capacity;
  }

  const mergeMissingConfig = (column: 'config_notificacoes' | 'config_seguranca', value: unknown) => {
    if (!isPlainObject(value)) return;

    const databaseValue = company[column];
    if (databaseValue === null || databaseValue === undefined) {
      updates[column] = value;
      return;
    }

    if (!isPlainObject(databaseValue)) return;

    const hasMissingValue = Object.keys(value).some(key => !(key in databaseValue));
    if (hasMissingValue) {
      // O banco vence em chaves já existentes; só complementamos as ausentes.
      updates[column] = { ...value, ...databaseValue };
    }
  };

  mergeMissingConfig('config_notificacoes', legacy.notifications);
  mergeMissingConfig('config_seguranca', legacy.security);

  const documentSettings = isPlainObject(legacy.documents) ? legacy.documents : {};
  if (
    isEmptyDatabaseValue(company.tipo_assinatura_documentos) &&
    documentSettings.tipoAssinatura === 'certificado_a1'
  ) {
    updates.tipo_assinatura_documentos = 'certificado_a1';
  }

  const boletimSettings = isPlainObject(legacy.boletim) ? legacy.boletim : {};
  if (isEmptyDatabaseValue(company.modelo_boletim) && boletimSettings.modelo === 'diario') {
    updates.modelo_boletim = 'diario';
  }

  return updates;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [modeloBoletim, setModeloBoletim] = useState<BoletimModelType>('diurno_noturno');

  // --- Gate de ativação (assinatura Asaas) ---
  // Bloqueia o acesso apenas quando a última assinatura da empresa for Asaas,
  // estiver pendente e ainda não tiver sido ativada por webhook. Empresas antigas
  // (mock/trial/ativa) nunca são travadas.
  const computeAccessStatus = async (user: AuthUser | null) => {
    if (!user?.empresaId) { setAccessBlocked(false); return; }
    try {
      // Verifica o status da empresa primeiro — fonte mais confiável e sem dependência de RLS complexo.
      const { data: empresa } = await supabase
        .from('Recanto_Empresas')
        .select('status')
        .eq('empresa_id', user.empresaId)
        .maybeSingle();

      if (empresa?.status === 'ativa') {
        setAccessBlocked(false);
        return;
      }

      // Fallback: verifica a assinatura mais recente.
      const { data } = await supabase
        .from('Recanto_Assinaturas')
        .select('status, gateway_pagamento, ativada_em, trial_expira_em')
        .eq('empresa_id', user.empresaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Trial: em_trial com expiração futura → libera acesso, exibe banner
      if (data?.status === 'em_trial') {
        const expiraEm = data.trial_expira_em ? new Date(data.trial_expira_em) : null;
        const now = new Date();
        const isExpired = expiraEm ? expiraEm <= now : false;
        const daysRemaining = expiraEm
          ? Math.max(0, Math.ceil((expiraEm.getTime() - now.getTime()) / 86400000))
          : 7;
        setTrialInfo({ isInTrial: true, daysRemaining, expiraEm: data.trial_expira_em, isExpired });
        setAccessBlocked(isExpired);
        return;
      }

      setTrialInfo(null);
      const blocked = !!data
        && data.gateway_pagamento === 'asaas'
        && data.status === 'pendente'
        && data.ativada_em === null;
      setAccessBlocked(blocked);
    } catch (err) {
      // Fail-open: erro de rede não deve travar quem já tem acesso legítimo.
      console.warn('Erro ao verificar status de acesso:', err);
      setAccessBlocked(false);
    }
  };

  const refreshAccessStatus = async () => {
    await computeAccessStatus(currentUser);
  };

  // --- Modelo de boletim diário (Configurações > Boletim Diário) ---

  const refreshModeloBoletim = async () => {
    if (!currentUser?.empresaId) return;
    try {
      const { data, error } = await supabase
        .from('Recanto_Empresas')
        .select('modelo_boletim')
        .eq('empresa_id', currentUser.empresaId)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar modelo de boletim:', error);
        return;
      }

      setModeloBoletim(data?.modelo_boletim === 'diario' ? 'diario' : 'diurno_noturno');
    } catch (err) {
      console.warn('Erro ao buscar modelo de boletim:', err);
    }
  };

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
        cpf,
        sexo,
        celular,
        cep,
        logradouro,
        bairro,
        cidade,
        estado,
        numero,
        complemento,
        avatar_url,
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
        cpf: u.cpf || undefined,
        sexo: u.sexo || undefined,
        celular: u.celular || undefined,
        cep: u.cep || undefined,
        logradouro: u.logradouro || undefined,
        bairro: u.bairro || undefined,
        cidade: u.cidade || undefined,
        estado: u.estado || undefined,
        numero: u.numero || undefined,
        complemento: u.complemento || undefined,
        avatarUrl: u.avatar_url || undefined,
      };
    });

    setUsers(mapped);
  };

  // --- Auth State Handlers ---

  const currentUserRef = useRef<AuthUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Erro ao recuperar sessão do Supabase:', error.message);
          if (error.status === 400 || error.message?.includes('refresh_token') || error.message?.includes('invalid_grant')) {
            await supabase.auth.signOut().catch(() => {});
          }
          setCurrentUser(null);
        } else if (session?.user) {
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
      // Se for apenas renovação de token / alternância de aba e o usuário já estiver logado com o mesmo ID,
      // evitamos disparar re-fetch/loading para não causar reflash no navegador.
      if (session?.user && currentUserRef.current?.id === session.user.id) {
        return;
      }

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
      computeAccessStatus(currentUser);
    } else {
      setUsers([]);
      setProfiles([]);
      setAccessBlocked(false);
    }
  }, [currentUser?.id]);

  // O banco é a fonte canônica. A chave de migração é isolada por empresa e
  // o espelho local só é atualizado depois de uma leitura/escrita confirmada.
  useEffect(() => {
    let active = true;

    const syncCompanySettings = async () => {
      const empresaId = currentUser?.empresaId;
      if (!empresaId) {
        if (active) setModeloBoletim('diurno_noturno');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('Recanto_Empresas')
          .select('*')
          .eq('empresa_id', empresaId)
          .single();

        if (error || !data) {
          console.warn('Erro ao buscar configurações da empresa:', error);
          return;
        }

        if (!active) return;

        let company = data as any;
        const localKey = getCompanySettingsLegacyKey(empresaId);
        const migrationKey = getCompanySettingsMigrationKey(empresaId);
        let migrationDone = false;
        try {
          migrationDone = localStorage.getItem(migrationKey) === 'true';
        } catch (storageError) {
          console.warn('Não foi possível acessar o cache local de configurações:', storageError);
        }

        // A migração é restrita a dados já separados por empresa. A antiga
        // chave global não possui contexto de tenant e não pode ser usada sem
        // risco de vazar ou sobrescrever outra instituição.
        if (!migrationDone && currentUser?.profile.type === 'Administrador') {
          let localRaw: string | null = null;
          try {
            localRaw = localStorage.getItem(localKey);
          } catch (storageError) {
            console.warn('Não foi possível ler o cache legado de configurações:', storageError);
          }

          try {
            const legacy = localRaw ? JSON.parse(localRaw) : null;
            const updates = buildMissingCompanySettingsUpdate(company, legacy);

            if (Object.keys(updates).length > 0) {
              const { data: updatedCompany, error: updateError } = await supabase
                .from('Recanto_Empresas')
                .update(updates)
                .eq('empresa_id', empresaId)
                .select('*')
                .single();

              if (updateError || !updatedCompany) {
                console.warn('Erro ao migrar configurações locais para o banco:', updateError);
                // Mantém o cache intacto para permitir nova tentativa; não
                // assumimos persistência quando a operação no banco falha.
                if (active) {
                  setModeloBoletim(company.modelo_boletim === 'diario' ? 'diario' : 'diurno_noturno');
                }
                return;
              }

              company = updatedCompany as any;
            }

            // Marca apenas depois de uma migração bem-sucedida (ou de concluir
            // que não há nada seguro para migrar), sempre no escopo da empresa.
            try {
              localStorage.setItem(migrationKey, 'true');
              migrationDone = true;
            } catch (storageError) {
              console.warn('Não foi possível registrar a migração local:', storageError);
            }

            try {
              localStorage.removeItem(localKey);
            } catch (storageError) {
              console.warn('Não foi possível remover o cache local já migrado:', storageError);
            }
          } catch (parseError) {
            console.warn('Cache legado de configurações inválido; mantendo o banco como fonte:', parseError);
            // Um cache inválido não é usado para atualizar o banco. Como ele
            // não pode ser migrado com segurança, evitamos repetições infinitas.
            try {
              localStorage.setItem(migrationKey, 'true');
              migrationDone = true;
            } catch (storageError) {
              console.warn('Não foi possível registrar a migração local:', storageError);
            }

            try {
              localStorage.removeItem(localKey);
            } catch (storageError) {
              console.warn('Não foi possível remover o cache local inválido:', storageError);
            }
          }
        }

        if (migrationDone) {
          try {
            localStorage.removeItem(localKey);
          } catch (storageError) {
            console.warn('Não foi possível limpar o cache local de configurações:', storageError);
          }
        }

        if (active) {
          setModeloBoletim(company.modelo_boletim === 'diario' ? 'diario' : 'diurno_noturno');
        }

      } catch (err) {
        console.error('Erro ao sincronizar configurações da empresa:', err);
      }
    };

    void syncCompanySettings();
    return () => { active = false; };
  }, [currentUser?.empresaId, currentUser?.profile.type]);

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
    await requestPasswordRecovery(email);
  };

  const confirmPasswordReset = async (email: string, code: string, password: string) => {
    await confirmPasswordRecovery(email, code, password);
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
    if (perm) {
      return perm.actions.includes(action);
    }

    // Fallback logic for sub-pages of RESIDENT_DETAIL
    const subPages = [
      ViewState.RESIDENT_DETAIL_INFO,
      ViewState.RESIDENT_DETAIL_VITALS,
      ViewState.RESIDENT_DETAIL_GLICEMIA,
      ViewState.RESIDENT_DETAIL_MEDS,
      ViewState.RESIDENT_DETAIL_ROUTINE,
      ViewState.RESIDENT_DETAIL_CARE_PLAN,
      ViewState.RESIDENT_DETAIL_VISITS,
      ViewState.RESIDENT_DETAIL_DOCS,
      ViewState.RESIDENT_DETAIL_EVOLUTION,
      ViewState.RESIDENT_DETAIL_HISTORY,
    ];

    if (subPages.includes(module)) {
      // If there's an explicit entry for this sub-module, use it directly
      const explicitPerm = currentUser.profile.permissions.find((p: Permission) => p.module === module);
      if (explicitPerm !== undefined) {
        return explicitPerm.actions.includes(action);
      }

      // Inherit parent permission (RESIDENT_DETAIL) for sub-modules without an explicit entry
      const parentPerm = currentUser.profile.permissions.find(p => p.module === ViewState.RESIDENT_DETAIL);
      if (!parentPerm) return false;
      if (action === 'sign') {
        return parentPerm.actions.includes('edit') || parentPerm.actions.includes('create');
      }
      return parentPerm.actions.includes(action);
    }
    
    return false;
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

  const deleteProfile = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('Recanto_Perfis')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      await fetchAllProfiles();
      toast.success('Perfil excluído com sucesso.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir o perfil.');
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
          empresa_id: currentUser?.empresaId,
          cpf: userData.cpf || null,
          sexo: userData.sexo || null,
          celular: userData.celular || null,
          cep: userData.cep || null,
          logradouro: userData.logradouro || null,
          bairro: userData.bairro || null,
          cidade: userData.cidade || null,
          estado: userData.estado || null,
          numero: userData.numero || null,
          complemento: userData.complemento || null,
          avatar_url: userData.avatarUrl || null,
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
      const { data, error } = await supabase.functions.invoke('RecantoDosAnciaos_delete-user', {
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

  const resetUserPassword = async (id: string, newPassword: string) => {
    const { data, error } = await supabase.functions.invoke('RecantoDosAnciaos_reset-user-password', {
      body: { targetUserId: id, newPassword },
    });
    if (error || data?.error) {
      throw new Error(data?.error || 'Não foi possível redefinir a senha do usuário.');
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 8) {
      throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || 'Erro ao redefinir a senha.');
    }
  };

  const updateUser = async (updatedUser: AuthUser) => {
    try {
      // Se o e-mail mudou, atualiza em auth.users via Edge Function (requer service_role)
      const existingUser = users.find(u => u.id === updatedUser.id);
      if (existingUser && existingUser.email !== updatedUser.email) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('RecantoDosAnciaos_update-user-email', {
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
          cpf: updatedUser.cpf || null,
          sexo: updatedUser.sexo || null,
          celular: updatedUser.celular || null,
          cep: updatedUser.cep || null,
          logradouro: updatedUser.logradouro || null,
          bairro: updatedUser.bairro || null,
          cidade: updatedUser.cidade || null,
          estado: updatedUser.estado || null,
          numero: updatedUser.numero || null,
          complemento: updatedUser.complemento || null,
          avatar_url: updatedUser.avatarUrl || null,
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
    <AuthContext.Provider value={{ currentUser, users, profiles, loading, login, logout, resetPassword, confirmPasswordReset, hasPermission, updateProfile, addProfile, deleteProfile, addUser, deleteUser, resetUserPassword, updatePassword, updateUser, updateUserCertificate, accessBlocked, trialInfo, refreshAccessStatus, modeloBoletim, refreshModeloBoletim }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


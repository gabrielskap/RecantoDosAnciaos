import React, { useState, useEffect } from 'react';
import { PageHeader, SectionCard, Avatar, Badge, Toggle } from './demo/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { toast } from '../services/toast';

const Field: React.FC<{
  label: string;
  value: string;
  onChange?: (val: string) => void;
  type?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = 'text', disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 transition-all ${
        disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' : ''
      }`}
    />
  </div>
);

const UserProfile: React.FC = () => {
  const { currentUser, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [prefs, setPrefs] = useState({
    emailNotif: true,
    stockAlerts: true,
    dailyDigest: false,
  });

  // Load preferences from localStorage and profile details from database
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.name);
    setEmail(currentUser.email);

    // Initial preference state from localStorage
    const localPrefsKey = `recanto_user_prefs_${currentUser.id}`;
    const savedPrefs = localStorage.getItem(localPrefsKey);
    if (savedPrefs) {
      try {
        setPrefs(JSON.parse(savedPrefs));
      } catch (err) {
        console.error('Error parsing local user preferences:', err);
      }
    }

    const fetchProfileData = async () => {
      try {
        setLoadingData(true);
        // 1. Fetch phone number from Recanto_Funcionarios
        const { data: funcData, error: funcError } = await supabase
          .from('Recanto_Funcionarios')
          .select('phone')
          .eq('auth_user_id', currentUser.id)
          .maybeSingle();

        if (funcError) {
          console.warn('Error fetching employee record:', funcError);
        } else if (funcData?.phone) {
          setPhone(funcData.phone);
        }

        // 2. Fetch company name from Recanto_Empresas
        if (currentUser.empresaId) {
          const { data: compData, error: compError } = await supabase
            .from('Recanto_Empresas')
            .select('nome_instituicao')
            .eq('empresa_id', currentUser.empresaId)
            .maybeSingle();

          if (compError) {
            console.warn('Error fetching company:', compError);
          } else if (compData?.nome_instituicao) {
            setCompanyName(compData.nome_instituicao);
          }
        }
      } catch (err) {
        console.error('Error loading user profile database info:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    if (!email.trim()) {
      toast.error('O e-mail é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      
      // 1. Save name and email to auth and Recanto_Usuarios
      await updateUser({
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
      });

      // 2. Save phone to Recanto_Funcionarios
      const cleanPhone = phone.trim();
      const { error: funcUpdateError } = await supabase
        .from('Recanto_Funcionarios')
        .update({ phone: cleanPhone || null })
        .eq('auth_user_id', currentUser.id);

      if (funcUpdateError) {
        console.warn('Could not update phone in Recanto_Funcionarios (likely due to RLS, missing employee match or lacking admin permissions):', funcUpdateError);
      }

      // 3. Save preferences to localStorage
      const localPrefsKey = `recanto_user_prefs_${currentUser.id}`;
      localStorage.setItem(localPrefsKey, JSON.stringify(prefs));

      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error saving user profile:', err);
      toast.error(err.message || 'Erro ao salvar as alterações do perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  // Helper to extract name initials
  const initials = (() => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Meu Perfil" subtitle="Suas informações e preferências" />

      {loadingData ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-4 font-medium">Carregando dados do perfil...</p>
        </div>
      ) : (
        <>
          <SectionCard className="mb-6">
            <div className="p-5">
              <div className="flex items-center gap-4 mb-6">
                <Avatar initials={initials} color="bg-blue-600" size="lg" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{name || currentUser.name}</h2>
                  <div className="mt-1">
                    <Badge tone="blue">{currentUser.profile.name}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Nome completo"
                  value={name}
                  onChange={setName}
                />
                <Field
                  label="E-mail"
                  value={email}
                  onChange={setEmail}
                  type="email"
                />
                <Field
                  label="Telefone"
                  value={phone}
                  onChange={setPhone}
                  type="text"
                />
                <Field
                  label="Instituição"
                  value={companyName || 'RecantoCare'}
                  disabled={true}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preferências de notificação" className="mb-6">
            <div className="px-5 divide-y divide-slate-100">
              <Toggle
                label="Notificações por e-mail"
                desc="Receba alertas importantes no seu e-mail."
                checked={prefs.emailNotif}
                onChange={v => setPrefs(p => ({ ...p, emailNotif: v }))}
              />
              <Toggle
                label="Alertas de estoque"
                desc="Avisar quando um item atingir o mínimo."
                checked={prefs.stockAlerts}
                onChange={v => setPrefs(p => ({ ...p, stockAlerts: v }))}
              />
              <Toggle
                label="Resumo diário"
                desc="Um resumo das atividades a cada manhã."
                checked={prefs.dailyDigest}
                onChange={v => setPrefs(p => ({ ...p, dailyDigest: v }))}
              />
            </div>
          </SectionCard>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </>
      )}
    </div>
  );
};

export default UserProfile;

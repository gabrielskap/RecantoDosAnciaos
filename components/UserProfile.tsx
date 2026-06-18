import React, { useState, useEffect } from 'react';
import { PageHeader, SectionCard, Avatar, Badge, Toggle } from './demo/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase, compressImage, uploadUserPhoto } from '../services/supabaseClient';
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

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 transition-all"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

function formatCPF(v: string): string {
  v = v.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}

function formatPhone(v: string): string {
  v = v.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

function formatCEP(v: string): string {
  v = v.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
}

const UserProfile: React.FC = () => {
  const { currentUser, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // New fields
  const [cpf, setCpf] = useState('');
  const [sexo, setSexo] = useState('Prefiro não Informar');
  const [celular, setCelular] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [searchingCep, setSearchingCep] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
    setCpf(currentUser.cpf || '');
    setSexo(currentUser.sexo || 'Prefiro não Informar');
    setCelular(currentUser.celular || '');
    setCep(currentUser.cep || '');
    setLogradouro(currentUser.logradouro || '');
    setBairro(currentUser.bairro || '');
    setCidade(currentUser.cidade || '');
    setEstado(currentUser.estado || '');
    setNumero(currentUser.numero || '');
    setComplemento(currentUser.complemento || '');
    setAvatarUrl(currentUser.avatarUrl || '');

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
        // Fetch company name from Recanto_Empresas
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

  const handleCepChange = async (val: string) => {
    const formatted = formatCEP(val);
    setCep(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        setSearchingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error('CEP não encontrado.');
        } else {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setEstado(data.uf || '');
        }
      } catch (err) {
        console.error('Error fetching CEP:', err);
        toast.error('Erro ao buscar o CEP.');
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      // Compress the image before uploading (maxWidth: 400, maxHeight: 400, quality: 0.8)
      const compressed = await compressImage(file, 400, 400, 0.8);
      const publicUrl = await uploadUserPhoto(file, compressed);
      setAvatarUrl(publicUrl);
      toast.success('Foto carregada com sucesso! Lembre-se de salvar as alterações.');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

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
    if (!cpf.trim()) {
      toast.error('O CPF é obrigatório.');
      return;
    }
    if (!validateCPF(cpf)) {
      toast.error('O CPF informado é inválido.');
      return;
    }

    try {
      setSaving(true);
      
      // 1. Save all details to Recanto_Usuarios
      await updateUser({
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        cpf: cpf.trim(),
        sexo,
        celular: celular.trim(),
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        numero: numero.trim(),
        complemento: complemento.trim(),
        avatarUrl,
      });

      // 2. Save phone to Recanto_Funcionarios for backwards compatibility
      const cleanPhone = celular.trim();
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
              <div className="flex items-center gap-5 mb-6">
                <div className="relative group w-14 h-14 shrink-0">
                  <Avatar initials={initials} color="bg-blue-600" size="lg" src={avatarUrl} />
                  <label className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center px-1">
                    {uploadingAvatar ? 'Aguarde...' : 'Alterar Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{name || currentUser.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone="blue">{currentUser.profile.name}</Badge>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-xs text-rose-500 hover:text-rose-700 underline font-medium cursor-pointer"
                      >
                        Remover foto
                      </button>
                    )}
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
                  label="CPF (Obrigatório)"
                  value={cpf}
                  onChange={v => setCpf(formatCPF(v))}
                />
                <SelectField
                  label="Sexo"
                  value={sexo}
                  onChange={setSexo}
                  options={[
                    { value: 'Masculino', label: 'Masculino' },
                    { value: 'Feminino', label: 'Feminino' },
                    { value: 'Prefiro não Informar', label: 'Prefiro não Informar' }
                  ]}
                />
                <Field
                  label="Celular"
                  value={celular}
                  onChange={v => setCelular(formatPhone(v))}
                />
                <div className="relative">
                  <Field
                    label="CEP"
                    value={cep}
                    onChange={handleCepChange}
                  />
                  {searchingCep && (
                    <div className="absolute right-3 bottom-3 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Endereço Residencial</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Field
                      label="Logradouro"
                      value={logradouro}
                      onChange={setLogradouro}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Field
                      label="Número"
                      value={numero}
                      onChange={setNumero}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Field
                      label="Complemento"
                      value={complemento}
                      onChange={setComplemento}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Field
                      label="Bairro"
                      value={bairro}
                      onChange={setBairro}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Field
                      label="Cidade"
                      value={cidade}
                      onChange={setCidade}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Field
                      label="Estado (UF)"
                      value={estado}
                      onChange={v => setEstado(v.toUpperCase().slice(0, 2))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Instituição"
                      value={companyName || 'RecantoCare'}
                      disabled={true}
                    />
                  </div>
                </div>
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

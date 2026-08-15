import React, { useState, useEffect } from 'react';
import { PageHeader, SectionCard, Avatar, Badge, Toggle } from './demo/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase, compressImage, uploadUserPhoto } from '../services/supabaseClient';
import { toast } from '../services/toast';
import { Camera, Upload, Trash2, KeyRound, Eye, EyeOff, Lock, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

const Field: React.FC<{
  label: string;
  value: string;
  onChange?: (val: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', disabled = false, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
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
  const { currentUser, updateUser, updatePassword } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Profile fields
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

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

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

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    try {
      setUploadingAvatar(true);
      // Compress the image before uploading (maxWidth: 400, maxHeight: 400, quality: 0.8)
      const compressed = await compressImage(file, 400, 400, 0.8);
      const publicUrl = await uploadUserPhoto(file, compressed);
      setAvatarUrl(publicUrl);
      toast.success('Foto carregada com sucesso! Clique em "Salvar Dados Pessoais" para confirmar.');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    toast.success('Foto removida. Salve os dados pessoais para confirmar.');
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
        console.warn('Could not update phone in Recanto_Funcionarios:', funcUpdateError);
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      toast.error('Informe a nova senha.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    try {
      setUpdatingPassword(true);
      await updatePassword(newPassword);
      toast.success('Sua senha foi alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error(err.message || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      setUpdatingPassword(false);
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

  const isPasswordValidLength = newPassword.length >= 8;
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais, segurança e preferências" />

      {loadingData ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-4 font-medium">Carregando dados do perfil...</p>
        </div>
      ) : (
        <>
          {/* Card 1: Informações Pessoais & Avatar */}
          <SectionCard className="overflow-hidden">
            <div className="p-6">
              {/* Top Banner / Avatar Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 mb-6 border-b border-slate-100">
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-4 ring-blue-50 border border-slate-200 shrink-0 shadow-md relative bg-slate-100 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                    )}
                    
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <label className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 border-2 border-white">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 truncate">{name || currentUser.name}</h2>
                    <Badge tone="blue">{currentUser.profile.name}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{email || currentUser.email}</p>
                  
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/50 text-slate-700 text-xs font-semibold cursor-pointer transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      {uploadingAvatar ? 'Enviando...' : 'Carregar nova foto'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Dados Pessoais</h3>
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

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando alterações...
                    </>
                  ) : (
                    'Salvar Dados Pessoais'
                  )}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: Troca de Senha */}
          <SectionCard title="Segurança & Alterar Senha" className="overflow-hidden">
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
              <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-slate-700 text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Para proteger sua conta, utilize uma senha forte com no mínimo <strong>8 caracteres</strong>.
                  Sua senha é criptografada e mantida em ambiente seguro.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Digite a nova senha novamente"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 transition-all"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Indicadores de Requisitos da Senha */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 ${isPasswordValidLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pelo menos 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 ${doPasswordsMatch ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>As senhas correspondem</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updatingPassword || !isPasswordValidLength || !doPasswordsMatch}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Alterando senha...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Atualizar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* Card 3: Preferências de Notificação */}
          <SectionCard title="Preferências de notificação">
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
        </>
      )}
    </div>
  );
};

export default UserProfile;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Building2, Bell, Shield, Info, Save, RotateCcw,
  CheckCircle, ChevronRight, AlertTriangle, Clock, Lock,
  Eye, EyeOff, Package, HeartPulse, Phone, Mail, MapPin,
  FileText, Wifi, Database, Download, Upload, Users,
  PenTool, Trash2, CheckSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface InstitutionSettings {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  capacity: number;
  directorName: string;
  technicalDirector: string;
  anvisa: string;
  watermarkImage?: string;
}

interface NotificationSettings {
  stockAlertThreshold: number;
  medicationReminderEnabled: boolean;
  medicationReminderMinutes: number;
  birthdayRemindersEnabled: boolean;
  contractDueDaysWarning: number;
  checklistMissedAlerts: boolean;
  lowOccupancyThreshold: number;
}

interface SecuritySettings {
  sessionTimeoutMinutes: number;
  requirePasswordChange: boolean;
  passwordChangeDays: number;
  twoFactorEnabled: boolean;
  auditLogRetentionDays: number;
  maxLoginAttempts: number;
}

interface SystemSettings {
  institution: InstitutionSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

const STORAGE_KEY = 'recanto_system_settings';

const defaultSettings: SystemSettings = {
  institution: {
    name: 'Recanto dos Anciãos',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'SP',
    cep: '',
    capacity: 30,
    directorName: '',
    technicalDirector: '',
    anvisa: '',
    watermarkImage: '',
  },
  notifications: {
    stockAlertThreshold: 5,
    medicationReminderEnabled: true,
    medicationReminderMinutes: 30,
    birthdayRemindersEnabled: true,
    contractDueDaysWarning: 30,
    checklistMissedAlerts: true,
    lowOccupancyThreshold: 20,
  },
  security: {
    sessionTimeoutMinutes: 60,
    requirePasswordChange: false,
    passwordChangeDays: 90,
    twoFactorEnabled: false,
    auditLogRetentionDays: 365,
    maxLoginAttempts: 5,
  },
};

type TabId = 'institution' | 'notifications' | 'security' | 'about';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'institution', label: 'Instituição', icon: Building2 },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'about', label: 'Sobre', icon: Info },
];

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
];

function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      institution: { ...defaultSettings.institution, ...parsed.institution },
      notifications: { ...defaultSettings.notifications, ...parsed.notifications },
      security: { ...defaultSettings.security, ...parsed.security },
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: SystemSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ── Main Settings Component ───────────────────────────────────────────────────

const SettingsModule: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('institution');
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.profile.type === 'Administrador';

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!currentUser?.empresaId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('Recanto_Empresas')
          .select('*')
          .eq('empresa_id', currentUser.empresaId)
          .single();
        
        if (error) {
          console.error('Erro ao carregar configurações do banco:', error);
          return;
        }

        if (data) {
          const loaded: SystemSettings = {
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
            notifications: data.config_notificacoes ? { ...defaultSettings.notifications, ...data.config_notificacoes } : defaultSettings.notifications,
            security: data.config_seguranca ? { ...defaultSettings.security, ...data.config_seguranca } : defaultSettings.security,
          };
          setSettings(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
        }
      } catch (err) {
        console.error('Erro no fetch das configurações:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanySettings();
  }, [currentUser]);

  const update = <K extends keyof SystemSettings>(section: K, patch: Partial<SystemSettings[K]>) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('Recanto_Empresas')
        .update({
          nome_instituicao: settings.institution.name,
          cnpj: settings.institution.cnpj,
          telefone: settings.institution.phone,
          email_comercial: settings.institution.email,
          endereco: settings.institution.address,
          cidade: settings.institution.city,
          estado: settings.institution.state,
          cep: settings.institution.cep,
          capacidade_maxima: settings.institution.capacity,
          diretor_geral: settings.institution.directorName,
          responsavel_tecnico: settings.institution.technicalDirector,
          registro_anvisa: settings.institution.anvisa,
          papel_timbrado: settings.institution.watermarkImage,
          config_notificacoes: settings.notifications,
          config_seguranca: settings.security,
        })
        .eq('empresa_id', currentUser.empresaId);

      if (error) throw error;

      saveSettings(settings);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      alert('Erro ao salvar configurações: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!currentUser?.empresaId) return;
    if (confirm('Redefinir todas as configurações para os valores padrão no banco de dados?')) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('Recanto_Empresas')
          .update({
            nome_instituicao: defaultSettings.institution.name,
            cnpj: defaultSettings.institution.cnpj,
            telefone: defaultSettings.institution.phone,
            email_comercial: defaultSettings.institution.email,
            endereco: defaultSettings.institution.address,
            cidade: defaultSettings.institution.city,
            estado: defaultSettings.institution.state,
            cep: defaultSettings.institution.cep,
            capacidade_maxima: defaultSettings.institution.capacity,
            diretor_geral: defaultSettings.institution.directorName,
            responsavel_tecnico: defaultSettings.institution.technicalDirector,
            registro_anvisa: defaultSettings.institution.anvisa,
            papel_timbrado: defaultSettings.institution.watermarkImage,
            config_notificacoes: defaultSettings.notifications,
            config_seguranca: defaultSettings.security,
          })
          .eq('empresa_id', currentUser.empresaId);

        if (error) throw error;

        setSettings(defaultSettings);
        saveSettings(defaultSettings);
        setDirty(false);
      } catch (err: any) {
        console.error('Erro ao redefinir configurações:', err);
        alert('Erro ao redefinir: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configurações do Sistema</h1>
            <p className="text-sm text-slate-500">Gerencie as preferências e parâmetros da plataforma</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-pulse">
                <CheckCircle className="h-4 w-4" />
                Salvo com sucesso
              </span>
            )}
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              Redefinir
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </button>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          Apenas administradores podem editar as configurações do sistema. Você está no modo somente leitura.
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab Navigation */}
        <div className="lg:w-52 shrink-0">
          <nav className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  disabled={loading}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center w-full px-4 py-3 text-sm transition-all disabled:opacity-55 ${
                    active
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className={`h-4 w-4 mr-3 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 mt-4 font-medium">Carregando configurações...</p>
            </div>
          ) : (
            <>
              {activeTab === 'institution' && (
                <InstitutionTab
                  data={settings.institution}
                  onChange={(patch) => update('institution', patch)}
                  readOnly={!isAdmin || loading}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab
                  data={settings.notifications}
                  onChange={(patch) => update('notifications', patch)}
                  readOnly={!isAdmin || loading}
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  data={settings.security}
                  onChange={(patch) => update('security', patch)}
                  readOnly={!isAdmin || loading}
                />
              )}

              {activeTab === 'about' && <AboutTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Institution Tab ─── */

const InstitutionTab: React.FC<{
  data: InstitutionSettings;
  onChange: (p: Partial<InstitutionSettings>) => void;
  readOnly: boolean;
}> = ({ data, onChange, readOnly }) => {
  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      alert('A imagem é muito grande. Escolha uma imagem de até 1.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChange({ watermarkImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Dados da Instituição" icon={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da Instituição" span={2}>
            <input
              type="text"
              value={data.name}
              disabled={readOnly}
              onChange={e => onChange({ name: e.target.value })}
              className={inputClass(readOnly)}
              placeholder="Ex: Recanto dos Anciãos"
            />
          </Field>
          <Field label="CNPJ">
            <input
              type="text"
              value={data.cnpj}
              disabled={readOnly}
              onChange={e => onChange({ cnpj: e.target.value })}
              className={inputClass(readOnly)}
              placeholder="00.000.000/0000-00"
            />
          </Field>
          <Field label="Capacidade Máxima (vagas)">
            <input
              type="number"
              value={data.capacity}
              disabled={readOnly}
              min={1}
              onChange={e => onChange({ capacity: Number(e.target.value) })}
              className={inputClass(readOnly)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Papel Timbrado para Documentos" icon={FileText}>
        {data.watermarkImage ? (
          <div className="relative border border-slate-100 rounded-xl p-4 bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-sm">
                <img src={data.watermarkImage} alt="Papel timbrado" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Papel timbrado configurado</p>
                <p className="text-xs text-slate-400">Esta imagem aparecerá no fundo de todos os relatórios e documentos do sistema.</p>
              </div>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange({ watermarkImage: '' })}
                className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl flex items-center justify-center transition-all shadow-sm"
                title="Remover papel timbrado"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              id="watermark-upload"
              disabled={readOnly}
              onChange={handleWatermarkUpload}
              className="hidden"
            />
            <label
              htmlFor="watermark-upload"
              className={`group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl p-6 cursor-pointer transition-all ${
                readOnly ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
              }`}
            >
              <Upload className="h-8 w-8 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" />
              <span className="text-sm font-semibold text-slate-600 mt-2">Fazer upload de papel timbrado</span>
              <span className="text-xs text-slate-400 mt-1">Clique para selecionar uma imagem (PNG, JPG ou SVG)</span>
            </label>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Contato" icon={Phone}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Telefone">
          <input
            type="text"
            value={data.phone}
            disabled={readOnly}
            onChange={e => onChange({ phone: e.target.value })}
            className={inputClass(readOnly)}
            placeholder="(00) 00000-0000"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={data.email}
            disabled={readOnly}
            onChange={e => onChange({ email: e.target.value })}
            className={inputClass(readOnly)}
            placeholder="contato@instituicao.com.br"
          />
        </Field>
      </div>
    </SectionCard>

    <SectionCard title="Endereço" icon={MapPin}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="CEP">
          <input
            type="text"
            value={data.cep}
            disabled={readOnly}
            onChange={e => onChange({ cep: e.target.value })}
            className={inputClass(readOnly)}
            placeholder="00000-000"
          />
        </Field>
        <Field label="Estado">
          <select
            value={data.state}
            disabled={readOnly}
            onChange={e => onChange({ state: e.target.value })}
            className={inputClass(readOnly)}
          >
            {STATES_BR.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Cidade">
          <input
            type="text"
            value={data.city}
            disabled={readOnly}
            onChange={e => onChange({ city: e.target.value })}
            className={inputClass(readOnly)}
          />
        </Field>
        <Field label="Endereço">
          <input
            type="text"
            value={data.address}
            disabled={readOnly}
            onChange={e => onChange({ address: e.target.value })}
            className={inputClass(readOnly)}
            placeholder="Rua, número, complemento"
          />
        </Field>
      </div>
    </SectionCard>

    <SectionCard title="Responsáveis Técnicos" icon={Users}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Diretor(a) Geral">
          <input
            type="text"
            value={data.directorName}
            disabled={readOnly}
            onChange={e => onChange({ directorName: e.target.value })}
            className={inputClass(readOnly)}
          />
        </Field>
        <Field label="Responsável Técnico (RT)">
          <input
            type="text"
            value={data.technicalDirector}
            disabled={readOnly}
            onChange={e => onChange({ technicalDirector: e.target.value })}
            className={inputClass(readOnly)}
          />
        </Field>
        <Field label="Registro ANVISA / Vigilância Sanitária">
          <input
            type="text"
            value={data.anvisa}
            disabled={readOnly}
            onChange={e => onChange({ anvisa: e.target.value })}
            className={inputClass(readOnly)}
            placeholder="Número do alvará sanitário"
          />
        </Field>
      </div>
    </SectionCard>
  </div>
  );
};

/* ─── Notifications Tab ─── */

const NotificationsTab: React.FC<{
  data: NotificationSettings;
  onChange: (p: Partial<NotificationSettings>) => void;
  readOnly: boolean;
}> = ({ data, onChange, readOnly }) => (
  <div className="space-y-4">
    <SectionCard title="Alertas de Estoque" icon={Package}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Quantidade mínima para alerta (itens)" span={2}>
          <input
            type="number"
            value={data.stockAlertThreshold}
            disabled={readOnly}
            min={1}
            onChange={e => onChange({ stockAlertThreshold: Number(e.target.value) })}
            className={inputClass(readOnly)}
          />
          <p className="text-xs text-slate-400 mt-1">Itens com estoque igual ou abaixo deste valor serão destacados.</p>
        </Field>
      </div>
    </SectionCard>

    <SectionCard title="Lembretes de Medicação" icon={HeartPulse}>
      <div className="space-y-4">
        <ToggleField
          label="Alertas de medicação atrasada"
          description="Exibe aviso quando uma dose está próxima ou atrasada"
          checked={data.medicationReminderEnabled}
          disabled={readOnly}
          onChange={v => onChange({ medicationReminderEnabled: v })}
        />
        {data.medicationReminderEnabled && (
          <Field label="Antecedência do lembrete (minutos)">
            <input
              type="number"
              value={data.medicationReminderMinutes}
              disabled={readOnly}
              min={5}
              max={120}
              onChange={e => onChange({ medicationReminderMinutes: Number(e.target.value) })}
              className={inputClass(readOnly)}
            />
          </Field>
        )}
      </div>
    </SectionCard>

    <SectionCard title="Alertas Gerais" icon={Bell}>
      <div className="space-y-4">
        <ToggleField
          label="Aniversários de residentes"
          description="Lembrete de aniversário no dia do evento"
          checked={data.birthdayRemindersEnabled}
          disabled={readOnly}
          onChange={v => onChange({ birthdayRemindersEnabled: v })}
        />
        <ToggleField
          label="Checklists não preenchidos"
          description="Alerta quando o checklist diário de um turno não foi registrado"
          checked={data.checklistMissedAlerts}
          disabled={readOnly}
          onChange={v => onChange({ checklistMissedAlerts: v })}
        />
        <Field label="Alerta de vencimento de contratos (dias antes)">
          <input
            type="number"
            value={data.contractDueDaysWarning}
            disabled={readOnly}
            min={1}
            max={180}
            onChange={e => onChange({ contractDueDaysWarning: Number(e.target.value) })}
            className={inputClass(readOnly)}
          />
        </Field>
        <Field label="Alerta de baixa ocupação (% mínimo)">
          <input
            type="number"
            value={data.lowOccupancyThreshold}
            disabled={readOnly}
            min={0}
            max={100}
            onChange={e => onChange({ lowOccupancyThreshold: Number(e.target.value) })}
            className={inputClass(readOnly)}
          />
          <p className="text-xs text-slate-400 mt-1">Gera alerta quando a ocupação cair abaixo desta porcentagem.</p>
        </Field>
      </div>
    </SectionCard>
  </div>
);

/* ─── Security Tab ─── */

const SecurityTab: React.FC<{
  data: SecuritySettings;
  onChange: (p: Partial<SecuritySettings>) => void;
  readOnly: boolean;
}> = ({ data, onChange, readOnly }) => (
  <div className="space-y-4">
    <SectionCard title="Sessão e Acesso" icon={Clock}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tempo limite de sessão (minutos)">
          <input
            type="number"
            value={data.sessionTimeoutMinutes}
            disabled={readOnly}
            min={15}
            max={480}
            onChange={e => onChange({ sessionTimeoutMinutes: Number(e.target.value) })}
            className={inputClass(readOnly)}
          />
          <p className="text-xs text-slate-400 mt-1">Sessão encerrada automaticamente após inatividade.</p>
        </Field>
        <Field label="Tentativas máximas de login">
          <input
            type="number"
            value={data.maxLoginAttempts}
            disabled={readOnly}
            min={3}
            max={10}
            onChange={e => onChange({ maxLoginAttempts: Number(e.target.value) })}
            className={inputClass(readOnly)}
          />
        </Field>
      </div>
    </SectionCard>

    <SectionCard title="Política de Senhas" icon={Lock}>
      <div className="space-y-4">
        <ToggleField
          label="Exigir troca periódica de senha"
          description="Solicita redefinição de senha após o período configurado"
          checked={data.requirePasswordChange}
          disabled={readOnly}
          onChange={v => onChange({ requirePasswordChange: v })}
        />
        {data.requirePasswordChange && (
          <Field label="Intervalo de troca (dias)">
            <input
              type="number"
              value={data.passwordChangeDays}
              disabled={readOnly}
              min={30}
              max={365}
              onChange={e => onChange({ passwordChangeDays: Number(e.target.value) })}
              className={inputClass(readOnly)}
            />
          </Field>
        )}
      </div>
    </SectionCard>

    <SectionCard title="Auditoria e Logs" icon={FileText}>
      <Field label="Retenção de logs de auditoria (dias)">
        <input
          type="number"
          value={data.auditLogRetentionDays}
          disabled={readOnly}
          min={30}
          max={1825}
          onChange={e => onChange({ auditLogRetentionDays: Number(e.target.value) })}
          className={inputClass(readOnly)}
        />
        <p className="text-xs text-slate-400 mt-1">Registros mais antigos que este prazo serão arquivados.</p>
      </Field>
    </SectionCard>

    <SectionCard title="Autenticação" icon={Shield}>
      <ToggleField
        label="Autenticação em dois fatores (2FA)"
        description="Requer código adicional no login via e-mail ou app autenticador"
        checked={data.twoFactorEnabled}
        disabled={readOnly}
        onChange={v => onChange({ twoFactorEnabled: v })}
      />
      {data.twoFactorEnabled && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          A configuração de 2FA requer ação individual de cada usuário no seu perfil.
        </p>
      )}
    </SectionCard>
  </div>
);

/* ─── About Tab ─── */

const AboutTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="RecantoCare" icon={HeartPulse}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
          <HeartPulse className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-lg leading-tight">RecantoCare</p>
          <p className="text-sm text-slate-500">Plataforma de Gestão para ILPIs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">v2.4.0</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Assinatura Ativa
            </span>
          </div>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Informações Técnicas" icon={Database}>
      <dl className="space-y-2.5">
        {[
          { label: 'Versão da aplicação', value: '2.4.0' },
          { label: 'Banco de dados', value: 'Supabase (PostgreSQL)' },
          { label: 'Ambiente', value: 'Produção' },
          { label: 'Última atualização', value: 'Junho / 2026' },
          { label: 'Framework', value: 'React 18 + TypeScript' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-700">{value}</span>
          </div>
        ))}
      </dl>
    </SectionCard>

    <SectionCard title="Status dos Serviços" icon={Wifi}>
      <div className="space-y-2">
        {[
          { service: 'API Principal', status: 'online' },
          { service: 'Banco de Dados', status: 'online' },
          { service: 'Armazenamento de Arquivos', status: 'online' },
          { service: 'Autenticação', status: 'online' },
        ].map(({ service, status }) => (
          <div key={service} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-600">{service}</span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              status === 'online'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
              {status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Assinatura" icon={FileText}>
      <dl className="space-y-2.5">
        {[
          { label: 'Plano', value: 'Profissional' },
          { label: 'Status', value: 'Ativo' },
          { label: 'Suporte', value: 'Prioritário' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-700">{value}</span>
          </div>
        ))}
      </dl>
    </SectionCard>
  </div>
);

/* ─── Shared UI helpers ─── */

const inputClass = (disabled: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${
    disabled
      ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200'
      : 'bg-white text-slate-900 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'
  }`;

const SectionCard: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50 bg-slate-50/60">
      <Icon className="h-4 w-4 text-blue-600 shrink-0" />
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  span?: number;
}> = ({ label, children, span }) => (
  <div className={span === 2 ? 'sm:col-span-2' : undefined}>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
);

const ToggleField: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default SettingsModule;

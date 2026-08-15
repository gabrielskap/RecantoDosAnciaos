import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Building2, Bell, Shield, Info, Save, RotateCcw,
  CheckCircle, ChevronRight, AlertTriangle, Clock, Lock,
  Eye, EyeOff, Package, HeartPulse, Phone, Mail, MapPin,
  FileText, Wifi, Database, Download, Upload, Users,
  PenTool, Trash2, CheckSquare,
  CreditCard, X, Star, RefreshCw, Zap, XCircle, ArrowLeft,
  FileSignature, BadgeCheck, UserCheck, CalendarCheck, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { toast } from '../services/toast';
import SubscriptionModal from './SubscriptionModal';
import { BoletimModelType, BoletimSettings } from '../types';

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

// Tipo de assinatura utilizado nos documentos institucionais.
// 'simples'        → registra nome completo, CPF e data/hora do usuário autenticado.
// 'certificado_a1' → exige certificado digital ICP-Brasil Tipo A1 cadastrado.
// O fluxo real de assinatura será implementado em etapa posterior.
type DocumentSignatureType = 'simples' | 'certificado_a1';

interface DocumentSettings {
  tipoAssinatura: DocumentSignatureType;
}

interface SystemSettings {
  institution: InstitutionSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  documents: DocumentSettings;
  boletim: BoletimSettings;
}

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
  documents: {
    tipoAssinatura: 'simples' as DocumentSignatureType,
  },
  boletim: {
    modelo: 'diurno_noturno' as BoletimModelType,
  },
};

type TabId = 'institution' | 'notifications' | 'security' | 'documents' | 'boletim' | 'about' | 'subscription';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'institution', label: 'Instituição', icon: Building2 },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'documents', label: 'Documentos', icon: FileSignature },
  { id: 'boletim', label: 'Boletim Diário', icon: CalendarCheck },
  { id: 'about', label: 'Sobre', icon: Info },
  { id: 'subscription', label: 'Assinatura', icon: CreditCard },
];

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
];

// ── Main Settings Component ───────────────────────────────────────────────────

const SettingsModule: React.FC = () => {
  const { currentUser, refreshModeloBoletim } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as TabId | null;
    const valid: TabId[] = ['institution', 'notifications', 'security', 'documents', 'boletim', 'about', 'subscription'];
    if (tabParam && valid.includes(tabParam)) {
      return tabParam;
    }
    const saved = localStorage.getItem('recanto_settings_active_tab') as TabId | null;
    return saved && valid.includes(saved) ? saved : 'institution';
  });

  useEffect(() => {
    localStorage.setItem('recanto_settings_active_tab', activeTab);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [activeTab]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.profile.type === 'Administrador';

  useEffect(() => {
    let active = true;

    const fetchCompanySettings = async () => {
      const empresaId = currentUser?.empresaId;
      if (!empresaId) {
        if (active) {
          setSettings(defaultSettings);
          setDirty(false);
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          // Evita que a configuração de outra empresa fique visível ou possa
          // ser salva enquanto a consulta da nova empresa está em andamento.
          setSettings(defaultSettings);
          setDirty(false);
          setLoading(true);
        }
        const { data, error } = await supabase
          .from('Recanto_Empresas')
          .select('*')
          .eq('empresa_id', empresaId)
          .single();
        
        if (error) {
          console.error('Erro ao carregar configurações do banco:', error);
          return;
        }

        if (data) {
          const rawTipo = data.tipo_assinatura_documentos;
          const tipoAssinatura: DocumentSignatureType =
            rawTipo === 'certificado_a1' ? 'certificado_a1' : 'simples';
          const modelo: BoletimModelType =
            data.modelo_boletim === 'diario' ? 'diario' : 'diurno_noturno';
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
            documents: { tipoAssinatura },
            boletim: { modelo },
          };
          if (active) {
            setSettings(loaded);
            setDirty(false);
          }
        }
      } catch (err) {
        console.error('Erro no fetch das configurações:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchCompanySettings();
    return () => { active = false; };
  }, [currentUser?.empresaId]);

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
          tipo_assinatura_documentos: settings.documents.tipoAssinatura,
          modelo_boletim: settings.boletim.modelo,
        })
        .eq('empresa_id', currentUser.empresaId);

      if (error) throw error;

      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await refreshModeloBoletim();
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações: ' + (err.message || err));
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
            tipo_assinatura_documentos: defaultSettings.documents.tipoAssinatura,
            modelo_boletim: defaultSettings.boletim.modelo,
          })
          .eq('empresa_id', currentUser.empresaId);

        if (error) throw error;

        setSettings(defaultSettings);
        setDirty(false);
        await refreshModeloBoletim();
      } catch (err: any) {
        console.error('Erro ao redefinir configurações:', err);
        toast.error('Erro ao redefinir: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configurações do Sistema</h1>
            <p className="text-sm text-slate-500">Gerencie as preferências e parâmetros da plataforma</p>
          </div>
        </div>
        {isAdmin && activeTab !== 'subscription' && (
          <div className="flex items-center flex-wrap gap-2">
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

              {activeTab === 'documents' && (
                <DocumentsTab
                  data={settings.documents}
                  onChange={(patch) => update('documents', patch)}
                  readOnly={!isAdmin || loading}
                />
              )}
              {activeTab === 'boletim' && (
                <BoletimTab
                  data={settings.boletim}
                  onChange={(patch) => update('boletim', patch)}
                  readOnly={!isAdmin || loading}
                />
              )}
              {activeTab === 'about' && <AboutTab />}
              {activeTab === 'subscription' && (
                <SubscriptionTab empresaId={currentUser?.empresaId} isAdmin={isAdmin} />
              )}
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
      toast.warning('A imagem é muito grande. Escolha uma imagem de até 1.5MB.');
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

/* ─── Documents Tab ─── */

const DocumentsTab: React.FC<{
  data: DocumentSettings;
  onChange: (p: Partial<DocumentSettings>) => void;
  readOnly: boolean;
}> = ({ data, onChange, readOnly }) => {
  const isSimples = data.tipoAssinatura === 'simples';
  const isCertificado = data.tipoAssinatura === 'certificado_a1';

  return (
    <div className="space-y-4">
      <SectionCard title="Tipo de Assinatura para Documentos" icon={FileSignature}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Define como os documentos que exigem assinatura serão processados nesta instituição.
            Todos os documentos utilizarão o modelo selecionado abaixo.
          </p>

          {/* Card selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {/* Opção 1: Assinatura Simplificada */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange({ tipoAssinatura: 'simples' })}
              className={`group relative flex flex-col gap-3 text-left p-4 rounded-xl border-2 transition-all ${
                readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${
                isSimples
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSimples ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <UserCheck className={`h-4 w-4 ${isSimples ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSimples ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {isSimples && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                </span>
              </div>

              <div>
                <p className={`text-sm font-semibold ${isSimples ? 'text-blue-900' : 'text-slate-700'}`}>
                  Assinatura Eletrônica Interna
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Registra automaticamente o nome completo, CPF e data/hora do usuário autenticado
                  no momento da assinatura. Aceita para uso interno institucional.
                </p>
              </div>
            </button>

            {/* Opção 2: Certificado Digital A1 */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange({ tipoAssinatura: 'certificado_a1' })}
              className={`group relative flex flex-col gap-3 text-left p-4 rounded-xl border-2 transition-all ${
                readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${
                isCertificado
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isCertificado ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <BadgeCheck className={`h-4 w-4 ${isCertificado ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isCertificado ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {isCertificado && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                </span>
              </div>

              <div>
                <p className={`text-sm font-semibold ${isCertificado ? 'text-blue-900' : 'text-slate-700'}`}>
                  Certificado Digital Tipo A1
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Assinatura com validade jurídica via ICP-Brasil (.pfx / .p12). Exige que
                  cada usuário assinante tenha um certificado A1 válido previamente cadastrado
                  no sistema.
                </p>
              </div>
            </button>
          </div>

          {/* Info box contextual */}
          <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed transition-all ${
            isSimples
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-violet-50 border-violet-200 text-violet-800'
          }`}>
            {isSimples ? (
              <div className="flex items-start gap-2.5">
                <UserCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold mb-0.5">O que será registrado em cada assinatura:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-emerald-700">
                    <li>Nome completo do usuário autenticado</li>
                    <li>CPF do assinante</li>
                    <li>Data e hora exata da assinatura</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 mt-0.5 shrink-0 text-violet-600" />
                <div>
                  <p className="font-semibold mb-0.5">Pré-requisitos para assinatura com Certificado A1:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-violet-700">
                    <li>Cada usuário assinante deve ter um certificado A1 ativo cadastrado</li>
                    <li>O certificado deve ser ICP-Brasil emitido por AC reconhecida</li>
                    <li>Certificados vencidos serão bloqueados automaticamente</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {readOnly && (
            <p className="text-xs text-slate-400 italic">
              Somente administradores podem alterar o tipo de assinatura.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Nota de implementação futura */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <p>
          Esta configuração define o modelo que será utilizado quando o fluxo de assinatura eletrônica
          for aplicado aos documentos. O fluxo completo de assinatura será disponibilizado em
          atualização futura.
        </p>
      </div>
    </div>
  );
};

/* ─── Boletim Tab ─── */

const BoletimTab: React.FC<{
  data: BoletimSettings;
  onChange: (p: Partial<BoletimSettings>) => void;
  readOnly: boolean;
}> = ({ data, onChange, readOnly }) => {
  const isDiurnoNoturno = data.modelo === 'diurno_noturno';
  const isDiario = data.modelo === 'diario';

  return (
    <div className="space-y-4">
      <SectionCard title="Modelo de Boletim Diário" icon={CalendarCheck}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Define como a rotina diária dos residentes será registrada nesta instituição.
            Todos os residentes utilizarão o modelo selecionado abaixo.
          </p>

          {/* Card selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {/* Opção 1: Diurno / Noturno */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange({ modelo: 'diurno_noturno' })}
              className={`group relative flex flex-col gap-3 text-left p-4 rounded-xl border-2 transition-all ${
                readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${
                isDiurnoNoturno
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDiurnoNoturno ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Sun className={`h-4 w-4 ${isDiurnoNoturno ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isDiurnoNoturno ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {isDiurnoNoturno && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                </span>
              </div>

              <div>
                <p className={`text-sm font-semibold ${isDiurnoNoturno ? 'text-blue-900' : 'text-slate-700'}`}>
                  Diurno / Noturno
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Dois boletins por dia, preenchidos separadamente pelas equipes do turno
                  diurno e do turno noturno.
                </p>
              </div>
            </button>

            {/* Opção 2: Boletim Diário Único */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange({ modelo: 'diario' })}
              className={`group relative flex flex-col gap-3 text-left p-4 rounded-xl border-2 transition-all ${
                readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${
                isDiario
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDiario ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <CalendarCheck className={`h-4 w-4 ${isDiario ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isDiario ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {isDiario && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                </span>
              </div>

              <div>
                <p className={`text-sm font-semibold ${isDiario ? 'text-blue-900' : 'text-slate-700'}`}>
                  Boletim Diário Único
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Um único boletim por dia, unificando os campos de diurno e noturno em um
                  só preenchimento.
                </p>
              </div>
            </button>
          </div>

          {/* Info box contextual */}
          <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed transition-all ${
            isDiurnoNoturno
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {isDiurnoNoturno ? (
              <div className="flex items-start gap-2.5">
                <Moon className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-semibold mb-0.5">Como funciona:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-sky-700">
                    <li>A equipe diurna preenche o Boletim Diurno</li>
                    <li>A equipe noturna preenche o Boletim Noturno, incluindo a avaliação do sono</li>
                    <li>Os dois registros ficam disponíveis separadamente no histórico</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <CalendarCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold mb-0.5">Como funciona:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-emerald-700">
                    <li>Um único boletim é preenchido por dia, por qualquer equipe</li>
                    <li>Os campos de diurno e noturno (incluindo o sono) ficam reunidos no mesmo registro</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {readOnly && (
            <p className="text-xs text-slate-400 italic">
              Somente administradores podem alterar o modelo de boletim.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Nota sobre histórico */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <p>
          Trocar o modelo não apaga boletins já preenchidos: os registros anteriores continuam
          disponíveis para consulta no histórico do residente, mesmo após a mudança.
        </p>
      </div>
    </div>
  );
};

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

/* ─── Subscription Tab ─── */

interface AssinaturaData {
  id: string;
  empresa_id: string;
  plano_id: string;
  plano_nome: string;
  valor_mensal: number;
  periodicidade: string;
  status: string;
  data_inicio?: string;
  data_vencimento?: string;
  trial_expira_em?: string;
}

const PLANOS_INFO = [
  {
    id: 'essencial',
    nome: 'Essencial',
    precoMensal: 399,
    precoAnual: 299,
    desc: 'Ideal para ILPIs com até 30 residentes',
    features: ['Até 30 residentes', '5 usuários', 'Gestão de residentes', 'Saúde & checklists', 'Financeiro básico', 'Estoque', 'Suporte por e-mail'],
    popular: false,
    colorClass: 'bg-slate-500',
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    precoMensal: 799,
    precoAnual: 599,
    desc: 'Para ILPIs de médio porte com mais recursos',
    features: ['Até 100 residentes', '20 usuários', 'Todos os módulos', 'Relatórios avançados', 'IA Assistente', 'Portal do familiar', 'Suporte prioritário'],
    popular: true,
    colorClass: 'bg-blue-600',
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    precoMensal: 0,
    precoAnual: 0,
    desc: 'Para redes e grupos com múltiplas unidades',
    features: ['Residentes ilimitados', 'Usuários ilimitados', 'Múltiplas unidades', 'Dashboard consolidado', 'Onboarding dedicado', 'SLA 99,9%', 'Gerente de sucesso'],
    popular: false,
    colorClass: 'bg-violet-600',
  },
];

function getStatusConfig(status: string) {
  switch (status) {
    case 'ativa': return { label: 'Em Dia', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    case 'em_trial': return { label: 'Em Trial', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    case 'pendente': return { label: 'Pendente', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    case 'vencida': return { label: 'Vencida', className: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    case 'pagamento_recusado': return { label: 'Pgto. Recusado', className: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    case 'cancelada': return { label: 'Cancelada', className: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    default: return { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  }
}

function formatDateBR(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const SubscriptionTab: React.FC<{ empresaId?: string; isAdmin: boolean }> = ({ empresaId, isAdmin }) => {
  const { trialInfo } = useAuth();
  const [assinatura, setAssinatura] = useState<AssinaturaData | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalInitialId, setPlanModalInitialId] = useState<string | undefined>();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const fetchAssinatura = async () => {
      if (!empresaId) { setLoadingSub(false); return; }
      try {
        const { data, error } = await supabase
          .from('Recanto_Assinaturas')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) setAssinatura(data);
      } catch (err) {
        console.error('Erro ao buscar assinatura:', err);
      } finally {
        setLoadingSub(false);
      }
    };
    fetchAssinatura();
  }, [empresaId]);

  const handlePaymentSuccess = () => {
    if (assinatura) setAssinatura({ ...assinatura, status: 'ativa' });
    setShowPaymentModal(false);
  };

  const handlePlanChange = (newPlanId: string) => {
    const plan = PLANOS_INFO.find(p => p.id === newPlanId);
    if (assinatura && plan) {
      setAssinatura({
        ...assinatura,
        plano_id: plan.id,
        plano_nome: plan.nome,
        valor_mensal: assinatura.periodicidade === 'anual' ? plan.precoAnual : plan.precoMensal,
      });
    }
    setShowPlanModal(false);
  };

  if (loadingSub) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4 font-medium">Carregando informações da assinatura...</p>
      </div>
    );
  }

  if (!assinatura) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[300px] text-center">
        <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">Nenhuma assinatura encontrada</p>
        <p className="text-sm text-slate-400 mt-1">Entre em contato com o suporte para regularizar sua assinatura.</p>
      </div>
    );
  }

  const planoAtual = PLANOS_INFO.find(p => p.id === assinatura.plano_id);
  const statusConfig = getStatusConfig(assinatura.status);
  const isInadimplente = assinatura.status === 'vencida' || assinatura.status === 'pagamento_recusado';
  const isCancelada = assinatura.status === 'cancelada';

  const isEmTrial = assinatura.status === 'em_trial' || trialInfo?.isInTrial === true;
  const trialDaysRemaining = (() => {
    if (trialInfo?.daysRemaining !== undefined) return trialInfo.daysRemaining;
    if (assinatura.trial_expira_em)
      return Math.max(0, Math.ceil((new Date(assinatura.trial_expira_em).getTime() - Date.now()) / 86400000));
    return 0;
  })();
  const countdownChipClass =
    trialDaysRemaining <= 2 ? 'bg-rose-100 text-rose-700 border-rose-200'
    : trialDaysRemaining <= 5 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  const trialEndDate = assinatura.trial_expira_em ? formatDateBR(assinatura.trial_expira_em) : '—';

  if (isEmTrial) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-100 bg-amber-50/60">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <h3 className="text-sm font-semibold text-amber-800">Período de Teste Gratuito</h3>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-100 shrink-0">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900">Você está no período de teste</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${countdownChipClass}`}>
                    <Clock className="h-3 w-3" />
                    {trialDaysRemaining === 0 ? 'Expira hoje'
                      : trialDaysRemaining === 1 ? '1 dia restante'
                      : `${trialDaysRemaining} dias restantes`}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Você está utilizando o sistema no período de teste. Nenhuma assinatura foi vinculada ainda.
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Início</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{formatDateBR(assinatura.data_inicio)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fim do Teste</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{trialEndDate}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-amber-600 mt-1">Trial gratuito</p>
                  </div>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  Assinar Agora
                </button>
              </div>
            )}
          </div>
        </div>

        <SectionCard title="Escolha seu Plano" icon={Star}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANOS_INFO.map(plano => (
              <div
                key={plano.id}
                className={`relative rounded-2xl border-2 p-4 transition-all ${plano.popular ? 'border-blue-400 bg-blue-50/30 shadow-md' : 'border-slate-100 bg-white'}`}
              >
                {plano.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm whitespace-nowrap">
                    Mais popular
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plano.colorClass}`}>
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900">{plano.nome}</h4>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">{plano.desc}</p>
                <p className="font-bold text-blue-700 text-sm mb-3">
                  {plano.precoMensal === 0 ? 'Sob consulta' : `R$ ${plano.precoMensal}/mês`}
                </p>
                <ul className="space-y-1.5">
                  {plano.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className={`mt-4 w-full py-2 text-xs font-semibold rounded-xl transition-all ${plano.colorClass} text-white hover:opacity-90`}
                  >
                    {plano.precoMensal === 0 ? 'Falar com equipe' : 'Contratar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {showSubscriptionModal && (
          <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isInadimplente && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-800">
              {assinatura.status === 'pagamento_recusado' ? 'Pagamento recusado' : 'Assinatura vencida'}
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              {assinatura.status === 'pagamento_recusado'
                ? 'Seu último pagamento foi recusado. Regularize para manter acesso completo ao sistema.'
                : 'Sua assinatura está vencida. Efetue o pagamento para restabelecer todos os recursos.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="shrink-0 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
            >
              Pagar agora
            </button>
          )}
        </div>
      )}

      {/* Current plan */}
      <SectionCard title="Plano Atual" icon={CreditCard}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${planoAtual?.colorClass ?? 'bg-blue-600'}`}>
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{assinatura.plano_nome}</h3>
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{planoAtual?.desc ?? ''}</p>
              <p className="text-base font-semibold text-blue-600 mt-1">
                {assinatura.valor_mensal === 0
                  ? 'Sob consulta'
                  : `R$ ${assinatura.valor_mensal.toFixed(2).replace('.', ',')} / ${assinatura.periodicidade === 'anual' ? 'mês (anual)' : 'mês'}`}
              </p>
            </div>
          </div>
          {isAdmin && !isCancelada && (
            <button
              onClick={() => { setPlanModalInitialId(undefined); setShowPlanModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Trocar Plano
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Periodicidade', value: assinatura.periodicidade === 'anual' ? 'Anual' : 'Mensal' },
            { label: 'Início', value: formatDateBR(assinatura.data_inicio) },
            { label: 'Vencimento', value: formatDateBR(assinatura.data_vencimento), highlight: isInadimplente },
            { label: 'Status Pgto.', value: isInadimplente ? 'Inadimplente' : assinatura.status === 'em_trial' ? 'Trial' : 'Em dia', highlight: isInadimplente },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-sm font-semibold mt-1 ${highlight ? 'text-rose-600' : 'text-slate-700'}`}>{value}</p>
            </div>
          ))}
        </div>

        {planoAtual && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recursos incluídos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {planoAtual.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              Realizar Pagamento
            </button>
          </div>
        )}
      </SectionCard>

      {/* Plan comparison */}
      <SectionCard title="Comparar Planos" icon={Star}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANOS_INFO.map(plano => {
            const isCurrent = plano.id === assinatura.plano_id;
            return (
              <div
                key={plano.id}
                className={`relative rounded-2xl border-2 p-4 transition-all ${
                  isCurrent ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-100 bg-white'
                }`}
              >
                {plano.popular && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm whitespace-nowrap">
                    Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 px-3 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
                    Plano atual
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plano.colorClass}`}>
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900">{plano.nome}</h4>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">{plano.desc}</p>
                <p className="font-bold text-blue-700 text-sm mb-3">
                  {plano.precoMensal === 0 ? 'Sob consulta' : `R$ ${plano.precoMensal}/mês`}
                </p>
                <ul className="space-y-1.5">
                  {plano.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isAdmin && !isCurrent && !isCancelada && (
                  <button
                    onClick={() => { setPlanModalInitialId(plano.id); setShowPlanModal(true); }}
                    className={`mt-4 w-full py-2 text-xs font-semibold rounded-xl transition-all ${plano.colorClass} text-white hover:opacity-90`}
                  >
                    Migrar para este plano
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {showPaymentModal && (
        <PaymentModal
          assinatura={assinatura}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
      {showPlanModal && (
        <PlanChangeModal
          currentPlanId={assinatura.plano_id}
          periodicidade={assinatura.periodicidade}
          empresaId={empresaId!}
          initialPlanId={planModalInitialId}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanChange}
        />
      )}
    </div>
  );
};

/* ─── Payment Modal ─── */

function calcVencimento(periodicidade: string): string {
  const d = new Date();
  if (periodicidade === 'anual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

const PaymentModal: React.FC<{
  assinatura: AssinaturaData;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ assinatura, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'cartao' | 'pix' | 'boleto'>('cartao');
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const modalMouseDown = useRef(false);
  const [dbError, setDbError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const fmtCartao = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  const fmtValidade = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

  const handleConfirm = async () => {
    setStep('processing');
    await new Promise(r => setTimeout(r, 2500));
    try {
      const novoVencimento = calcVencimento(assinatura.periodicidade);
      const { error } = await supabase
        .from('Recanto_Assinaturas')
        .update({ status: 'ativa', data_vencimento: novoVencimento })
        .eq('id', assinatura.id);
      if (error) throw error;

      await supabase.from('Recanto_Logs_Empresa').insert({
        empresa_id: assinatura.empresa_id,
        tipo: 'pagamento_aprovado',
        descricao: `Pagamento do plano ${assinatura.plano_nome} via ${method}`,
        metadata: { plano_nome: assinatura.plano_nome, valor: assinatura.valor_mensal, forma_pagamento: method, vencimento: novoVencimento },
      });

      setStep('success');
    } catch (err: any) {
      console.error('Erro ao registrar pagamento:', err);
      setDbError(err?.message ?? 'Erro desconhecido');
      setStep('error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={() => { modalMouseDown.current = false; }}
      onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget && step !== 'processing') onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">Realizar Pagamento</h2>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === 'form' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-blue-800 font-medium">Plano {assinatura.plano_nome}
                  {assinatura.valor_mensal > 0 && (
                    <span className="font-normal"> — R$ {assinatura.valor_mensal.toFixed(2).replace('.', ',')}/mês</span>
                  )}
                </p>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['cartao', 'pix', 'boleto'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      method === m ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {m === 'cartao' ? 'Cartão' : m === 'pix' ? 'PIX' : 'Boleto'}
                  </button>
                ))}
              </div>

              {method === 'cartao' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Número do Cartão</label>
                    <input
                      value={cardNumber}
                      onChange={e => setCardNumber(fmtCartao(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nome no Cartão</label>
                    <input
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      placeholder="NOME COMPLETO"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Validade</label>
                      <input
                        value={cardExpiry}
                        onChange={e => setCardExpiry(fmtValidade(e.target.value))}
                        placeholder="MM/AA"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CVV</label>
                      <input
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Pagamento simulado — nenhuma cobrança real será efetuada
                  </div>
                </div>
              )}

              {method === 'pix' && (
                <div className="text-center space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center">
                    <div className="w-36 h-36 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center mb-3">
                      <div className="grid grid-cols-5 gap-0.5 opacity-25">
                        {[1,0,1,1,0,0,1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,1,0,0,1].map((v, i) => (
                          <div key={i} className={`w-5 h-5 rounded-sm ${v ? 'bg-slate-900' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="font-mono text-xs text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-1.5 max-w-full truncate">
                      00020126580014br.gov.bcb.pix0136mock-key
                    </p>
                    <button className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Copiar chave PIX
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">QR Code simulado. Confirme para registrar o pagamento.</p>
                </div>
              )}

              {method === 'boleto' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <p className="font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-3 tracking-widest leading-relaxed break-all">
                      23791.12345 67890.12345 67890.12345 6 00000000000000
                    </p>
                    <button className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Copiar código de barras
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center">Boleto simulado com vencimento em 3 dias úteis.</p>
                </div>
              )}

              <button
                onClick={handleConfirm}
                className="mt-5 w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                {method === 'cartao' ? 'Confirmar Pagamento' : method === 'pix' ? 'Confirmar PIX' : 'Confirmar Boleto'}
              </button>
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-700 font-semibold">Processando pagamento...</p>
              <p className="text-sm text-slate-400">Aguarde, não feche esta janela</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-lg">Pagamento realizado!</p>
                <p className="text-sm text-slate-500 mt-1">Sua assinatura foi regularizada com sucesso.</p>
              </div>
              <button
                onClick={onSuccess}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-rose-500" />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-lg">Erro ao processar</p>
                <p className="text-sm text-slate-500 mt-1">
                  {dbError || 'Não foi possível salvar o pagamento. Tente novamente.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep('form'); setDbError(''); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Tentar novamente
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Plan Change Modal ─── */

const PlanChangeModal: React.FC<{
  currentPlanId: string;
  periodicidade: string;
  empresaId: string;
  initialPlanId?: string;
  onClose: () => void;
  onSuccess: (newPlanId: string) => void;
}> = ({ currentPlanId, periodicidade, empresaId, initialPlanId, onClose, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(initialPlanId ?? currentPlanId);
  const [selectedPeriod, setSelectedPeriod] = useState<'mensal' | 'anual'>(periodicidade as 'mensal' | 'anual');
  const [step, setStep] = useState<'select' | 'payment' | 'processing' | 'success' | 'error'>('select');
  const [dbError, setDbError] = useState('');
  const [payMethod, setPayMethod] = useState<'cartao' | 'pix' | 'boleto'>('cartao');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const modalMouseDown = useRef(false);

  const planInfo = PLANOS_INFO.find(p => p.id === selectedPlan);
  const price = planInfo ? (selectedPeriod === 'anual' ? planInfo.precoAnual : planInfo.precoMensal) : 0;

  const fmtCartao = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  const fmtValidade = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

  const handlePagar = async () => {
    setStep('processing');
    await new Promise(r => setTimeout(r, 2500));
    try {
      const plan = PLANOS_INFO.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plano não encontrado');

      const novoVencimento = calcVencimento(selectedPeriod);
      const { error } = await supabase
        .from('Recanto_Assinaturas')
        .update({
          plano_id: plan.id,
          plano_nome: plan.nome,
          valor_mensal: price,
          periodicidade: selectedPeriod,
          status: 'ativa',
          data_vencimento: novoVencimento,
        })
        .eq('empresa_id', empresaId);
      if (error) throw error;

      await supabase.from('Recanto_Logs_Empresa').insert({
        empresa_id: empresaId,
        tipo: 'pagamento_aprovado',
        descricao: `Migração para plano ${plan.nome} via ${payMethod}`,
        metadata: { plano_id: plan.id, plano_nome: plan.nome, valor: price, periodicidade: selectedPeriod, forma_pagamento: payMethod, vencimento: novoVencimento },
      });

      setStep('success');
    } catch (err: any) {
      console.error('Erro ao migrar plano:', err);
      setDbError(err?.message ?? 'Erro desconhecido');
      setStep('error');
    }
  };

  const stepTitle: Record<string, string> = {
    select: 'Trocar Plano',
    payment: 'Pagamento',
    processing: 'Processando',
    success: 'Concluído',
    error: 'Erro',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={() => { modalMouseDown.current = false; }}
      onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget && step !== 'processing') onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">{stepTitle[step]}</h2>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Step indicator */}
        {(step === 'select' || step === 'payment') && (
          <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
            {['Escolha o plano', 'Pagamento'].map((label, i) => {
              const active = (i === 0 && step === 'select') || (i === 1 && step === 'payment');
              const done = (i === 0 && step === 'payment');
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1 — Select plan */}
          {step === 'select' && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <p className="text-sm text-slate-600">Cobrança:</p>
                <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                  {(['mensal', 'anual'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {p === 'mensal' ? 'Mensal' : 'Anual (-25%)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANOS_INFO.map(plano => {
                  const isSelected = selectedPlan === plano.id;
                  const isCurrent = currentPlanId === plano.id;
                  const p = selectedPeriod === 'anual' ? plano.precoAnual : plano.precoMensal;
                  return (
                    <button
                      key={plano.id}
                      onClick={() => setSelectedPlan(plano.id)}
                      className={`relative text-left rounded-2xl border-2 p-4 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">Atual</span>
                      )}
                      {plano.popular && !isCurrent && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full whitespace-nowrap">Popular</span>
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${plano.colorClass}`}>
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{plano.nome}</p>
                      <p className="text-xs font-bold text-blue-700 mt-0.5">{p === 0 ? 'Sob consulta' : `R$ ${p}/mês`}</p>
                      <ul className="mt-2 space-y-1">
                        {plano.features.slice(0, 4).map(f => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                            <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                        {plano.features.length > 4 && (
                          <li className="text-xs text-blue-600 font-medium pl-4">+{plano.features.length - 4} recursos</li>
                        )}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 2 — Payment */}
          {step === 'payment' && planInfo && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Plano {planInfo.nome}</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {price === 0 ? 'Sob consulta' : `R$ ${price.toFixed(2).replace('.', ',')}/mês`}
                    {selectedPeriod === 'anual' && ' · cobrança anual'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${planInfo.colorClass}`}>
                  <Zap className="h-5 w-5 text-white" />
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['cartao', 'pix', 'boleto'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      payMethod === m ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {m === 'cartao' ? 'Cartão' : m === 'pix' ? 'PIX' : 'Boleto'}
                  </button>
                ))}
              </div>

              {payMethod === 'cartao' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Número do Cartão</label>
                    <input value={cardNumber} onChange={e => setCardNumber(fmtCartao(e.target.value))} placeholder="0000 0000 0000 0000"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nome no Cartão</label>
                    <input value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} placeholder="NOME COMPLETO"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Validade</label>
                      <input value={cardExpiry} onChange={e => setCardExpiry(fmtValidade(e.target.value))} placeholder="MM/AA"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CVV</label>
                      <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Pagamento simulado — nenhuma cobrança real será efetuada
                  </div>
                </div>
              )}

              {payMethod === 'pix' && (
                <div className="text-center space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center">
                    <div className="w-36 h-36 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center mb-3">
                      <div className="grid grid-cols-5 gap-0.5 opacity-25">
                        {[1,0,1,1,0,0,1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,1,0,0,1].map((v, i) => (
                          <div key={i} className={`w-5 h-5 rounded-sm ${v ? 'bg-slate-900' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="font-mono text-xs text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-1.5 max-w-full truncate">
                      00020126580014br.gov.bcb.pix0136mock-key
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">QR Code simulado. Confirme para registrar o pagamento.</p>
                </div>
              )}

              {payMethod === 'boleto' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <p className="font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-3 tracking-widest break-all">
                      23791.12345 67890.12345 67890.12345 6 00000000000000
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 text-center">Boleto simulado com vencimento em 3 dias úteis.</p>
                </div>
              )}
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-700 font-semibold">Processando pagamento e atualizando plano...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-lg">Plano atualizado!</p>
                <p className="text-sm text-slate-500 mt-1">Migrado com sucesso para o plano <strong>{planInfo?.nome}</strong>. Pagamento registrado.</p>
              </div>
              <button onClick={() => onSuccess(selectedPlan)} className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
                Fechar
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-rose-500" />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-lg">Erro ao processar</p>
                <p className="text-sm text-slate-500 mt-1">{dbError || 'Não foi possível atualizar o plano. Tente novamente.'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep('payment'); setDbError(''); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Tentar novamente
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {(step === 'select' || step === 'payment') && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
            {step === 'payment' ? (
              <>
                <button onClick={() => setStep('select')} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button onClick={handlePagar} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                  <CreditCard className="h-4 w-4" />
                  {payMethod === 'cartao' ? 'Confirmar Pagamento' : payMethod === 'pix' ? 'Confirmar PIX' : 'Confirmar Boleto'}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">
                  Cancelar
                </button>
                <button
                  disabled={selectedPlan === currentPlanId}
                  onClick={() => setStep('payment')}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Avançar para Pagamento
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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

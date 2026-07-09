import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare, FileText, Send, History, Settings as SettingsIcon, Plus, X, Trash2,
  Pencil, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2, Smartphone,
  ShieldCheck, QrCode, Power, Eye,
} from 'lucide-react';
import { Resident, NotificationTemplate, NotificationQueueItem, NotificationChoice, NotificationMessageType, WhatsappInstance, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../services/toast';
import * as svc from '../services/notificationService';
import type { ResponsibleContact } from '../services/notificationService';

interface NotificationsModuleProps {
  residents: Resident[];
}

const TRIGGER_EVENTS = [
  { value: 'manual', label: 'Manual' },
  { value: 'medication_low', label: 'Medicamento com estoque baixo' },
];

const HEALTH_EVENTS = new Set(['medication_low']);

const TEMPLATE_VARS = ['responsible_name', 'resident_name', 'medication_name', 'quantity', 'min_quantity'];

const SAMPLE_VARS: Record<string, string> = {
  responsible_name: 'Maria',
  resident_name: 'Sr. João',
  medication_name: 'Dipirona',
  quantity: '3',
  min_quantity: '5',
};

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:    { label: 'Aguardando', bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Clock },
  processing: { label: 'Processando', bg: 'bg-blue-50',   text: 'text-blue-700',    icon: Loader2 },
  sent:       { label: 'Enviada',    bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  failed:     { label: 'Falhou',     bg: 'bg-rose-50',    text: 'text-rose-700',    icon: XCircle },
  cancelled:  { label: 'Cancelada',  bg: 'bg-slate-100',  text: 'text-slate-600',   icon: XCircle },
};

const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function renderTemplate(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), text || '');
}

function maskPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length < 6) return phone;
  const last4 = d.slice(-4);
  const ddd = d.length >= 12 ? d.slice(2, 4) : d.slice(0, 2);
  return `+${d.slice(0, 2)} ${ddd} ${'*'.repeat(Math.max(2, d.length - 8))}-${last4}`;
}

type Tab = 'templates' | 'send' | 'history' | 'config';

const emptyTemplateForm = (): Partial<NotificationTemplate> => ({
  name: '', triggerEvent: 'manual', messageType: 'text', messageText: '', footerText: '', choices: [], active: true,
});

const NotificationsModule: React.FC<NotificationsModuleProps> = ({ residents = [] }) => {
  const { currentUser } = useAuth();
  const empresaId = currentUser?.empresaId;

  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [responsibles, setResponsibles] = useState<ResponsibleContact[]>([]);
  const [prefs, setPrefs] = useState<svc.NotificationPreferenceMap>({});
  const [instance, setInstance] = useState<WhatsappInstance | null>(null);

  // ─── Carregamento ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [tpls, q, resp, prefList, inst] = await Promise.all([
        svc.fetchTemplates(empresaId),
        svc.fetchQueue(empresaId),
        svc.fetchResponsibles(empresaId),
        svc.fetchPreferences(empresaId),
        svc.getWhatsappInstance().catch(() => null),
      ]);
      setTemplates(tpls);
      setQueue(q);
      setResponsibles(resp);
      const map: svc.NotificationPreferenceMap = {};
      for (const p of prefList) map[`${p.responsibleId}:${p.residentId ?? ''}`] = p;
      setPrefs(map);
      setInstance(inst);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'templates', label: 'Modelos', icon: FileText },
    { id: 'send', label: 'Enviar', icon: Send },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'config', label: 'Configurações', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Notificações WhatsApp</h1>
          <p className="text-sm text-slate-500">Modelos, envios e avisos automáticos via UAZAPI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 w-fit overflow-x-auto">
        {tabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <>
          {activeTab === 'templates' && (
            <TemplatesTab empresaId={empresaId!} templates={templates} onReload={loadAll} />
          )}
          {activeTab === 'send' && (
            <SendTab templates={templates.filter(t => t.active)} responsibles={responsibles} onSent={loadAll} />
          )}
          {activeTab === 'history' && (
            <HistoryTab queue={queue} onReload={loadAll} />
          )}
          {activeTab === 'config' && (
            <ConfigTab
              empresaId={empresaId!}
              instance={instance}
              setInstance={setInstance}
              responsibles={responsibles}
              prefs={prefs}
              setPrefs={setPrefs}
            />
          )}
        </>
      )}
    </div>
  );
};

// ===========================================================================
// Aba: MODELOS
// ===========================================================================
const TemplatesTab: React.FC<{ empresaId: string; templates: NotificationTemplate[]; onReload: () => void }> = ({ empresaId, templates, onReload }) => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.NOTIFICATIONS, 'create');

  const [editing, setEditing] = useState<Partial<NotificationTemplate> | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) { toast.error('Informe o nome do modelo.'); return; }
    if (!editing.messageText?.trim()) { toast.error('A mensagem não pode ser vazia.'); return; }
    if ((editing.messageType === 'button' || editing.messageType === 'menu') && !(editing.choices?.length)) {
      toast.error('Adicione ao menos uma opção para mensagens com botões/menu.'); return;
    }
    try {
      await svc.saveTemplate(empresaId, editing);
      toast.success('Modelo salvo.');
      setEditing(null);
      onReload();
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar modelo.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este modelo?')) return;
    try { await svc.deleteTemplate(id); toast.success('Modelo excluído.'); onReload(); }
    catch (err: any) { toast.error(err.message || 'Erro ao excluir.'); }
  };

  const handleToggle = async (t: NotificationTemplate) => {
    try { await svc.toggleTemplate(t.id, !t.active); onReload(); }
    catch (err: any) { toast.error(err.message || 'Erro ao atualizar.'); }
  };

  const insertVar = (v: string) => {
    const el = textRef.current;
    const token = `{${v}}`;
    if (!el) { setEditing(p => ({ ...p!, messageText: (p?.messageText || '') + token })); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setEditing(p => ({ ...p!, messageText: next }));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length; });
  };

  const isHealth = editing && HEALTH_EVENTS.has(editing.triggerEvent || '');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && (
          <button onClick={() => setEditing(emptyTemplateForm())} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Novo modelo
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhum modelo cadastrado.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800 truncate">{t.name}</h3>
                    {!t.empresaId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Global</span>}
                    {HEALTH_EVENTS.has(t.triggerEvent) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Saúde</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {TRIGGER_EVENTS.find(e => e.value === t.triggerEvent)?.label || t.triggerEvent} · {t.messageType}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(t)}
                  className={`text-[11px] px-2 py-1 rounded-lg font-medium shrink-0 ${t.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                >
                  {t.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-2 line-clamp-3 whitespace-pre-wrap break-words">{t.messageText}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing({ ...t })} className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                {t.empresaId && (
                  <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editing && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{editing.id ? 'Editar modelo' : 'Novo modelo'}</h2>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-5">
              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nome do modelo</label>
                  <input className={inputClass} value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Evento</label>
                    <select className={inputClass} value={editing.triggerEvent} onChange={e => setEditing({ ...editing, triggerEvent: e.target.value })}>
                      {TRIGGER_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Tipo</label>
                    <select className={inputClass} value={editing.messageType} onChange={e => setEditing({ ...editing, messageType: e.target.value as NotificationMessageType })}>
                      <option value="text">Texto</option>
                      <option value="button">Botões</option>
                      <option value="menu">Menu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">Mensagem</label>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {TEMPLATE_VARS.map(v => (
                      <button key={v} type="button" onClick={() => insertVar(v)} className="text-[10px] px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100">
                        {`{${v}}`}
                      </button>
                    ))}
                  </div>
                  <textarea ref={textRef} rows={6} className={inputClass} value={editing.messageText || ''} onChange={e => setEditing({ ...editing, messageText: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Rodapé (opcional)</label>
                  <input className={inputClass} value={editing.footerText || ''} onChange={e => setEditing({ ...editing, footerText: e.target.value })} />
                </div>

                {(editing.messageType === 'button' || editing.messageType === 'menu') && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Opções / Botões</label>
                    {(editing.choices || []).map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <input className={inputClass} placeholder="Texto do botão" value={c.text}
                          onChange={e => {
                            const choices = [...(editing.choices || [])];
                            choices[i] = { id: e.target.value.toLowerCase().replace(/\s+/g, '_').slice(0, 30) || `op_${i}`, text: e.target.value };
                            setEditing({ ...editing, choices });
                          }} />
                        <button type="button" onClick={() => setEditing({ ...editing, choices: (editing.choices || []).filter((_, j) => j !== i) })} className="text-rose-500 hover:bg-rose-50 rounded-lg px-2">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditing({ ...editing, choices: [...(editing.choices || []), { id: '', text: '' }] })} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar opção
                    </button>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing({ ...editing, active: e.target.checked })} className="rounded" />
                  Modelo ativo
                </label>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                {isHealth && (
                  <div className="flex gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Mensagem de saúde: só é enviada a responsáveis com consentimento ativo. Não inclua diagnóstico ou posologia detalhada (LGPD).</span>
                  </div>
                )}
                <label className="text-xs font-medium text-slate-600">Pré-visualização</label>
                <div className="rounded-2xl bg-[#e5ddd5] p-4 min-h-[180px]">
                  <div className="bg-white rounded-xl rounded-tl-none shadow-sm p-3 text-sm text-slate-700 whitespace-pre-wrap break-words max-w-[90%]">
                    {renderTemplate(editing.messageText || 'Sua mensagem aparecerá aqui…', SAMPLE_VARS)}
                    {editing.footerText && <div className="text-[11px] text-slate-400 mt-2">{editing.footerText}</div>}
                    {(editing.messageType === 'button' || editing.messageType === 'menu') && (editing.choices || []).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                        {(editing.choices || []).map((c, i) => (
                          <div key={i} className="text-center text-xs text-blue-600 bg-blue-50 rounded-lg py-1.5">{c.text || 'Opção'}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Aba: ENVIAR
// ===========================================================================
const SendTab: React.FC<{ templates: NotificationTemplate[]; responsibles: ResponsibleContact[]; onSent: () => void }> = ({ templates, responsibles, onSent }) => {
  const [mode, setMode] = useState<'template' | 'free'>('free');
  const [templateId, setTemplateId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [recipients, setRecipients] = useState<svc.ManualRecipient[]>([]);
  const [sending, setSending] = useState(false);

  // Seleção de destinatário
  const [recipMode, setRecipMode] = useState<'responsible' | 'manual_phone'>('responsible');
  const [selectedRespId, setSelectedRespId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const selectedTemplate = templates.find(t => t.id === templateId);
  const effectiveText = mode === 'template' ? (selectedTemplate?.messageText ?? '') : messageText;
  const isHealth = mode === 'template' && selectedTemplate && HEALTH_EVENTS.has(selectedTemplate.triggerEvent);

  const addRecipient = () => {
    if (recipMode === 'responsible') {
      const r = responsibles.find(x => x.id === selectedRespId);
      if (!r) { toast.error('Selecione um responsável.'); return; }
      if (recipients.some(x => x.recipient_id === r.id)) { toast.error('Responsável já adicionado.'); return; }
      setRecipients(prev => [...prev, {
        recipient_type: 'responsible', recipient_id: r.id, recipient_name: r.name, recipient_phone: r.phone,
        variables: { responsible_name: r.name, resident_name: r.residentName },
      }]);
    } else {
      if (!manualPhone.trim()) { toast.error('Informe o telefone.'); return; }
      setRecipients(prev => [...prev, {
        recipient_type: 'manual_phone', recipient_name: manualName || undefined, recipient_phone: manualPhone,
        variables: manualName ? { responsible_name: manualName } : {},
      }]);
      setManualName(''); setManualPhone('');
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) { toast.error('Adicione ao menos um destinatário.'); return; }
    if (mode === 'free' && !messageText.trim()) { toast.error('Escreva a mensagem.'); return; }
    if (mode === 'template' && !templateId) { toast.error('Selecione um modelo.'); return; }
    if (!confirm(`Enviar para ${recipients.length} destinatário(s)?`)) return;
    setSending(true);
    try {
      const res = await svc.enqueueManual({
        templateId: mode === 'template' ? templateId : undefined,
        messageText: mode === 'free' ? messageText : undefined,
        recipients,
      });
      toast.success(`${res.created} de ${res.total} enfileirada(s) para envio.`);
      setRecipients([]); setMessageText('');
      onSent();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar.');
    } finally { setSending(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex gap-2">
          <button onClick={() => setMode('free')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === 'free' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Texto livre</button>
          <button onClick={() => setMode('template')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === 'template' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Usar modelo</button>
        </div>

        {mode === 'template' ? (
          <div>
            <label className="text-xs font-medium text-slate-600">Modelo</label>
            <select className={inputClass} value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">Selecione…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-slate-600">Mensagem</label>
            <textarea rows={5} className={inputClass} value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Digite a mensagem…" />
          </div>
        )}

        {isHealth && (
          <div className="flex gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Este modelo é de saúde. Confirme o consentimento dos destinatários antes de enviar (LGPD).</span>
          </div>
        )}

        {/* Destinatários */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="text-xs font-medium text-slate-600">Adicionar destinatário</label>
          <div className="flex gap-2">
            <button onClick={() => setRecipMode('responsible')} className={`flex-1 py-1.5 rounded-lg text-xs ${recipMode === 'responsible' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>Responsável</button>
            <button onClick={() => setRecipMode('manual_phone')} className={`flex-1 py-1.5 rounded-lg text-xs ${recipMode === 'manual_phone' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>Telefone avulso</button>
          </div>
          {recipMode === 'responsible' ? (
            <select className={inputClass} value={selectedRespId} onChange={e => setSelectedRespId(e.target.value)}>
              <option value="">Selecione um responsável…</option>
              {responsibles.map(r => (
                <option key={r.id} value={r.id}>{r.name} — {r.residentName}{r.isPrimary ? ' (principal)' : ''}</option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input className={inputClass} placeholder="Nome (opcional)" value={manualName} onChange={e => setManualName(e.target.value)} />
              <input className={inputClass} placeholder="(31) 99999-1234" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
            </div>
          )}
          <button onClick={addRecipient} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
      </div>

      {/* Preview + lista + enviar */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <label className="text-xs font-medium text-slate-600">Pré-visualização</label>
          <div className="rounded-2xl bg-[#e5ddd5] p-4 min-h-[120px] mt-1">
            <div className="bg-white rounded-xl rounded-tl-none shadow-sm p-3 text-sm text-slate-700 whitespace-pre-wrap break-words max-w-[90%]">
              {renderTemplate(effectiveText || 'Mensagem…', SAMPLE_VARS)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Destinatários ({recipients.length})</span>
          </div>
          {recipients.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Nenhum destinatário adicionado.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recipients.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="truncate">{r.recipient_name || 'Sem nome'} · <span className="text-slate-400">{maskPhone(r.recipient_phone)}</span></span>
                  <button onClick={() => setRecipients(recipients.filter((_, j) => j !== i))} className="text-rose-500 hover:bg-rose-100 rounded p-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleSend} disabled={sending} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// Aba: HISTÓRICO
// ===========================================================================
const HistoryTab: React.FC<{ queue: NotificationQueueItem[]; onReload: () => void }> = ({ queue, onReload }) => {
  const [detail, setDetail] = useState<NotificationQueueItem | null>(null);

  const handleResend = async (id: string) => {
    try { const ok = await svc.resendQueueItem(id); toast[ok ? 'success' : 'error'](ok ? 'Reenfileirada.' : 'Não foi possível reenviar.'); onReload(); }
    catch (err: any) { toast.error(err.message || 'Erro.'); }
  };
  const handleCancel = async (id: string) => {
    try { const ok = await svc.cancelQueueItem(id); toast[ok ? 'success' : 'error'](ok ? 'Cancelada.' : 'Não foi possível cancelar.'); onReload(); }
    catch (err: any) { toast.error(err.message || 'Erro.'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-700">{queue.length} mensagem(ns)</span>
        <button onClick={onReload} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Data</th>
              <th className="text-left px-4 py-2.5 font-medium">Destinatário</th>
              <th className="text-left px-4 py-2.5 font-medium">Evento</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Tent.</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-400 py-10">Nenhuma notificação ainda.</td></tr>
            ) : queue.map(q => {
              const sc = statusConfig[q.status] ?? statusConfig.pending;
              return (
                <tr key={q.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(q.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-slate-700">{q.recipientName || '—'}</div>
                    <div className="text-[11px] text-slate-400">{maskPhone(q.recipientPhone)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{TRIGGER_EVENTS.find(e => e.value === q.triggerEvent)?.label || q.triggerEvent}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg ${sc.bg} ${sc.text}`}>
                      <sc.icon className={`h-3 w-3 ${q.status === 'processing' ? 'animate-spin' : ''}`} /> {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{q.attempts}/{q.maxAttempts}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDetail(q)} className="text-slate-400 hover:text-blue-600 p-1" title="Detalhes"><Eye className="h-4 w-4" /></button>
                      {q.status === 'failed' && <button onClick={() => handleResend(q.id)} className="text-slate-400 hover:text-emerald-600 p-1" title="Reenviar"><RefreshCw className="h-4 w-4" /></button>}
                      {q.status === 'pending' && <button onClick={() => handleCancel(q.id)} className="text-slate-400 hover:text-rose-600 p-1" title="Cancelar"><XCircle className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Detalhes do envio</h3>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              <p><span className="text-slate-400">Destinatário:</span> {detail.recipientName || '—'} ({maskPhone(detail.recipientPhone)})</p>
              <p><span className="text-slate-400">Mensagem:</span></p>
              <div className="bg-slate-50 rounded-xl p-3 whitespace-pre-wrap break-words text-slate-700">{detail.messageText}</div>
              {detail.lastError && (
                <div className="bg-rose-50 text-rose-700 rounded-xl p-3 text-xs">
                  <strong>Erro:</strong> {detail.lastError}
                </div>
              )}
              {detail.sentAt && <p><span className="text-slate-400">Enviada em:</span> {new Date(detail.sentAt).toLocaleString('pt-BR')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Aba: CONFIGURAÇÕES (Conexão WhatsApp + Consentimentos)
// ===========================================================================
const ConfigTab: React.FC<{
  empresaId: string;
  instance: WhatsappInstance | null;
  setInstance: (i: WhatsappInstance | null) => void;
  responsibles: ResponsibleContact[];
  prefs: svc.NotificationPreferenceMap;
  setPrefs: React.Dispatch<React.SetStateAction<svc.NotificationPreferenceMap>>;
}> = ({ empresaId, instance, setInstance, responsibles, prefs, setPrefs }) => {
  const [connecting, setConnecting] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPolling(), []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await svc.connectWhatsapp();
      setInstance(res);
      setQr(res.qrcode ?? null);
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const s = await svc.refreshWhatsappStatus();
          setInstance(s);
          if (s.connected) { setQr(null); stopPolling(); toast.success('WhatsApp conectado!'); }
        } catch { /* mantém polling */ }
      }, 4000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar. Verifique UAZAPI_BASE_URL/ADMIN_TOKEN.');
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    try { const s = await svc.disconnectWhatsapp(); setInstance(s); setQr(null); stopPolling(); toast.success('Desconectado.'); }
    catch (err: any) { toast.error(err.message || 'Erro ao desconectar.'); }
  };

  const connected = instance?.connected;

  const togglePref = async (r: ResponsibleContact, field: 'whatsappEnabled' | 'healthNotificationsEnabled' | 'administrativeNotificationsEnabled' | 'financialNotificationsEnabled') => {
    const key = `${r.id}:${r.residentId}`;
    const current = prefs[key] ?? {
      responsibleId: r.id, residentId: r.residentId,
      whatsappEnabled: false, healthNotificationsEnabled: false,
      administrativeNotificationsEnabled: true, financialNotificationsEnabled: true,
    };
    const updated = { ...current, [field]: !current[field] };
    setPrefs(prev => ({ ...prev, [key]: updated })); // otimista
    try {
      const saved = await svc.savePreference(empresaId, updated);
      setPrefs(prev => ({ ...prev, [key]: saved }));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar consentimento.');
      setPrefs(prev => ({ ...prev, [key]: current })); // rollback
    }
  };

  return (
    <div className="space-y-5">
      {/* Conexão WhatsApp */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Conexão WhatsApp (UAZAPI)</h3>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-sm font-medium text-slate-700">
                {connected ? 'Conectado' : instance?.status === 'connecting' ? 'Conectando…' : instance?.status === 'not_configured' ? 'Não configurado' : 'Desconectado'}
              </span>
            </div>
            {instance?.phoneNumber && <p className="text-xs text-slate-400 mt-1">Número: {instance.phoneNumber}</p>}
            <p className="text-[11px] text-slate-400 mt-2 max-w-md">O token da instância é mantido apenas no servidor (nunca exposto ao navegador).</p>
          </div>
          <div className="flex gap-2">
            {!connected ? (
              <button onClick={handleConnect} disabled={connecting} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Conectar
              </button>
            ) : (
              <button onClick={handleDisconnect} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-medium rounded-xl">
                <Power className="h-4 w-4" /> Desconectar
              </button>
            )}
          </div>
        </div>
        {qr && !connected && (
          <div className="mt-4 flex flex-col items-center gap-2 py-4 border-t border-slate-100">
            <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code" className="w-56 h-56 rounded-xl border border-slate-200" />
            <p className="text-xs text-slate-500">Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho.</p>
          </div>
        )}
      </div>

      {/* Consentimentos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Consentimento dos responsáveis (LGPD)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Responsável</th>
                <th className="text-center px-3 py-2.5 font-medium">WhatsApp</th>
                <th className="text-center px-3 py-2.5 font-medium">Saúde</th>
                <th className="text-center px-3 py-2.5 font-medium">Administrativo</th>
                <th className="text-center px-3 py-2.5 font-medium">Financeiro</th>
              </tr>
            </thead>
            <tbody>
              {responsibles.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-400 py-10">Nenhum responsável cadastrado.</td></tr>
              ) : responsibles.map(r => {
                const p = prefs[`${r.id}:${r.residentId}`];
                const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
                  <button onClick={onClick} className={`w-10 h-5.5 rounded-full relative transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ height: 22, width: 40 }}>
                    <span className={`absolute top-0.5 ${on ? 'right-0.5' : 'left-0.5'} w-[18px] h-[18px] bg-white rounded-full shadow transition-all`} />
                  </button>
                );
                return (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.name}{r.isPrimary && <span className="ml-1 text-[10px] text-blue-500">(principal)</span>}</div>
                      <div className="text-[11px] text-slate-400">{r.residentName} · {maskPhone(r.phone)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center"><div className="flex justify-center"><Toggle on={!!p?.whatsappEnabled} onClick={() => togglePref(r, 'whatsappEnabled')} /></div></td>
                    <td className="px-3 py-2.5 text-center"><div className="flex justify-center"><Toggle on={!!p?.healthNotificationsEnabled} onClick={() => togglePref(r, 'healthNotificationsEnabled')} /></div></td>
                    <td className="px-3 py-2.5 text-center"><div className="flex justify-center"><Toggle on={p?.administrativeNotificationsEnabled ?? true} onClick={() => togglePref(r, 'administrativeNotificationsEnabled')} /></div></td>
                    <td className="px-3 py-2.5 text-center"><div className="flex justify-center"><Toggle on={p?.financialNotificationsEnabled ?? true} onClick={() => togglePref(r, 'financialNotificationsEnabled')} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 px-5 py-3 border-t border-slate-50">
          O aviso automático de medicamento só é enviado quando “WhatsApp” e “Saúde” estiverem ativos para o responsável principal.
        </p>
      </div>
    </div>
  );
};

export default NotificationsModule;

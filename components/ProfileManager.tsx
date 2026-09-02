import React, { useState } from 'react';
import { Shield, Plus, ChevronDown, ChevronUp, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Profile, ViewState, PermissionAction } from '../types';

const MODULE_LABELS: Record<ViewState, string> = {
  [ViewState.DASHBOARD]: 'Painel Geral',
  [ViewState.RESIDENTS]: 'Residentes',
  [ViewState.GENERAL_EVOLUTION]: 'Evolução Geral',
  [ViewState.RESIDENT_DETAIL]: 'Prontuário',
  [ViewState.AGENDA]: 'Agenda',
  [ViewState.NUTRITION]: 'Nutrição',
  [ViewState.FRIGOBAR]: 'Controle de Frigobar',
  [ViewState.TEAM]: 'Equipe',
  [ViewState.FINANCE]: 'Financeiro',
  [ViewState.STOCK]: 'Estoque',
  [ViewState.REPORTS]: 'Relatórios',
  [ViewState.USERS]: 'Contas de Acesso',
  [ViewState.ROOMS]: 'Quartos',
  [ViewState.NOTIFICATIONS]: 'Notificações',
  [ViewState.SETTINGS]: 'Configurações',
  [ViewState.PROFILE]: 'Meu Perfil',
  
  // Sub-pages of Prontuário
  [ViewState.RESIDENT_DETAIL_INFO]: 'Cadastro',
  [ViewState.RESIDENT_DETAIL_VITALS]: 'Sinais Vitais',
  [ViewState.RESIDENT_DETAIL_GLICEMIA]: 'Glicemia',
  [ViewState.RESIDENT_DETAIL_MEDS]: 'Medicamentos',
  [ViewState.RESIDENT_DETAIL_ROUTINE]: 'Rotina Diária',
  [ViewState.RESIDENT_DETAIL_CARE_PLAN]: 'Plano Evolutivo',
  [ViewState.RESIDENT_DETAIL_VISITS]: 'Visitas',
  [ViewState.RESIDENT_DETAIL_DOCS]: 'Documentos',
  [ViewState.RESIDENT_DETAIL_EVOLUTION]: 'Evolução',
  [ViewState.RESIDENT_DETAIL_HISTORY]: 'Auditoria',
};

const EDITABLE_MODULES = [
  ViewState.DASHBOARD,
  ViewState.RESIDENTS,
  ViewState.GENERAL_EVOLUTION,
  ViewState.RESIDENT_DETAIL,
  ViewState.AGENDA,
  ViewState.NUTRITION,
  ViewState.FRIGOBAR,
  ViewState.TEAM,
  ViewState.FINANCE,
  ViewState.STOCK,
  ViewState.REPORTS,
  ViewState.USERS,
  ViewState.ROOMS,
  ViewState.NOTIFICATIONS,
  ViewState.SETTINGS,
];

const SUB_MODULES = [
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

const ALL_ACTIONS: PermissionAction[] = ['view', 'edit', 'create', 'delete', 'sign'];
const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  edit: 'Editar',
  create: 'Criar',
  delete: 'Excluir',
  sign: 'Assinar',
};

const ProfileManager: React.FC = () => {
  const { profiles, updateProfile, addProfile, deleteProfile } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [prontuarioExpanded, setProntuarioExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (profileId: string) => {
    await deleteProfile(profileId);
    setConfirmDeleteId(null);
    if (expandedId === profileId) setExpandedId(null);
  };

  const toggleAction = (profile: Profile, module: ViewState, action: PermissionAction) => {
    const targets = module === ViewState.RESIDENT_DETAIL
      ? [ViewState.RESIDENT_DETAIL, ...SUB_MODULES]
      : [module];

    const hasCurrent = hasAction(profile, module, action);
    let newPermissions = [...profile.permissions];

    targets.forEach(mod => {
      const existingIdx = newPermissions.findIndex(p => p.module === mod);
      if (existingIdx >= 0) {
        const existing = newPermissions[existingIdx];
        const newActions = hasCurrent
          ? existing.actions.filter(a => a !== action)
          : existing.actions.includes(action)
            ? existing.actions
            : [...existing.actions, action];
        newPermissions[existingIdx] = { ...existing, actions: newActions };
      } else if (!hasCurrent) {
        newPermissions.push({ module: mod, actions: [action] });
      } else {
        // Entry doesn't exist and we're removing: add explicit empty entry so
        // hasPermission won't fall back to the parent module granting access.
        newPermissions.push({ module: mod, actions: [] });
      }
    });

    updateProfile({ ...profile, permissions: newPermissions });
  };

  const hasAction = (profile: Profile, module: ViewState, action: PermissionAction) => {
    const perm = profile.permissions.find(p => p.module === module);
    return perm ? perm.actions.includes(action) : false;
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const profile: Profile = {
      id: `profile-${Date.now()}`,
      name: newName.trim(),
      type: 'Cuidador',
      isEditable: true,
      permissions: [],
    };
    addProfile(profile);
    setNewName('');
    setShowNewForm(false);
    setExpandedId(profile.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-slate-800">Perfis e Permissões</h3>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Perfil
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handleAddProfile} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome do perfil..."
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button type="submit" className="bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Criar
          </button>
          <button type="button" onClick={() => setShowNewForm(false)} className="text-sm text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
        </form>
      )}

      <div className="space-y-3">
        {profiles.map(profile => (
          <div key={profile.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center">
              <button
                onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    profile.type === 'Administrador' ? 'bg-rose-500' :
                    profile.type === 'Médico' ? 'bg-blue-500' :
                    profile.type === 'Cuidador' ? 'bg-emerald-500' :
                    'bg-purple-500'
                  }`} />
                  <span className="font-medium text-sm text-slate-800">{profile.name}</span>
                  {!profile.isEditable && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Fixo</span>
                  )}
                </div>
                {expandedId === profile.id
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {profile.isEditable && (
                confirmDeleteId === profile.id ? (
                  <div className="flex items-center gap-1 pr-3">
                    <span className="text-xs text-slate-500">Confirmar?</span>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded transition-colors"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setConfirmDeleteId(profile.id); }}
                    className="mr-3 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Excluir perfil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              )}
            </div>

            {expandedId === profile.id && (
              <div className="border-t border-slate-100 px-4 py-3">
                {!profile.isEditable ? (
                  <p className="text-sm text-slate-400 italic">Este perfil não pode ser editado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200">
                          <th className="font-medium pb-2 pr-4 w-1/3">Módulo</th>
                          {ALL_ACTIONS.map(a => (
                            <th key={a} className="text-center font-medium pb-2 px-2">{ACTION_LABELS[a]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {EDITABLE_MODULES.map(mod => {
                          const isParent = mod === ViewState.RESIDENT_DETAIL;
                          return (
                            <React.Fragment key={mod}>
                              <tr className="border-t border-slate-100 hover:bg-slate-50/40">
                                <td className="py-2.5 pr-4 text-slate-700 font-medium whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {isParent && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setProntuarioExpanded(!prontuarioExpanded);
                                        }}
                                        className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                                        title={prontuarioExpanded ? "Recolher sub-páginas" : "Expandir sub-páginas"}
                                      >
                                        {prontuarioExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      </button>
                                    )}
                                    <span>{MODULE_LABELS[mod]}</span>
                                    {isParent && (
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-normal shrink-0">
                                        Módulo Geral
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {ALL_ACTIONS.map(action => {
                                  const supportsSign = SUB_MODULES.includes(mod) || mod === ViewState.RESIDENT_DETAIL;
                                  if (action === 'sign' && !supportsSign) {
                                    return (
                                      <td key={action} className="py-2.5 px-2 text-center text-slate-300">
                                        —
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={action} className="py-2.5 px-2 text-center">
                                      <button
                                        onClick={() => toggleAction(profile, mod, action)}
                                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                          hasAction(profile, mod, action)
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                        }`}
                                      >
                                        {hasAction(profile, mod, action) && <Check className="h-3.5 w-3.5" />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>

                              {isParent && prontuarioExpanded && SUB_MODULES.map(subMod => (
                                <tr key={subMod} className="bg-slate-50/50 hover:bg-slate-100/40">
                                  <td className="py-2 pl-8 pr-4 text-slate-600 font-medium whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-300 font-normal">↳</span>
                                      <span>{MODULE_LABELS[subMod]}</span>
                                    </div>
                                  </td>
                                  {ALL_ACTIONS.map(action => (
                                    <td key={action} className="py-2 px-2 text-center">
                                      <button
                                        onClick={() => toggleAction(profile, subMod, action)}
                                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                          hasAction(profile, subMod, action)
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                        }`}
                                      >
                                        {hasAction(profile, subMod, action) && <Check className="h-3.5 w-3.5" />}
                                      </button>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileManager;

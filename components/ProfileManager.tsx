import React, { useState } from 'react';
import { Shield, Plus, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Profile, Permission, ViewState, PermissionAction } from '../types';

const MODULE_LABELS: Record<ViewState, string> = {
  [ViewState.DASHBOARD]: 'Painel Geral',
  [ViewState.RESIDENTS]: 'Residentes',
  [ViewState.RESIDENT_DETAIL]: 'Prontuário',
  [ViewState.AGENDA]: 'Agenda',
  [ViewState.NUTRITION]: 'Nutrição',
  [ViewState.TEAM]: 'Equipe',
  [ViewState.FINANCE]: 'Financeiro',
  [ViewState.STOCK]: 'Estoque',
  [ViewState.REPORTS]: 'Relatórios',
  [ViewState.USERS]: 'Contas de Acesso',
  [ViewState.ROOMS]: 'Quartos',
  [ViewState.NOTIFICATIONS]: 'Notificações',
  [ViewState.SETTINGS]: 'Configurações',
  [ViewState.PROFILE]: 'Meu Perfil',
};

const EDITABLE_MODULES = [
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
  ViewState.NOTIFICATIONS,
  ViewState.SETTINGS,
];

const ALL_ACTIONS: PermissionAction[] = ['view', 'edit', 'create', 'delete'];
const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  edit: 'Editar',
  create: 'Criar',
  delete: 'Excluir',
};

const ProfileManager: React.FC = () => {
  const { profiles, updateProfile, addProfile } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');

  const toggleAction = (profile: Profile, module: ViewState, action: PermissionAction) => {
    const existing = profile.permissions.find(p => p.module === module);
    let newPermissions: Permission[];

    if (existing) {
      const hasAction = existing.actions.includes(action);
      const newActions = hasAction
        ? existing.actions.filter(a => a !== action)
        : [...existing.actions, action];
      newPermissions = profile.permissions.map(p =>
        p.module === module ? { ...p, actions: newActions } : p
      );
    } else {
      newPermissions = [...profile.permissions, { module, actions: [action] }];
    }

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
            <button
              onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
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

            {expandedId === profile.id && (
              <div className="border-t border-slate-100 px-4 py-3">
                {!profile.isEditable ? (
                  <p className="text-sm text-slate-400 italic">Este perfil não pode ser editado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left font-medium pb-2 pr-4">Módulo</th>
                          {ALL_ACTIONS.map(a => (
                            <th key={a} className="text-center font-medium pb-2 px-2">{ACTION_LABELS[a]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {EDITABLE_MODULES.map(mod => (
                          <tr key={mod} className="border-t border-slate-50">
                            <td className="py-2 pr-4 text-slate-700 font-medium whitespace-nowrap">{MODULE_LABELS[mod]}</td>
                            {ALL_ACTIONS.map(action => (
                              <td key={action} className="py-2 px-2 text-center">
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
                            ))}
                          </tr>
                        ))}
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

import React, { useState } from 'react';
import { Plus, X, Search, Trash2, Mail, Lock, User, UserPlus, AlertCircle, Check, ShieldAlert, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser, Resident, SystemAccessLog, Profile, Employee } from '../types';
import CustomSelect from './CustomSelect';

interface UsersModuleProps {
  residents: Resident[];
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => Promise<Employee>;
  onAddAccessLog: (log: SystemAccessLog) => void;
}

const UsersModule: React.FC<UsersModuleProps> = ({ residents, employees, onAddEmployee, onAddAccessLog }) => {
  const { users, profiles, addUser, deleteUser, currentUser, updateUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return sessionStorage.getItem('modal_users_create_open') === 'true';
  });
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem('modal_users_delete_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(() => {
    return sessionStorage.getItem('modal_users_editing_user_id') || null;
  });

  // Form State
  const [name, setName] = useState(() => {
    return sessionStorage.getItem('modal_users_form_name') || '';
  });
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem('modal_users_form_email') || '';
  });
  const [password, setPassword] = useState(() => {
    return sessionStorage.getItem('modal_users_form_password') || '';
  });
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    return sessionStorage.getItem('modal_users_form_profile_id') || '';
  });
  const [selectedResidentId, setSelectedResidentId] = useState(() => {
    return sessionStorage.getItem('modal_users_form_resident_id') || '';
  });
  const [formError, setFormError] = useState(() => {
    return sessionStorage.getItem('modal_users_form_error') || '';
  });



  React.useEffect(() => {
    if (isModalOpen) {
      sessionStorage.setItem('modal_users_create_open', 'true');
      sessionStorage.setItem('modal_users_form_name', name);
      sessionStorage.setItem('modal_users_form_email', email);
      sessionStorage.setItem('modal_users_form_password', password);
      sessionStorage.setItem('modal_users_form_profile_id', selectedProfileId);
      sessionStorage.setItem('modal_users_form_resident_id', selectedResidentId);
      sessionStorage.setItem('modal_users_form_error', formError);
      if (editingUserId) {
        sessionStorage.setItem('modal_users_editing_user_id', editingUserId);
      }
    } else {
      sessionStorage.removeItem('modal_users_create_open');
      sessionStorage.removeItem('modal_users_form_name');
      sessionStorage.removeItem('modal_users_form_email');
      sessionStorage.removeItem('modal_users_form_password');
      sessionStorage.removeItem('modal_users_form_profile_id');
      sessionStorage.removeItem('modal_users_form_resident_id');
      sessionStorage.removeItem('modal_users_form_error');
      sessionStorage.removeItem('modal_users_editing_user_id');
    }
  }, [isModalOpen, name, email, password, selectedProfileId, selectedResidentId, formError, editingUserId]);

  React.useEffect(() => {
    if (userToDelete) {
      sessionStorage.setItem('modal_users_delete_user', JSON.stringify(userToDelete));
    } else {
      sessionStorage.removeItem('modal_users_delete_user');
    }
  }, [userToDelete]);

  // Search Filter
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setEditingUserId(null);
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
    setName('');
    setEmail('');
    setPassword('');
    setSelectedResidentId(residents[0]?.id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditUser = (user: AuthUser) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setSelectedProfileId(user.profile.id);
    setSelectedResidentId(user.residentId || residents[0]?.id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) return setFormError('O nome completo é obrigatório.');
    if (!email.trim()) return setFormError('O e-mail é obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Digite um e-mail válido.');
    
    if (!editingUserId && password.length < 4) {
      return setFormError('A senha deve conter pelo menos 4 caracteres.');
    }

    if (!editingUserId) {
      if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return setFormError('Este e-mail já está cadastrado.');
      }
    } else {
      const userBefore = users.find(u => u.id === editingUserId);
      if (userBefore && userBefore.email.toLowerCase() !== email.trim().toLowerCase()) {
        if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
          return setFormError('Este e-mail já está cadastrado.');
        }
      }
    }

    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) return setFormError('Selecione um perfil de acesso válido.');

    if (profile.type === 'Responsável' && !selectedResidentId) {
      return setFormError('Você deve selecionar o residente vinculado para este responsável.');
    }

    try {
      if (editingUserId) {
        const updatedUser: AuthUser = {
          id: editingUserId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: '',
          profile,
          ...(profile.type === 'Responsável' ? { residentId: selectedResidentId } : {})
        };

        await updateUser(updatedUser);

        if (currentUser) {
          const logEntry: SystemAccessLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.profile.type as any || 'Admin',
            action: 'Edição de Usuário' as any,
            resource: `Usuário: ${updatedUser.name} (${updatedUser.email}) - Perfil: ${profile.name}`,
            ipAddress: '192.168.1.50'
          };
          onAddAccessLog(logEntry);
        }
      } else {
        const userData: Omit<AuthUser, 'id'> = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          profile,
          ...(profile.type === 'Responsável' ? { residentId: selectedResidentId } : {})
        };

        await addUser(userData);

        if (currentUser) {
          const logEntry: SystemAccessLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.profile.type as any || 'Admin',
            action: 'Cadastro de Usuário',
            resource: `Usuário: ${userData.name} (${userData.email}) - Perfil: ${profile.name}`,
            ipAddress: '192.168.1.50'
          };
          onAddAccessLog(logEntry);
        }
      }

      setIsModalOpen(false);
      setEditingUserId(null);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    // Prevent deleting oneself
    if (currentUser && currentUser.id === userToDelete.id) {
      alert('Você não pode excluir o seu próprio usuário enquanto está logado.');
      setUserToDelete(null);
      return;
    }

    deleteUser(userToDelete.id);

    // Create system access audit log
    if (currentUser) {
      const logEntry: SystemAccessLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.profile.type as any || 'Admin',
        action: 'Exclusão de Usuário',
        resource: `Usuário: ${userToDelete.name} (${userToDelete.email})`,
        ipAddress: '192.168.1.50' // mock client IP
      };
      onAddAccessLog(logEntry);
    }

    setUserToDelete(null);
  };

  const getProfileBadgeClass = (type: string) => {
    switch (type) {
      case 'Administrador':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Médico':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Cuidador':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Responsável':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getResidentName = (residentId?: string) => {
    if (!residentId) return '-';
    const res = residents.find(r => r.id === residentId);
    return res ? res.name : 'Residente não encontrado';
  };

  const getLinkedEmployeeInfo = (userEmail: string, userId: string) => {
    const emp = employees.find(e => e.auth_user_id === userId || e.email.toLowerCase() === userEmail.toLowerCase());
    if (emp) {
      return `${emp.name} (${emp.role})`;
    }
    return null;
  };



  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const inputClass = 'w-full pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h1>
          <p className="text-slate-500">Administração de credenciais e níveis de acesso ao sistema</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center bg-primary-600 text-white px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </button>
      </div>

      {/* Users Count Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Usuários', count: users.length, color: 'border-l-primary-500' },
          { label: 'Administradores', count: users.filter(u => u.profile.type === 'Administrador').length, color: 'border-l-rose-500' },
          { label: 'Profissionais de Saúde', count: users.filter(u => u.profile.type === 'Médico' || u.profile.type === 'Cuidador').length, color: 'border-l-emerald-500' },
          { label: 'Responsáveis', count: users.filter(u => u.profile.type === 'Responsável').length, color: 'border-l-purple-500' },
        ].map((card, idx) => (
          <div key={idx} className={`bg-white p-4 border border-slate-200 border-l-4 ${card.color} rounded-xl shadow-sm`}>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 min-h-[400px]">
        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Nome completo</th>
                <th className="px-4 py-3">E-mail de acesso</th>
                <th className="px-4 py-3">Perfil / Nível</th>
                <th className="px-4 py-3">Residente Vinculado</th>
                <th className="px-4 py-3 text-center rounded-tr-lg w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                    Nenhum usuário encontrado com os termos de busca.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 select-none">
                          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{user.name}</p>
                          {currentUser?.id === user.id && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border border-slate-200 font-medium">Você</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${getProfileBadgeClass(user.profile.type)}`}>
                        {user.profile.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.profile.type === 'Responsável' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Responsável por</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200 font-medium">
                            {getResidentName(user.residentId)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Colaborador Vinculado</span>
                          {getLinkedEmployeeInfo(user.email, user.id) ? (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 font-medium truncate max-w-[200px] inline-block">
                              {getLinkedEmployeeInfo(user.email, user.id)}
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 font-medium inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 inline shrink-0" /> Sem vínculo
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="Editar usuário"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          disabled={currentUser?.id === user.id}
                          className={`p-1.5 rounded-lg border transition-colors ${currentUser?.id === user.id
                              ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                              : 'text-rose-500 border-rose-100 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                          title={currentUser?.id === user.id ? 'Você não pode se auto-excluir' : 'Excluir usuário'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Layout View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredUsers.length === 0 ? (
            <p className="text-center py-10 text-slate-400 italic">Nenhum usuário encontrado.</p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl relative shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs select-none">
                      {user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-[15px]">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${getProfileBadgeClass(user.profile.type)}`}>
                    {user.profile.name}
                  </span>
                </div>

                {user.profile.type === 'Responsável' ? (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                    <span className="text-slate-400">Residente vinculado:</span>
                    <span className="font-semibold text-slate-700">{getResidentName(user.residentId)}</span>
                  </div>
                ) : (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                    <span className="text-slate-400">Colaborador:</span>
                    {getLinkedEmployeeInfo(user.email, user.id) ? (
                      <span className="font-semibold text-slate-700">{getLinkedEmployeeInfo(user.email, user.id)}</span>
                    ) : (
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 inline shrink-0" /> Sem colaborador vinculado
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-[10px] text-slate-400 font-medium">Status: Ativo</span>
                  <div className="flex gap-2">
                    {currentUser?.id === user.id ? (
                      <span className="text-[10px] bg-slate-150 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-200 shadow-sm">Você (Logado)</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Creation Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-lg overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                {editingUserId ? <Edit className="h-5 w-5 text-primary-600" /> : <UserPlus className="h-5 w-5 text-primary-600" />}
                <div>
                  <h3 className="font-bold text-slate-800">{editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{editingUserId ? 'Atualize as credenciais e nível de acesso' : 'Preencha as credenciais e nível de acesso'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-700 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Perfil de Acesso / Hierarquia</label>
                  <CustomSelect
                    value={selectedProfileId}
                    onChange={(val) => {
                      setSelectedProfileId(val);
                      // Don't wipe name/email unless we are linking
                      const prof = profiles.find(p => p.id === val);
                      if (prof && prof.type === 'Responsável') {
                        setName('');
                        setEmail('');
                      }
                    }}
                    options={profiles.map(p => ({ value: p.id, label: p.name, desc: p.type }))}
                    placeholder="Selecione um perfil..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Nome Completo do Usuário"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    autoComplete="new-password"
                    placeholder="exemplo@recanto.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!!editingUserId}
                    className={`${inputClass} pl-9 ${editingUserId ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
                  />
                </div>
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha Inicial</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required={!editingUserId}
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              )}

              {selectedProfile && selectedProfile.type === 'Responsável' && (
                <div className="bg-purple-50/50 p-4 border border-purple-100 rounded-xl space-y-2">
                  <label className="block text-sm font-semibold text-purple-900">Vincular a Residente</label>
                  <p className="text-xs text-purple-700">Este usuário terá acesso restrito às informações apenas do residente selecionado.</p>
                  <CustomSelect
                    required
                    value={selectedResidentId}
                    onChange={setSelectedResidentId}
                    options={residents.map(r => ({ value: r.id, label: r.name, desc: `Quarto: ${r.room}` }))}
                    placeholder="Selecione o residente..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white sm:rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>

            <p className="text-sm text-slate-650">
              Tem certeza que deseja excluir o usuário <span className="font-semibold text-slate-800">{userToDelete.name}</span> (<span className="font-mono text-xs">{userToDelete.email}</span>)?
            </p>
            <p className="text-xs text-slate-400 italic">
              Esta ação é irreversível e revogará imediatamente o acesso desse usuário ao sistema.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-150 pt-4">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;

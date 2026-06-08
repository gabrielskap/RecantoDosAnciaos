import React, { useState } from 'react';
import { Plus, X, Search, Trash2, Mail, Lock, User, UserPlus, AlertCircle, Check, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser, Resident, SystemAccessLog, Profile } from '../types';
import CustomSelect from './CustomSelect';

interface UsersModuleProps {
  residents: Resident[];
  onAddAccessLog: (log: SystemAccessLog) => void;
}

const UsersModule: React.FC<UsersModuleProps> = ({ residents, onAddAccessLog }) => {
  const { users, profiles, addUser, deleteUser, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return sessionStorage.getItem('modal_users_create_open') === 'true';
  });
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem('modal_users_delete_user');
    return saved ? JSON.parse(saved) : null;
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
    } else {
      sessionStorage.removeItem('modal_users_create_open');
      sessionStorage.removeItem('modal_users_form_name');
      sessionStorage.removeItem('modal_users_form_email');
      sessionStorage.removeItem('modal_users_form_password');
      sessionStorage.removeItem('modal_users_form_profile_id');
      sessionStorage.removeItem('modal_users_form_resident_id');
      sessionStorage.removeItem('modal_users_form_error');
    }
  }, [isModalOpen, name, email, password, selectedProfileId, selectedResidentId, formError]);

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
    // Default to the first profile in the list
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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) return setFormError('O nome completo é obrigatório.');
    if (!email.trim()) return setFormError('O e-mail é obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Digite um e-mail válido.');
    if (password.length < 4) return setFormError('A senha deve conter pelo menos 4 caracteres.');

    // Check email uniqueness
    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return setFormError('Este e-mail já está cadastrado.');
    }

    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) return setFormError('Selecione um perfil de acesso válido.');

    if (profile.type === 'Responsável' && !selectedResidentId) {
      return setFormError('Você deve selecionar o residente vinculado para este responsável.');
    }

    const userData: Omit<AuthUser, 'id'> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      profile,
      ...(profile.type === 'Responsável' ? { residentId: selectedResidentId } : {})
    };

    addUser(userData);

    // Create system access audit log
    if (currentUser) {
      const logEntry: SystemAccessLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.profile.type as any || 'Admin',
        action: 'Cadastro de Usuário',
        resource: `Usuário: ${userData.name} (${userData.email}) - Perfil: ${profile.name}`,
        ipAddress: '192.168.1.50' // mock client IP
      };
      onAddAccessLog(logEntry);
    }

    setIsModalOpen(false);
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

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

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
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-medium">
                          {getResidentName(user.residentId)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Não aplicável</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
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

                {user.profile.type === 'Responsável' && (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                    <span className="text-slate-400">Residente vinculado:</span>
                    <span className="font-semibold text-slate-700">{getResidentName(user.residentId)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-[10px] text-slate-400 font-medium">Status: Ativo</span>
                  <div className="flex gap-2">
                    {currentUser?.id === user.id ? (
                      <span className="text-[10px] bg-slate-150 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-200 shadow-sm">Você (Logado)</span>
                    ) : (
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col transform transition-all"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-55 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary-600" />
                <h3 className="font-semibold text-slate-800">Cadastrar Novo Usuário</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 flex items-start gap-2.5 text-rose-700 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Nome Completo do Usuário"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    placeholder="exemplo@recanto.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Acesso / Hierarquia</label>
                  <CustomSelect
                    value={selectedProfileId}
                    onChange={setSelectedProfileId}
                    options={profiles.map(p => ({ value: p.id, label: p.name, desc: p.type }))}
                    placeholder="Selecione um perfil..."
                  />
                </div>
              </div>

              {selectedProfile && selectedProfile.type === 'Responsável' && (
                <div className="bg-purple-50/50 p-4 border border-purple-100 rounded-lg space-y-2">
                  <label className="block text-sm font-medium text-purple-900">Vincular a Residente</label>
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-full shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>

            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o usuário <span className="font-semibold text-slate-800">{userToDelete.name}</span> (<span className="font-mono text-xs">{userToDelete.email}</span>)?
            </p>
            <p className="text-xs text-slate-400 italic">
              Esta ação é irreversível e revogará imediatamente o acesso desse usuário ao sistema.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-150 pt-4">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium shadow-sm transition-colors"
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
